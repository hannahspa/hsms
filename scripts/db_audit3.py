import os
"""
HSMS Database Audit Part 3 — Kiểm tra chéo: Đơn hàng ↔ Khách hàng ↔ Nhân viên
Xác nhận đơn hàng KHÔNG bị tính vào doanh_thu (Sổ Thu Chi)
"""
import requests

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

def get(table, params="", limit=1000):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}&limit={limit}"
    r = requests.get(url, headers=HEADERS, timeout=60)
    count_raw = r.headers.get("content-range", "0/0").split("/")[-1]
    count = int(count_raw) if count_raw.isdigit() else None
    data = r.json() if r.status_code == 200 else []
    return data, count, r.status_code

def fmt(n):
    if n is None: return "N/A"
    try: return f"{int(n):,}".replace(",", ".") + "d"
    except: return str(n)

SEP = "=" * 65
sep = "-" * 65

# ═══════════════════════════════════════════════════════════════
# 0. KHÁM PHÁ SCHEMA don_hang (tại sao query bị 400 lần trước)
# ═══════════════════════════════════════════════════════════════
print(SEP)
print("0. SCHEMA don_hang — TIM HIEU CAU TRUC BANG")
print(sep)

# Thử select * limit 1
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=*&limit=1",
    headers=HEADERS, timeout=30
)
print(f"  select=* status={r.status_code}")
if r.status_code == 200:
    data = r.json()
    if data:
        print(f"  Columns: {list(data[0].keys())}")
        print(f"  Sample : {data[0]}")
    else:
        print("  => Bang rong (0 records)")
elif r.status_code == 400:
    print(f"  Loi 400: {r.text[:200]}")
else:
    print(f"  Loi {r.status_code}: {r.text[:200]}")

# Thử count exact với select=id
r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=id",
    headers={**HEADERS, "Range": "0-0"}, timeout=30
)
count_hdr = r2.headers.get("content-range", "?")
print(f"  select=id  status={r2.status_code}  content-range={count_hdr}")

# ═══════════════════════════════════════════════════════════════
# A. TỔNG QUAN don_hang + don_hang_chi_tiet
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("A. TONG QUAN DON HANG POS")
print(sep)

# Count tổng
r_dh = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=id",
    headers={**HEADERS, "Range-Unit": "items", "Range": "0-0", "Prefer": "count=exact"},
    timeout=30
)
total_dh = r_dh.headers.get("content-range", "?/0").split("/")[-1]
print(f"  Tong don_hang      : {total_dh}")

r_ct = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet?select=id",
    headers={**HEADERS, "Range-Unit": "items", "Range": "0-0", "Prefer": "count=exact"},
    timeout=30
)
total_ct = r_ct.headers.get("content-range", "?/0").split("/")[-1]
print(f"  Tong don_hang_chi_tiet: {total_ct}")

# Phân bố theo năm (dùng created_at nếu có, hoặc ngay)
# Thử lấy sample đơn hàng để xem date field
r_sample = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=*&limit=3&order=created_at.asc",
    headers=HEADERS, timeout=30
)
if r_sample.status_code == 200 and r_sample.json():
    sample = r_sample.json()
    print(f"\n  Sample don hang dau tien (3 records):")
    for s in sample:
        print(f"    {s}")
else:
    # Thử order by id
    r_sample2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/don_hang?select=*&limit=3",
        headers=HEADERS, timeout=30
    )
    if r_sample2.status_code == 200 and r_sample2.json():
        print(f"\n  Sample don hang (3 records, no order):")
        for s in r_sample2.json():
            print(f"    {s}")

# ═══════════════════════════════════════════════════════════════
# B. KIỂM TRA CHÉO: don_hang ↔ khach_hang
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("B. KIEM TRA CHEO: don_hang <-> khach_hang")
print(sep)

