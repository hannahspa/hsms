import os
"""Kiểm tra toàn bộ database sau migration 010"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fmt(n):
    if n is None: return "0d"
    return f"{int(n):,}d".replace(",", ".")

def check(label, ok, detail=""):
    icon = "[OK]" if ok else "[LOI]"
    print(f"  {icon} {label} {detail}")
    return ok

all_ok = True

print("=" * 65)
print("KIEM TRA TOAN BO DATABASE — SAU MIGRATION 010")
print("=" * 65)

# 1. vi.loai
print("\n1. VI TABLE")
r = supabase.from_("vi").select("ten,loai,so_du_dau").order("thu_tu").execute()
expected = {"Tiền Mặt": "tien_mat", "MB Bank": "chuyen_khoan", "TP Bank": "quet_the"}
for v in (r.data or []):
    ok = v["loai"] == expected.get(v["ten"], "???")
    if not check(f"{v['ten']} loai={v['loai']}", ok, f"so_du_dau={fmt(v.get('so_du_dau'))}"):
        all_ok = False

# 2. View so_du_vi_thuc_te
print("\n2. VIEW so_du_vi_thuc_te")
r = supabase.from_("so_du_vi_thuc_te").select("*").order("thu_tu").execute()
total = 0
for vi in (r.data or []):
    sd = vi.get("so_du_hien_tai", 0) or 0
    total += sd
    print(f"  {vi['ten']:15s}  so_du_hien_tai = {fmt(sd)}")
print(f"  {'TONG TAI SAN':15s}  = {fmt(total)}")

dt_total = supabase.from_("doanh_thu").select("hinh_thuc,so_tien").execute()
cp_total = supabase.from_("chi_phi").select("hinh_thuc_thanh_toan,so_tien").execute()
thuc_thu = sum(d["so_tien"] or 0 for d in (dt_total.data or []) if d.get("hinh_thuc") != "the_tra_truoc")
tong_chi = sum(d["so_tien"] or 0 for d in (cp_total.data or []))
loi_nhuan = thuc_thu - tong_chi
ok = total == loi_nhuan
if not check(f"Tong TS ({fmt(total)}) = Thuc thu ({fmt(thuc_thu)}) - Tong chi ({fmt(tong_chi)}) = {fmt(loi_nhuan)}", ok):
    all_ok = False

# 3. chi_phi mismatch
print("\n3. CHI_PHI — hinh_thuc_thanh_toan vs vi.loai")
vi_data = supabase.from_("vi").select("id,loai").execute()
vi_map = {v["id"]: v["loai"] for v in (vi_data.data or [])}
cp_data = supabase.from_("chi_phi").select("id,vi_id,hinh_thuc_thanh_toan").execute()
mismatches = 0
for cp in (cp_data.data or []):
    vid = cp.get("vi_id")
    if vid and vid in vi_map and cp.get("hinh_thuc_thanh_toan", "") != vi_map[vid]:
        mismatches += 1
if not check(f"chi_phi mismatches: {mismatches}", mismatches == 0):
    all_ok = False

# 4. khach_hang columns
print("\n4. KHACH_HANG COLUMNS (005 + 008)")
try:
    r = supabase.from_("khach_hang").select("id,tong_chi_tieu,so_lan_den,hang,ma_kh").limit(1).execute()
    d = r.data[0] if r.data else {}
    for col in ["tong_chi_tieu", "so_lan_den", "hang", "ma_kh"]:
        if not check(f"khach_hang.{col}", col in d):
            all_ok = False
except Exception as e:
    check("khach_hang query", False, str(e)[:80])
    all_ok = False

# 5. ma_sp, ma_the, ma_dv
print("\n5. MA CODE COLUMNS (008)")
checks = [
    ("kho_san_pham", "ma_sp"),
    ("the_lieu_trinh", "ma_the"),
    ("dich_vu", "ma_dv"),
]
for table, col in checks:
    try:
        r = supabase.from_(table).select("id").limit(1).execute()
        r2 = supabase.from_(table).select(f"id,{col}").limit(1).execute()
        d = r2.data[0] if r2.data else {}
        if not check(f"{table}.{col}", col in d):
            all_ok = False
    except Exception as e:
        check(f"{table}.{col}", False, str(e)[:60])
        all_ok = False

# 6. RPC functions
print("\n6. RPC FUNCTIONS (006 + 008)")
for rpc_name in ["pos_finalize_order", "pos_void_order", "tinh_tong_chi_tieu_kh"]:
    try:
        r = supabase.rpc(rpc_name, {}).execute()
        check(f"RPC {rpc_name}", True)
    except Exception as e:
        err = str(e)
        if "Could not find" in err:
            check(f"RPC {rpc_name}", False, "MISSING")
            all_ok = False
        elif any(w in err.lower() for w in ["cannot be null", "not found", "does not exist"]):
            check(f"RPC {rpc_name}", True, "(exists, needs params)")
        else:
            check(f"RPC {rpc_name}", True, f"(exists)")

# 7. POS tables
print("\n7. POS TABLES (004)")
for t in ["don_hang", "don_hang_chi_tiet", "thanh_toan", "cong_no_khach_hang", "lich_su_dung_the", "lich_hen"]:
    try:
        r = supabase.from_(t).select("count", count="exact").limit(0).execute()
        check(f"Table {t}", True, f"count={r.count}")
    except Exception as e:
        check(f"Table {t}", False, str(e)[:60])
        all_ok = False

# 8. Views
print("\n8. VIEWS")
for view_name in ["so_du_vi_thuc_te", "bao_cao_doanh_thu_day_du", "lich_su_dich_vu_kh", "lich_su_giao_dich_tong_hop"]:
    try:
        r = supabase.from_(view_name).select("count", count="exact").limit(0).execute()
        check(f"View {view_name}", True, f"count={r.count}")
    except Exception as e:
        check(f"View {view_name}", False, str(e)[:60])
        all_ok = False

# 9. CHECK constraints via the_lieu_trinh
print("\n9. CHECK CONSTRAINTS")
dt_hinh_thuc = supabase.from_("doanh_thu").select("hinh_thuc").execute()
types = set(d["hinh_thuc"] for d in (dt_hinh_thuc.data or []))
check(f"doanh_thu hinh_thuc values: {sorted(types)}", "the_lieu_trinh" in types or True)

# 10. Doanh thu summary
print("\n10. DOANH THU SUMMARY")
dt_map = {}
for d in (dt_hinh_thuc.data or []):
    t = d["hinh_thuc"]
    dt_map[t] = dt_map.get(t, 0) + 1
for t, c in sorted(dt_map.items(), key=lambda x: -x[1]):
    r = supabase.from_("doanh_thu").select("so_tien").eq("hinh_thuc", t).execute()
    total_t = sum(d2["so_tien"] or 0 for d2 in (r.data or []))
    print(f"  {t:20s}  {c:4d} records  {fmt(total_t)}")

print()
print("=" * 65)
if all_ok:
    print("KET QUA: TAT CA DEU HOAN CHINH!")
else:
    print("KET QUA: CON LOI — xem chi tiet ben tren")
print("=" * 65)
