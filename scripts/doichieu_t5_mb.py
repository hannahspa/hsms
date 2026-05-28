"""
Đối chiếu chi tiết T5/2026: Sao kê MB Bank vs HSMS
Tìm nguyên nhân chênh lệch 2,042,717đ
"""
import requests
import pandas as pd
from pathlib import Path

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
H = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}

MB_ID  = "6d69df42-9d5a-4f03-9370-a0b6e007e12d"
TM_ID  = "3cee1999-15a3-43a8-9b90-f92831641b83"
SAO_KE = Path(r"D:\Hannah Spa\Thu Chi\Sao Ke Khanh Duy.xlsx")

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".")
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

SEP = "=" * 65
sep = "-" * 65

# ══════════════════════════════════════════════════════════════
# A. ĐỌC SAO KÊ MB BANK — THÁNG 5
# ══════════════════════════════════════════════════════════════
print(SEP)
print("A. SAO KÊ MB BANK — THÁNG 5/2026")
print(sep)

xl = pd.ExcelFile(SAO_KE)
sheet = xl.sheet_names[0]
df_raw = pd.read_excel(SAO_KE, sheet_name=sheet, header=None)

# Header row 18 (index 17), data từ row 19 (index 18)
df = pd.read_excel(SAO_KE, sheet_name=sheet, header=17, dtype=str)
df.columns = [str(c).strip() for c in df.columns]

# Xác định cột từ vị trí (đã biết từ session trước)
cols = list(df.columns)
# col[4]=ngày, col[9]=debit (phát sinh nợ), col[10]=credit (phát sinh có), col[11]=nội dung
COL_NGAY  = cols[4]
COL_DEBIT = cols[9]
COL_CREDIT= cols[10]
COL_NOIDUNG = cols[11] if len(cols) > 11 else cols[-1]
COL_SODU  = cols[12] if len(cols) > 12 else None

print(f"Cột ngày    : [{COL_NGAY}]")
print(f"Cột debit   : [{COL_DEBIT}]")
print(f"Cột credit  : [{COL_CREDIT}]")
print(f"Cột nội dung: [{COL_NOIDUNG}]")

def parse_num(x):
    try:
        s = str(x).replace(',', '').replace(' ', '').strip()
        if s in ('', 'nan', 'None', '-'): return 0
        return int(float(s))
    except: return 0

# Parse ngày
def parse_date(x):
    try:
        s = str(x).strip()
        if '/' in s:
            parts = s.split('/')
            if len(parts) == 3:
                d, m, y = parts[0].strip(), parts[1].strip(), parts[2].strip()
                if len(y) == 2: y = '20' + y
                return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
        return None
    except: return None

rows = []
for _, row in df.iterrows():
    ngay = parse_date(row.get(COL_NGAY, ''))
    if not ngay: continue
    debit  = parse_num(row.get(COL_DEBIT, 0))
    credit = parse_num(row.get(COL_CREDIT, 0))
    noidung = str(row.get(COL_NOIDUNG, '')).strip()
    sodu = parse_num(row.get(COL_SODU, 0)) if COL_SODU else 0
    rows.append({'ngay': ngay, 'debit': debit, 'credit': credit, 'noidung': noidung, 'sodu': sodu})

# Lọc T5
t5 = [r for r in rows if r['ngay'] and r['ngay'].startswith('2026-05')]
t4_end = [r for r in rows if r['ngay'] and r['ngay'].startswith('2026-04')]

tong_debit_t5  = sum(r['debit']  for r in t5)
tong_credit_t5 = sum(r['credit'] for r in t5)

# Số dư cuối T4 = đầu T5
sodu_dau_t5 = t4_end[-1]['sodu'] if t4_end else 0
sodu_cuoi_t5 = t5[-1]['sodu'] if t5 else 0