# Lấy tất cả khach_hang_id từ don_hang (null + non-null)
r_kh_ids = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=khach_hang_id&limit=100000",
    headers=HEADERS, timeout=120
)
if r_kh_ids.status_code == 200:
    all_orders = r_kh_ids.json()
    kh_ids = [x.get('khach_hang_id') for x in all_orders]
    null_kh = sum(1 for x in kh_ids if x is None)
    non_null_kh = [x for x in kh_ids if x is not None]
    unique_kh = set(non_null_kh)
    print(f"  Tong don hang       : {len(all_orders)}")
    print(f"  Don hang co KH      : {len(non_null_kh)} ({100*len(non_null_kh)//max(len(all_orders),1)}%)")
    print(f"  Don hang khong KH   : {null_kh} (khach le)")
    print(f"  KH unique trong DH  : {len(unique_kh)}")
else:
    print(f"  Loi: {r_kh_ids.status_code} - {r_kh_ids.text[:100]}")
    all_orders = []
    unique_kh = set()

# Đếm tổng KH
r_kh_total = requests.get(
    f"{SUPABASE_URL}/rest/v1/khach_hang?select=id",
    headers={**HEADERS, "Range-Unit": "items", "Range": "0-0", "Prefer": "count=exact"},
    timeout=30
)
total_kh = r_kh_total.headers.get("content-range", "?/0").split("/")[-1]
print(f"  Tong KH trong DB    : {total_kh}")

# Kiểm tra orphan: KH ID trong don_hang nhưng không có trong khach_hang
if unique_kh:
    # Lấy tất cả KH IDs
    r_all_kh = requests.get(
        f"{SUPABASE_URL}/rest/v1/khach_hang?select=id&limit=100000",
        headers=HEADERS, timeout=60
    )
    if r_all_kh.status_code == 200:
        db_kh_ids = {x['id'] for x in r_all_kh.json()}
        orphan_kh = unique_kh - db_kh_ids
        print(f"\n  KH ID trong DH khong ton tai trong khach_hang: {len(orphan_kh)}")
        if orphan_kh:
            for o in list(orphan_kh)[:5]:
                print(f"    - {o}")
        else:
            print("  => OK: Tat ca KH trong don hang deu ton tai trong DB")
    else:
        print(f"  Loi lay KH IDs: {r_all_kh.status_code}")

# ═══════════════════════════════════════════════════════════════
# C. KIỂM TRA CHÉO: don_hang_chi_tiet ↔ nhan_vien
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("C. KIEM TRA CHEO: don_hang_chi_tiet <-> nhan_vien")
print(sep)

# Xem sample chi tiết để biết columns
r_ct_sample = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet?select=*&limit=2",
    headers=HEADERS, timeout=30
)
if r_ct_sample.status_code == 200 and r_ct_sample.json():
    ct_cols = list(r_ct_sample.json()[0].keys())
    print(f"  Columns chi_tiet: {ct_cols}")
    # Tìm column nhân viên
    nv_col = None
    for col in ['nhan_vien_id', 'ktv_id', 'staff_id', 'employee_id']:
        if col in ct_cols:
            nv_col = col
            break
    print(f"  Column nhan vien: {nv_col}")
else:
    nv_col = None
    print(f"  Loi: {r_ct_sample.status_code}")

