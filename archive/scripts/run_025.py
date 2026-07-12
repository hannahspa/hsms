import os
"""Fix gia_tri_the + tien_tour retroactive dung REST API thuan"""
import sys, io, requests, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY  = os.environ["SUPABASE_KEY"]
H  = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
HJ = {**H, "Content-Type": "application/json", "Prefer": "return=minimal"}

def fetch(table, select, flt="", limit=10000):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit={limit}"
    if flt: url += f"&{flt}"
    r = requests.get(url, headers=H, timeout=60)
    return r.json() if r.status_code == 200 else []

def patch(table, flt, body):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{flt}"
    r = requests.patch(url, headers=HJ, json=body, timeout=30)
    return r.status_code in [200, 201, 204]

def post(table, rows):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.post(url, headers={**HJ, "Prefer": "resolution=merge-duplicates,return=minimal"},
                      json=rows, timeout=30)
    return r.status_code in [200, 201, 204]

def count_filter(table, flt):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=id&limit=0&{flt}"
    r = requests.get(url, headers={**H, "Prefer": "count=exact", "Range": "0-0"}, timeout=30)
    try:
        return int(r.headers.get("Content-Range", "0/0").split("/")[1])
    except:
        return -1

# ════════════════════════════════════════════════════════════
print("=" * 62)
print("  BUOC A: FIX gia_tri_the trong the_lieu_trinh")
print("=" * 62)

# Load dich_vu -> gia_co_ban map
dv_all = fetch("dich_vu", "id,ten,gia_co_ban,ti_le_hoa_hong", "is_active=eq.true")
dv_exact = {d["ten"]: d for d in dv_all}          # exact match
dv_list  = sorted(dv_all, key=lambda x: -len(x.get("ten") or ""))  # sorted by name length desc (for ILIKE)

def find_gia(ten_dv):
    """Tim gia_co_ban va ti_le theo ten dich vu, ho tro fuzzy."""
    if not ten_dv: return None, None
    # 1. Exact
    if ten_dv in dv_exact:
        d = dv_exact[ten_dv]
        return d.get("gia_co_ban") or 0, d.get("ti_le_hoa_hong") or 0
    # 2. Prefix match: ten_dv starts with dv.ten
    for d in dv_list:
        dv_ten = d.get("ten") or ""
        if dv_ten and ten_dv.startswith(dv_ten):
            return d.get("gia_co_ban") or 0, d.get("ti_le_hoa_hong") or 0
    return None, None

# Fetch tat ca the gia_tri_the=0 voi pagination
print("\nFetch the gia_tri_the=0...")
the_zero = []
PAGE = 1000
offset = 0
while True:
    batch = fetch("the_lieu_trinh",
                  "id,ten_dich_vu,so_buoi_tong,so_buoi_con_lai,gia_tri_the",
                  "gia_tri_the=eq.0",
                  limit=PAGE)
    # PostgREST tra ve theo thu tu nen can offset
    url = f"{SUPABASE_URL}/rest/v1/the_lieu_trinh?select=id,ten_dich_vu,so_buoi_tong,gia_tri_the&gia_tri_the=eq.0&limit={PAGE}&offset={offset}"
    r = requests.get(url, headers=H, timeout=60)
    rows = r.json() if r.status_code == 200 else []
    if not rows: break
    the_zero.extend(rows)
    offset += len(rows)
    if len(rows) < PAGE: break

print(f"  The gia_tri_the=0: {len(the_zero)}")

# Tinh gia_tri_the moi va update
matched = 0
skip = 0
BATCH_PATCH = 50
updates = []  # list of (id, gia_tri_the_moi)

for t in the_zero:
    ten   = t.get("ten_dich_vu") or ""
    buoi  = t.get("so_buoi_tong") or 1
    gia, _ = find_gia(ten)
    if gia and gia > 0:
        gia_tri_the_moi = gia * max(buoi, 1)
        updates.append((t["id"], gia_tri_the_moi))
        matched += 1
    else:
        skip += 1
        if skip <= 5:
            print(f"  [SKIP] Khong match: '{ten}'")

print(f"  Match: {matched}, Skip: {skip}")

# Gom nhom theo (ten_dich_vu, gia_tri_the_moi) -> 1 PATCH request fix nhieu the
from collections import defaultdict
by_ten_gia = defaultdict(list)  # key=(ten_dv, gia_moi) -> [ids]
ten_gia_map = {}  # map id -> (ten_dv, gia_moi)

for the_id, gia_moi in updates:
    # Tim ten_dv cua the nay
    the_info = next((t for t in the_zero if t["id"] == the_id), None)
    if not the_info: continue
    ten_dv = the_info.get("ten_dich_vu") or ""
    buoi   = the_info.get("so_buoi_tong") or 1
    key    = (ten_dv, buoi, gia_moi)
    by_ten_gia[key].append(the_id)

print(f"  Nhom unique (ten_dv, buoi): {len(by_ten_gia)} -> giam tu {matched} requests")
print(f"  Bat dau UPDATE...")

