"""
Đối chiếu T5 MB Bank vs HSMS — đọc đúng tên cột thực tế
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

SEP = "=" * 72
sep = "-" * 72

# ── Đọc Excel với tên cột thực tế ─────────────────────────────────────
df = pd.read_excel(SAO_KE, sheet_name=0, header=18, dtype=str)

COL_NGAY   = 'Ngày giao dịch\nTransaction Date'
COL_DEBIT  = 'Phát sinh nợ\nDebit'
COL_CREDIT = 'Phát sinh có\nCredit'
COL_NOIDUNG= 'Nội dung\nDetails'
COL_DONVI  = 'Đơn vị thụ hưởng/Đơn vị chuyển\nBeneficiary/Applicant'
COL_TK     = 'Tài khoản\nAccount'
COL_NH     = 'Ngân hàng đối tác\nRemitter Bank'

def parse_num(x):
    try:
        s = str(x).replace(',','').strip()
        if s in ('','nan','None','-'): return 0
        f = float(s)
        return int(round(f))
    except: return 0

def parse_date(x):
    try:
        s = str(x).strip()
        if '/' not in s: return None
        part = s.split(' ')[0]
        d, m, y = part.split('/')
        if len(y) == 2: y = '20' + y
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except: return None

rows = []
for _, row in df.iterrows():
    ngay = parse_date(row.get(COL_NGAY, ''))
    if not ngay: continue
    debit  = parse_num(row.get(COL_DEBIT, 0))
    credit = parse_num(row.get(COL_CREDIT, 0))
    if debit == 0 and credit == 0: continue
    rows.append({
        'ngay'    : ngay,
        'debit'   : debit,
        'credit'  : credit,
        'noi_dung': str(row.get(COL_NOIDUNG, '') or '').strip()[:80],
        'don_vi'  : str(row.get(COL_DONVI,   '') or '').strip()[:40],
        'tai_khoan': str(row.get(COL_TK,     '') or '').strip(),
        'ngan_hang': str(row.get(COL_NH,     '') or '').strip()[:30],
    })

print(SEP)
print("KIỂM TRA ĐỌC SAO KÊ")
print(sep)
print(f"  Tổng GD: {len(rows)}")
print(f"  Đầu: {rows[0]['ngay'] if rows else '?'}")
print(f"  Cuối: {rows[-1]['ngay'] if rows else '?'}")
tong_cr_all = sum(r['credit'] for r in rows)
tong_db_all = sum(r['debit']  for r in rows)
print(f"  Tổng credit: {fmt(tong_cr_all)}")
print(f"  Tổng debit : {fmt(tong_db_all)}")
print(f"  Số dư tính : {fmt(tong_cr_all - tong_db_all)}")
print(f"  Sao kê thực: 45.864.619")

# ── Lọc T5 và T4 ──────────────────────────────────────────────────────
t5 = [r for r in rows if r['ngay'].startswith('2026-05')]
t4 = [r for r in rows if r['ngay'].startswith('2026-04')]
before_t5 = [r for r in rows if r['ngay'] <= '2026-04-30']

sodu_dau_t5 = sum(r['credit'] - r['debit'] for r in before_t5)
tong_cr_t5  = sum(r['credit'] for r in t5)
tong_db_t5  = sum(r['debit']  for r in t5)

print(f"\n  Số dư cuối T4 (sao kê): {fmt(sodu_dau_t5)}")
print(f"  GD tháng 5: {len(t5)}")
print(f"  Credit T5 : {fmt(tong_cr_t5)}")
print(f"  Debit  T5 : {fmt(tong_db_t5)}")
print(f"  Net T5    : {fmt(tong_cr_t5 - tong_db_t5)}")
print(f"  Cuối T5   : {fmt(sodu_dau_t5 + tong_cr_t5 - tong_db_t5)}")

# ── HSMS T5 ───────────────────────────────────────────────────────────
dt_ck_t5   = fetch_all("doanh_thu", "hinh_thuc=eq.chuyen_khoan&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")
cp_ck_t5   = fetch_all("chi_phi",   "hinh_thuc_thanh_toan=eq.chuyen_khoan&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")
ck_vao_t5  = fetch_all("chuyen_khoan_noi_bo", f"den_vi_id=eq.{MB_ID}&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien,dien_giai&order=ngay")

tong_dt_t5    = sum(x.get('so_tien',0) or 0 for x in dt_ck_t5)
tong_cp_t5    = sum(x.get('so_tien',0) or 0 for x in cp_ck_t5)
tong_ckvao_t5 = sum(x.get('so_tien',0) or 0 for x in ck_vao_t5)
credit_hsms_t5 = tong_dt_t5 + tong_ckvao_t5

# Số dư cuối T4 theo HSMS
sodu_t4_hsms = (
    sum(x.get('so_tien',0) or 0 for x in fetch_all("doanh_thu","hinh_thuc=eq.chuyen_khoan&ngay=lte.2026-04-30&select=so_tien"))
    - sum(x.get('so_tien',0) or 0 for x in fetch_all("chi_phi","hinh_thuc_thanh_toan=eq.chuyen_khoan&ngay=lte.2026-04-30&select=so_tien"))
    + sum(x.get('so_tien',0) or 0 for x in fetch_all("chuyen_khoan_noi_bo",f"den_vi_id=eq.{MB_ID}&ngay=lte.2026-04-30&select=so_tien"))
    - sum(x.get('so_tien',0) or 0 for x in fetch_all("chuyen_khoan_noi_bo",f"tu_vi_id=eq.{MB_ID}&ngay=lte.2026-04-30&select=so_tien"))
)

print(f"\n{SEP}")
print("TÓM TẮT SO SÁNH THÁNG 5")
print(sep)
print(f"  {'':25} {'Sao kê MB':>15} {'HSMS':>15} {'Chênh':>14}")
print(f"  {'-'*67}")
print(f"  {'Số dư cuối T4':25} {fmt(sodu_dau_t5):>15} {fmt(sodu_t4_hsms):>15} {fmt(sodu_t4_hsms - sodu_dau_t5):>14}")
print(f"  {'+ Credit T5':25} {fmt(tong_cr_t5):>15} {fmt(credit_hsms_t5):>15} {fmt(credit_hsms_t5 - tong_cr_t5):>14}")
print(f"  {'- Debit T5':25} {fmt(tong_db_t5):>15} {fmt(tong_cp_t5):>15} {fmt(tong_cp_t5 - tong_db_t5):>14}")
print(f"  {'= Số dư cuối T5':25} {fmt(sodu_dau_t5+tong_cr_t5-tong_db_t5):>15} {fmt(sodu_t4_hsms+credit_hsms_t5-tong_cp_t5):>15} {fmt((sodu_t4_hsms+credit_hsms_t5-tong_cp_t5)-(sodu_dau_t5+tong_cr_t5-tong_db_t5)):>14}")

# ── CREDIT DETAIL ─────────────────────────────────────────────────────
print(f"\n{SEP}")
print("CREDIT T5 — SAO KÊ (tiền VÀO MB Bank)")
print(sep)
cr_t5 = sorted([r for r in t5 if r['credit'] > 0], key=lambda x: x['ngay'])
print(f"  {'Ngày':<12} {'Credit':>14}  Nội dung / Đơn vị")
print(f"  {'-'*68}")
for r in cr_t5:
    noidung = (r['noi_dung'][:30] + ' | ' + r['don_vi'][:20]).strip()
    print(f"  {r['ngay']:<12} {'+'+fmt(r['credit']):>14}  {noidung}")
print(f"  {'TỔNG':<12} {'+'+fmt(tong_cr_t5):>14}")

# ── DEBIT DETAIL ──────────────────────────────────────────────────────
print(f"\n{SEP}")
print("DEBIT T5 — SAO KÊ (tiền RA MB Bank)")
print(sep)
db_t5 = sorted([r for r in t5 if r['debit'] > 0], key=lambda x: x['ngay'])
print(f"  {'Ngày':<12} {'Debit':>14}  Nội dung / Đơn vị")
print(f"  {'-'*68}")
for r in db_t5:
    noidung = (r['noi_dung'][:30] + ' | ' + r['don_vi'][:20]).strip()
    print(f"  {r['ngay']:<12} {'-'+fmt(r['debit']):>14}  {noidung}")
print(f"  {'TỔNG':<12} {'-'+fmt(tong_db_t5):>14}")

print(f"\n{SEP}")
print("DEBIT T5 — HSMS (CP CK từ MB)")
print(sep)
print(f"  {'Ngày':<12} {'So tien':>14}  Diễn giải")
print(f"  {'-'*68}")
for x in cp_ck_t5:
    dg = (x.get('dien_giai') or '')[:50]
    print(f"  {x.get('ngay','?'):<12} {'-'+fmt(x.get('so_tien',0)):>14}  {dg}")
print(f"  {'TỔNG':<12} {'-'+fmt(tong_cp_t5):>14}")

# ── SO SÁNH TỪNG KHOẢN DEBIT ──────────────────────────────────────────
print(f"\n{SEP}")
print("ĐỐI CHIẾU DEBIT: SỮ LIỆU NÀO KHÁC?")
print(sep)
print(f"  Sao kê debit T5 : {fmt(tong_db_t5)}")
print(f"  HSMS  debit T5  : {fmt(tong_cp_t5)}")
print(f"  Chênh           : {fmt(tong_db_t5 - tong_cp_t5)} (+ = sao kê có thêm, - = HSMS có thêm)")

print(f"\n  ĐỐI CHIẾU CREDIT:")
print(f"  Sao kê credit T5: {fmt(tong_cr_t5)}")
print(f"  HSMS  credit T5 : {fmt(credit_hsms_t5)}")
print(f"  Chênh           : {fmt(tong_cr_t5 - credit_hsms_t5)} (+ = sao kê có thêm, - = HSMS có thêm)")

print(f"\n  => Nguồn gốc chênh lệch cuối T5 = chênh credit - chênh debit = {fmt((tong_cr_t5-credit_hsms_t5) - (tong_db_t5-tong_cp_t5))}")

print(f"\n{SEP}")
print("XONG")
print(SEP)
