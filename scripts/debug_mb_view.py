"""
Debug: Tại sao MB Bank tăng sau khi insert chi_phi?
Kiểm tra từng thành phần của view so_du_vi_thuc_te
"""
import requests

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"

H = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

# MB Bank vi_id
MB_ID = "6d69df42-9d5a-4f03-9370-a0b6e007e12d"
TM_ID = "3cee1999-15a3-43a8-9b90-f92831641b83"
TP_ID = "8db03ac2-e092-40b0-8f0c-abda1f1993e1"

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".")
    except: return str(n)

SEP = "=" * 60
sep = "-" * 60

# ── 1. View hiện tại ──────────────────────────────────────────
print(SEP)
print("1. VIEW SO_DU_VI_THUC_TE (hiện tại)")
print(sep)
r = requests.get(f"{SUPABASE_URL}/rest/v1/so_du_vi_thuc_te?select=*", headers=H, timeout=15)
for row in (r.json() or []):
    print(f"  {row.get('ten','?'):<15} | so_du_dau={fmt(row.get('so_du_dau',0))} | thu_vao={fmt(row.get('thu_vao',0))} | chi_ra={fmt(row.get('chi_ra',0))} | ck_vao={fmt(row.get('ck_vao',0))} | ck_ra={fmt(row.get('ck_ra',0))} | SO DU={fmt(row.get('so_du_hien_tai',0))}")

# ── 2. Kiểm tra 3 records vừa insert ─────────────────────────
print(f"\n{SEP}")
print("2. 3 CHI_PHI VỪA INSERT (theo ID)")
print(sep)
ids = [
    "03946d1b-e710-492c-a368-fb26802a4197",
    "903fe032-a882-466a-840e-f3c616cec8b6",
    "811b2536-f54c-41b0-8fff-f004dda423c2"
]
for i in ids:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/chi_phi?id=eq.{i}&select=id,ngay,so_tien,hinh_thuc_thanh_toan,vi_id,dien_giai,danh_muc_id",
        headers=H, timeout=10
    )
    data = r.json()
    if data:
        row = data[0]
        print(f"  id={row['id'][:8]}...")
        print(f"    ngay={row.get('ngay')} | so_tien={fmt(row.get('so_tien'))} | hinh_thuc={row.get('hinh_thuc_thanh_toan')}")
        print(f"    vi_id={row.get('vi_id')} | dien_giai={row.get('dien_giai')}")
        print(f"    vi_id khớp MB? {row.get('vi_id') == MB_ID}")
    else:
        print(f"  ID {i[:8]}... → KHÔNG TÌM THẤY!")

# ── 3. Tổng chi_phi theo vi_id=MB ────────────────────────────
print(f"\n{SEP}")
print("3. TỔNG CHI_PHI THEO VI_ID (MB Bank)")
print(sep)

# Lấy tất cả chi_phi với vi_id=MB
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

cp_mb = fetch_all("chi_phi", f"vi_id=eq.{MB_ID}&select=id,ngay,so_tien,hinh_thuc_thanh_toan")
tong_cp_mb = sum(x.get('so_tien', 0) or 0 for x in cp_mb)
print(f"  Số records chi_phi có vi_id=MB: {len(cp_mb)}")
print(f"  Tổng chi ra (MB): {fmt(tong_cp_mb)}")

# ── 4. Doanh thu theo hinh_thuc=chuyen_khoan (MB thu vào) ────
print(f"\n{SEP}")
print("4. DOANH THU HÌNH THỨC CHUYỂN KHOẢN (thu vào MB)")
print(sep)
dt_ck = fetch_all("doanh_thu", "hinh_thuc=eq.chuyen_khoan&select=id,ngay,so_tien")
tong_dt_ck = sum(x.get('so_tien', 0) or 0 for x in dt_ck)
print(f"  Số records doanh_thu CK: {len(dt_ck)}")
print(f"  Tổng thu vào (MB): {fmt(tong_dt_ck)}")

# ── 5. Chuyển khoản nội bộ liên quan MB ──────────────────────
print(f"\n{SEP}")
print("5. CHUYỂN KHOẢN NỘI BỘ LIÊN QUAN MB")
print(sep)
ck_vao_mb = fetch_all("chuyen_khoan_noi_bo", f"den_vi_id=eq.{MB_ID}&select=id,ngay,so_tien,tu_vi_id")
ck_ra_mb = fetch_all("chuyen_khoan_noi_bo", f"tu_vi_id=eq.{MB_ID}&select=id,ngay,so_tien,den_vi_id")

