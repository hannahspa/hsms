# -*- coding: utf-8 -*-
"""KHẢO SÁT READ-ONLY: so sánh Data Thang 05 (tải 31/05) với DB production.
Không ghi gì vào DB. Chỉ báo cáo chênh lệch."""
import sys, io, requests, pandas as pd, re
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Đọc key từ .env.import
env = {}
for line in Path(".env.import").read_text(encoding='utf-8').splitlines():
    if '=' in line and not line.strip().startswith('#'):
        k, v = line.split('=', 1); env[k.strip()] = v.strip()
URL = env['SUPABASE_URL']; KEY = env['SUPABASE_KEY']
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
folder = Path(r"D:\Hannah Spa\Database\Data Thang 05")

def fetch_all(table, params=""):
    out, off = [], 0
    while True:
        r = requests.get(f"{URL}/rest/v1/{table}?{params}&limit=1000&offset={off}", headers=H)
        d = r.json() if r.status_code in (200, 206) else []
        if not d: break
        out.extend(d)
        if len(d) < 1000: break
        off += 1000
    return out

def pi(x, d=0):
    try:
        s = str(x).strip()
        return d if s in ('nan','None','') else int(float(s))
    except: return d

def to_str(v):
    s = str(v).strip()
    return None if s in ('nan','None','') else s

print("="*64)
print("KHẢO SÁT ĐỒNG BỘ THÁNG 5 — 31/05/2026 (READ-ONLY)")
print("="*64)

# ── 1. ĐƠN HÀNG ──────────────────────────────────────────
print("\n[1] ĐƠN HÀNG")
df = pd.read_excel(folder / "danh_sach_ban_hang_tat_ca_chi_nhanh_1780241752.xlsx", dtype=str)
df_ok = df[df['Đơn hàng đã xóa'].isna() | (df['Đơn hàng đã xóa'].str.strip()=='')].copy()
df_del = df[~(df['Đơn hàng đã xóa'].isna() | (df['Đơn hàng đã xóa'].str.strip()==''))]
ma_don_file = set(df_ok['Mã đơn hàng'].dropna().unique())
# Phân bố theo ngày
df_ok['_ngay'] = df_ok['Ngày giờ'].str.split(' ').str[0]
print(f"  File: {len(df)} dòng | {len(df_ok)} dòng hợp lệ | {len(df_del)} dòng đơn đã xóa")
print(f"  Số đơn hợp lệ trong file: {len(ma_don_file)}")
# khoảng ngày
ngays = sorted([d for d in df_ok['_ngay'].dropna().unique()])
print(f"  Khoảng ngày: {ngays[0]} → {ngays[-1]}")

dh_db = fetch_all("don_hang", "select=id,ma_don,ngay,thuc_thu,is_test")
ma_don_db = set(x['ma_don'] for x in dh_db if x.get('ma_don'))
dh_db_t5 = [x for x in dh_db if x.get('ngay','').startswith('2026-05')]
print(f"  DB: tổng {len(dh_db)} đơn | tháng 5: {len(dh_db_t5)} đơn")
thieu = ma_don_file - ma_don_db
thua = ma_don_db - ma_don_file  # đơn trong DB không có trong file (đã xóa trên myspa?)
print(f"  >> Đơn CÓ trong file, CHƯA có DB (cần import): {len(thieu)}")
print(f"  >> Đơn CÓ trong DB, KHÔNG có file (xóa/khác kỳ): {len(thua)}")
# tổng thực thu file
thuc_thu_file = 0
for ma, grp in df_ok.groupby('Mã đơn hàng', sort=False):
    thuc_thu_file += pi(grp.iloc[0]['Thành tiền ĐH/TLT'])