if nv_col:
    # Lấy tất cả nhan_vien_id từ chi tiết
    r_nv_ids = requests.get(
        f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet?select={nv_col}&limit=100000",
        headers=HEADERS, timeout=120
    )
    if r_nv_ids.status_code == 200:
        ct_data = r_nv_ids.json()
        nv_ids = [x.get(nv_col) for x in ct_data]
        null_nv = sum(1 for x in nv_ids if x is None)
        non_null_nv = [x for x in nv_ids if x is not None]
        unique_nv = set(non_null_nv)
        print(f"\n  Tong chi_tiet           : {len(ct_data)}")
        print(f"  Chi tiet co NV          : {len(non_null_nv)} ({100*len(non_null_nv)//max(len(ct_data),1)}%)")
        print(f"  Chi tiet khong co NV    : {null_nv}")
        print(f"  NV unique trong chi_tiet: {len(unique_nv)}")

        # Lấy tất cả NV IDs trong DB
        r_all_nv = requests.get(
            f"{SUPABASE_URL}/rest/v1/nhan_vien?select=id,ho_ten,trang_thai&limit=1000",
            headers=HEADERS, timeout=30
        )
        if r_all_nv.status_code == 200:
            nv_db = r_all_nv.json()
            db_nv_ids = {x['id'] for x in nv_db}
            nv_map = {x['id']: x['ho_ten'] for x in nv_db}
            orphan_nv = unique_nv - db_nv_ids
            matched_nv = unique_nv & db_nv_ids
            print(f"\n  NV trong chi_tiet khop voi nhan_vien DB: {len(matched_nv)}")
            print(f"  NV ID orphan (khong ton tai trong DB)   : {len(orphan_nv)}")
            if orphan_nv:
                print(f"  => Orphan NV IDs (5 dau):")
                for o in list(orphan_nv)[:5]:
                    print(f"    - {o}")

            # Hiện NV nào được gán đơn hàng
            print(f"\n  NV duoc gan trong chi_tiet don hang:")
            nv_count = {}
            for nid in non_null_nv:
                nv_count[nid] = nv_count.get(nid, 0) + 1
            for nid, cnt in sorted(nv_count.items(), key=lambda x: -x[1])[:15]:
                name = nv_map.get(nid, f"ORPHAN:{nid[:8]}")
                print(f"    {name:<30} : {cnt:>6} chi tiet")

# ═══════════════════════════════════════════════════════════════
# D. XÁC NHẬN: Đơn hàng KHÔNG tính vào doanh_thu
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("D. XAC NHAN: DON HANG KHONG TINH VAO DOANH_THU")
print(sep)

# Đếm doanh_thu trước và sau 26/11/2025
r_dt_truoc = requests.get(
    f"{SUPABASE_URL}/rest/v1/doanh_thu?select=id,ngay,so_tien&ngay=lt.2025-11-26&order=ngay",
    headers={**HEADERS, "Prefer": "count=exact"}, timeout=30
)
dt_truoc = r_dt_truoc.json() if r_dt_truoc.status_code == 200 else []
cnt_truoc = r_dt_truoc.headers.get("content-range", "0/0").split("/")[-1]
print(f"  doanh_thu truoc 26/11/2025: {cnt_truoc} records")
if dt_truoc:
    print(f"  => CO DU LIEU TRUOC NGAY GO LIVE — can kiem tra!")
    for x in dt_truoc[:5]:
        print(f"     {x.get('ngay')} | {fmt(x.get('so_tien'))}")
else:
    print(f"  => OK: Khong co record nao truoc 26/11/2025 trong doanh_thu")

# Đếm tổng doanh_thu sau 26/11/2025
r_dt_sau = requests.get(
    f"{SUPABASE_URL}/rest/v1/doanh_thu?select=so_tien&ngay=gte.2025-11-26",
    headers={**HEADERS, "Prefer": "count=exact"}, timeout=30
)
dt_sau = r_dt_sau.json() if r_dt_sau.status_code == 200 else []
cnt_sau = r_dt_sau.headers.get("content-range", "0/0").split("/")[-1]
tong_sau = sum(x.get('so_tien', 0) or 0 for x in dt_sau)
print(f"  doanh_thu tu 26/11/2025+  : {cnt_sau} records = {fmt(tong_sau)}")

# Kiểm tra có dien_giai nào nhắc đến "don_hang" / "POS" / "ma_don" không
r_dt_pos = requests.get(
    f"{SUPABASE_URL}/rest/v1/doanh_thu?select=ngay,so_tien,dien_giai&dien_giai=ilike.*DH-*&limit=10",
    headers=HEADERS, timeout=30
)
if r_dt_pos.status_code == 200 and r_dt_pos.json():
    print(f"\n  CANH BAO: Tim thay doanh_thu co dien_giai chua ma DH-:")
    for x in r_dt_pos.json():
        print(f"     {x.get('ngay')} | {fmt(x.get('so_tien'))} | {x.get('dien_giai','')[:50]}")
