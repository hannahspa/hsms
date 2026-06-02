import os
"""Kiểm tra chất lượng dữ liệu + kiểm tra ngày 28/02"""
import sys, io
sys.path.insert(0, '.')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
def fmt(n):
    if n is None: return "0d"
    return f"{int(n):,}d".replace(",", ".")

print("=" * 65)
print("DON DEP DU LIEU + KIEM TRA 28/02")
print("=" * 65)

# ══════════════════════════════════════════════
# 1. KIEM TRA NGAY 28/02/2026
# ══════════════════════════════════════════════
target = '2026-02-28'
print(f"\n1. KIEM TRA NGAY {target}")
print("-" * 50)

r = supabase.from_("lich_su_giao_dich_tong_hop").select("*").eq("ngay", target).order("created_at").execute()
if r.data:
    for gd in r.data:
        dg = gd.get('dien_giai') or ''
        print(f"  {gd['loai']:8s}  {fmt(gd.get('so_tien')):>15s}  {dg[:50]}")

    dt = sum(g['so_tien'] or 0 for g in r.data if g['loai'] == 'thu')
    cp = sum(g['so_tien'] or 0 for g in r.data if g['loai'] == 'chi')
    ck = sum(g['so_tien'] or 0 for g in r.data if g['loai'] == 'chuyen_khoan')
    print(f"\n  Doanh thu: {fmt(dt)}  |  Chi phi: {fmt(cp)}  |  CK: {fmt(ck)}")
else:
    print("  KHONG CO GIAO DICH NAO!")

# Kiểm tra doanh_thu ngày 28/02
r = supabase.from_("doanh_thu").select("hinh_thuc, so_tien, dien_giai").eq("ngay", target).execute()
dt_by_type = {}
for d in (r.data or []):
    t = d['hinh_thuc']
    dt_by_type[t] = dt_by_type.get(t, 0) + (d['so_tien'] or 0)
print(f"\n  Doanh thu 28/02:")
for t, v in dt_by_type.items():
    print(f"    {t:20s} {fmt(v)}")

# Kiểm tra chi_phi ngày 28/02
r = supabase.from_("chi_phi").select("hinh_thuc_thanh_toan, so_tien, dien_giai").eq("ngay", target).execute()
cp_by_type = {}
for d in (r.data or []):
    t = d.get('hinh_thuc_thanh_toan','?')
    cp_by_type[t] = cp_by_type.get(t, 0) + (d['so_tien'] or 0)
print(f"\n  Chi phi 28/02:")
for t, v in cp_by_type.items():
    print(f"    {t:20s} {fmt(v)}")

# Chuyển khoản ngày 28/02
r = supabase.from_("chuyen_khoan_noi_bo").select("tu_vi_id, den_vi_id, so_tien, dien_giai").eq("ngay", target).execute()
print(f"\n  Chuyen khoan noi bo 28/02:")
vi_map = {}
for v in (supabase.from_("vi").select("id,ten").execute().data or []):
    vi_map[v['id']] = v['ten']
for ck in (r.data or []):
    print(f"    {vi_map.get(ck['tu_vi_id'],'?')} -> {vi_map.get(ck['den_vi_id'],'?')}: {fmt(ck['so_tien'])}  {ck.get('dien_giai','')}")

# ══════════════════════════════════════════════
# 2. DON DEP DU LIEU — TIM DU LIEU SAI/TRUNG
# ══════════════════════════════════════════════
print(f"\n\n2. DON DEP DU LIEU")
print("-" * 50)

# 2a: Tim doanh_thu bi trung lap
print("\n2a. Doanh thu trung lap (cung ngay + hinh_thuc + so_tien):")
from collections import defaultdict
r = supabase.from_("doanh_thu").select("id, ngay, hinh_thuc, so_tien, dien_giai").execute()
groups = defaultdict(list)
for d in (r.data or []):
    key = (d['ngay'], d['hinh_thuc'], d['so_tien'])
    groups[key].append(d)
