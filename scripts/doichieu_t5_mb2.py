"""
Đối chiếu T5 MB Bank vs HSMS — đọc đúng cột file Excel
"""
import requests
import pandas as pd
from pathlib import Path

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
H = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
MB_ID = "6d69df42-9d5a-4f03-9370-a0b6e007e12d"
SAO_KE = Path(r"D:\Hannah Spa\Thu Chi\Sao Ke Khanh Duy.xlsx")

def fmt(n):
    try: return f"{int(round(n)):,}".replace(",", ".")
    except: return str(n)

def fetch_all(table, params=""):
    result, limit, offset = [], 1000, 0
    while True:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?{params}&limit={limit}&offset={offset}", headers=H, timeout=30)
        data = r.json() if r.status_code in [200, 206] else []
        if not data: break
        result.extend(data)
        if len(data) < limit: break
        offset += limit
    return result

SEP = "=" * 70
sep = "-" * 70

# ══════════════════════════════════════════════════════════════════
# A. ĐỌC SAO KÊ — format thực tế: 9 cột, header row 19 (index 18)
# ══════════════════════════════════════════════════════════════════
print(SEP)
print("A. ĐỌC SAO KÊ MB BANK")
print(sep)

df = pd.read_excel(SAO_KE, sheet_name=0, header=18, dtype=str)
# Đặt tên cột thủ công theo vị trí thực tế
df.columns = ['stt','ngay','so_but_toan','debit','credit','noi_dung','don_vi','tai_khoan','ngan_hang'] + \
             [f'extra_{i}' for i in range(len(df.columns)-9)]

def parse_num(x):
    try:
        s = str(x).replace(',','').replace(' ','').strip()
        if s in ('', 'nan', 'None', '-', '0.00', '0'): return 0
        return int(float(s))
    except: return 0

def parse_date(x):
    try:
        s = str(x).strip()
        # Format: dd/mm/yyyy HH:MM hoặc dd/mm/yyyy
        part = s.split(' ')[0]  # lấy phần ngày
        if '/' in part:
            d, m, y = part.split('/')
            if len(y) == 2: y = '20' + y
            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
        return None
    except: return None

rows = []
for _, row in df.iterrows():
    ngay_str = str(row.get('ngay', '')).strip()
    ngay = parse_date(ngay_str)
    if not ngay or ngay < '2026-01-01': continue
    debit  = parse_num(row.get('debit', 0))
    credit = parse_num(row.get('credit', 0))
    noi_dung = str(row.get('noi_dung', '')).strip()
    don_vi = str(row.get('don_vi', '')).strip()
    tai_khoan = str(row.get('tai_khoan', '')).strip()
    if debit == 0 and credit == 0: continue
    rows.append({'ngay': ngay, 'debit': debit, 'credit': credit,
                 'noi_dung': noi_dung, 'don_vi': don_vi, 'tai_khoan': tai_khoan})

print(f"  Tổng GD đọc được: {len(rows)}")
print(f"  GD đầu: {rows[0] if rows else 'None'}")
print(f"  GD cuối: {rows[-1] if rows else 'None'}")

# Tính số dư tổng để kiểm tra
tong_credit_all = sum(r['credit'] for r in rows)
tong_debit_all  = sum(r['debit']  for r in rows)
print(f"\n  Tổng credit tất cả: {fmt(tong_credit_all)}")
print(f"  Tổng debit  tất cả: {fmt(tong_debit_all)}")
print(f"  Số dư cuối (0 + credit - debit): {fmt(tong_credit_all - tong_debit_all)}")
print(f"  Số dư thực tế sao kê: 45.864.619")

# ══════════════════════════════════════════════════════════════════
# B. LỌC THÁNG 5
# ══════════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("B. SAO KÊ THÁNG 5/2026")
print(sep)

t4_rows = [r for r in rows if r['ngay'].startswith('2026-04')]
t5_rows = [r for r in rows if r['ngay'].startswith('2026-05')]

