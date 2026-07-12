# -*- coding: utf-8 -*-
"""Phân loại toàn bộ giao dịch sao kê MB Bank T5 để kiểm toán Sổ Thu Chi.
Xuất: scripts/phanloai_mb_t5.csv + thống kê nhóm."""
import sys, io, re
import pandas as pd
from pathlib import Path
from collections import defaultdict
import warnings; warnings.filterwarnings('ignore')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

f = Path(r"D:\Hannah Spa\Database\Data Thang 05\Kiem Toan Thang 05\MB Bank.xlsx")
df = pd.read_excel(f, sheet_name=0, header=18, dtype=str)
def pf(x):
    try: return float(str(x).replace(',',''))
    except: return 0.0
dc = [c for c in df.columns if 'Debit' in c][0]
cc = [c for c in df.columns if 'Credit' in c][0]
ndc = [c for c in df.columns if 'Details' in c][0]
ngc = [c for c in df.columns if 'Transaction D' in c or 'giao dịch' in c][0]
df['debit'] = df[dc].apply(pf); df['credit'] = df[cc].apply(pf)
df['nd'] = df[ndc].fillna('').astype(str).str.strip()
df['ngay'] = df[ngc].fillna('').astype(str).str.split(' ').str[0]
# Lọc giao dịch thật: có tiền VÀ có nội dung (loại 2 dòng tổng trống)
df = df[((df['debit']>0)|(df['credit']>0)) & (df['nd']!='')].copy()

def phan_loai(nd, credit, debit):
    n = nd.lower()
    if credit > 0:
        if 'tip' in n: return 'Tip nhân viên (vào)'
        if 'lai tien gui' in n: return 'Lãi ngân hàng'
        # Nộp tiền mặt spa vào TK (nội bộ): "DT TM", "Nop TM" do Khánh Duy/Ngọc Phương
        if re.search(r'\b(dt tm|nop tm)\b', n) or ('do thi khanh duy' in n and ' tm ' in n):
            return 'Nộp tiền mặt vào TK (nội bộ)'
        if 'ho ngoc phuong' in n and ' tm' in n: return 'Nộp tiền mặt vào TK (nội bộ)'
        return 'Doanh thu khách CK'
    else:
        if 'tip' in n: return 'Tip chi cho NV (ra)'
        if 'luong cung' in n: return 'Chi lương cứng'
        if 'luong kinh doanh' in n: return 'Chi lương kinh doanh'
        if 'tien nha' in n or 'thue nha' in n: return 'Chi tiền nhà'
        if any(k in n for k in ['evn','electric','tien dien']): return 'Chi điện'
        if any(k in n for k in ['tien nuoc','cap nuoc']): return 'Chi nước'
        if any(k in n for k in ['vnpt','viettel','fpt','internet']): return 'Chi internet/đt'
        if 'anh nam' in n: return 'Chuyển chủ (Anh Nam)'
        if 'rut' in n or 'atm' in n: return 'Rút tiền mặt'
        return 'Chi khác'

df['nhom'] = [phan_loai(nd,c,d) for nd,c,d in zip(df['nd'],df['credit'],df['debit'])]

# Thống kê
g = defaultdict(lambda: {'n':0,'vao':0,'ra':0})
for _,r in df.iterrows():
    g[r['nhom']]['n']+=1; g[r['nhom']]['vao']+=r['credit']; g[r['nhom']]['ra']+=r['debit']
print("="*62); print("PHÂN LOẠI GIAO DỊCH MB BANK THÁNG 5 (kiểm toán)"); print("="*62)
print(f"{'Nhóm':32}{'SL':>4}{'Vào':>13}{'Ra':>13}")
print("-"*62)
tv=tr=0
for k,v in sorted(g.items(), key=lambda x:-(x[1]['vao']+x[1]['ra'])):
    print(f"{k:32}{v['n']:>4}{v['vao']:>13,.0f}{v['ra']:>13,.0f}")
    tv+=v['vao']; tr+=v['ra']
print("-"*62)
print(f"{'TỔNG':32}{len(df):>4}{tv:>13,.0f}{tr:>13,.0f}")
print(f"Ròng (vào - ra): {tv-tr:,.0f}đ")

# Đối chiếu nhanh với POS
print("\n--- ĐỐI CHIẾU DOANH THU CK ---")
dt_ck = g['Doanh thu khách CK']['vao']
print(f"Doanh thu khách CK trên sao kê MB : {dt_ck:,.0f}đ")
print(f"Doanh thu CK POS (HSMS)           : 102,444,000đ")
print(f"Chênh                             : {dt_ck-102444000:,.0f}đ")
print(f"Nộp tiền mặt vào TK (nội bộ)      : {g['Nộp tiền mặt vào TK (nội bộ)']['vao']:,.0f}đ")

# Xuất CSV cho anh Nam rà soát
out = df[['ngay','credit','debit','nhom','nd']].copy()
out.columns = ['Ngày','Tiền vào','Tiền ra','Nhóm phân loại','Nội dung']
out.to_csv(Path("scripts/phanloai_mb_t5.csv"), index=False, encoding='utf-8-sig')
print(f"\n>> Đã xuất chi tiết {len(out)} GD -> scripts/phanloai_mb_t5.csv")