tong_ck_vao_mb = sum(x.get('so_tien', 0) or 0 for x in ck_vao_mb)
tong_ck_ra_mb = sum(x.get('so_tien', 0) or 0 for x in ck_ra_mb)

print(f"  CK vào MB: {len(ck_vao_mb)} records | tổng = {fmt(tong_ck_vao_mb)}")
for x in ck_vao_mb[:5]:
    print(f"    {x.get('ngay')} | {fmt(x.get('so_tien'))} | từ {x.get('tu_vi_id','?')[:8]}...")
print(f"  CK ra MB: {len(ck_ra_mb)} records | tổng = {fmt(tong_ck_ra_mb)}")
for x in ck_ra_mb[:5]:
    print(f"    {x.get('ngay')} | {fmt(x.get('so_tien'))} | đến {x.get('den_vi_id','?')[:8]}...")

# ── 6. Tính tay số dư MB ─────────────────────────────────────
print(f"\n{SEP}")
print("6. TÍNH TAY SỐ DƯ MB BANK")
print(sep)

# Lấy so_du_dau
vi_mb = requests.get(f"{SUPABASE_URL}/rest/v1/vi?id=eq.{MB_ID}&select=*", headers=H, timeout=10).json()
sd_dau_mb = 0
if vi_mb:
    sd_dau_mb = vi_mb[0].get('so_du_dau', 0) or 0
    print(f"  so_du_dau (vi.so_du_dau): {fmt(sd_dau_mb)}")

print(f"  + Thu vào (DT CK):       {fmt(tong_dt_ck)}")
print(f"  - Chi ra (CP vi_id=MB):  {fmt(tong_cp_mb)}")
print(f"  + CK vào MB:             {fmt(tong_ck_vao_mb)}")
print(f"  - CK ra MB:              {fmt(tong_ck_ra_mb)}")

so_du_tinh_tay = sd_dau_mb + tong_dt_ck - tong_cp_mb + tong_ck_vao_mb - tong_ck_ra_mb
print(f"  = Số dư tính tay:        {fmt(so_du_tinh_tay)}")
print(f"  View hiển thị:           61.358.021")
print(f"  Thực tế (sao kê):        45.864.619")
print(f"  Chênh lệch (tính tay vs thực tế): {fmt(so_du_tinh_tay - 45864619)}")

# ── 7. Kiểm tra chi_phi hinh_thuc=chuyen_khoan (nhưng không có vi_id=MB) ──
print(f"\n{SEP}")
print("7. CHI_PHI HÌNH THỨC CK NHƯNG VI_ID KHÁC MB")
print(sep)
cp_ck_all = fetch_all("chi_phi", "hinh_thuc_thanh_toan=eq.chuyen_khoan&select=id,ngay,so_tien,vi_id,dien_giai")
cp_ck_not_mb = [x for x in cp_ck_all if x.get('vi_id') != MB_ID]
print(f"  CP hinh_thuc=CK tổng: {len(cp_ck_all)} | vi_id không phải MB: {len(cp_ck_not_mb)}")
for x in cp_ck_not_mb[:10]:
    print(f"    {x.get('ngay')} | {fmt(x.get('so_tien'))} | vi_id={x.get('vi_id','?')[:8]}... | {x.get('dien_giai','?')[:40]}")

# ── 8. Doanh thu theo ngày từ 01/05 (để thấy cơ cấu) ─────────
print(f"\n{SEP}")
print("8. DOANH THU THÁNG 5 THEO HÌNH THỨC")
print(sep)
dt_t5 = fetch_all("doanh_thu", "ngay=gte.2026-05-01&ngay=lte.2026-05-26&select=ngay,hinh_thuc,so_tien")
by_ht = {}
for x in dt_t5:
    ht = x.get('hinh_thuc', '?')
    by_ht[ht] = by_ht.get(ht, 0) + (x.get('so_tien', 0) or 0)
print(f"  Tổng records T5: {len(dt_t5)}")
for ht, tong in sorted(by_ht.items()):
    print(f"    {ht}: {fmt(tong)}")

print(f"\n{SEP}")
print("XONG DEBUG")
print(SEP)
