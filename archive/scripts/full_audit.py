import os
"""Kiểm toán toàn bộ Sổ Thu Chi từ 26/11/2025 đến 28/02/2026 — tìm mọi sai sót"""
import sys, io
sys.path.insert(0, '.')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client
from collections import defaultdict
from datetime import date, timedelta

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
def fmt(n):
    if n is None: return "0đ"
    return f"{int(n):,}đ".replace(",", ".")

print("=" * 72)
print("KIỂM TOÁN TOÀN BỘ SỔ THU CHI")
print("Từ 26/11/2025 đến 28/02/2026")
print("=" * 72)

# Lấy vi info
r = supabase.from_("vi").select("*").execute()
vi_map = {v['id']: v for v in (r.data or [])}
vi_ten = {v['ten']: v for v in (r.data or [])}
tm_id = vi_ten['Tiền Mặt']['id']

# ══════════════════════════════════════════════
# 1. PHÂN TÍCH TỪNG NGÀY
# ══════════════════════════════════════════════
print("\n1. PHÂN TÍCH TỪNG NGÀY — TÌM BẤT THƯỜNG")
print("-" * 72)

# Doanh thu từng ngày từng loại
r = supabase.from_("doanh_thu").select("ngay, hinh_thuc, so_tien").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").execute()
dt_day_type = defaultdict(lambda: defaultdict(int))
for d in (r.data or []):
    dt_day_type[d['ngay']][d['hinh_thuc']] += (d['so_tien'] or 0)

# Chi phí từng ngày từng loại
r = supabase.from_("chi_phi").select("ngay, hinh_thuc_thanh_toan, so_tien, dien_giai").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").execute()
cp_day_type = defaultdict(lambda: defaultdict(int))
cp_items = defaultdict(list)
for d in (r.data or []):
    cp_day_type[d['ngay']][d.get('hinh_thuc_thanh_toan','?')] += (d['so_tien'] or 0)
    cp_items[d['ngay']].append(d)

# CK từng ngày
r = supabase.from_("chuyen_khoan_noi_bo").select("ngay, tu_vi_id, den_vi_id, so_tien, dien_giai").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").execute()
ck_day_out = defaultdict(int)
ck_day_in = defaultdict(int)
for d in (r.data or []):
    if d['tu_vi_id'] == tm_id:
        ck_day_out[d['ngay']] += (d['so_tien'] or 0)
    if d['den_vi_id'] == tm_id:
        ck_day_in[d['ngay']] += (d['so_tien'] or 0)

all_days = sorted(set(list(dt_day_type.keys()) + list(cp_day_type.keys()) + list(ck_day_out.keys()) + list(ck_day_in.keys())))

running_tm = 0
anomalies = []
daily_summary = []

for day in all_days:
    dt_tm = dt_day_type[day].get('tien_mat', 0)
    dt_ck = dt_day_type[day].get('chuyen_khoan', 0)
    dt_qt = dt_day_type[day].get('quet_the', 0)
    dt_tt = dt_day_type[day].get('the_tra_truoc', 0)

    cp_tm = cp_day_type[day].get('tien_mat', 0)
    cp_ng = cp_day_type[day].get('ngan_hang', 0)
    cp_ck = cp_day_type[day].get('chuyen_khoan', 0)

    ck_out = ck_day_out[day]
    ck_in = ck_day_in[day]

    # Tiền mặt phải nộp = thu TM - chi TM
    phai_nop = dt_tm - cp_tm
    thuc_nop = ck_out
    delta = phai_nop - thuc_nop

    running_tm += dt_tm - cp_tm - ck_out + ck_in

    daily_summary.append((day, dt_tm, cp_tm, phai_nop, thuc_nop, delta, running_tm))

    # Phát hiện bất thường
    if dt_tm > 0 and phai_nop > 0 and thuc_nop == 0:
        anomalies.append(("CHƯA NỘP TM", day, phai_nop, f"Thu={fmt(dt_tm)} Chi={fmt(cp_tm)} → chưa có CK nộp {fmt(phai_nop)}"))
    elif abs(delta) > 500 and thuc_nop > 0:
        if delta > 0:
            anomalies.append(("NỘP THIẾU", day, delta, f"Phải nộp {fmt(phai_nop)} nhưng chỉ nộp {fmt(thuc_nop)}, thiếu {fmt(delta)}"))
        else:
            anomalies.append(("NỘP DƯ", day, -delta, f"Phải nộp {fmt(phai_nop)} nhưng đã nộp {fmt(thuc_nop)}, dư {fmt(-delta)}"))
    if cp_ng > 0:
        anomalies.append(("CHI PHÍ 'ngan_hang'", day, cp_ng, f"Có {fmt(cp_ng)} chi phí với hinh_thuc='ngan_hang' (sai enum)"))

print(f"\n  Tổng số ngày có giao dịch: {len(all_days)}")
print(f"  Tổng số ngày có bất thường: {len(set(a[1] for a in anomalies))}")

print(f"\n  CHI TIẾT BẤT THƯỜNG:")
print(f"  {'Ngày':<12s} {'Loại':<18s} {'Số tiền':>12s} {'Chi tiết'}")
print(f"  {'─'*10} {'─'*16} {'─'*10} {'─'*40}")
for typ, day, amt, detail in anomalies:
    print(f"  {day:<12s} {typ:<18s} {fmt(amt):>12s} {detail}")

