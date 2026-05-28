"""
HSMS Database Audit Part 2 — Chi tiết các vấn đề phát hiện
"""
import requests

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

def get(table, params=""):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}?{params}",
        headers=HEADERS, timeout=30
    )
    count = int(r.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r.headers else None
    return r.json() if r.status_code == 200 else [], count

def fmt(n):
    if n is None: return "N/A"
    try: return f"{int(n):,}d".replace(",",".")
    except: return str(n)

SEP = "=" * 60
sep = "-" * 60

# ══════════════════════════════════════════════════════════════
# A. Chi phí không có vi_id
# ══════════════════════════════════════════════════════════════
print(SEP)
print("A. CHI PHI KHONG CO VI_ID")
print(sep)
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/chi_phi?select=id,ngay,so_tien,dien_giai,hinh_thuc_thanh_toan&vi_id=is.null&order=ngay",
    headers={**HEADERS, "Prefer": "count=exact"}, timeout=30
)
data = r.json() if r.status_code == 200 else []
count = int(r.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r.headers else "?"
print(f"  So records: {count}")
for row in data[:10]:
    print(f"  {row.get('ngay','?')} | {fmt(row.get('so_tien'))} | {row.get('hinh_thuc_thanh_toan','?')} | {(row.get('dien_giai','?') or '')[:40]}")
if len(data) > 10:
    print(f"  ... va {len(data)-10} records khac")

# ══════════════════════════════════════════════════════════════
# B. Chi phí có hinh_thuc sai
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("B. CHI PHI CO HINH_THUC SAI")
print(sep)
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/chi_phi?select=id,ngay,so_tien,hinh_thuc_thanh_toan,dien_giai&order=ngay",
    headers={**HEADERS, "Prefer": "count=exact"}, timeout=60
)
all_cp = r.json() if r.status_code == 200 else []
valid_ht = {'tien_mat','chuyen_khoan','quet_the', None}
invalid = [x for x in all_cp if x.get('hinh_thuc_thanh_toan') not in valid_ht]
print(f"  So records sai: {len(invalid)}")
for row in invalid:
    print(f"  {row.get('ngay','?')} | '{row.get('hinh_thuc_thanh_toan','?')}' | {fmt(row.get('so_tien'))} | {(row.get('dien_giai','?') or '')[:40]}")

# NULL hinh_thuc
null_ht = [x for x in all_cp if x.get('hinh_thuc_thanh_toan') is None]
print(f"  hinh_thuc = NULL: {len(null_ht)} records")
for row in null_ht[:5]:
    print(f"    {row.get('ngay','?')} | {fmt(row.get('so_tien'))} | {(row.get('dien_giai','?') or '')[:40]}")

# ══════════════════════════════════════════════════════════════
# C. Tien mat am — phan tich nguyen nhan
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("C. TIEN MAT AM (-130.000d) — PHAN TICH")
print(sep)
# Lay vi tien mat
vi_r = requests.get(
    f"{SUPABASE_URL}/rest/v1/vi?select=*&loai=eq.tien_mat",
    headers=HEADERS, timeout=10
)
vi_data = vi_r.json()
if vi_data:
    vi_tm = vi_data[0]
    vi_id = vi_tm['id']
    print(f"  Vi Tien Mat ID: {vi_id}")
    print(f"  so_du_dau     : {fmt(vi_tm.get('so_du_dau',0))}")

    # Chi tien mat
    r_dt_tm = requests.get(
        f"{SUPABASE_URL}/rest/v1/doanh_thu?select=so_tien&hinh_thuc=eq.tien_mat",
        headers={**HEADERS,"Prefer":"count=exact"}, timeout=30
    )
    dt_tm = r_dt_tm.json() or []
    tong_thu_tm = sum(x.get('so_tien',0) or 0 for x in dt_tm)

    r_cp_tm = requests.get(
        f"{SUPABASE_URL}/rest/v1/chi_phi?select=so_tien&hinh_thuc_thanh_toan=eq.tien_mat",
        headers={**HEADERS,"Prefer":"count=exact"}, timeout=30
    )
    cp_tm = r_cp_tm.json() or []
    tong_chi_tm = sum(x.get('so_tien',0) or 0 for x in cp_tm)

    # CK tu tien mat
    r_ck_di = requests.get(
        f"{SUPABASE_URL}/rest/v1/chuyen_khoan_noi_bo?select=so_tien&tu_vi_id=eq.{vi_id}",
        headers={**HEADERS,"Prefer":"count=exact"}, timeout=30
    )
    ck_di = sum(x.get('so_tien',0) or 0 for x in (r_ck_di.json() or []))

    r_ck_den = requests.get(
        f"{SUPABASE_URL}/rest/v1/chuyen_khoan_noi_bo?select=so_tien&den_vi_id=eq.{vi_id}",
        headers={**HEADERS,"Prefer":"count=exact"}, timeout=30
    )
    ck_den = sum(x.get('so_tien',0) or 0 for x in (r_ck_den.json() or []))

    sd_dau = vi_tm.get('so_du_dau', 0) or 0
    sd_cuoi = sd_dau + tong_thu_tm - tong_chi_tm - ck_di + ck_den
    print(f"  so_du_dau     : {fmt(sd_dau)}")
    print(f"  + Thu TM      : {fmt(tong_thu_tm)} ({len(dt_tm)} records)")
    print(f"  - Chi TM      : {fmt(tong_chi_tm)} ({len(cp_tm)} records)")
    print(f"  - CK di       : {fmt(ck_di)}")
    print(f"  + CK den      : {fmt(ck_den)}")
    print(f"  = So du cuoi  : {fmt(sd_cuoi)}")
    print(f"  (View shows: -130.000d)")
    print(f"  => Chi TM vuot qua Thu TM + CK den - CK di")