dups = {k: v for k, v in groups.items() if len(v) > 1}
if dups:
    for k, v in list(dups.items())[:10]:
        print(f"  {k[0]} {k[1]:15s} {fmt(k[2])} x{len(v)} records")
        for d in v:
            print(f"    id={d['id'][:8]}... {d.get('dien_giai','')[:40]}")
    print(f"  Tong: {len(dups)} nhom trung lap")
else:
    print("  Khong phat hien trung lap")

# 2b: Tim chi_phi co danh_muc_id NULL hoac sai
print("\n2b. Chi phi khong co danh muc:")
r = supabase.from_("chi_phi").select("id, ngay, so_tien, dien_giai").is_("danh_muc_id", "null").execute()
for d in (r.data or [])[:5]:
    print(f"  {d['ngay']} {fmt(d['so_tien'])} {d.get('dien_giai','')[:60]}")
print(f"  Tong: {len(r.data or [])} records thieu danh muc")

# 2c: Tim giao dich ngay tuong lai hoac qua xa
print("\n2c. Doanh thu ngay bat thuong (<2025 hoac >2026):")
r = supabase.from_("doanh_thu").select("ngay, so_tien, dien_giai").lt("ngay", "2025-01-01").execute()
for d in (r.data or [])[:5]:
    print(f"  {d['ngay']} {fmt(d['so_tien'])} {d.get('dien_giai','')[:50]}")
r2 = supabase.from_("doanh_thu").select("ngay, so_tien, dien_giai").gt("ngay", "2026-12-31").execute()
for d in (r2.data or [])[:5]:
    print(f"  {d['ngay']} {fmt(d['so_tien'])} {d.get('dien_giai','')[:50]}")
print(f"  Tong ngay bat thuong: {len(r.data or []) + len(r2.data or [])}")

print("\n2d. Chi phi ngay bat thuong:")
r = supabase.from_("chi_phi").select("ngay, so_tien, dien_giai").lt("ngay", "2025-01-01").execute()
for d in (r.data or [])[:5]:
    print(f"  {d['ngay']} {fmt(d['so_tien'])} {d.get('dien_giai','')[:50]}")
r2 = supabase.from_("chi_phi").select("ngay, so_tien, dien_giai").gt("ngay", "2026-12-31").execute()
for d in (r2.data or [])[:5]:
    print(f"  {d['ngay']} {fmt(d['so_tien'])} {d.get('dien_giai','')[:50]}")
print(f"  Tong ngay bat thuong: {len(r.data or []) + len(r2.data or [])}")

# 2e: Tim so_tien am hoac = 0
print("\n2e. Doanh thu so_tien <= 0:")
r = supabase.from_("doanh_thu").select("ngay, so_tien, dien_giai").lte("so_tien", 0).execute()
for d in (r.data or []):
    print(f"  {d['ngay']} {fmt(d['so_tien'])} {d.get('dien_giai','')[:50]}")
print(f"  Tong: {len(r.data or [])}")

print("\n2f. Chi phi so_tien <= 0:")
r = supabase.from_("chi_phi").select("ngay, so_tien, dien_giai").lte("so_tien", 0).execute()
for d in (r.data or []):
    print(f"  {d['ngay']} {fmt(d['so_tien'])} {d.get('dien_giai','')[:50]}")
print(f"  Tong: {len(r.data or [])}")

# 2g: Tim dien_giai rong hoac NULL
print("\n2g. Chi phi thieu dien_giai:")
r = supabase.from_("chi_phi").select("id, ngay, so_tien", order="ngay.desc").limit(100).execute()
empty = [d for d in (r.data or []) if not (d.get('dien_giai') or '').strip()]
print(f"  Trong 100 records gan nhat: {len(empty)} thieu dien giai")

# 2h: Kiem tra doi_soat_ngay
print("\n2h. Doi soat ngay records:")
r = supabase.from_("doi_soat_ngay").select("ngay, muc_kiem_tra, ket_qua, nguoi_doi_soat").order("ngay", ascending=False).limit(20).execute()
for d in (r.data or []):
    print(f"  {d['ngay']} | {d.get('muc_kiem_tra','?'):25s} | {d.get('ket_qua')} | {d.get('nguoi_doi_soat','?')}")

print("\n" + "=" * 65)
print("HOAN TAT")
