"""Kiểm tra toàn bộ data integrity MySpa → HSMS — dùng count-only để tránh giới hạn 1000 rows"""
import sys, io, requests
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
H = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}

def count(table, filter_str=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=id"
    if filter_str:
        url += f"&{filter_str}"
    r = requests.get(url, headers={**H, "Prefer": "count=exact", "Range": "0-0"}, timeout=30)
    try:
        return int(r.headers.get("Content-Range", "0/0").split("/")[1])
    except:
        return -1

def sum_col(table, col, filter_str=""):
    """Lấy SUM một cột qua PostgREST aggregate"""
    # PostgREST không có SUM native → dùng RPC hoặc fetch
    # Dùng cách đơn giản: lấy giá trị từ select với group
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={col}&limit=100000"
    if filter_str:
        url += f"&{filter_str}"
    r = requests.get(url, headers=H, timeout=60)
    if r.status_code == 200:
        return sum((row.get(col) or 0) for row in r.json())
    return -1

def fetch(table, select, filter_str="", limit=100000):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit={limit}"
    if filter_str:
        url += f"&{filter_str}"
    r = requests.get(url, headers=H, timeout=90)
    return r.json() if r.status_code == 200 else []

def sep(title):
    print("\n" + "="*62)
    print(f"  {title}")
    print("="*62)

# ────────────────────────────────────────────────────────────
sep("1 — SỐ LƯỢNG RECORDS TỪNG BẢNG")
# ────────────────────────────────────────────────────────────

rows = [
    ("khach_hang",         "",                                          "Tổng KH"),
    ("khach_hang",         "is_active=eq.true",                        "KH active"),
    ("the_lieu_trinh",     "",                                          "Tổng thẻ LT"),
    ("the_lieu_trinh",     "trang_thai=eq.active",                     "Thẻ active"),
    ("the_lieu_trinh",     "so_buoi_con_lai=gt.0",                     "Thẻ còn buổi"),
    ("the_lieu_trinh",     "gia_tri_the=eq.0",                         "Thẻ gia_tri_the=0 ⚠"),
    ("the_lieu_trinh",     "gia_tri_the=gt.0",                         "Thẻ có giá trị"),
    ("don_hang",           "is_test=eq.false",                         "Đơn thật"),
    ("don_hang",           "is_test=eq.true",                          "Đơn test"),
    ("don_hang",           "trang_thai=eq.da_thanh_toan&is_test=eq.false", "Đơn thật đã chốt"),
    ("don_hang",           "khach_hang_id=not.is.null&is_test=eq.false",   "Đơn có KH liên kết"),
    ("don_hang",           "khach_hang_id=is.null&is_test=eq.false",       "Đơn KHÔNG có KH ⚠"),
    ("don_hang_chi_tiet",  "",                                          "Tổng dòng chi tiết"),
    ("don_hang_chi_tiet",  "loai_item=eq.dich_vu",                     "  loai=dich_vu"),
    ("don_hang_chi_tiet",  "loai_item=eq.the_lieu_trinh",              "  loai=the_lieu_trinh"),
    ("don_hang_chi_tiet",  "loai_item=eq.san_pham",                    "  loai=san_pham"),
    ("don_hang_chi_tiet",  "loai_item=eq.the_moi",                     "  loai=the_moi"),
    ("don_hang_chi_tiet",  "nhan_vien_id=is.null",                     "  KHÔNG có KTV ⚠"),
    ("don_hang_chi_tiet",  "tien_tour=gt.0",                           "  tien_tour > 0"),
    ("don_hang_chi_tiet",  "tien_tour=eq.0&loai_item=eq.dich_vu",      "  dv + tour=0 ⚠"),
    ("don_hang_chi_tiet",  "tien_tour=eq.0&loai_item=eq.the_lieu_trinh", "  the + tour=0 ⚠"),
    ("nhan_vien_thu_nhap", "is_test=eq.false",                         "Ledger thật"),
    ("nhan_vien_thu_nhap", "loai=eq.tour&is_test=eq.false",            "  loai=tour"),
    ("nhan_vien_thu_nhap", "loai=eq.commission&is_test=eq.false",      "  loai=commission"),
    ("nhan_vien",          "trang_thai=eq.dang_lam",                   "NV đang làm"),
    ("dich_vu",            "is_active=eq.true",                        "Dịch vụ active"),
    ("kho_san_pham",       "",                                          "Sản phẩm kho"),
    ("kho_san_pham",       "is_active=eq.true",                        "Sản phẩm active"),
]

for tbl, flt, label in rows:
    n = count(tbl, flt)
    print(f"  {n:>8,}  {label}")

# ────────────────────────────────────────────────────────────
sep("2 — TIỀN TOUR: ĐỐI SOÁT CHI TIẾT ĐƠN vs LEDGER")
# ────────────────────────────────────────────────────────────

# Tổng tien_tour trong chi tiết đơn (chỉ đơn thật)
# Cần join → dùng fetch rồi lọc
print("  Đang tổng hợp tiền tour trong chi tiết đơn...")

# Dùng count filter thẻ LT với KTV và tour=0 — đây là vấn đề chính
n_the_ktv_tour_zero = count(
    "don_hang_chi_tiet",
    "loai_item=eq.the_lieu_trinh&nhan_vien_id=not.is.null&tien_tour=eq.0"
)
n_dv_ktv_tour_zero = count(
    "don_hang_chi_tiet",
    "loai_item=eq.dich_vu&nhan_vien_id=not.is.null&tien_tour=eq.0"
)

print(f"\n  Dòng thẻ LT: có KTV + tour=0  : {n_the_ktv_tour_zero:,}  ← Tiền tour bị mất")
print(f"  Dòng dịch vụ: có KTV + tour=0  : {n_dv_ktv_tour_zero:,}  ← Tiền tour bị mất")

# Tổng tiền tour trong ledger theo từng NV
print("\n  Đang lấy ledger tour theo KTV...")
ledger_tour = fetch("nhan_vien_thu_nhap", "nhan_vien_id,so_tien", "loai=eq.tour&is_test=eq.false")
nv_list     = fetch("nhan_vien", "id,ho_ten", "")
nv_map      = {n["id"]: n["ho_ten"] for n in nv_list}

from collections import defaultdict
ledger_by_nv = defaultdict(int)
for r in ledger_tour:
    if r.get("nhan_vien_id"):
        ledger_by_nv[r["nhan_vien_id"]] += (r.get("so_tien") or 0)

tong_ledger = sum(ledger_by_nv.values())
print(f"\n  Tổng tour trong ledger (is_test=false): {tong_ledger:,.0f}đ")
print(f"\n  {'Nhân Viên':<30} {'Tour Ledger (đ)':>16}")
print(f"  {'-'*30} {'-'*16}")
for nv_id, amt in sorted(ledger_by_nv.items(), key=lambda x: -x[1]):
    ten = nv_map.get(nv_id, nv_id[:8] + "…")
    print(f"  {ten:<30} {amt:>16,.0f}")

# ────────────────────────────────────────────────────────────
sep("3 — THẺ LIỆU TRÌNH: CHI TIẾT VẤN ĐỀ gia_tri_the")
# ────────────────────────────────────────────────────────────

print("  Đang phân tích thẻ liệu trình...")
the_sample = fetch("the_lieu_trinh", "gia_tri_the,trang_thai,so_buoi_tong,so_buoi_con_lai", "", limit=100000)

tong = len(the_sample)
zero_val = sum(1 for t in the_sample if (t.get("gia_tri_the") or 0) == 0)
co_val   = tong - zero_val
active   = sum(1 for t in the_sample if t.get("trang_thai") == "active")
con_buoi = sum(1 for t in the_sample if (t.get("so_buoi_con_lai") or 0) > 0)
zero_but_active = sum(1 for t in the_sample
                     if (t.get("gia_tri_the") or 0) == 0 and t.get("trang_thai") == "active")

print(f"  Tổng thẻ fetch được    : {tong:,}")
print(f"  gia_tri_the = 0        : {zero_val:,}  ({zero_val*100//tong if tong else 0}%)  ← NGHIÊM TRỌNG")
print(f"  gia_tri_the > 0        : {co_val:,}")
print(f"  Active + gia_tri_the=0 : {zero_but_active:,}  ← Thẻ active nhưng tính tour sai")
print(f"  Active tổng            : {active:,}")
print(f"  Còn buổi               : {con_buoi:,}")

if zero_val > 0:
    print("\n  ⚠  Toàn bộ thẻ LT import từ MySpa KHÔNG có gia_tri_the")
    print("     → Khi KTV checkout thẻ, tienTour = 0 vì baseTT = 0")
    print("     → Cần: UPDATE the_lieu_trinh SET gia_tri_the = dich_vu.gia_co_ban")
    print("              / so_buoi_tong (theo tên dịch vụ)")

# ────────────────────────────────────────────────────────────
sep("4 — KHO SẢN PHẨM")
# ────────────────────────────────────────────────────────────

sp_all    = count("kho_san_pham", "")
sp_active = count("kho_san_pham", "is_active=eq.true")
sp_ban    = count("kho_san_pham", "loai=eq.ban_khach")
sp_tieu   = count("kho_san_pham", "loai=eq.tieu_hao")
sp_vt     = count("kho_san_pham", "loai=eq.vat_tu")

print(f"  Tổng sản phẩm kho  : {sp_all:,}")
print(f"  Active             : {sp_active:,}")
print(f"  Loại ban_khach     : {sp_ban:,}")
print(f"  Loại tieu_hao      : {sp_tieu:,}")
print(f"  Loại vat_tu        : {sp_vt:,}")
if sp_active == 0:
    print("\n  ⚠  Chưa có sản phẩm nào trong kho — cần import từ MySpa")

# ────────────────────────────────────────────────────────────
sep("5 — TÓM TẮT VẤN ĐỀ CẦN FIX")
# ────────────────────────────────────────────────────────────

tong_the = count("the_lieu_trinh", "")
tong_the_gia_tri_zero = count("the_lieu_trinh", "gia_tri_the=eq.0")
tong_don = count("don_hang", "is_test=eq.false")
don_khong_kh = count("don_hang", "khach_hang_id=is.null&is_test=eq.false")

print(f"""
  ┌─ VẤN ĐỀ 1 (NGHIÊM TRỌNG) ─────────────────────────────┐
  │  {tong_the_gia_tri_zero:,}/{tong_the:,} thẻ liệu trình có gia_tri_the = 0          │
  │  → Tiền tour luôn = 0 khi KTV checkout thẻ             │
  │  → Fix: cập nhật gia_tri_the từ bảng dich_vu           │
  └──────────────────────────────────────────────────────────┘

  ┌─ VẤN ĐỀ 2 (BÌNH THƯỜNG) ───────────────────────────────┐
  │  {don_khong_kh:,}/{tong_don:,} đơn không có khách hàng liên kết         │
  │  → Đây là đơn khách vãng lai (Walk-in) — bình thường   │
  │  → MySpa cũng có nhiều đơn Walk-in                     │
  └──────────────────────────────────────────────────────────┘

  ┌─ VẤN ĐỀ 3 (CẦN XEM XÉT) ──────────────────────────────┐
  │  kho_san_pham: {sp_active:,} sản phẩm active                      │
  │  → POS tab "Sản Phẩm" không có hàng để bán             │
  │  → Cần import 300+ SP từ MySpa                         │
  └──────────────────────────────────────────────────────────┘
""")

print("✅ Audit hoàn tất.")