# ══════════════════════════════════════════════════════════════
# D. Kho hang — kiem tra don gian
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("D. KHO HANG")
print(sep)
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/kho_san_pham?select=id,ten,ton_kho,is_active&limit=5",
    headers={**HEADERS, "Prefer": "count=exact"}, timeout=30
)
count = int(r.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r.headers else "?"
data = r.json() if r.status_code == 200 else []
print(f"  Ket qua query kho_san_pham: count={count}, status={r.status_code}")
print(f"  Data sample: {data[:2]}")

# Try san_pham
r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/san_pham?select=id&limit=1",
    headers=HEADERS, timeout=10
)
print(f"  Query 'san_pham': status={r2.status_code}, body={r2.text[:100]}")

# ══════════════════════════════════════════════════════════════
# E. Don hang POS
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("E. DON HANG POS")
print(sep)
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=id,created_at,trang_thai,thanh_tien&limit=5&order=created_at.desc",
    headers={**HEADERS, "Prefer": "count=exact"}, timeout=30
)
count = int(r.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r.headers else "?"
data = r.json() if r.status_code == 200 else []
print(f"  status={r.status_code}, count={count}")
for row in data[:5]:
    print(f"  {row.get('created_at','?')[:10]} | {row.get('trang_thai','?')} | {fmt(row.get('thanh_tien'))}")

# don_hang_chi_tiet
r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet?select=id&limit=1",
    headers={**HEADERS, "Prefer": "count=exact"}, timeout=30
)
count2 = int(r2.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r2.headers else "?"
print(f"  don_hang_chi_tiet: count={count2}")

# ══════════════════════════════════════════════════════════════
# F. Data 01/05 - 26/05 da co san
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("F. DATA 01/05 - 26/05/2026 (DA CO TRONG DB)")
print(sep)
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/doanh_thu?select=ngay,so_tien,hinh_thuc&ngay=gte.2026-05-01&ngay=lte.2026-05-26&order=ngay",
    headers={**HEADERS,"Prefer":"count=exact"}, timeout=30
)
dt_may = r.json() or []
count_may = int(r.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r.headers else "?"
print(f"  Doanh Thu 01-26/05: {count_may} records")

# Group by day
by_day = {}
for x in dt_may:
    d = x.get('ngay','?')
    by_day[d] = by_day.get(d, 0) + (x.get('so_tien',0) or 0)
print(f"  So ngay co DT: {len(by_day)}")
for d in sorted(by_day)[:5]:
    print(f"    {d}: {fmt(by_day[d])}")
if len(by_day) > 5:
    print(f"    ...")
for d in sorted(by_day)[-3:]:
    print(f"    {d}: {fmt(by_day[d])}")

r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/chi_phi?select=ngay,so_tien&ngay=gte.2026-05-01&ngay=lte.2026-05-26&order=ngay",
    headers={**HEADERS,"Prefer":"count=exact"}, timeout=30
)
cp_may = r2.json() or []
count_cp_may = int(r2.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r2.headers else "?"
print(f"  Chi Phi 01-26/05: {count_cp_may} records")
tong_may_dt = sum(x.get('so_tien',0) or 0 for x in dt_may if x.get('hinh_thuc') != 'the_tra_truoc')
tong_may_cp = sum(x.get('so_tien',0) or 0 for x in cp_may)
print(f"  Tong thuc thu T5 : {fmt(tong_may_dt)}")
print(f"  Tong chi phi T5  : {fmt(tong_may_cp)}")

# ══════════════════════════════════════════════════════════════
# G. Profiles / Auth users
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("G. PROFILES (AUTH USERS)")
print(sep)
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/profiles?select=ho_ten,email,vai_tro,trang_thai",
    headers=HEADERS, timeout=10
)
profiles = r.json() if r.status_code == 200 else []
print(f"  Tong profiles: {len(profiles)}")
for p in profiles:
    print(f"  - {p.get('ho_ten','?'):<25} | {p.get('vai_tro','?'):<10} | {p.get('email','?')}")

print(f"\n{SEP}")
print("XONG AUDIT PART 2")
print(SEP)
