import os
"""Undo fix sai + Fix lại đúng logic: chỉ sửa CK sai, không tạo CK cho ngày chưa nộp"""
import sys, io, re
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

r = supabase.from_("vi").select("id,ten").execute()
vi_ten = {v['ten']: v for v in (r.data or [])}
tm_id = vi_ten['Tiền Mặt']['id']

print("=" * 65)
print("UNDO + FIX DUNG LOGIC")
print("=" * 65)

# ══════════════════════════════════════════════
# STEP 1: UNDO - Xóa CK auto-fix và khôi phục CK đã sửa
# ══════════════════════════════════════════════
print("\n1. UNDO:")

# Xóa CK mới tạo (có "Auto-fix:" trong dien_giai và được tạo bởi script trước)
r = supabase.from_("chuyen_khoan_noi_bo").select("id, ngay, so_tien, dien_giai").eq("tu_vi_id", tm_id).gte("ngay", "2025-11-26").ilike("dien_giai", "%Auto-fix%").execute()

deleted_new = 0
restored = 0
for ck in (r.data or []):
    dg = ck.get('dien_giai', '')

    # Pattern 1: CK mới tạo "Auto-fix: Nộp tiền mặt ngày..."
    if dg.startswith("Auto-fix: Nộp tiền mặt"):
        supabase.from_("chuyen_khoan_noi_bo").delete().eq("id", ck['id']).execute()
        deleted_new += 1
        print(f"  XÓA: {ck['ngay']} {fmt(ck['so_tien'])} (CK mới tạo)")

    # Pattern 2: CK bị sửa "original_dg [Auto-fix: X → Y]"
    elif "[Auto-fix:" in dg:
        # Parse original value
        m = re.search(r'\[Auto-fix: ([\d.,]+)d? →', dg)
        if m:
            orig_str = m.group(1).replace('.', '').replace(',', '')
            orig_val = int(orig_str)
            # Restore original amount and clean up dien_giai
            clean_dg = dg.split('[Auto-fix:')[0].strip()
            supabase.from_("chuyen_khoan_noi_bo").update({
                "so_tien": orig_val,
                "dien_giai": clean_dg if clean_dg else None
            }).eq("id", ck['id']).execute()
            restored += 1
            print(f"  KHÔI PHỤC: {ck['ngay']} {fmt(ck['so_tien'])} → {fmt(orig_val)}")

print(f"  Đã xóa {deleted_new} CK mới, khôi phục {restored} CK bị sửa")

# ══════════════════════════════════════════════
# STEP 2: FIX ĐÚNG - Chỉ tạo CK cho 28/02 (mới nhất, rõ ràng nhất)
# ══════════════════════════════════════════════
print("\n2. FIX ĐÚNG:")

# Kiểm tra dữ liệu 28/02
r = supabase.from_("doanh_thu").select("so_tien").eq("ngay", "2026-02-28").eq("hinh_thuc", "tien_mat").execute()
dt_tm = sum(d['so_tien'] or 0 for d in (r.data or []))
r = supabase.from_("chi_phi").select("so_tien").eq("ngay", "2026-02-28").eq("hinh_thuc_thanh_toan", "tien_mat").execute()
cp_tm = sum(d['so_tien'] or 0 for d in (r.data or []))
r = supabase.from_("chuyen_khoan_noi_bo").select("id,so_tien").eq("ngay", "2026-02-28").eq("tu_vi_id", tm_id).execute()
has_ck = len(r.data or []) > 0

phai_nop = dt_tm - cp_tm
print(f"  28/02: Thu TM={fmt(dt_tm)} Chi TM={fmt(cp_tm)} Cần nộp={fmt(phai_nop)}")

if phai_nop > 0 and not has_ck:
    supabase.from_("chuyen_khoan_noi_bo").insert({
        "ngay": "2026-02-28",
        "tu_vi_id": tm_id,
        "den_vi_id": vi_ten['MB Bank']['id'],
        "so_tien": phai_nop,
        "dien_giai": f"Nộp tiền mặt cuối ngày (Thu {fmt(dt_tm)} - Chi {fmt(cp_tm)})",
    }).execute()
    print(f"  ✅ Đã tạo CK {fmt(phai_nop)} cho 28/02")
