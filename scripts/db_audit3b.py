import os
"""
HSMS Audit 3b — Fix 206, kiểm tra chéo đơn hàng ↔ KH ↔ NV
"""
import requests, json

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

H = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def fetch_all(table, select, filters="", page_size=1000):
    """Lấy toàn bộ records qua pagination"""
    all_data = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&{filters}&limit={page_size}&offset={offset}"
        r = requests.get(url, headers={**H, "Prefer": "count=exact"}, timeout=60)
        if r.status_code not in (200, 206):
            print(f"  LỖI {r.status_code} khi fetch {table}: {r.text[:100]}")
            break
        batch = r.json()
        if not batch:
            break
        all_data.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
        if offset > 200000:  # safety cap
            print(f"  WARN: Cap 200k records")
            break
    return all_data

def count_only(table, filters=""):
    """Lấy count nhanh"""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=id&{filters}"
    r = requests.get(url, headers={**H, "Range-Unit": "items", "Range": "0-0", "Prefer": "count=exact"}, timeout=30)
    hdr = r.headers.get("content-range", "?/0")
    return hdr.split("/")[-1]

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".") + "đ"
    except: return str(n)

SEP = "=" * 65
sep = "-" * 65

# ═══════════════════════════════════════════════════════════════
# 0. SCHEMA don_hang — xem đầy đủ
# ═══════════════════════════════════════════════════════════════
print(SEP)
print("0. SCHEMA + SAMPLE don_hang")
print(sep)

r = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=*&limit=2&order=created_at.desc",
    headers=H, timeout=30
)
if r.status_code in (200, 206) and r.json():
    sample = r.json()
    cols = list(sample[0].keys())
    print(f"  Columns ({len(cols)}): {cols}")
    print()
    for i, s in enumerate(sample):
        print(f"  Record {i+1}:")
        for k, v in s.items():
            print(f"    {k:<25} = {str(v)[:60]}")
        print()
else:
    print(f"  Lỗi: {r.status_code}")

# Cũng xem 1 record cũ nhất
r_old = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=*&limit=2&order=created_at.asc",
    headers=H, timeout=30
)
if r_old.status_code in (200, 206) and r_old.json():
    print(f"  Record CU NHAT (asc created_at):")
    s = r_old.json()[0]
    for k, v in s.items():
        print(f"    {k:<25} = {str(v)[:60]}")

# ═══════════════════════════════════════════════════════════════
# A. TỔNG QUAN
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("A. TONG QUAN SO LIEU")
print(sep)
print(f"  don_hang            : {count_only('don_hang')}")
print(f"  don_hang_chi_tiet   : {count_only('don_hang_chi_tiet')}")
print(f"  khach_hang          : {count_only('khach_hang')}")
print(f"  nhan_vien           : {count_only('nhan_vien')}")
print(f"  the_lieu_trinh      : {count_only('the_lieu_trinh')}")
print(f"  doanh_thu           : {count_only('doanh_thu')}")

# ═══════════════════════════════════════════════════════════════
# B. don_hang ↔ khach_hang
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("B. KIEM TRA CHEO: don_hang <-> khach_hang")
print(sep)

print("  Đang tải don_hang (43k records)...")
orders = fetch_all("don_hang", "khach_hang_id")
kh_ids_in_orders = [x.get("khach_hang_id") for x in orders]
null_kh  = sum(1 for x in kh_ids_in_orders if x is None)
nn_kh    = [x for x in kh_ids_in_orders if x is not None]
unique_kh = set(nn_kh)

print(f"  Tổng đơn hàng        : {len(orders):,}")
print(f"  Có khach_hang_id     : {len(nn_kh):,} ({100*len(nn_kh)//max(len(orders),1)}%)")
print(f"  Khách lẻ (null KH)   : {null_kh:,}")
print(f"  KH unique trong DH   : {len(unique_kh):,}")

print("  Đang tải khach_hang...")
kh_db = fetch_all("khach_hang", "id,ho_ten,so_dien_thoai")
db_kh_ids = {x["id"] for x in kh_db}
print(f"  KH trong DB          : {len(db_kh_ids):,}")

orphan_kh = unique_kh - db_kh_ids
print(f"\n  KH ID trong DH nhưng KHÔNG có trong DB: {len(orphan_kh)}")
if orphan_kh:
    print(f"  => CẢNH BÁO: {len(orphan_kh)} đơn hàng trỏ đến KH không tồn tại!")
    for o in list(orphan_kh)[:5]:
        print(f"    - {o}")
else:
    print(f"  => OK: 100% KH trong đơn hàng đều tồn tại trong DB")