sess = requests.Session()
ok = err = 0
for idx, ((ten_dv, buoi, gia_moi), ids) in enumerate(by_ten_gia.items()):
    # Dung PATCH filter: ten_dich_vu=eq.{ten}&so_buoi_tong=eq.{buoi}&gia_tri_the=eq.0
    import urllib.parse
    flt = (f"ten_dich_vu=eq.{urllib.parse.quote(ten_dv, safe='')}"
           f"&so_buoi_tong=eq.{buoi}&gia_tri_the=eq.0")
    try:
        url = f"{SUPABASE_URL}/rest/v1/the_lieu_trinh?{flt}"
        r = sess.patch(url, headers=HJ, json={"gia_tri_the": gia_moi}, timeout=30)
        if r.status_code in [200, 201, 204]:
            ok += len(ids)
        else:
            err += len(ids)
            if err <= 3:
                print(f"  LOI [{r.status_code}]: {ten_dv[:40]} — {r.text[:100]}")
    except Exception as e:
        err += len(ids)
        print(f"  Exception: {e}")
        time.sleep(1)
        sess = requests.Session()  # reset session
    if (idx + 1) % 20 == 0:
        print(f"  ...{idx+1}/{len(by_ten_gia)} nhom, OK={ok}")
        time.sleep(0.2)

print(f"  Ket qua: OK={ok}, LOI={err}")

# Xac nhan
n_zero_after = count_filter("the_lieu_trinh", "gia_tri_the=eq.0")
n_ok_after   = count_filter("the_lieu_trinh", "gia_tri_the=gt.0")
print(f"\n  Sau fix: gia_tri_the=0={n_zero_after}, >0={n_ok_after}")

# ════════════════════════════════════════════════════════════
print("\n" + "=" * 62)
print("  BUOC B: FIX tien_tour trong don_hang_chi_tiet (the LT)")
print("=" * 62)

# Fetch cac dong the_lieu_trinh co KTV, tour=0, ti_le>0
print("\nFetch don_hang_chi_tiet the LT co KTV + tour=0...")
offset = 0
chi_tiet_fix = []
while True:
    url = (f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet"
           f"?select=id,don_hang_id,the_lieu_trinh_id,nhan_vien_id,ti_le_hoa_hong,so_luong,tien_tour"
           f"&loai_item=eq.the_lieu_trinh&nhan_vien_id=not.is.null&tien_tour=eq.0"
           f"&limit={PAGE}&offset={offset}")
    r = requests.get(url, headers=H, timeout=60)
    rows = r.json() if r.status_code == 200 else []
    if not rows: break
    chi_tiet_fix.extend(rows)
    offset += len(rows)
    if len(rows) < PAGE: break

print(f"  Dong can fix: {len(chi_tiet_fix)}")

# Fetch don_hang is_test=false -> set de filter
print("  Fetch don_hang is_test=false...")
dh_that = set()
offset2 = 0
while True:
    url = (f"{SUPABASE_URL}/rest/v1/don_hang"
           f"?select=id&is_test=eq.false&trang_thai=eq.da_thanh_toan"
           f"&limit={PAGE}&offset={offset2}")
    r2 = requests.get(url, headers=H, timeout=60)
    rows2 = r2.json() if r2.status_code == 200 else []
    if not rows2: break
    for o in rows2: dh_that.add(o["id"])
    offset2 += len(rows2)
    if len(rows2) < PAGE: break
print(f"  Don that da chot: {len(dh_that)}")

# Fetch gia_tri_the tu the_lieu_trinh (sau khi da fix)
print("  Fetch gia_tri_the moi...")
the_map = {}
offset3 = 0
while True:
    url = (f"{SUPABASE_URL}/rest/v1/the_lieu_trinh"
           f"?select=id,gia_tri_the,so_buoi_tong&limit={PAGE}&offset={offset3}")
    r3 = requests.get(url, headers=H, timeout=60)
    rows3 = r3.json() if r3.status_code == 200 else []
    if not rows3: break
    for t in rows3: the_map[t["id"]] = t
    offset3 += len(rows3)
    if len(rows3) < PAGE: break
print(f"  The fetch duoc: {len(the_map)}")

# Tinh tien_tour moi va update dhct
tour_updates = []
for ct in chi_tiet_fix:
    if ct["don_hang_id"] not in dh_that: continue
    tlt_id = ct.get("the_lieu_trinh_id")
    tlt    = the_map.get(tlt_id, {})
    gia_tri = tlt.get("gia_tri_the") or 0
    buoi    = tlt.get("so_buoi_tong") or 1
    ti_le   = ct.get("ti_le_hoa_hong") or 0
    so_luong= ct.get("so_luong") or 1
    if gia_tri <= 0 or ti_le <= 0: continue
    gia_1_buoi = gia_tri / max(buoi, 1)
    tien_tour  = round(gia_1_buoi * so_luong * ti_le / 100)
    if tien_tour > 0:
        tour_updates.append((ct["id"], ct["don_hang_id"], ct["nhan_vien_id"], ti_le, tien_tour))