# Số dư tích lũy đến cuối T4
sodu_cuoi_t4_saoke = sum(r['credit'] - r['debit'] for r in rows if r['ngay'] <= '2026-04-30')
tong_credit_t5 = sum(r['credit'] for r in t5_rows)
tong_debit_t5  = sum(r['debit']  for r in t5_rows)

print(f"  Số dư cuối T4 (sao kê): {fmt(sodu_cuoi_t4_saoke)}")
print(f"  Credit T5  : {fmt(tong_credit_t5)}  ({len([r for r in t5_rows if r['credit']>0])} GD)")
print(f"  Debit  T5  : {fmt(tong_debit_t5)}  ({len([r for r in t5_rows if r['debit']>0])} GD)")
print(f"  Net T5     : {fmt(tong_credit_t5 - tong_debit_t5)}")
print(f"  Số dư cuối T5 tính ra: {fmt(sodu_cuoi_t4_saoke + tong_credit_t5 - tong_debit_t5)}")
print(f"  Số dư cuối T5 thực tế: 45.864.619")

# ══════════════════════════════════════════════════════════════════
# C. HSMS THÁNG 5
# ══════════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("C. HSMS THÁNG 5/2026 (MB Bank)")
print(sep)

dt_ck_t5 = fetch_all("doanh_thu", "hinh_thuc=eq.chuyen_khoan&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")
cp_ck_t5 = fetch_all("chi_phi", "hinh_thuc_thanh_toan=eq.chuyen_khoan&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")
ck_vao_t5 = fetch_all("chuyen_khoan_noi_bo", f"den_vi_id=eq.{MB_ID}&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")

tong_dt_t5  = sum(x.get('so_tien',0) or 0 for x in dt_ck_t5)
tong_cp_t5  = sum(x.get('so_tien',0) or 0 for x in cp_ck_t5)
tong_ckvao_t5 = sum(x.get('so_tien',0) or 0 for x in ck_vao_t5)

sodu_mb_cuoi_t4_hsms = (
    sum(x.get('so_tien',0) or 0 for x in fetch_all("doanh_thu","hinh_thuc=eq.chuyen_khoan&ngay=lte.2026-04-30&select=so_tien"))
    - sum(x.get('so_tien',0) or 0 for x in fetch_all("chi_phi","hinh_thuc_thanh_toan=eq.chuyen_khoan&ngay=lte.2026-04-30&select=so_tien"))
    + sum(x.get('so_tien',0) or 0 for x in fetch_all("chuyen_khoan_noi_bo",f"den_vi_id=eq.{MB_ID}&ngay=lte.2026-04-30&select=so_tien"))
    - sum(x.get('so_tien',0) or 0 for x in fetch_all("chuyen_khoan_noi_bo",f"tu_vi_id=eq.{MB_ID}&ngay=lte.2026-04-30&select=so_tien"))
)

print(f"  Số dư cuối T4 (HSMS)  : {fmt(sodu_mb_cuoi_t4_hsms)}")
print(f"  Số dư cuối T4 (sao kê): {fmt(sodu_cuoi_t4_saoke)}")
print(f"  Chênh cuối T4          : {fmt(sodu_mb_cuoi_t4_hsms - sodu_cuoi_t4_saoke)}")

# ══════════════════════════════════════════════════════════════════
# D. CREDIT DETAIL T5: SAO KÊ vs HSMS
# ══════════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("D. CREDIT T5 — SAO KÊ (tiền VÀO tài khoản)")
print(sep)
credit_t5 = sorted([r for r in t5_rows if r['credit'] > 0], key=lambda x: x['ngay'])
print(f"  {'Ngày':<12} {'Số tiền':>15}  Nội dung / Đơn vị")
for r in credit_t5:
    print(f"  {r['ngay']:<12} +{fmt(r['credit']):>14}  {r['noi_dung'][:35]} | {r['don_vi'][:25]}")
print(f"  {'TỔNG':<12} +{fmt(tong_credit_t5):>14}")

