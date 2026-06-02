import os
"""Truy vết dòng tiền mặt từ 28/02 đến nay"""
import sys, io
sys.path.insert(0, '.')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client
from collections import defaultdict

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
def fmt(n):
    if n is None: return "0d"
    return f"{int(n):,}d".replace(",", ".")

print("=" * 70)
print("TRUY VET DONG TIEN MAT — TU 28/02 DEN NAY")
print("=" * 70)

# Lấy vi_id của Tiền Mặt
r = supabase.from_("vi").select("id,ten,loai").execute()
vi_map_loai = {v['loai']: v for v in (r.data or [])}
vi_map_ten = {v['ten']: v for v in (r.data or [])}
tm_id = vi_map_loai['tien_mat']['id']
mb_id = vi_map_ten['MB Bank']['id']

# 1. TẤT CẢ giao dịch tiền mặt từ 28/02 đến nay
print("\n1. LỊCH SỬ TIỀN MẶT TỪNG NGÀY (28/02 → nay):")
print("-" * 60)

# Doanh thu tiền mặt từng ngày
r = supabase.from_("doanh_thu").select("ngay, so_tien").eq("hinh_thuc", "tien_mat").gte("ngay", "2026-02-28").execute()
dt_by_day = defaultdict(int)
for d in (r.data or []):
    dt_by_day[d['ngay']] += (d['so_tien'] or 0)

# Chi phí tiền mặt từng ngày
r = supabase.from_("chi_phi").select("ngay, so_tien").eq("hinh_thuc_thanh_toan", "tien_mat").gte("ngay", "2026-02-28").execute()
cp_by_day = defaultdict(int)
for d in (r.data or []):
    cp_by_day[d['ngay']] += (d['so_tien'] or 0)

# Chuyển khoản nội bộ (tiền mặt → MB Bank) từng ngày
r = supabase.from_("chuyen_khoan_noi_bo").select("ngay, tu_vi_id, den_vi_id, so_tien, dien_giai").gte("ngay", "2026-02-28").execute()
ck_out_by_day = defaultdict(int)  # Tiền mặt → MB
ck_details = []
for d in (r.data or []):
    if d['tu_vi_id'] == tm_id:
        ck_out_by_day[d['ngay']] += (d['so_tien'] or 0)
        ck_details.append(d)

all_days = sorted(set(list(dt_by_day.keys()) + list(cp_by_day.keys()) + list(ck_out_by_day.keys())))

running = 0
print(f"  {'Ngày':<12s} {'Thu TM':>12s} {'Chi TM':>12s} {'CK TM→MB':>12s} {'Δ Ngày':>12s} {'Số Dư':>12s}")
print(f"  {'─'*10} {'─'*10} {'─'*10} {'─'*10} {'─'*10} {'─'*10}")

total_dt = 0
total_cp = 0
total_ck = 0

for day in all_days:
    dt = dt_by_day[day]
    cp = cp_by_day[day]
    ck = ck_out_by_day[day]
    delta = dt - cp - ck
    running += delta
    total_dt += dt
    total_cp += cp
    total_ck += ck

    marker = ""
    if ck == 0 and dt > 0:
        tien_phai_nop = dt - cp
        if tien_phai_nop > 0:
            marker = f"  ⚠️ CHƯA NỘP {fmt(tien_phai_nop)}"

    print(f"  {day:<12s} {fmt(dt):>12s} {fmt(cp):>12s} {fmt(ck):>12s} {fmt(delta):>12s} {fmt(running):>12s}{marker}")

print(f"  {'─'*10} {'─'*10} {'─'*10} {'─'*10} {'─'*10} {'─'*10}")
print(f"  {'TỔNG':<12s} {fmt(total_dt):>12s} {fmt(total_cp):>12s} {fmt(total_ck):>12s}")

# 2. Chi tiết CK nội bộ TM → MB
print("\n2. CHI TIẾT CÁC LẦN NỘP TIỀN MẶT (TM → MB):")
print("-" * 60)
for d in sorted(ck_details, key=lambda x: x['ngay']):
    print(f"  {d['ngay']}  {fmt(d['so_tien'])}  {d.get('dien_giai','')}")

# 3. Kiểm tra: tổng tiền mặt lẽ ra phải có
print("\n3. KIỂM TRA SỐ DƯ:")
print("-" * 60)
# Lấy so_du_dau của ví TM trước 28/02
r = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", "tien_mat").lt("ngay", "2026-02-28").execute()
dt_before = sum(d['so_tien'] or 0 for d in (r.data or []))
r = supabase.from_("chi_phi").select("so_tien").eq("hinh_thuc_thanh_toan", "tien_mat").lt("ngay", "2026-02-28").execute()
cp_before = sum(d['so_tien'] or 0 for d in (r.data or []))
r = supabase.from_("chuyen_khoan_noi_bo").select("so_tien").eq("tu_vi_id", tm_id).lt("ngay", "2026-02-28").execute()
ck_before = sum(d['so_tien'] or 0 for d in (r.data or []))
r = supabase.from_("chuyen_khoan_noi_bo").select("so_tien").eq("den_vi_id", tm_id).lt("ngay", "2026-02-28").execute()
ck_in_before = sum(d['so_tien'] or 0 for d in (r.data or []))

sd_before_28 = dt_before - cp_before - ck_before + ck_in_before
print(f"  Số dư trước 28/02:      {fmt(sd_before_28)}")
print(f"  Tổng thu TM từ 28/02:   {fmt(total_dt)}")
print(f"  Tổng chi TM từ 28/02:   {fmt(total_cp)}")
print(f"  Tổng CK TM→MB từ 28/02: {fmt(total_ck)}")
expected = sd_before_28 + total_dt - total_cp - total_ck
print(f"  SỐ DƯ HIỆN TẠI (tính):  {fmt(expected)}")

r = supabase.from_("so_du_vi_thuc_te").select("so_du_hien_tai").eq("id", tm_id).single().execute()
actual = (r.data or {}).get('so_du_hien_tai', 0) or 0
print(f"  SỐ DƯ HIỆN TẠI (view):  {fmt(actual)}")
print(f"  CHÊNH LỆCH:             {fmt(actual - expected)}")

# 4. Các ngày chưa nộp tiền mặt
print("\n4. CÁC NGÀY CÓ THU TIỀN MẶT NHƯNG CHƯA NỘP:")
print("-" * 60)
for day in all_days:
    dt = dt_by_day[day]
    cp = cp_by_day[day]
    ck = ck_out_by_day[day]
    phai_nop = dt - cp
    if phai_nop > 0 and ck == 0:
        print(f"  {day}: Thu={fmt(dt)} Chi={fmt(cp)} Cần nộp={fmt(phai_nop)} → CHƯA CÓ CK")
    elif phai_nop > 0 and ck != phai_nop:
        print(f"  {day}: Thu={fmt(dt)} Chi={fmt(cp)} Cần nộp={fmt(phai_nop)} Đã nộp={fmt(ck)} → LỆCH {fmt(phai_nop - ck)}")

print("\n" + "=" * 70)
print("HOAN TAT")