print(f"\nSao kê T5/2026:")
print(f"  Số dư đầu T5 (cuối T4)  : {fmt(sodu_dau_t5)}")
print(f"  Tổng credit (vào)        : {fmt(tong_credit_t5)}")
print(f"  Tổng debit  (ra)         : {fmt(tong_debit_t5)}")
print(f"  Net T5                   : {fmt(tong_credit_t5 - tong_debit_t5)}")
print(f"  Số dư cuối T5            : {fmt(sodu_cuoi_t5)}")
print(f"  Tính lại cuối T5         : {fmt(sodu_dau_t5 + tong_credit_t5 - tong_debit_t5)}")

# ══════════════════════════════════════════════════════════════
# B. HSMS — THÁNG 5
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("B. HSMS — THÁNG 5/2026 (MB Bank)")
print(sep)

# DT CK T5 (credit: KH chuyển khoản vào)
dt_ck_t5 = fetch_all("doanh_thu", "hinh_thuc=eq.chuyen_khoan&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")
tong_dt_ck_t5 = sum(x.get('so_tien', 0) or 0 for x in dt_ck_t5)

# CP CK T5 (debit: chi từ MB)
cp_ck_t5 = fetch_all("chi_phi", f"hinh_thuc_thanh_toan=eq.chuyen_khoan&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")
tong_cp_ck_t5 = sum(x.get('so_tien', 0) or 0 for x in cp_ck_t5)

# CK nội bộ TM→MB T5 (credit: nộp tiền vào NH)
ck_vao_t5 = fetch_all("chuyen_khoan_noi_bo", f"den_vi_id=eq.{MB_ID}&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")
tong_ck_vao_t5 = sum(x.get('so_tien', 0) or 0 for x in ck_vao_t5)

# CK nội bộ MB→... T5 (debit: rút từ NH)
ck_ra_t5 = fetch_all("chuyen_khoan_noi_bo", f"tu_vi_id=eq.{MB_ID}&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")
tong_ck_ra_t5 = sum(x.get('so_tien', 0) or 0 for x in ck_ra_t5)

print(f"  Credit HSMS T5:")
print(f"    DT CK (KH chuyển vào) : {fmt(tong_dt_ck_t5)}  ({len(dt_ck_t5)} records)")
print(f"    CK TM→MB (nộp NH)     : {fmt(tong_ck_vao_t5)}  ({len(ck_vao_t5)} records)")
print(f"    TỔNG CREDIT            : {fmt(tong_dt_ck_t5 + tong_ck_vao_t5)}")
print(f"\n  Debit HSMS T5:")
print(f"    CP CK (chi từ MB)     : {fmt(tong_cp_ck_t5)}  ({len(cp_ck_t5)} records)")
print(f"    CK MB→... (rút NH)    : {fmt(tong_ck_ra_t5)}  ({len(ck_ra_t5)} records)")
print(f"    TỔNG DEBIT             : {fmt(tong_cp_ck_t5 + tong_ck_ra_t5)}")
print(f"\n  NET T5 (HSMS)           : {fmt(tong_dt_ck_t5 + tong_ck_vao_t5 - tong_cp_ck_t5 - tong_ck_ra_t5)}")

# ══════════════════════════════════════════════════════════════
# C. SO SÁNH CREDIT T5: SAO KÊ vs HSMS
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("C. SO SÁNH T5: SAO KÊ vs HSMS")
print(sep)

credit_hsms = tong_dt_ck_t5 + tong_ck_vao_t5
debit_hsms  = tong_cp_ck_t5 + tong_ck_ra_t5

print(f"  CREDIT  — Sao kê: {fmt(tong_credit_t5):>15} | HSMS: {fmt(credit_hsms):>15} | Chênh: {fmt(tong_credit_t5 - credit_hsms)}")
print(f"  DEBIT   — Sao kê: {fmt(tong_debit_t5):>15} | HSMS: {fmt(debit_hsms):>15} | Chênh: {fmt(tong_debit_t5 - debit_hsms)}")
print(f"  NET     — Sao kê: {fmt(tong_credit_t5 - tong_debit_t5):>15} | HSMS: {fmt(credit_hsms - debit_hsms):>15} | Chênh: {fmt((tong_credit_t5 - tong_debit_t5) - (credit_hsms - debit_hsms))}")