elif has_ck:
    print(f"  Đã có CK rồi, không cần tạo")

# ══════════════════════════════════════════════
# STEP 3: FIX chi_phi: mapping hinh_thuc_thanh_toan theo vi.ten
# ══════════════════════════════════════════════
print("\n3. CHUẨN HÓA CHI PHÍ (lần cuối):")
r = supabase.from_("chi_phi").select("id, vi_id, hinh_thuc_thanh_toan").execute()
fixed = 0
for cp in (r.data or []):
    vid = cp.get('vi_id')
    cur = cp.get('hinh_thuc_thanh_toan', '')
    # Xác định giá trị đúng
    if vid == tm_id:
        correct = 'tien_mat'
    else:
        vi = next((v for v in vi_ten.values() if v['id'] == vid), None)
        if vi and 'MB' in vi['ten']:
            correct = 'chuyen_khoan'
        elif vi and 'TP' in vi['ten']:
            correct = 'quet_the'
        else:
            continue
    if cur != correct:
        supabase.from_("chi_phi").update({"hinh_thuc_thanh_toan": correct}).eq("id", cp['id']).execute()
        fixed += 1

r = supabase.from_("chi_phi").select("hinh_thuc_thanh_toan").execute()
from collections import Counter
c = Counter(d['hinh_thuc_thanh_toan'] for d in (r.data or []))
print(f"  Đã fix {fixed} | Types: {dict(c)}")

# ══════════════════════════════════════════════
# VERIFY CUỐI CÙNG
# ══════════════════════════════════════════════
print("\n4. VERIFY CUỐI CÙNG:")
r = supabase.from_("so_du_vi_thuc_te").select("ten,so_du_hien_tai").order("thu_tu").execute()
total = 0
for vi in (r.data or []):
    sd = vi.get('so_du_hien_tai', 0) or 0; total += sd
    print(f"  {vi['ten']:15s} {fmt(sd)}")
print(f"  {'TỔNG':15s} {fmt(total)}")

# Kiểm tra tiền mặt từng ngày sau fix
print("\n5. DÒNG TIỀN MẶT SAU FIX:")
r = supabase.from_("doanh_thu").select("ngay,so_tien").eq("hinh_thuc","tien_mat").gte("ngay","2025-11-26").lte("ngay","2026-02-28").execute()
dt_day = defaultdict(int)
for d in (r.data or []): dt_day[d['ngay']] += (d['so_tien'] or 0)
r = supabase.from_("chi_phi").select("ngay,so_tien").eq("hinh_thuc_thanh_toan","tien_mat").gte("ngay","2025-11-26").lte("ngay","2026-02-28").execute()
cp_day = defaultdict(int)
for d in (r.data or []): cp_day[d['ngay']] += (d['so_tien'] or 0)
r = supabase.from_("chuyen_khoan_noi_bo").select("ngay,so_tien").eq("tu_vi_id",tm_id).gte("ngay","2025-11-26").lte("ngay","2026-02-28").execute()
ck_day = defaultdict(int)
for d in (r.data or []): ck_day[d['ngay']] += (d['so_tien'] or 0)

all_days = sorted(set(list(dt_day.keys()) + list(cp_day.keys()) + list(ck_day.keys())))
running = 0
anomalies = 0
for day in all_days:
    dt = dt_day[day]; cp = cp_day[day]; ck = ck_day[day]
    phai = dt - cp; delta = phai - ck
    running += dt - cp - ck
    if abs(delta) > 500:
        anomalies += 1
        print(f"  {day}: Thu={fmt(dt)} Chi={fmt(cp)} Cần nộp={fmt(phai)} Đã nộp={fmt(ck)} CHÊNH={fmt(delta)}")

print(f"  Số dư cuối: {fmt(running)} | Ngày chênh >500d: {anomalies}/{len(all_days)}")

print("\n" + "=" * 65)
print("HOAN TAT")
