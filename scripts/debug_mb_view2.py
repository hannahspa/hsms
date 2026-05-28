"""
Debug MB Bank - Phan 2: Raw view columns + CK bat thuong + dinh nghia view
"""
import requests
import json

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"

H = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

MB_ID = "6d69df42-9d5a-4f03-9370-a0b6e007e12d"
TM_ID = "3cee1999-15a3-43a8-9b90-f92831641b83"
TP_ID = "8db03ac2-e092-40b0-8f0c-abda1f1993e1"

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".")
    except: return str(n)

SEP = "=" * 60
sep = "-" * 60

# 1. Raw JSON cua view
print(SEP)
print("1. RAW JSON VIEW so_du_vi_thuc_te")
print(sep)
r = requests.get(f"{SUPABASE_URL}/rest/v1/so_du_vi_thuc_te?select=*", headers=H, timeout=15)
data = r.json()
if data:
    print("Keys co trong view:", list(data[0].keys()))
    for row in data:
        print(json.dumps(row, ensure_ascii=False, indent=2))

# 2. Record CK bat thuong (tu MB den MB)
print(f"\n{SEP}")
print("2. RECORD CK BAT THUONG: tu_vi_id=MB va den_vi_id=MB")
print(sep)
r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/chuyen_khoan_noi_bo?tu_vi_id=eq.{MB_ID}&den_vi_id=eq.{MB_ID}&select=*",
    headers=H, timeout=10
)
data2 = r2.json()
print(f"  So records: {len(data2)}")
for row in data2:
    print(json.dumps(row, ensure_ascii=False, indent=2))

# 3. TẤT CA CK noi bo - xem logic
print(f"\n{SEP}")
print("3. TẤT CA CK NOI BO (max 20 rows)")
print(sep)
r3 = requests.get(
    f"{SUPABASE_URL}/rest/v1/chuyen_khoan_noi_bo?select=*&order=ngay&limit=20",
    headers=H, timeout=10
)
data3 = r3.json()
print(f"  (lay 20 records dau)")
for row in data3:
    print(f"  {row.get('ngay')} | tu={row.get('tu_vi_id','?')[:8]} | den={row.get('den_vi_id','?')[:8]} | {fmt(row.get('so_tien'))} | {row.get('dien_giai','?')[:40]}")