print(f"  Dong tinh duoc tien_tour>0: {len(tour_updates)}")

ok_ct = err_ct = 0
sess2 = requests.Session()
for idx, (ct_id, _, _, _, tien_tour) in enumerate(tour_updates):
    try:
        url = f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet?id=eq.{ct_id}"
        r = sess2.patch(url, headers=HJ,
                        json={"tien_tour": tien_tour, "tien_hoa_hong": tien_tour},
                        timeout=30)
        if r.status_code in [200, 201, 204]:
            ok_ct += 1
        else:
            err_ct += 1
    except Exception as e:
        err_ct += 1
        time.sleep(0.5)
        sess2 = requests.Session()
    if (idx + 1) % 50 == 0:
        time.sleep(0.1)

print(f"  Update dhct: OK={ok_ct}, LOI={err_ct}")

# ════════════════════════════════════════════════════════════
print("\n" + "=" * 62)
print("  BUOC C: INSERT nhan_vien_thu_nhap bo sung")
print("=" * 62)

# Fetch don_hang ngay de dung trong insert
print("  Fetch ngay cua don hang...")
dh_ngay = {}
offset4 = 0
while True:
    url = (f"{SUPABASE_URL}/rest/v1/don_hang"
           f"?select=id,ngay&is_test=eq.false&limit={PAGE}&offset={offset4}")
    r4 = requests.get(url, headers=H, timeout=60)
    rows4 = r4.json() if r4.status_code == 200 else []
    if not rows4: break
    for o in rows4: dh_ngay[o["id"]] = o["ngay"]
    offset4 += len(rows4)
    if len(rows4) < PAGE: break

# Fetch nhung ledger da co de tranh trung
print("  Fetch ledger hien co...")
existing_ledger = set()
offset5 = 0
while True:
    url = (f"{SUPABASE_URL}/rest/v1/nhan_vien_thu_nhap"
           f"?select=don_hang_chi_tiet_id&loai=eq.tour&is_test=eq.false"
           f"&limit={PAGE}&offset={offset5}")
    r5 = requests.get(url, headers=H, timeout=60)
    rows5 = r5.json() if r5.status_code == 200 else []
    if not rows5: break
    for r in rows5:
        cid = r.get("don_hang_chi_tiet_id")
        if cid: existing_ledger.add(cid)
    offset5 += len(rows5)
    if len(rows5) < PAGE: break
print(f"  Ledger da co: {len(existing_ledger)}")

# Tao rows insert
insert_rows = []
for ct_id, dh_id, nv_id, ti_le, tien_tour in tour_updates:
    if ct_id in existing_ledger: continue
    ngay = dh_ngay.get(dh_id)
    insert_rows.append({
        "don_hang_id":          dh_id,
        "don_hang_chi_tiet_id": ct_id,
        "nhan_vien_id":         nv_id,
        "loai":                 "tour",
        "nguon":                "pos",
        "ngay":                 ngay,
        "doanh_so_tinh":        0,
        "ti_le":                ti_le,
        "so_tien":              tien_tour,
        "is_test":              False,
        "ghi_chu":              "Fix retroactive 025: the_lieu_trinh gia_tri_the",
    })

print(f"  Rows can insert: {len(insert_rows)}")

ok_ins = err_ins = 0
INS_BATCH = 100
for i in range(0, len(insert_rows), INS_BATCH):
    batch = insert_rows[i:i+INS_BATCH]
    r_ins = requests.post(
        f"{SUPABASE_URL}/rest/v1/nhan_vien_thu_nhap",
        headers={**HJ, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=batch, timeout=30
    )
    if r_ins.status_code in [200, 201, 204]:
        ok_ins += len(batch)
    else:
        err_ins += len(batch)
        if err_ins <= 3:
            print(f"  LOI insert: {r_ins.status_code} {r_ins.text[:200]}")

print(f"  Insert ledger: OK={ok_ins}, LOI={err_ins}")

# ════════════════════════════════════════════════════════════
print("\n" + "=" * 62)
print("  XAC NHAN KET QUA CUOI CUNG")
print("=" * 62)

print(f"\n  the_lieu_trinh:")
print(f"    gia_tri_the=0    : {count_filter('the_lieu_trinh','gia_tri_the=eq.0')}")
print(f"    gia_tri_the>0    : {count_filter('the_lieu_trinh','gia_tri_the=gt.0')}")
print(f"\n  don_hang_chi_tiet (the_lieu_trinh):")
print(f"    co KTV + tour>0  : {count_filter('don_hang_chi_tiet','loai_item=eq.the_lieu_trinh&nhan_vien_id=not.is.null&tien_tour=gt.0')}")
print(f"    co KTV + tour=0  : {count_filter('don_hang_chi_tiet','loai_item=eq.the_lieu_trinh&nhan_vien_id=not.is.null&tien_tour=eq.0')}")
print(f"\n  nhan_vien_thu_nhap (tour, is_test=false):")
print(f"    tong records     : {count_filter('nhan_vien_thu_nhap','loai=eq.tour&is_test=eq.false')}")

print("\nHoan tat.")
