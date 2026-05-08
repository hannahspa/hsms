"""Fix toàn bộ dữ liệu Sổ Thu Chi cho chuẩn — 26/11/2025 → 28/02/2026"""
import sys, io
sys.path.insert(0, '.')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client
from collections import defaultdict

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
def fmt(n):
    if n is None: return "0d"
    return f"{int(n):,}d".replace(",", ".")

print("=" * 65)
print("FIX TOAN BO DU LIEU SO THU CHI")
print("=" * 65)

# Lấy ví info
r = supabase.from_("vi").select("id,ten,loai").execute()
vi_ten = {v['ten']: v for v in (r.data or [])}
tm_id = vi_ten['Tiền Mặt']['id']
mb_id = vi_ten['MB Bank']['id']

print(f"\nTiền Mặt ID: {tm_id}")
print(f"MB Bank ID:  {mb_id}")

# ══════════════════════════════════════════════
# FIX 1: Chuẩn hóa hinh_thuc_thanh_toan trong chi_phi
# ══════════════════════════════════════════════
print("\n1. CHUẨN HÓA CHI PHÍ — hinh_thuc_thanh_toan theo đúng ví:")
r = supabase.from_("chi_phi").select("id, vi_id, hinh_thuc_thanh_toan, so_tien, ngay, dien_giai").execute()

fixed_chi_phi = 0
for cp in (r.data or []):
    vid = cp.get('vi_id')
    current = cp.get('hinh_thuc_thanh_toan', '')

    # Xác định giá trị đúng dựa trên vi_id
    if vid == tm_id:
        correct = 'tien_mat'
    elif vid == mb_id:
        correct = 'chuyen_khoan'
    else:
        # TP Bank hoặc ví khác
        vi = next((v for v in (vi_ten.values()) if v['id'] == vid), None)
        if vi and 'TP' in vi['ten']:
            correct = 'quet_the'
        else:
            continue  # skip unknown

    if current != correct:
        supabase.from_("chi_phi").update({"hinh_thuc_thanh_toan": correct}).eq("id", cp['id']).execute()
        fixed_chi_phi += 1

print(f"  Đã fix {fixed_chi_phi} records chi_phi")

# Verify
r = supabase.from_("chi_phi").select("hinh_thuc_thanh_toan").execute()
from collections import Counter
c = Counter(d['hinh_thuc_thanh_toan'] for d in (r.data or []))
print(f"  Chi phi types: {dict(c)}")

# ══════════════════════════════════════════════
# FIX 2: Tạo CK nội bộ cho các ngày CHƯA NỘP
# ══════════════════════════════════════════════
print("\n2. TẠO CK CHO CÁC NGÀY CHƯA NỘP TIỀN MẶT:")

# Thu thập dữ liệu từng ngày
r = supabase.from_("doanh_thu").select("ngay, hinh_thuc, so_tien").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").execute()
dt_day = defaultdict(lambda: defaultdict(int))
for d in (r.data or []): dt_day[d['ngay']][d['hinh_thuc']] += (d['so_tien'] or 0)

r = supabase.from_("chi_phi").select("ngay, hinh_thuc_thanh_toan, so_tien").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").execute()
cp_day = defaultdict(lambda: defaultdict(int))
for d in (r.data or []): cp_day[d['ngay']][d.get('hinh_thuc_thanh_toan','?')] += (d['so_tien'] or 0)

r = supabase.from_("chuyen_khoan_noi_bo").select("ngay, tu_vi_id, so_tien").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").execute()
ck_day = defaultdict(int)
for d in (r.data or []):
    if d['tu_vi_id'] == tm_id: ck_day[d['ngay']] += (d['so_tien'] or 0)

all_days = sorted(set(list(dt_day.keys()) + list(cp_day.keys())))

created_ck = 0
for day in all_days:
    dt_tm = dt_day[day].get('tien_mat', 0)
    cp_tm = cp_day[day].get('tien_mat', 0)
    ck_existing = ck_day[day]
    phai_nop = dt_tm - cp_tm

    if phai_nop > 0 and ck_existing == 0:
        # Ngày này chưa nộp → tạo CK
        supabase.from_("chuyen_khoan_noi_bo").insert({
            "ngay": day,
            "tu_vi_id": tm_id,
            "den_vi_id": mb_id,
            "so_tien": phai_nop,
            "dien_giai": f"Auto-fix: Nộp tiền mặt ngày {day} (Thu {fmt(dt_tm)} - Chi {fmt(cp_tm)})",
        }).execute()
        created_ck += 1
        print(f"  {day}: Tạo CK {fmt(phai_nop)} (Thu={fmt(dt_tm)} Chi={fmt(cp_tm)})")