else:
    print(f"  OK: Khong co doanh_thu nao lien ket voi ma don hang (DH-xxx)")

# ═══════════════════════════════════════════════════════════════
# E. KIỂM TRA CHÉO: the_lieu_trinh ↔ khach_hang
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("E. KIEM TRA CHEO: the_lieu_trinh <-> khach_hang")
print(sep)

r_the = requests.get(
    f"{SUPABASE_URL}/rest/v1/the_lieu_trinh?select=khach_hang_id&limit=100000",
    headers=HEADERS, timeout=60
)
if r_the.status_code == 200:
    the_data = r_the.json()
    the_kh_ids = [x.get('khach_hang_id') for x in the_data]
    null_the = sum(1 for x in the_kh_ids if x is None)
    unique_the_kh = set(x for x in the_kh_ids if x is not None)
    print(f"  Tong the_lieu_trinh        : {len(the_data)}")
    print(f"  The co khach_hang_id       : {len(the_data) - null_the}")
    print(f"  The khong co khach_hang_id : {null_the}")
    print(f"  KH unique trong the        : {len(unique_the_kh)}")

    # Kiểm tra orphan
    if 'db_kh_ids' in dir():
        orphan_the = unique_the_kh - db_kh_ids
        print(f"  Orphan (KH khong ton tai)  : {len(orphan_the)}")
        if orphan_the:
            print(f"  => Co {len(orphan_the)} the lien ket KH khong ton tai!")
        else:
            print(f"  => OK: Tat ca the deu co KH hop le")
else:
    print(f"  Loi: {r_the.status_code}")

# ═══════════════════════════════════════════════════════════════
# F. PHÂN BỐ ĐƠN HÀNG THEO THỜI GIAN
# ═══════════════════════════════════════════════════════════════
print(f"\n{SEP}")
print("F. PHAN BO DON HANG THEO THOI GIAN")
print(sep)

# Lấy created_at hoặc ngay từ don_hang
r_time = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=created_at&limit=100000",
    headers=HEADERS, timeout=120
)
if r_time.status_code == 200 and r_time.json():
    time_data = r_time.json()
    # Group by năm-tháng
    by_month = {}
    for x in time_data:
        ts = x.get('created_at', '')
        if ts:
            ym = str(ts)[:7]  # YYYY-MM
            by_month[ym] = by_month.get(ym, 0) + 1

    print(f"  Tong don hang: {len(time_data)}")
    sorted_months = sorted(by_month.items())
    print(f"  Phan bo theo thang ({len(sorted_months)} thang co data):")

    if sorted_months:
        print(f"  5 thang dau tien:")
        for ym, cnt in sorted_months[:5]:
            bar = "█" * min(cnt // 100, 40)
            print(f"    {ym}: {cnt:>6} don  {bar}")
        if len(sorted_months) > 10:
            print(f"    ...")
        print(f"  5 thang cuoi cung:")
        for ym, cnt in sorted_months[-5:]:
            bar = "█" * min(cnt // 100, 40)
            print(f"    {ym}: {cnt:>6} don  {bar}")

        # Check có đơn hàng sau 26/11/2025 không (từ HSMS POS mới)
        after_golive = sum(cnt for ym, cnt in by_month.items() if ym >= '2025-11')
        before_golive = sum(cnt for ym, cnt in by_month.items() if ym < '2025-11')
        print(f"\n  Don hang truoc go-live (<11/2025): {before_golive} (lich su MySpa)")
        print(f"  Don hang tu go-live (>=11/2025)  : {after_golive}")
elif r_time.status_code != 200:
    print(f"  Loi query: {r_time.status_code} - {r_time.text[:200]}")

print(f"\n{SEP}")
print("XONG AUDIT PART 3")
print(SEP)