print(f"\n  CREDIT T5 HSMS (DT CK + CK TM→MB):")
print(f"  {'Ngày':<12} {'Số tiền':>15}  Nguồn")
for x in sorted(dt_ck_t5, key=lambda x: x['ngay']):
    print(f"  {x.get('ngay','?'):<12} +{fmt(x.get('so_tien',0)):>14}  DT: {(x.get('dien_giai','') or '')[:40]}")
for x in sorted(ck_vao_t5, key=lambda x: x['ngay']):
    print(f"  {x.get('ngay','?'):<12} +{fmt(x.get('so_tien',0)):>14}  CK: {(x.get('dien_giai','') or '')[:40]}")

credit_hsms_t5 = tong_dt_t5 + tong_ckvao_t5
print(f"\n  CREDIT: Sao kê={fmt(tong_credit_t5)} | HSMS={fmt(credit_hsms_t5)} | Chênh={fmt(tong_credit_t5 - credit_hsms_t5)}")

# ══════════════════════════════════════════════════════════════════
# E. DEBIT DETAIL T5: SAO KÊ vs HSMS
# ══════════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("E. DEBIT T5 — SAO KÊ (tiền RA tài khoản)")
print(sep)
debit_t5 = sorted([r for r in t5_rows if r['debit'] > 0], key=lambda x: x['ngay'])
print(f"  {'Ngày':<12} {'Số tiền':>15}  Nội dung / Đơn vị")
for r in debit_t5:
    print(f"  {r['ngay']:<12} -{fmt(r['debit']):>14}  {r['noi_dung'][:35]} | {r['don_vi'][:25]}")
print(f"  {'TỔNG':<12} -{fmt(tong_debit_t5):>14}")

print(f"\n  DEBIT T5 HSMS (CP CK):")
for x in sorted(cp_ck_t5, key=lambda x: x['ngay']):
    dg = (x.get('dien_giai','') or '')
    print(f"  {x.get('ngay','?'):<12} -{fmt(x.get('so_tien',0)):>14}  {dg[:50]}")
print(f"  {'TỔNG':<12} -{fmt(tong_cp_t5):>14}")

print(f"\n  DEBIT: Sao kê={fmt(tong_debit_t5)} | HSMS={fmt(tong_cp_t5)} | Chênh={fmt(tong_debit_t5 - tong_cp_t5)}")

# ══════════════════════════════════════════════════════════════════
# F. TÓM TẮT
# ══════════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("F. TÓM TẮT CHÊNH LỆCH")
print(sep)
print(f"  Số dư cuối T4: Sao kê={fmt(sodu_cuoi_t4_saoke)} | HSMS={fmt(sodu_mb_cuoi_t4_hsms)} | Chênh={fmt(sodu_mb_cuoi_t4_hsms - sodu_cuoi_t4_saoke)}")
print(f"  Credit T5    : Sao kê={fmt(tong_credit_t5)} | HSMS={fmt(credit_hsms_t5)} | Chênh={fmt(credit_hsms_t5 - tong_credit_t5)}")
print(f"  Debit  T5    : Sao kê={fmt(tong_debit_t5)} | HSMS={fmt(tong_cp_t5)} | Chênh={fmt(tong_cp_t5 - tong_debit_t5)}")
so_du_saoke_t5 = sodu_cuoi_t4_saoke + tong_credit_t5 - tong_debit_t5
so_du_hsms_t5  = sodu_mb_cuoi_t4_hsms + credit_hsms_t5 - tong_cp_t5
print(f"\n  Số dư cuối T5:")
print(f"    Sao kê: {fmt(so_du_saoke_t5)} (thực tế: 45.864.619)")
print(f"    HSMS  : {fmt(so_du_hsms_t5)} (view: 47.907.336)")
print(f"    Chênh : {fmt(so_du_hsms_t5 - so_du_saoke_t5)}")
print(f"\n{SEP}")
print("XONG")
print(SEP)