print(f"  Tổng thực thu (file, theo đơn): {thuc_thu_file:,}đ")
thuc_thu_db_t5 = sum(pi(x.get('thuc_thu')) for x in dh_db_t5)
print(f"  Tổng thực thu (DB tháng 5):      {thuc_thu_db_t5:,}đ")
# Tổng PTTT từ file
PTTT = {'Khách Hàng Chuyển Khoản':'CK','Khách Quẹt Thẻ':'Quẹt thẻ','Tiền mặt':'Tiền mặt','MOMO':'MOMO','PT khác':'PT khác','MPOS (ATM, Visa, Master,...)':'MPOS','PAYON (QR Code)':'PAYON','TINGBOX (QR Code)':'TINGBOX'}
print("  PTTT (file, theo đơn - dòng đầu mỗi đơn):")
tong_pttt = 0
for col, nhan in PTTT.items():
    s = 0
    for ma, grp in df_ok.groupby('Mã đơn hàng', sort=False):
        s += pi(grp.iloc[0].get(col, 0))
    if s > 0:
        print(f"    {nhan:12}: {s:>14,}đ"); tong_pttt += s
print(f"    {'TỔNG':12}: {tong_pttt:>14,}đ")

# ── 2. KHÁCH HÀNG ────────────────────────────────────────
print("\n[2] KHÁCH HÀNG")
dfk = pd.read_excel(folder / "khach_hang_tat_ca_chi_nhanh_1780242088.xlsx", dtype=str)
print(f"  File cột: {list(dfk.columns)[:8]}")
col_makh = [c for c in dfk.columns if 'Mã khách' in c or 'Mã KH' in c]
ma_kh_col = col_makh[0] if col_makh else dfk.columns[0]
ma_kh_file = set(dfk[ma_kh_col].dropna().unique())
kh_db = fetch_all("khach_hang", "select=id,ma_kh")
ma_kh_db = set(x['ma_kh'] for x in kh_db if x.get('ma_kh'))
print(f"  File: {len(dfk)} dòng | {len(ma_kh_file)} mã KH")
print(f"  DB:   {len(kh_db)} KH | {len(ma_kh_db)} có mã")
print(f"  >> KH trong file CHƯA có DB: {len(ma_kh_file - ma_kh_db)}")

# ── 3. THẺ LIỆU TRÌNH ────────────────────────────────────
print("\n[3] THẺ LIỆU TRÌNH")
dft = pd.read_excel(folder / "danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1780241952.xlsx", dtype=str)
print(f"  File cột: {list(dft.columns)[:8]}")
col_mathe = [c for c in dft.columns if 'Mã thẻ' in c or 'Mã Thẻ' in c]
mathe_col = col_mathe[0] if col_mathe else dft.columns[0]
mathe_file = set(dft[mathe_col].dropna().unique())
the_db = fetch_all("the_lieu_trinh", "select=id,ma_the")
mathe_db = set(x['ma_the'] for x in the_db if x.get('ma_the'))
print(f"  File: {len(dft)} dòng | {len(mathe_file)} mã thẻ")
print(f"  DB:   {len(the_db)} thẻ")
print(f"  >> Thẻ trong file CHƯA có DB: {len(mathe_file - mathe_db)}")

# ── 4. CHI TIẾT ĐƠN (don_hang_chi_tiet) ─────────────────
print("\n[4] CHI TIẾT & THANH TOÁN (DB)")
print(f"  Dòng chi tiết file (hợp lệ): {len(df_ok)}")
# Đếm nhanh DB
import json
r = requests.get(f"{URL}/rest/v1/don_hang_chi_tiet?select=id&limit=1", headers={**H,'Prefer':'count=exact','Range':'0-0'})
print(f"  don_hang_chi_tiet DB count: {r.headers.get('content-range')}")
r = requests.get(f"{URL}/rest/v1/thanh_toan?select=id&limit=1", headers={**H,'Prefer':'count=exact','Range':'0-0'})
print(f"  thanh_toan DB count: {r.headers.get('content-range')}")

print("\n" + "="*64)
print("KẾT THÚC KHẢO SÁT")
print("="*64)