print(f"  Đã tạo {created_ck} CK mới")

# ══════════════════════════════════════════════
# FIX 3: Sửa CK bị sai số (NỘP DƯ/THIẾU > 500đ)
# ══════════════════════════════════════════════
print("\n3. SỬA CK SAI SỐ (>500đ):")

r = supabase.from_("chuyen_khoan_noi_bo").select("id, ngay, tu_vi_id, so_tien, dien_giai").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").eq("tu_vi_id", tm_id).execute()

fixed_ck = 0
for ck in (r.data or []):
    day = ck['ngay']
    dt_tm = dt_day[day].get('tien_mat', 0)
    cp_tm = cp_day[day].get('tien_mat', 0)
    phai_nop = dt_tm - cp_tm

    if abs(ck['so_tien'] - phai_nop) > 500:
        old_val = ck['so_tien']
        supabase.from_("chuyen_khoan_noi_bo").update({
            "so_tien": phai_nop,
            "dien_giai": (ck.get('dien_giai') or '') + f' [Auto-fix: {fmt(old_val)} → {fmt(phai_nop)}]'
        }).eq("id", ck['id']).execute()
        fixed_ck += 1
        diff = old_val - phai_nop
        print(f"  {day}: {fmt(old_val)} → {fmt(phai_nop)} ({'dư' if diff > 0 else 'thiếu'} {fmt(abs(diff))})")

print(f"  Đã sửa {fixed_ck} CK")

# ══════════════════════════════════════════════
# VERIFY
# ══════════════════════════════════════════════
print("\n4. VERIFY SAU KHI FIX:")

r = supabase.from_("so_du_vi_thuc_te").select("ten,so_du_hien_tai").order("thu_tu").execute()
total = 0
for vi in (r.data or []):
    sd = vi.get('so_du_hien_tai', 0) or 0
    total += sd
    print(f"  {vi['ten']:15s} {fmt(sd)}")
print(f"  {'TỔNG':15s} {fmt(total)}")

# Kiểm tra chéo
print("\n5. KIỂM TRA CHÉO TỪNG VÍ:")
for vi_name in ['Tiền Mặt', 'MB Bank', 'TP Bank']:
    vi = vi_ten[vi_name]

    # Doanh thu
    if vi_name == 'Tiền Mặt':
        r2 = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", "tien_mat").execute()
    elif vi_name == 'MB Bank':
        r2 = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", "chuyen_khoan").execute()
    else:
        r2 = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", "quet_the").execute()
    dt = sum(d['so_tien'] or 0 for d in (r2.data or []))

    # Chi phí
    if vi_name == 'Tiền Mặt':
        r3 = supabase.from_("chi_phi").select("so_tien").eq("hinh_thuc_thanh_toan", "tien_mat").execute()
    elif vi_name == 'MB Bank':
        r3 = supabase.from_("chi_phi").select("so_tien").eq("hinh_thuc_thanh_toan", "chuyen_khoan").execute()
    else:
        r3 = supabase.from_("chi_phi").select("so_tien").eq("hinh_thuc_thanh_toan", "quet_the").execute()
    cp = sum(d['so_tien'] or 0 for d in (r3.data or []))

    # CK
    r4 = supabase.from_("chuyen_khoan_noi_bo").select("so_tien").eq("tu_vi_id", vi['id']).execute()
    ck_out = sum(d['so_tien'] or 0 for d in (r4.data or []))
    r5 = supabase.from_("chuyen_khoan_noi_bo").select("so_tien").eq("den_vi_id", vi['id']).execute()
    ck_in = sum(d['so_tien'] or 0 for d in (r5.data or []))

    sd_view = next((v for v in (r.data or []) if v['ten'] == vi_name), {}).get('so_du_hien_tai', 0) or 0
    sd_dau = vi.get('so_du_dau', 0) or 0
    calc = sd_dau + dt - cp + ck_in - ck_out

    match = "✅" if calc == sd_view else f"❌ LỆCH {fmt(calc - sd_view)}"
    print(f"  {vi_name:15s} {fmt(sd_dau)} + {fmt(dt)} - {fmt(cp)} + {fmt(ck_in)} - {fmt(ck_out)} = {fmt(calc)} vs view {fmt(sd_view)} {match}")

print("\n" + "=" * 65)
print("HOAN TAT FIX")
