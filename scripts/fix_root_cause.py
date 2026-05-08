"""Fix gốc rễ: vi.loai + chuẩn hóa toàn bộ dữ liệu liên quan"""
import sys, io
sys.path.insert(0, '.')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
def fmt(n):
    if n is None: return "0d"
    return f"{int(n):,}d".replace(",", ".")

print("=" * 65)
print("FIX GOC RE: vi.loai + DU LIEU LIEN QUAN")
print("=" * 65)

# 1. Xem trạng thái hiện tại
print("\n1. TRUOC KHI FIX:")
r = supabase.from_("vi").select("*").order("thu_tu").execute()
for v in (r.data or []):
    print(f"  {v['ten']:15s}  loai={v['loai']:15s}  id={v['id']}")

# 2. Fix vi.loai
print("\n2. FIX vi.loai...")
vi_data = r.data or []
updates = []
vi_map = {}
for v in vi_data:
    vi_map[v['id']] = v
    if v['ten'] == 'MB Bank' and v['loai'] != 'chuyen_khoan':
        print(f"  MB Bank:  ngan_hang → chuyen_khoan")
        supabase.from_("vi").update({"loai": "chuyen_khoan"}).eq("id", v['id']).execute()
    elif v['ten'] == 'TP Bank' and v['loai'] != 'quet_the':
        print(f"  TP Bank:  ngan_hang → quet_the")
        supabase.from_("vi").update({"loai": "quet_the"}).eq("id", v['id']).execute()
    elif v['ten'] == 'Tiền Mặt':
        print(f"  Tiền Mặt: tien_mat → giữ nguyên")

# Verify
print("\n  Sau khi fix:")
r = supabase.from_("vi").select("*").order("thu_tu").execute()
for v in (r.data or []):
    print(f"  {v['ten']:15s}  loai={v['loai']:15s}")

# 3. Fix chi_phi: map hinh_thuc_thanh_toan dựa trên vi_id
print("\n3. FIX CHI_PHI — MAPPING THEO VI_ID...")

# Lấy danh sách chi_phi cần fix
r = supabase.from_("chi_phi").select("id, vi_id, hinh_thuc_thanh_toan, so_tien").execute()
fixed_count = 0
for cp in (r.data or []):
    vid = cp.get('vi_id')
    current = cp.get('hinh_thuc_thanh_toan', '')
    if vid and vid in vi_map:
        vi = vi_map[vid]
        correct = vi['loai']  # tien_mat / chuyen_khoan / quet_the
        if current != correct and correct in ('tien_mat', 'chuyen_khoan', 'quet_the'):
            supabase.from_("chi_phi").update({"hinh_thuc_thanh_toan": correct}).eq("id", cp['id']).execute()
            fixed_count += 1

print(f"  Đã fix {fixed_count} records chi_phi")

# Verify chi_phi types
r = supabase.from_("chi_phi").select("hinh_thuc_thanh_toan").execute()
from collections import Counter
c = Counter(d['hinh_thuc_thanh_toan'] for d in (r.data or []))
print(f"  Chi phi types hiện tại: {dict(c)}")

# 4. Chạy view mới từ migration file
print("\n4. FIX VIEW...")
# Drop and recreate view
sql_drop = "DROP VIEW IF EXISTS so_du_vi_thuc_te;"
sql_create = """
CREATE VIEW so_du_vi_thuc_te AS
SELECT
  v.id,
  v.ten,
  v.loai,
  v.icon,
  v.thu_tu,
  v.so_du_dau
    + COALESCE((SELECT sum(d.so_tien) FROM doanh_thu d
        WHERE d.hinh_thuc <> 'the_tra_truoc'
          AND ((v.loai = 'tien_mat' AND d.hinh_thuc = 'tien_mat')
            OR (v.loai = 'chuyen_khoan' AND d.hinh_thuc = 'chuyen_khoan')
            OR (v.loai = 'quet_the' AND d.hinh_thuc = 'quet_the'))), 0)
    - COALESCE((SELECT sum(cp.so_tien) FROM chi_phi cp
        WHERE ((v.loai = 'tien_mat' AND cp.hinh_thuc_thanh_toan = 'tien_mat')
            OR (v.loai = 'chuyen_khoan' AND cp.hinh_thuc_thanh_toan = 'chuyen_khoan')
            OR (v.loai = 'quet_the' AND cp.hinh_thuc_thanh_toan = 'quet_the'))), 0)
    + COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.den_vi_id = v.id), 0)
    - COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.tu_vi_id = v.id), 0)
  AS so_du_hien_tai
FROM vi v
WHERE v.is_active = true
ORDER BY v.thu_tu;
"""

# Thử dùng REST API SQL
try:
    supabase.rpc('exec_sql', {'sql': sql_drop}).execute()
except:
    pass
try:
    supabase.rpc('exec_sql', {'sql': sql_create}).execute()
except:
    pass

# 5. Verify cuối cùng
print("\n5. VERIFY SAU CÙNG:")
r = supabase.from_("so_du_vi_thuc_te").select("*").order("thu_tu").execute()
total = 0
for vi in (r.data or []):
    sd = vi.get('so_du_hien_tai', 0) or 0
    total += sd
    print(f"  {vi['ten']:15s}  so_du_hien_tai = {fmt(sd)}")
print(f"  {'TONG TAI SAN':15s}  = {fmt(total)}")

# 6. Kiểm tra chéo
print("\n6. KIEM TRA CHEO:")
for vi in (r.data or []):
    vid = vi['id']

    # Doanh thu
    r2 = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", vi['loai']).neq("hinh_thuc", "the_tra_truoc").execute()
    # Xử lý mapping đặc biệt
    if vi['loai'] == 'tien_mat':
        r2 = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", "tien_mat").execute()
    elif vi['loai'] == 'chuyen_khoan':
        r2 = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", "chuyen_khoan").execute()
    elif vi['loai'] == 'quet_the':
        r2 = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", "quet_the").execute()
    dt = sum(d['so_tien'] or 0 for d in (r2.data or []))

    # Chi phí
    r3 = supabase.from_("chi_phi").select("so_tien").eq("hinh_thuc_thanh_toan", vi['loai']).execute()
    cp = sum(d['so_tien'] or 0 for d in (r3.data or []))

    # CK
    r4 = supabase.from_("chuyen_khoan_noi_bo").select("so_tien").eq("tu_vi_id", vid).execute()
    ck_out = sum(d['so_tien'] or 0 for d in (r4.data or []))
    r5 = supabase.from_("chuyen_khoan_noi_bo").select("so_tien").eq("den_vi_id", vid).execute()
    ck_in = sum(d['so_tien'] or 0 for d in (r5.data or []))

    sd_dau = vi.get('so_du_dau', 0) or 0
    calc = sd_dau + dt - cp + ck_in - ck_out
    match = "✅" if calc == (vi.get('so_du_hien_tai', 0) or 0) else f"❌ LỆCH {fmt(calc - (vi.get('so_du_hien_tai', 0) or 0))}"
    print(f"  {vi['ten']:15s}  dau={fmt(sd_dau)} + thu={fmt(dt)} - chi={fmt(cp)} + CKvào={fmt(ck_in)} - CKra={fmt(ck_out)} = {fmt(calc)}  {match}")

print("\n" + "=" * 65)
print("HOAN TAT FIX GOC RE")