# ══════════════════════════════════════════════
# 2. TÓM TẮT DÒNG TIỀN MẶT
# ══════════════════════════════════════════════
print(f"\n\n2. TÓM TẮT DÒNG TIỀN MẶT (26/11/2025 → 28/02/2026)")
print("-" * 72)

total_dt_tm = sum(dt_day_type[d].get('tien_mat', 0) for d in all_days)
total_cp_tm = sum(cp_day_type[d].get('tien_mat', 0) for d in all_days)
total_ck_out = sum(ck_day_out.values())
total_ck_in = sum(ck_day_in.values())

print(f"  Tổng thu tiền mặt:     {fmt(total_dt_tm)}")
print(f"  Tổng chi tiền mặt:     {fmt(total_cp_tm)}")
print(f"  Tổng CK TM → MB:       {fmt(total_ck_out)}")
print(f"  Tổng CK MB → TM:       {fmt(total_ck_in)}")
print(f"  Số dư cuối kỳ:         {fmt(running_tm)}")

# ══════════════════════════════════════════════
# 3. TỔNG QUAN TOÀN BỘ 3 VÍ
# ══════════════════════════════════════════════
print(f"\n\n3. TỔNG QUAN TOÀN BỘ HỆ THỐNG")
print("-" * 72)

total_all_dt = sum(sum(d.values()) for d in dt_day_type.values())
total_all_cp = sum(sum(d.values()) for d in cp_day_type.values())
total_tt = sum(dt_day_type[d].get('the_tra_truoc', 0) for d in all_days)
thuc_thu = total_all_dt - total_tt

print(f"  Tổng doanh thu:        {fmt(total_all_dt)}")
print(f"  Trừ thẻ trả trước:     {fmt(total_tt)}")
print(f"  Thực thu:              {fmt(thuc_thu)}")
print(f"  Tổng chi phí:          {fmt(total_all_cp)}")
print(f"  Lợi nhuận:             {fmt(thuc_thu - total_all_cp)}")

# So sánh với view
r = supabase.from_("so_du_vi_thuc_te").select("ten,so_du_hien_tai").order("thu_tu").execute()
print(f"\n  Số dư từng ví (view):")
total_view = 0
for vi in (r.data or []):
    sd = vi.get('so_du_hien_tai', 0) or 0
    total_view += sd
    print(f"    {vi['ten']:15s} {fmt(sd)}")
print(f"    {'TỔNG':15s} {fmt(total_view)}")

# ══════════════════════════════════════════════
# 4. KIỂM TRA CHI PHÍ KHÔNG CÓ DIỄN GIẢI
# ══════════════════════════════════════════════
print(f"\n\n4. KIỂM TRA CHẤT LƯỢNG DỮ LIỆU")
print("-" * 72)

r = supabase.from_("chi_phi").select("id,ngay,so_tien,dien_giai").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").execute()
no_dg = [d for d in (r.data or []) if not (d.get('dien_giai') or '').strip()]
if no_dg:
    print(f"  ⚠️ {len(no_dg)} chi phí THIẾU diễn giải:")
    for d in no_dg[:10]:
        print(f"    {d['ngay']} {fmt(d['so_tien'])} id={d['id'][:8]}...")
else:
    print(f"  ✅ Tất cả chi phí đều có diễn giải")

r = supabase.from_("doanh_thu").select("id,ngay,so_tien,dien_giai").gte("ngay", "2025-11-26").lte("ngay", "2026-02-28").execute()
no_dg = [d for d in (r.data or []) if not (d.get('dien_giai') or '').strip()]
if no_dg:
    print(f"  ⚠️ {len(no_dg)} doanh thu THIẾU diễn giải")
else:
    print(f"  ✅ Tất cả doanh thu đều có diễn giải")

# ══════════════════════════════════════════════
# 5. ĐÁNH GIÁ TỔNG THỂ
# ══════════════════════════════════════════════
print(f"\n\n5. ĐÁNH GIÁ TỔNG THỂ")
print("-" * 72)

nop_du_ngay = [a for a in anomalies if a[0] == "NỘP DƯ"]
nop_thieu_ngay = [a for a in anomalies if a[0] == "NỘP THIẾU"]
chua_nop_ngay = [a for a in anomalies if a[0] == "CHƯA NỘP TM"]

total_du = sum(a[2] for a in nop_du_ngay)
total_thieu = sum(a[2] for a in nop_thieu_ngay)
total_chua = sum(a[2] for a in chua_nop_ngay)

print(f"  Số ngày nộp đúng:   {len(all_days) - len(set(a[1] for a in anomalies))} / {len(all_days)}")
print(f"  Nộp dư:             {len(nop_du_ngay)} ngày, tổng dư {fmt(total_du)}")
print(f"  Nộp thiếu:          {len(nop_thieu_ngay)} ngày, tổng thiếu {fmt(total_thieu)}")
print(f"  Chưa nộp:           {len(chua_nop_ngay)} ngày, tổng {fmt(total_chua)}")

print(f"\n  Các ngày CHƯA NỘP tiền mặt (cần xử lý):")
for typ, day, amt, detail in chua_nop_ngay:
    print(f"    {day}: cần nộp {fmt(amt)}")

print(f"\n  Các ngày NỘP DƯ > 500đ (có thể sai số):")
for typ, day, amt, detail in nop_du_ngay:
    if amt > 500:
        print(f"    {day}: dư {fmt(amt)} — {detail}")

print("\n" + "=" * 72)
print("HOÀN TẤT KIỂM TOÁN")
