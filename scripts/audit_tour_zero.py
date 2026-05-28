"""Kiểm tra 131 dịch vụ có KTV nhưng tien_tour = 0"""
import sys, io, requests
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
H = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}

def fetch(table, select, filter_str="", limit=100000):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit={limit}"
    if filter_str:
        url += f"&{filter_str}"
    r = requests.get(url, headers=H, timeout=90)
    return r.json() if r.status_code == 200 else []

def sep(title):
    print("\n" + "="*64)
    print(f"  {title}")
    print("="*64)

# ── Lấy các dòng dv có KTV nhưng tour=0 ─────────────────────
sep("Dịch vụ có KTV nhưng tien_tour = 0 (và ti_le_hoa_hong > 0)")

items = fetch(
    "don_hang_chi_tiet",
    "id,dich_vu_id,nhan_vien_id,tien_tour,ti_le_hoa_hong,don_gia,thanh_tien",
    "loai_item=eq.dich_vu&nhan_vien_id=not.is.null&tien_tour=eq.0",
    limit=10000,
)

# Lấy tên dịch vụ và tên NV
dv_ids = list({i["dich_vu_id"] for i in items if i.get("dich_vu_id")})
nv_ids = list({i["nhan_vien_id"] for i in items if i.get("nhan_vien_id")})

dv_map, nv_map = {}, {}
if dv_ids:
    # Fetch theo batch
    batch = ",".join(dv_ids)
    dvs = fetch("dich_vu", "id,ten,ti_le_hoa_hong,danh_muc", f"id=in.({batch})")
    dv_map = {d["id"]: d for d in dvs}

if nv_ids:
    batch = ",".join(nv_ids)
    nvs = fetch("nhan_vien", "id,ho_ten,vi_tri,trang_thai", f"id=in.({batch})")
    nv_map = {n["id"]: n for n in nvs}

# ── Phân nhóm theo nguyên nhân ────────────────────────────────
no_rate   = []  # ti_le_hoa_hong = 0 (dịch vụ không có HH)
has_rate  = []  # ti_le_hoa_hong > 0 (có HH nhưng tour = 0 → lỗi)

for i in items:
    rate = i.get("ti_le_hoa_hong") or 0
    if rate > 0:
        has_rate.append(i)
    else:
        no_rate.append(i)

print(f"\n  Tổng dòng dv có KTV + tour=0    : {len(items):,}")
print(f"  - ti_le_hoa_hong = 0 (không HH) : {len(no_rate):,}  (bình thường)")
print(f"  - ti_le_hoa_hong > 0 (có HH→lỗi): {len(has_rate):,}  ← CẦN FIX")

# ── Nhóm theo dịch vụ ─────────────────────────────────────────
sep("Chi tiết: Dịch vụ CÓ hoa hồng nhưng tour = 0")

by_dv = defaultdict(list)
for i in has_rate:
    by_dv[i.get("dich_vu_id", "unknown")].append(i)

print(f"  {'Dịch Vụ':<40} {'DM':<20} {'HH%':>5} {'Số dòng':>8} {'Tổng GT':>12}")
print(f"  {'-'*40} {'-'*20} {'-'*5} {'-'*8} {'-'*12}")
for dv_id, rows in sorted(by_dv.items(), key=lambda x: -len(x[1])):
    dv = dv_map.get(dv_id, {})
    ten   = (dv.get("ten") or dv_id[:12])[:40]
    dm    = (dv.get("danh_muc") or "")[:20]
    hh    = dv.get("ti_le_hoa_hong") or (rows[0].get("ti_le_hoa_hong") or 0)
    total = sum(i.get("thanh_tien") or 0 for i in rows)
    print(f"  {ten:<40} {dm:<20} {hh:>5.1f} {len(rows):>8,} {total:>12,.0f}")

# ── Nhóm theo NV ──────────────────────────────────────────────
sep("Nhân Viên ảnh hưởng")
by_nv = defaultdict(int)
by_nv_gt = defaultdict(int)
for i in has_rate:
    nv_id = i.get("nhan_vien_id", "")
    by_nv[nv_id] += 1
    by_nv_gt[nv_id] += (i.get("thanh_tien") or 0)

print(f"  {'Nhân Viên':<30} {'Vị Trí':<12} {'TT':<10} {'Số dòng':>8} {'Tổng DT bị mất HH':>20}")
print(f"  {'-'*30} {'-'*12} {'-'*10} {'-'*8} {'-'*20}")
for nv_id, cnt in sorted(by_nv.items(), key=lambda x: -x[1]):
    nv   = nv_map.get(nv_id, {})
    ten  = (nv.get("ho_ten") or nv_id[:12])[:30]
    vt   = (nv.get("vi_tri") or "")[:12]
    tt   = (nv.get("trang_thai") or "?")[:10]
    total = by_nv_gt[nv_id]
    print(f"  {ten:<30} {vt:<12} {tt:<10} {cnt:>8,} {total:>20,.0f}")

# ── Dòng có rate > 0 nhưng tour=0 và don_gia=0 ───────────────
sep("Phân tích nguyên nhân sâu hơn")
gia_zero = [i for i in has_rate if (i.get("don_gia") or 0) == 0]
gia_ok   = [i for i in has_rate if (i.get("don_gia") or 0) > 0]
print(f"  Trong {len(has_rate)} dòng CÓ lỗi:")
print(f"  - don_gia = 0 (không có giá) : {len(gia_zero):,}  ← tienTour=0 vì don_gia=0")
print(f"  - don_gia > 0 (có giá) nhưng tour=0 : {len(gia_ok):,}  ← lỗi tính toán hoặc thiếu ti_le")

# Xem thử 5 dòng gia>0 mà tour=0
if gia_ok:
    print(f"\n  Sample 5 dòng có don_gia>0 nhưng tour=0:")
    for i in gia_ok[:5]:
        dv = dv_map.get(i.get("dich_vu_id"), {})
        nv = nv_map.get(i.get("nhan_vien_id"), {})
        print(f"    DV: {(dv.get('ten') or '?')[:35]:<35}  "
              f"don_gia={i.get('don_gia'):,}  "
              f"ti_le={i.get('ti_le_hoa_hong')}  "
              f"NV: {nv.get('ho_ten','?')}")

print("\n✅ Xong.")