print(f"\n  Số dư đầu T5 theo HSMS (cuối T4):")
# Tính số dư MB cuối T4
dt_ck_t4end = fetch_all("doanh_thu", "hinh_thuc=eq.chuyen_khoan&ngay=lte.2026-04-30&select=so_tien")
cp_ck_t4end = fetch_all("chi_phi", "hinh_thuc_thanh_toan=eq.chuyen_khoan&ngay=lte.2026-04-30&select=so_tien")
ck_vao_t4end = fetch_all("chuyen_khoan_noi_bo", f"den_vi_id=eq.{MB_ID}&ngay=lte.2026-04-30&select=so_tien")
ck_ra_t4end = fetch_all("chuyen_khoan_noi_bo", f"tu_vi_id=eq.{MB_ID}&ngay=lte.2026-04-30&select=so_tien")
sodu_mb_cuoi_t4_hsms = (
    sum(x.get('so_tien',0) or 0 for x in dt_ck_t4end)
    - sum(x.get('so_tien',0) or 0 for x in cp_ck_t4end)
    + sum(x.get('so_tien',0) or 0 for x in ck_vao_t4end)
    - sum(x.get('so_tien',0) or 0 for x in ck_ra_t4end)
)
print(f"    HSMS cuối T4: {fmt(sodu_mb_cuoi_t4_hsms)}")
print(f"    Sao kê cuối T4: {fmt(sodu_dau_t5)}")
print(f"    Chênh cuối T4: {fmt(sodu_mb_cuoi_t4_hsms - sodu_dau_t5)}")

# ══════════════════════════════════════════════════════════════
# D. CREDIT DETAIL: Khoản nào trong sao kê T5 không có trong HSMS?
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("D. CREDIT SAO KÊ T5 — TỪNG GIAO DỊCH")
print(sep)

credit_t5_rows = [r for r in t5 if r['credit'] > 0]
print(f"  Tổng credit T5: {len(credit_t5_rows)} giao dịch | {fmt(tong_credit_t5)}")
print(f"\n  Chi tiết credit (tiền vào MB):")
for r in credit_t5_rows:
    print(f"  {r['ngay']} | +{fmt(r['credit']):>15} | {r['noidung'][:60]}")

# ══════════════════════════════════════════════════════════════
# E. DEBIT DETAIL: Khoản nào trong sao kê T5 không có trong HSMS?
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("E. DEBIT SAO KÊ T5 — TỪNG GIAO DỊCH")
print(sep)

debit_t5_rows = [r for r in t5 if r['debit'] > 0]
print(f"  Tổng debit T5: {len(debit_t5_rows)} giao dịch | {fmt(tong_debit_t5)}")
print(f"\n  Chi tiết debit (tiền ra MB):")
for r in debit_t5_rows:
    print(f"  {r['ngay']} | -{fmt(r['debit']):>15} | {r['noidung'][:60]}")

print(f"\n{SEP}")
print(f"CREDIT HSMS T5 theo ngay:")
for x in dt_ck_t5:
    print(f"  DT {x.get('ngay')} | +{fmt(x.get('so_tien')):>12} | {x.get('dien_giai','?')[:50]}")
for x in ck_vao_t5:
    print(f"  CK {x.get('ngay')} | +{fmt(x.get('so_tien')):>12} | {x.get('dien_giai','?')[:50]}")

print(f"\nDEBIT HSMS T5 theo ngay:")
for x in cp_ck_t5:
    print(f"  CP {x.get('ngay')} | -{fmt(x.get('so_tien')):>12} | {x.get('dien_giai','?')[:50]}")

print(f"\n{SEP}")
print("XONG ĐỐI CHIẾU T5")
print(SEP)