# 4. Dem tong so CK noi bo
r4 = requests.get(
    f"{SUPABASE_URL}/rest/v1/chuyen_khoan_noi_bo?select=id",
    headers={**H, "Prefer": "count=exact"}, timeout=10
)
count_ck = int(r4.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r4.headers else "?"
print(f"\n  TONG CK noi bo trong DB: {count_ck}")

# 5. Tat ca CK lien quan MB (ca vao lan ra)
print(f"\n{SEP}")
print("5. TẤT CA CK LIEN QUAN MB - chi tiet")
print(sep)

def fetch_all(table, params=""):
    result = []
    limit = 1000
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?{params}&limit={limit}&offset={offset}"
        r = requests.get(url, headers=H, timeout=30)
        data = r.json() if r.status_code in [200, 206] else []
        if not data:
            break
        result.extend(data)
        if len(data) < limit:
            break
        offset += limit
    return result

ck_vao = fetch_all("chuyen_khoan_noi_bo", f"den_vi_id=eq.{MB_ID}&select=id,ngay,so_tien,tu_vi_id,dien_giai&order=ngay")
ck_ra = fetch_all("chuyen_khoan_noi_bo", f"tu_vi_id=eq.{MB_ID}&select=id,ngay,so_tien,den_vi_id,dien_giai&order=ngay")

# Map vi_id sang ten
VI_NAMES = {MB_ID: "MB", TM_ID: "TM", TP_ID: "TP"}

print(f"CK VAO MB ({len(ck_vao)} records):")
tong_vao = sum(x.get('so_tien',0) or 0 for x in ck_vao)
for x in ck_vao[-10:]:  # 10 records cuoi
    tu = VI_NAMES.get(x.get('tu_vi_id','?'), x.get('tu_vi_id','?')[:8])
    print(f"  {x.get('ngay')} | TU={tu} | {fmt(x.get('so_tien'))} | {x.get('dien_giai','?')[:40]}")
print(f"  TONG: {fmt(tong_vao)}")

print(f"\nCK RA MB ({len(ck_ra)} records):")
tong_ra = sum(x.get('so_tien',0) or 0 for x in ck_ra)
for x in ck_ra:  # chi co 1 record
    den = VI_NAMES.get(x.get('den_vi_id','?'), x.get('den_vi_id','?')[:8])
    print(f"  {x.get('ngay')} | DEN={den} | {fmt(x.get('so_tien'))} | {x.get('dien_giai','?')[:40]}")
    print(f"  FULL ROW: {json.dumps(x, ensure_ascii=False)}")
print(f"  TONG: {fmt(tong_ra)}")

# 6. So sanh view vs tinh tay
print(f"\n{SEP}")
print("6. SO SANH VIEW vs TINH TAY chi MB")
print(sep)

# lay so_du_dau tu vi table
vi_all = requests.get(f"{SUPABASE_URL}/rest/v1/vi?select=*&order=thu_tu", headers=H).json()
print("VI TABLE:")
for v in vi_all:
    print(f"  {v.get('ten','?'):<12} | so_du_dau={fmt(v.get('so_du_dau',0))} | id={v.get('id','?')[:8]}...")

# Lay doanh_thu quet_the -> TP Bank (KHONG phai MB)
dt_qt = fetch_all("doanh_thu", "hinh_thuc=eq.quet_the&select=so_tien")
tong_dt_qt = sum(x.get('so_tien',0) or 0 for x in dt_qt)

dt_ck = fetch_all("doanh_thu", "hinh_thuc=eq.chuyen_khoan&select=so_tien")
tong_dt_ck = sum(x.get('so_tien',0) or 0 for x in dt_ck)

dt_tm = fetch_all("doanh_thu", "hinh_thuc=eq.tien_mat&select=so_tien")
tong_dt_tm = sum(x.get('so_tien',0) or 0 for x in dt_tm)

dt_ttp = fetch_all("doanh_thu", "hinh_thuc=eq.the_tra_truoc&select=so_tien")
tong_dt_ttp = sum(x.get('so_tien',0) or 0 for x in dt_ttp)

cp_mb = fetch_all("chi_phi", f"vi_id=eq.{MB_ID}&select=so_tien")
tong_cp_mb = sum(x.get('so_tien',0) or 0 for x in cp_mb)

cp_tm = fetch_all("chi_phi", f"vi_id=eq.{TM_ID}&select=so_tien")
tong_cp_tm = sum(x.get('so_tien',0) or 0 for x in cp_tm)

cp_tp = fetch_all("chi_phi", f"vi_id=eq.{TP_ID}&select=so_tien")
tong_cp_tp = sum(x.get('so_tien',0) or 0 for x in cp_tp)

print(f"\nDOANH THU:")
print(f"  TM   : {fmt(tong_dt_tm)}")
print(f"  CK   : {fmt(tong_dt_ck)}")
print(f"  QT   : {fmt(tong_dt_qt)}")
print(f"  TTP  : {fmt(tong_dt_ttp)}")

print(f"\nCHI PHI theo vi_id:")
print(f"  TM   : {fmt(tong_cp_tm)}")
print(f"  MB   : {fmt(tong_cp_mb)}")
print(f"  TP   : {fmt(tong_cp_tp)}")

vi_mb_data = next((v for v in vi_all if v['id'] == MB_ID), {})
sd_dau_mb = vi_mb_data.get('so_du_dau', 0) or 0

print(f"\nMB BANK TINH TAY:")
print(f"  so_du_dau   = {fmt(sd_dau_mb)}")
print(f"  + thu CK    = {fmt(tong_dt_ck)}")
print(f"  - chi MB    = {fmt(tong_cp_mb)}")
print(f"  + CK vao    = {fmt(tong_vao)}")
print(f"  - CK ra     = {fmt(tong_ra)}")
tong_mb = sd_dau_mb + tong_dt_ck - tong_cp_mb + tong_vao - tong_ra
print(f"  = TONG      = {fmt(tong_mb)}")
print(f"  View        = 63.358.021")
print(f"  Thuc te     = 45.864.619")
print(f"  Chenh (tinh tay - thuc te) = {fmt(tong_mb - 45864619)}")

print(f"\n{SEP}")
print("XONG")
print(SEP)
