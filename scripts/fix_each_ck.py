"""Fix từng CK sai — đúng logic: phải nộp = thu TM - chi TM"""
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

r = supabase.from_("vi").select("id,ten").execute()
vi_ten = {v['ten']: v for v in (r.data or [])}
tm_id = vi_ten['Tiền Mặt']['id']
mb_id = vi_ten['MB Bank']['id']

print("=" * 65)
print("FIX TUNG CK SAI — PHẢI NỘP = THU TM - CHI TM")
print("=" * 65)

# Thu thập dữ liệu
r = supabase.from_("doanh_thu").select("ngay,so_tien").eq("hinh_thuc","tien_mat").gte("ngay","2025-11-26").lte("ngay","2026-02-28").execute()
dt_day = defaultdict(int)
for d in (r.data or []): dt_day[d['ngay']] += (d['so_tien'] or 0)

r = supabase.from_("chi_phi").select("ngay,so_tien").eq("hinh_thuc_thanh_toan","tien_mat").gte("ngay","2025-11-26").lte("ngay","2026-02-28").execute()
cp_day = defaultdict(int)
for d in (r.data or []): cp_day[d['ngay']] += (d['so_tien'] or 0)

r = supabase.from_("chuyen_khoan_noi_bo").select("id,ngay,so_tien,dien_giai").eq("tu_vi_id",tm_id).gte("ngay","2025-11-26").lte("ngay","2026-02-28").execute()
ck_map = {}
for d in (r.data or []):
    day = d['ngay']
    if day not in ck_map: ck_map[day] = []
    ck_map[day].append(d)

all_days = sorted(set(list(dt_day.keys()) + list(cp_day.keys())))

print("\n1. KIỂM TRA TỪNG NGÀY:")
print(f"  {'Ngày':<12s} {'Thu':>10s} {'Chi':>10s} {'Phải nộp':>12s} {'Đã nộp':>12s} {'Hành động'}")

fixed = 0
created = 0
deleted = 0
details = []

for day in all_days:
    dt = dt_day[day]
    cp = cp_day[day]
    phai_nop = dt - cp
    existing_cks = ck_map.get(day, [])
    total_ck = sum(c['so_tien'] or 0 for c in existing_cks)

    action = ""
    if phai_nop <= 0:
        # Không có tiền mặt để nộp → xóa CK nếu có
        for c in existing_cks:
            supabase.from_("chuyen_khoan_noi_bo").delete().eq("id", c['id']).execute()
            deleted += 1
            details.append(f"  {day}: XÓA CK {fmt(c['so_tien'])} (chi={fmt(cp)} > thu={fmt(dt)}, không có tiền để nộp)")
            action = f"XÓA CK"
            total_ck = 0
    elif phai_nop > 0 and len(existing_cks) == 0:
        # Chưa có CK → tạo mới
        supabase.from_("chuyen_khoan_noi_bo").insert({
            "ngay": day,
            "tu_vi_id": tm_id,
            "den_vi_id": mb_id,
            "so_tien": phai_nop,
            "dien_giai": f"Nộp tiền mặt (Thu {fmt(dt)} - Chi {fmt(cp)})",
        }).execute()
        created += 1
        details.append(f"  {day}: TẠO CK {fmt(phai_nop)} (chưa có CK)")
        action = f"TẠO {fmt(phai_nop)}"
        total_ck = phai_nop
    elif abs(total_ck - phai_nop) > 0:
        # Có CK nhưng sai số → sửa
        for c in existing_cks:
            supabase.from_("chuyen_khoan_noi_bo").update({
                "so_tien": phai_nop,
                "dien_giai": f"{c.get('dien_giai','Nộp tiền mặt')} [sửa: {fmt(c['so_tien'])} → {fmt(phai_nop)}]"
            }).eq("id", c['id']).execute()
            fixed += 1
            diff = phai_nop - c['so_tien']
            details.append(f"  {day}: SỬA CK {fmt(c['so_tien'])} → {fmt(phai_nop)} ({'thiếu' if diff > 0 else 'dư'} {fmt(abs(diff))})")
            action = f"SỬA→{fmt(phai_nop)}"
            break
        total_ck = phai_nop

    if action:
        print(f"  {day:<12s} {fmt(dt):>10s} {fmt(cp):>10s} {fmt(phai_nop):>12s} {fmt(total_ck):>12s} {action}")

if not details:
    print("  Tất cả đã đúng, không cần sửa!")

print(f"\n2. TỔNG KẾT:")
print(f"  Đã xóa CK: {deleted} | Đã tạo CK: {created} | Đã sửa CK: {fixed}")

for d in details:
    print(d)

# VERIFY
print("\n3. VERIFY SAU FIX:")
r = supabase.from_("so_du_vi_thuc_te").select("ten,so_du_hien_tai").order("thu_tu").execute()
total = 0
for vi in (r.data or []):
    sd = vi.get('so_du_hien_tai', 0) or 0; total += sd
    print(f"  {vi['ten']:15s} {fmt(sd)}")
print(f"  {'TỔNG':15s} {fmt(total)}")

# Kiểm tra chéo
print("\n4. KIỂM TRA CHÉO:")
for vi_name in ['Tiền Mặt', 'MB Bank', 'TP Bank']:
    vi = vi_ten[vi_name]
    if vi_name == 'Tiền Mặt':
        dt = sum(d['so_tien'] or 0 for d in (supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc","tien_mat").execute().data or []))
        cp = sum(d['so_tien'] or 0 for d in (supabase.from_("chi_phi").select("so_tien").eq("hinh_thuc_thanh_toan","tien_mat").execute().data or []))
    elif vi_name == 'MB Bank':
        dt = sum(d['so_tien'] or 0 for d in (supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc","chuyen_khoan").execute().data or []))
        cp = sum(d['so_tien'] or 0 for d in (supabase.from_("chi_phi").select("so_tien").eq("hinh_thuc_thanh_toan","chuyen_khoan").execute().data or []))
    else:
        dt = sum(d['so_tien'] or 0 for d in (supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc","quet_the").execute().data or []))
        cp = sum(d['so_tien'] or 0 for d in (supabase.from_("chi_phi").select("so_tien").eq("hinh_thuc_thanh_toan","quet_the").execute().data or []))

    ck_out = sum(d['so_tien'] or 0 for d in (supabase.from_("chuyen_khoan_noi_bo").select("so_tien").eq("tu_vi_id",vi['id']).execute().data or []))
    ck_in = sum(d['so_tien'] or 0 for d in (supabase.from_("chuyen_khoan_noi_bo").select("so_tien").eq("den_vi_id",vi['id']).execute().data or []))

    sd = vi.get('so_du_dau',0) or 0
    calc = sd + dt - cp + ck_in - ck_out
    view = next((v for v in (r.data or []) if v['ten']==vi_name), {}).get('so_du_hien_tai',0) or 0
    match = "✅" if calc == view else f"❌ LỆCH {fmt(calc - view)}"
    print(f"  {vi_name:15s} calc={fmt(calc)} view={fmt(view)} {match}")

print("\n" + "=" * 65)
print("HOAN TAT")