# KH có trong DB nhưng chưa có đơn hàng
kh_not_in_orders = db_kh_ids - unique_kh
print(f"\n  KH trong DB nhưng chưa có đơn hàng: {len(kh_not_in_orders):,}")

# ═══════════════════════════════════════════════════════════════
# C. don_hang_chi_tiet ↔ nhan_vien
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("C. KIEM TRA CHEO: don_hang_chi_tiet <-> nhan_vien")
print(sep)

# Xem schema chi_tiet
r_ct = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet?select=*&limit=1",
    headers=H, timeout=30
)
ct_cols = []
nv_col = None
if r_ct.status_code in (200, 206) and r_ct.json():
    ct_cols = list(r_ct.json()[0].keys())
    print(f"  Columns chi_tiet: {ct_cols}")
    for col in ["nhan_vien_id", "ktv_id", "staff_id", "employee_id", "nguoi_thuc_hien"]:
        if col in ct_cols:
            nv_col = col
            break
    print(f"  Column nhân viên: {nv_col}")
    # Cũng tìm column liên kết đến don_hang
    dh_col = None
    for col in ["don_hang_id", "order_id", "dh_id"]:
        if col in ct_cols:
            dh_col = col
            break
    print(f"  Column don_hang : {dh_col}")

if nv_col:
    print(f"\n  Đang tải chi_tiet (68k records, chọn {nv_col})...")
    ct_data = fetch_all("don_hang_chi_tiet", nv_col)
    nv_ids = [x.get(nv_col) for x in ct_data]
    null_nv = sum(1 for x in nv_ids if x is None)
    nn_nv   = [x for x in nv_ids if x is not None]
    unique_nv = set(nn_nv)

    print(f"  Tổng chi_tiet           : {len(ct_data):,}")
    print(f"  Có {nv_col}     : {len(nn_nv):,} ({100*len(nn_nv)//max(len(ct_data),1)}%)")
    print(f"  Không có NV             : {null_nv:,}")
    print(f"  NV unique trong chi_tiet: {len(unique_nv):,}")

    # Lấy danh sách NV
    nv_db = fetch_all("nhan_vien", "id,ho_ten,trang_thai,vi_tri")
    db_nv_ids = {x["id"] for x in nv_db}
    nv_map = {x["id"]: f"{x['ho_ten']} ({x.get('trang_thai','?')})" for x in nv_db}

    orphan_nv = unique_nv - db_nv_ids
    matched_nv = unique_nv & db_nv_ids
    print(f"\n  NV khớp với nhan_vien DB       : {len(matched_nv):,}")
    print(f"  NV ID orphan (không có trong DB): {len(orphan_nv):,}")

    if orphan_nv:
        print(f"\n  CẢNH BÁO! Orphan NV IDs:")
        for o in list(orphan_nv)[:10]:
            print(f"    {o}")
    else:
        print(f"  => OK: Tất cả NV trong chi_tiet đều tồn tại trong nhan_vien DB")

    # Phân bố số chi_tiet theo NV
    nv_count = {}
    for nid in nn_nv:
        nv_count[nid] = nv_count.get(nid, 0) + 1

    print(f"\n  Top 10 NV được gán nhiều dịch vụ nhất:")
    for nid, cnt in sorted(nv_count.items(), key=lambda x: -x[1])[:10]:
        name = nv_map.get(nid, f"ORPHAN:{nid[:8]}")
        print(f"    {name:<40}: {cnt:>6} dòng chi tiết")

    # NV trong DB nhưng không có chi tiết
    nv_not_in_ct = db_nv_ids - unique_nv
    print(f"\n  NV trong DB nhưng 0 chi_tiet đơn hàng: {len(nv_not_in_ct)}")
    for nid in nv_not_in_ct:
        print(f"    - {nv_map.get(nid, nid)}")

# ═══════════════════════════════════════════════════════════════
# D. XÁC NHẬN đơn hàng KHÔNG vào doanh_thu
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("D. XAC NHAN: DON HANG KHONG VAO DOANH_THU")
print(sep)

# doanh_thu trước 26/11/2025
cnt = count_only("doanh_thu", "ngay=lt.2025-11-26")
print(f"  doanh_thu trước 26/11/2025 : {cnt} records")
if cnt == "0":
    print(f"  => OK: Sổ Thu Chi sạch, không có record nào trước go-live")
else:
    print(f"  => CẦN KIỂM TRA!")

# doanh_thu chứa mã đơn hàng (DH-)
r_dh_check = requests.get(
    f"{SUPABASE_URL}/rest/v1/doanh_thu?select=ngay,so_tien,dien_giai&dien_giai=ilike.*%C4%90H-*&limit=5",
    headers=H, timeout=30
)
if r_dh_check.status_code in (200, 206) and r_dh_check.json():
    print(f"  CẢNH BÁO: Có doanh_thu chứa 'ĐH-' trong diễn giải!")
    for x in r_dh_check.json():
        print(f"    {x.get('ngay')} | {fmt(x.get('so_tien'))} | {x.get('dien_giai','')[:50]}")
