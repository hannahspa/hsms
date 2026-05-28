"""
Fix 2 records chi_phi co hinh_thuc=NULL nhung vi_id=MB Bank
Phai set hinh_thuc='chuyen_khoan' de view tinh dung chi_ra
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

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".")
    except: return str(n)

SEP = "=" * 60
sep = "-" * 60

# 1. Lay 2 records NULL
print(SEP)
print("1. 2 RECORDS CP NULL HIEN TAI")
print(sep)
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/chi_phi?hinh_thuc_thanh_toan=is.null&vi_id=eq.{MB_ID}&select=id,ngay,so_tien,dien_giai,hinh_thuc_thanh_toan",
    headers=H, timeout=10
)
records = r.json()
print(f"  So records tim thay: {len(records)}")
for row in records:
    print(f"  ID: {row['id']}")
    print(f"  ngay: {row.get('ngay')} | so_tien: {fmt(row.get('so_tien'))} | hinh_thuc: {row.get('hinh_thuc_thanh_toan')}")
    print(f"  dien_giai: {row.get('dien_giai')}")
    print()

# 2. Fix: set hinh_thuc='chuyen_khoan' cho tat ca CP NULL voi vi_id=MB
print(SEP)
print("2. FIX: SET hinh_thuc='chuyen_khoan' cho 2 records nay")
print(sep)

r_fix = requests.patch(
    f"{SUPABASE_URL}/rest/v1/chi_phi?hinh_thuc_thanh_toan=is.null&vi_id=eq.{MB_ID}",
    headers={**H, "Prefer": "return=representation"},
    json={"hinh_thuc_thanh_toan": "chuyen_khoan"},
    timeout=10
)

print(f"  PATCH status: {r_fix.status_code}")
if r_fix.status_code in [200, 204]:
    print(f"  FIX THANH CONG!")
    if r_fix.text:
        updated = r_fix.json()
        print(f"  Da cap nhat {len(updated)} records:")
        for row in updated:
            print(f"    {row.get('ngay')} | {fmt(row.get('so_tien'))} | hinh_thuc = {row.get('hinh_thuc_thanh_toan')} | {row.get('dien_giai','?')[:50]}")
else:
    print(f"  LOI: {r_fix.text[:500]}")

# 3. Kiem tra lai: dam bao khong con NULL
print(f"\n{SEP}")
print("3. KIEM TRA LAI: CP NULL voi vi_id=MB")
print(sep)
r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/chi_phi?hinh_thuc_thanh_toan=is.null&vi_id=eq.{MB_ID}&select=id",
    headers={**H, "Prefer": "count=exact"}, timeout=10
)
count = int(r2.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r2.headers else "?"
print(f"  Records con NULL (vi_id=MB): {count}")
if count == 0:
    print(f"  SACH! Khong con records NULL")
else:
    print(f"  CON {count} records chua fix!")

# 4. Kiem tra tong the
print(f"\n{SEP}")
print("4. KIEM TRA TONG THE: CP NULL (bat ky vi nao)")
print(sep)
r3 = requests.get(
    f"{SUPABASE_URL}/rest/v1/chi_phi?hinh_thuc_thanh_toan=is.null&select=id,ngay,so_tien,vi_id,dien_giai",
    headers={**H, "Prefer": "count=exact"}, timeout=10
)
count2 = int(r3.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in r3.headers else "?"
data2 = r3.json() or []
print(f"  Tong CP NULL (bat ky vi): {count2} records")
for row in data2:
    print(f"  {row.get('ngay')} | vi={row.get('vi_id','?')[:8]}... | {fmt(row.get('so_tien'))} | {row.get('dien_giai','?')[:50]}")

# 5. Xem so du vi sau khi fix
print(f"\n{SEP}")
print("5. SO DU VI THUC TE SAU KHI FIX")
print(sep)
r4 = requests.get(f"{SUPABASE_URL}/rest/v1/so_du_vi_thuc_te?select=*", headers=H, timeout=10)
vi_data = r4.json() or []
tong = 0
for v in vi_data:
    sd = v.get('so_du_hien_tai', 0) or 0
    tong += sd
    print(f"  {v.get('ten','?'):<12}: {fmt(sd)}")
print(f"  {'TONG':<12}: {fmt(tong)}")
print(f"\n  MB Bank thuc te (sao ke): 45.864.619")
print(f"  MB Bank HSMS sau fix    : {fmt(next((v.get('so_du_hien_tai',0) for v in vi_data if v.get('ten')=='MB Bank'), 0))}")
print(f"  Chenh con lai           : {fmt(abs(next((v.get('so_du_hien_tai',0) for v in vi_data if v.get('ten')=='MB Bank'), 0) - 45864619))}")

print(f"\n{SEP}")
print("XONG FIX")
print(SEP)
