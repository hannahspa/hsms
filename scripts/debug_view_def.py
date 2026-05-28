"""
Lay dinh nghia SQL cua view so_du_vi_thuc_te
va tim nguyen nhan chenh lech 16.7M
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

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".")
    except: return str(n)

SEP = "=" * 60
sep = "-" * 60

# 1. Lay view definition tu pg_views
print(SEP)
print("1. VIEW DEFINITION tu pg_views")
print(sep)
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/pg_views?viewname=eq.so_du_vi_thuc_te&schemaname=eq.public&select=definition",
    headers=H, timeout=10
)
print(f"Status: {r.status_code}")
print(r.text[:3000])

# 2. Thu query information_schema
print(f"\n{SEP}")
print("2. information_schema.views")
print(sep)
r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/information_schema.views?table_name=eq.so_du_vi_thuc_te&select=view_definition",
    headers=H, timeout=10
)
print(f"Status: {r2.status_code}")
print(r2.text[:2000])

# 3. Tim nguyen nhan 16.7M - chi tiet chi_phi theo thang
print(f"\n{SEP}")
print("3. CHI PHI THEO THANG (MB Bank)")
print(sep)
MB_ID = "6d69df42-9d5a-4f03-9370-a0b6e007e12d"

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

# Chi tiet chi_phi MB theo thang
cp_mb = fetch_all("chi_phi", f"vi_id=eq.{MB_ID}&select=ngay,so_tien,dien_giai&order=ngay")
by_month = {}
for x in cp_mb:
    ngay = x.get('ngay','?')
    ym = ngay[:7] if ngay != '?' else '?'
    by_month[ym] = by_month.get(ym, 0) + (x.get('so_tien', 0) or 0)
print("CP MB theo thang:")
for ym in sorted(by_month):
    print(f"  {ym}: {fmt(by_month[ym])}")
print(f"  TONG: {fmt(sum(by_month.values()))}")

# DT CK theo thang
dt_ck = fetch_all("doanh_thu", "hinh_thuc=eq.chuyen_khoan&select=ngay,so_tien&order=ngay")
dt_by_month = {}
for x in dt_ck:
    ngay = x.get('ngay','?')
    ym = ngay[:7] if ngay != '?' else '?'
    dt_by_month[ym] = dt_by_month.get(ym, 0) + (x.get('so_tien', 0) or 0)
print("\nDT CK theo thang:")
for ym in sorted(dt_by_month):
    print(f"  {ym}: {fmt(dt_by_month[ym])}")
print(f"  TONG: {fmt(sum(dt_by_month.values()))}")

# 4. Tim 804k chenh lech giua tinh tay (46.7M) va thuc te (45.9M)
print(f"\n{SEP}")
print("4. TIM NGUYEN NHAN 804k CHENH LECH")
print(sep)

# Tong thu CK T5 tu sao ke (file Excel da phan tich)
# Tong chi TM+CK+QT cac thang - se so sanh chi tiet T5
dt_t5 = fetch_all("doanh_thu", "ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,hinh_thuc,so_tien&order=ngay")
print("DT T5/2026 theo hinh thuc:")
ht_totals = {}
for x in dt_t5:
    ht = x.get('hinh_thuc','?')
    ht_totals[ht] = ht_totals.get(ht, 0) + (x.get('so_tien',0) or 0)
for ht, v in sorted(ht_totals.items()):
    print(f"  {ht}: {fmt(v)}")
print(f"  TONG DT T5 (tru TTP): {fmt(sum(v for k,v in ht_totals.items() if k!='the_tra_truoc'))}")

cp_t5 = fetch_all("chi_phi", f"ngay=gte.2026-05-01&ngay=lte.2026-05-26&vi_id=eq.{MB_ID}&select=ngay,so_tien,dien_giai&order=ngay")
tong_cp_t5_mb = sum(x.get('so_tien',0) or 0 for x in cp_t5)
print(f"\nCP T5 MB: {len(cp_t5)} records | tong = {fmt(tong_cp_t5_mb)}")
for x in cp_t5[-10:]:
    print(f"  {x.get('ngay')} | {fmt(x.get('so_tien'))} | {x.get('dien_giai','?')[:50]}")

# CK vao MB T5
ck_t5 = fetch_all("chuyen_khoan_noi_bo", f"den_vi_id=eq.{MB_ID}&ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,so_tien&order=ngay")
tong_ck_t5 = sum(x.get('so_tien',0) or 0 for x in ck_t5)
print(f"\nCK vao MB T5: {len(ck_t5)} records | tong = {fmt(tong_ck_t5)}")

print(f"\nMB T5 tinh tay:")
print(f"  + DT CK    = {fmt(ht_totals.get('chuyen_khoan', 0))}")
print(f"  - CP MB    = {fmt(tong_cp_t5_mb)}")
print(f"  + CK vao   = {fmt(tong_ck_t5)}")
print(f"  = NET T5   = {fmt(ht_totals.get('chuyen_khoan', 0) - tong_cp_t5_mb + tong_ck_t5)}")

# 5. Kiem tra record CK bat thuong - co the xoa duoc khong?
print(f"\n{SEP}")
print("5. RECORD CK TUONG VAO-RA (MB->MB) - CAN XOA?")
print(sep)
print("ID: 05aad6f8-4663-4d6d-be0d-3afcc0494923")
print("Ngay: 2026-01-09 | So tien: 45,587,362")
print("Dien giai: Quy Hannah Spa -> Khanh Duy (chuyen quy)")
print("Tu vi: MB Bank | Den vi: MB Bank (SAI! ca hai la MB)")
print()
print("=> Khi view tinh:")
print("   CK vao MB += 45,587,362 (vi den_vi_id=MB)")
print("   CK ra MB  += 45,587,362 (vi tu_vi_id=MB)")
print("   Net = 0 -> cancel nhau, KHONG anh huong so du")
print()
print("=> Record nay co the la loi nhap lieu:")
print("   'Quy' la mot tai khoan rieng (khong phai vi nao trong 3 vi)")
print("   Can xac nhan: day co phai la CK tu tai khoan ngoai vao MB khong?")
print("   Neu co, thi can chinh lai tu_vi_id cho dung vi nguon")

print(f"\n{SEP}")
print("XONG")
print(SEP)