else:
    print(f"  OK: Không có doanh_thu nào link tới mã đơn hàng ĐH-xxx")

# Tổng doanh_thu vs tổng thanh_tien đơn hàng
r_dt = requests.get(
    f"{SUPABASE_URL}/rest/v1/doanh_thu?select=so_tien&limit=10000",
    headers=H, timeout=30
)
if r_dt.status_code in (200, 206):
    tong_dt = sum(x.get("so_tien", 0) or 0 for x in r_dt.json())
    print(f"\n  Tổng doanh_thu (Sổ Thu Chi)    : {fmt(tong_dt)}")

# Tổng thực_thu đơn hàng (cột thuc_thu từ sample)
thuc_thu_col = "thuc_thu" if "thuc_thu" in (ct_cols if ct_cols else []) else None
# Thử lấy tổng đơn hàng
r_dh_sum = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=thuc_thu&limit=1000",
    headers=H, timeout=30
)
if r_dh_sum.status_code in (200, 206):
    sample_sum = r_dh_sum.json()
    total_pos = sum(x.get("thuc_thu", 0) or 0 for x in sample_sum)
    print(f"  Tổng thuc_thu đơn hàng (sample 1k): {fmt(total_pos)}")
    print(f"  => Đây là dữ liệu TỪ MySpa, tách biệt hoàn toàn với Sổ Thu Chi")

# ═══════════════════════════════════════════════════════════════
# E. the_lieu_trinh ↔ khach_hang
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("E. KIEM TRA CHEO: the_lieu_trinh <-> khach_hang")
print(sep)

the_data = fetch_all("the_lieu_trinh", "khach_hang_id")
the_kh_ids = [x.get("khach_hang_id") for x in the_data]
null_the = sum(1 for x in the_kh_ids if x is None)
unique_the_kh = set(x for x in the_kh_ids if x is not None)

print(f"  Tổng thẻ liệu trình      : {len(the_data):,}")
print(f"  Có khach_hang_id         : {len(the_data) - null_the:,}")
print(f"  Thiếu khach_hang_id      : {null_the:,}")
print(f"  KH unique trong thẻ      : {len(unique_the_kh):,}")

orphan_the = unique_the_kh - db_kh_ids
print(f"  Orphan (thẻ → KH không có trong DB): {len(orphan_the):,}")
if orphan_the:
    print(f"  => CẢNH BÁO: {len(orphan_the)} thẻ trỏ đến KH không tồn tại!")
    for o in list(orphan_the)[:5]:
        print(f"    - {o}")
else:
    print(f"  => OK: 100% thẻ liệu trình đều có KH hợp lệ")

# ═══════════════════════════════════════════════════════════════
# F. PHÂN BỐ THỜI GIAN đơn hàng (ngày thực tế, không phải created_at)
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("F. PHAN BO THOI GIAN DON HANG (xem ngay giao dich thuc te)")
print(sep)

# Xem columns của don_hang để tìm cột ngày thực tế
r_cols = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=*&limit=1",
    headers=H, timeout=30
)
if r_cols.status_code in (200, 206) and r_cols.json():
    all_cols = list(r_cols.json()[0].keys())
    date_cols = [c for c in all_cols if any(k in c.lower() for k in ["ngay", "date", "time", "at", "luc"])]
    print(f"  Tất cả columns: {all_cols}")
    print(f"  Columns dạng ngày: {date_cols}")

    # Lấy sample với tất cả cột ngày
    if date_cols:
        select_cols = ",".join(date_cols[:4])
        r_dates = requests.get(
            f"{SUPABASE_URL}/rest/v1/don_hang?select={select_cols}&limit=5&order=created_at.asc",
            headers=H, timeout=30
        )
        if r_dates.status_code in (200, 206):
            print(f"\n  Sample 5 đơn hàng CŨ NHẤT (theo created_at):")
            for x in r_dates.json():
                print(f"    {x}")

        r_dates2 = requests.get(
            f"{SUPABASE_URL}/rest/v1/don_hang?select={select_cols}&limit=5&order=created_at.desc",
            headers=H, timeout=30
        )
        if r_dates2.status_code in (200, 206):
            print(f"\n  Sample 5 đơn hàng MỚI NHẤT (theo created_at):")
            for x in r_dates2.json():
                print(f"    {x}")

print(f"\n{SEP}")
print("XONG AUDIT PART 3b")
print(SEP)
