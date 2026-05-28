"""
HSMS Database Audit Script
Kiểm tra tính đầy đủ và nhất quán của dữ liệu từ 2019 đến 30/04/2026
"""
import requests
import json
from datetime import datetime

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

def q(table, params="", count_only=False):
    """Query Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        if params:
            url += f"?{params}"
        elif count_only:
            url += "?select=id&limit=1"
        r = requests.get(url, headers=HEADERS, timeout=30)
        count = int(r.headers.get("content-range", "0/0").split("/")[-1]) if "content-range" in r.headers else None
        data = r.json() if r.status_code == 200 else []
        return data, count
    except Exception as e:
        return [], None

def rpc(func_name, body={}):
    """Call Supabase RPC"""
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/{func_name}",
            headers=HEADERS,
            json=body,
            timeout=30
        )
        return r.json() if r.status_code in [200, 201] else None
    except:
        return None

SEP = "=" * 65
sep = "-" * 65

def fmt(n):
    if n is None: return "N/A"
    if isinstance(n, (int, float)):
        return f"{int(n):,}đ".replace(",", ".")
    return str(n)

print(SEP)
print("  HSMS DATABASE AUDIT — 2019 → 30/04/2026")
print(f"  Chạy lúc: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
print(SEP)

# ══════════════════════════════════════════════════════════════
# 1. TÀI CHÍNH — DOANH THU
# ══════════════════════════════════════════════════════════════
print("\n📊 1. BẢNG DOANH THU")
print(sep)
dt_all, dt_count = q("doanh_thu", "select=id,ngay,so_tien,hinh_thuc&order=ngay&limit=1000")
if dt_count is None:
    # Try without count header
    dt_all2, _ = q("doanh_thu", "select=id,ngay,so_tien,hinh_thuc&order=ngay")
    dt_all = dt_all2

# Get count
_, dt_count = q("doanh_thu", "select=id", True)
# Actually fetch all for analysis
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/doanh_thu?select=id,ngay,so_tien,hinh_thuc&order=ngay",
    headers={**HEADERS, "Prefer": "count=exact"},
    timeout=60
)
dt_count = int(resp.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in resp.headers else "?"
dt_data = resp.json() if resp.status_code == 200 else []

print(f"  Tổng records  : {dt_count}")
if dt_data:
    ngay_sorted = sorted([r['ngay'] for r in dt_data if r.get('ngay')])
    print(f"  Ngày sớm nhất : {ngay_sorted[0] if ngay_sorted else 'N/A'}")
    print(f"  Ngày gần nhất : {ngay_sorted[-1] if ngay_sorted else 'N/A'}")
    tong = sum(r.get('so_tien', 0) or 0 for r in dt_data)
    print(f"  Tổng tiền     : {fmt(tong)}")

    # By hinh_thuc
    ht_map = {}
    for r in dt_data:
        ht = r.get('hinh_thuc','?')
        ht_map[ht] = ht_map.get(ht, 0) + (r.get('so_tien', 0) or 0)
    print("  Theo hình thức:")
    ht_labels = {'tien_mat':'Tiền mặt','chuyen_khoan':'Chuyển khoản','quet_the':'Quẹt thẻ','the_tra_truoc':'Thẻ trả trước'}
    for ht, total in sorted(ht_map.items(), key=lambda x: -x[1]):
        print(f"    {ht_labels.get(ht, ht):<20}: {fmt(total)}")

    # By year
    year_map = {}
    for r in dt_data:
        if r.get('ngay'):
            y = r['ngay'][:4]
            year_map[y] = year_map.get(y, {'count':0,'total':0})
            year_map[y]['count'] += 1
            year_map[y]['total'] += r.get('so_tien', 0) or 0
    print("  Theo năm:")
    for y in sorted(year_map):
        print(f"    {y}: {year_map[y]['count']:>5} records | {fmt(year_map[y]['total'])}")

# ══════════════════════════════════════════════════════════════
# 2. TÀI CHÍNH — CHI PHÍ
# ══════════════════════════════════════════════════════════════
print("\n💸 2. BẢNG CHI PHÍ")
print(sep)
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/chi_phi?select=id,ngay,so_tien,hinh_thuc_thanh_toan,vi_id&order=ngay",
    headers={**HEADERS, "Prefer": "count=exact"},
    timeout=60
)
cp_count = int(resp.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in resp.headers else "?"
cp_data = resp.json() if resp.status_code == 200 else []
print(f"  Tổng records  : {cp_count}")
if cp_data:
    ngay_sorted = sorted([r['ngay'] for r in cp_data if r.get('ngay')])
    print(f"  Ngày sớm nhất : {ngay_sorted[0] if ngay_sorted else 'N/A'}")
    print(f"  Ngày gần nhất : {ngay_sorted[-1] if ngay_sorted else 'N/A'}")
    tong = sum(r.get('so_tien', 0) or 0 for r in cp_data)
    print(f"  Tổng tiền     : {fmt(tong)}")

    year_map = {}
    for r in cp_data:
        if r.get('ngay'):
            y = r['ngay'][:4]
            year_map[y] = year_map.get(y, {'count':0,'total':0})
            year_map[y]['count'] += 1
            year_map[y]['total'] += r.get('so_tien', 0) or 0
    print("  Theo năm:")
    for y in sorted(year_map):
        print(f"    {y}: {year_map[y]['count']:>5} records | {fmt(year_map[y]['total'])}")

# ══════════════════════════════════════════════════════════════
# 3. CHUYỂN KHOẢN NỘI BỘ
# ══════════════════════════════════════════════════════════════
print("\n🔄 3. BẢNG CHUYỂN KHOẢN NỘI BỘ")
print(sep)
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/chuyen_khoan_noi_bo?select=id,ngay,so_tien&order=ngay",
    headers={**HEADERS, "Prefer": "count=exact"},
    timeout=60
)
ck_count = int(resp.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in resp.headers else "?"
ck_data = resp.json() if resp.status_code == 200 else []
print(f"  Tổng records  : {ck_count}")
if ck_data:
    ngay_sorted = sorted([r['ngay'] for r in ck_data if r.get('ngay')])
    print(f"  Ngày sớm nhất : {ngay_sorted[0] if ngay_sorted else 'N/A'}")
    print(f"  Ngày gần nhất : {ngay_sorted[-1] if ngay_sorted else 'N/A'}")
    tong = sum(r.get('so_tien', 0) or 0 for r in ck_data)
    print(f"  Tổng CK       : {fmt(tong)}")

    year_map = {}
    for r in ck_data:
        if r.get('ngay'):
            y = r['ngay'][:4]
            year_map[y] = year_map.get(y, {'count':0,'total':0})
            year_map[y]['count'] += 1
            year_map[y]['total'] += r.get('so_tien', 0) or 0
    print("  Theo năm:")
    for y in sorted(year_map):
        print(f"    {y}: {year_map[y]['count']:>5} records | {fmt(year_map[y]['total'])}")

# ══════════════════════════════════════════════════════════════
# 4. SỐ DƯ VÍ
# ══════════════════════════════════════════════════════════════
print("\n🏦 4. SỐ DƯ VÍ HIỆN TẠI")
print(sep)
vi_data, _ = q("so_du_vi_thuc_te", "select=*&order=thu_tu")
tong_ts = 0
for vi in vi_data:
    sd = vi.get('so_du_hien_tai', 0) or 0
    tong_ts += sd
    print(f"  {vi.get('ten','?'):<25}: {fmt(sd)}")
print(f"  {'TỔNG TÀI SẢN':<25}: {fmt(tong_ts)}")
print()
# So dư đầu kỳ (so_du_dau)
vi_raw, _ = q("vi", "select=*&order=thu_tu")
for vi in vi_raw:
    print(f"  [{vi.get('ten','?')}] so_du_dau = {fmt(vi.get('so_du_dau',0))}")

# ══════════════════════════════════════════════════════════════
# 5. NHÂN VIÊN & CHẤM CÔNG
# ══════════════════════════════════════════════════════════════
print("\n👥 5. NHÂN VIÊN")
print(sep)
nv_data, _ = q("nhan_vien", "select=*&order=vi_tri")
print(f"  Tổng nhân viên: {len(nv_data)}")
for nv in nv_data:
    print(f"  - {nv.get('ho_ten','?'):<25} | {nv.get('vi_tri','?'):<10} | {nv.get('trang_thai','?')}")

print("\n📋 CHẤM CÔNG")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/cham_cong?select=id,ngay,loai,nhan_vien_id&order=ngay",
    headers={**HEADERS, "Prefer": "count=exact"},
    timeout=60
)
cc_count = int(resp.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in resp.headers else "?"
cc_data = resp.json() if resp.status_code == 200 else []
print(f"  Tổng records  : {cc_count}")
if cc_data:
    ngay_sorted = sorted([r['ngay'] for r in cc_data if r.get('ngay')])
    print(f"  Ngày sớm nhất : {ngay_sorted[0] if ngay_sorted else 'N/A'}")
    print(f"  Ngày gần nhất : {ngay_sorted[-1] if ngay_sorted else 'N/A'}")
    loai_map = {}
    for r in cc_data:
        l = r.get('loai','?')
        loai_map[l] = loai_map.get(l,0) + 1
    print("  Theo loại:", dict(sorted(loai_map.items())))

# ══════════════════════════════════════════════════════════════
# 6. POS — ĐƠN HÀNG
# ══════════════════════════════════════════════════════════════
print("\n🛒 6. POS — ĐƠN HÀNG")
print(sep)
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/don_hang?select=id,created_at,trang_thai,thanh_tien&order=created_at",
    headers={**HEADERS, "Prefer": "count=exact"},
    timeout=60
)
dh_count = int(resp.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in resp.headers else "?"
dh_data = resp.json() if resp.status_code == 200 else []
print(f"  Tổng đơn hàng : {dh_count}")
if dh_data:
    ngay_sorted = sorted([r['created_at'][:10] for r in dh_data if r.get('created_at')])
    print(f"  Ngày sớm nhất : {ngay_sorted[0] if ngay_sorted else 'N/A'}")
    print(f"  Ngày gần nhất : {ngay_sorted[-1] if ngay_sorted else 'N/A'}")
    status_map = {}
    for r in dh_data:
        s = r.get('trang_thai','?')
        status_map[s] = status_map.get(s,0) + 1
    print(f"  Theo trạng thái: {status_map}")
    tong_dt = sum(r.get('thanh_tien', 0) or 0 for r in dh_data if r.get('trang_thai') == 'da_thanh_toan')
    print(f"  Tổng DT đã TT : {fmt(tong_dt)}")

    year_map = {}
    for r in dh_data:
        if r.get('created_at'):
            y = r['created_at'][:4]
            year_map[y] = year_map.get(y, {'count':0,'total':0})
            year_map[y]['count'] += 1
            if r.get('trang_thai') == 'da_thanh_toan':
                year_map[y]['total'] += r.get('thanh_tien', 0) or 0
    print("  Theo năm:")
    for y in sorted(year_map):
        print(f"    {y}: {year_map[y]['count']:>6} đơn | DT đã TT: {fmt(year_map[y]['total'])}")

# ══════════════════════════════════════════════════════════════
# 7. KHÁCH HÀNG & THẺ LIỆU TRÌNH
# ══════════════════════════════════════════════════════════════
print("\n👤 7. KHÁCH HÀNG")
print(sep)
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/khach_hang?select=id",
    headers={**HEADERS, "Prefer": "count=exact"},
    timeout=30
)
kh_count = int(resp.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in resp.headers else "?"
print(f"  Tổng khách hàng: {kh_count}")

resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/the_lieu_trinh?select=id,trang_thai",
    headers={**HEADERS, "Prefer": "count=exact"},
    timeout=30
)
tlt_count = int(resp.headers.get("content-range","0/0").split("/")[-1]) if "content-range" in resp.headers else "?"
tlt_data = resp.json() if resp.status_code == 200 else []
print(f"  Tổng thẻ liệu trình: {tlt_count}")
if tlt_data:
    ts_map = {}
    for r in tlt_data:
        s = r.get('trang_thai','?')
        ts_map[s] = ts_map.get(s,0) + 1
    print(f"  Theo trạng thái: {ts_map}")

# ══════════════════════════════════════════════════════════════
# 8. KHO HÀNG
# ══════════════════════════════════════════════════════════════
print("\n📦 8. KHO HÀNG")
print(sep)
kho_data, _ = q("kho_san_pham", "select=id,ten,loai,ton_kho,canh_bao_ton,is_active")
active = [k for k in kho_data if k.get('is_active')]
warning = [k for k in kho_data if k.get('is_active') and (k.get('ton_kho', 0) or 0) <= (k.get('canh_bao_ton', 0) or 0)]
print(f"  Tổng sản phẩm : {len(kho_data)}")
print(f"  Đang hoạt động: {len(active)}")
print(f"  Cảnh báo hết  : {len(warning)}")

if warning:
    print("  SP sắp hết:")
    for k in warning[:5]:
        print(f"    - {k.get('ten','?')}: tồn={k.get('ton_kho',0)}, cảnh báo={k.get('canh_bao_ton',0)}")

# ══════════════════════════════════════════════════════════════
# 9. DANH MỤC CHI PHÍ
# ══════════════════════════════════════════════════════════════
print("\n📂 9. DANH MỤC CHI PHÍ")
print(sep)
dm_data, _ = q("danh_muc_chi_phi", "select=*&order=thu_tu")
nhom_cha = [d for d in dm_data if not d.get('parent_id')]
hang_muc = [d for d in dm_data if d.get('parent_id')]
print(f"  Nhóm cha (Level 1): {len(nhom_cha)}")
print(f"  Hạng mục (Level 2): {len(hang_muc)}")
for n in nhom_cha:
    con = [h for h in hang_muc if h.get('parent_id') == n['id']]
    print(f"    {n.get('icon','')} {n.get('ten','?')}: {len(con)} hạng mục")

# ══════════════════════════════════════════════════════════════
# 10. KIỂM TRA TÍNH NHẤT QUÁN
# ══════════════════════════════════════════════════════════════
print("\n🔍 10. KIỂM TRA TÍNH NHẤT QUÁN")
print(sep)

# Check doanh_thu có hinh_thuc hợp lệ không
valid_ht = {'tien_mat','chuyen_khoan','quet_the','the_tra_truoc','the_lieu_trinh'}
invalid_ht = [r for r in dt_data if r.get('hinh_thuc') not in valid_ht]
print(f"  DT có hinh_thuc sai  : {len(invalid_ht)} records")
if invalid_ht:
    print(f"    Ví dụ: {invalid_ht[:3]}")

# Check chi_phi có vi_id null không
null_vi = [r for r in cp_data if not r.get('vi_id')]
print(f"  CP không có vi_id    : {len(null_vi)} records")

# Check ngày trong tương lai
today = "2026-04-30"
future_dt = [r for r in dt_data if r.get('ngay','') > today]
future_cp = [r for r in cp_data if r.get('ngay','') > today]
print(f"  DT ngày > 30/04/2026 : {len(future_dt)} records")
print(f"  CP ngày > 30/04/2026 : {len(future_cp)} records")
if future_dt:
    for r in future_dt[:5]:
        print(f"    DT: {r.get('ngay')} | {r.get('hinh_thuc')} | {fmt(r.get('so_tien'))}")
if future_cp:
    for r in future_cp[:5]:
        print(f"    CP: {r.get('ngay')} | {fmt(r.get('so_tien'))}")

# Check chi_phi có hinh_thuc hợp lệ
valid_ht_cp = {'tien_mat','chuyen_khoan','quet_the'}
invalid_ht_cp = [r for r in cp_data if r.get('hinh_thuc_thanh_toan') not in valid_ht_cp]
print(f"  CP có hinh_thuc sai  : {len(invalid_ht_cp)} records")

# Tổng hợp tài chính
tong_dt_thuc = sum(r.get('so_tien',0) or 0 for r in dt_data if r.get('hinh_thuc') != 'the_tra_truoc')
tong_tt = sum(r.get('so_tien',0) or 0 for r in dt_data if r.get('hinh_thuc') == 'the_tra_truoc')
tong_cp = sum(r.get('so_tien',0) or 0 for r in cp_data)
tong_ck = sum(r.get('so_tien',0) or 0 for r in ck_data)

print(f"\n  === TÓM TẮT TÀI CHÍNH (ALL TIME) ===")
print(f"  Thực Thu (không TT): {fmt(tong_dt_thuc)}")
print(f"  Thẻ Trả Trước      : {fmt(tong_tt)}")
print(f"  Tổng Chi Phí       : {fmt(tong_cp)}")
print(f"  Lợi Nhuận          : {fmt(tong_dt_thuc - tong_cp)}")
print(f"  Tổng CK Nội Bộ     : {fmt(tong_ck)}")
print(f"  Tổng Tài Sản       : {fmt(tong_ts)}")

# ══════════════════════════════════════════════════════════════
# 11. KIỂM TRA KHOẢNG TRỐNG DỮ LIỆU
# ══════════════════════════════════════════════════════════════
print("\n📅 11. KHOẢNG TRỐNG DỮ LIỆU (tháng không có giao dịch)")
print(sep)

# Tháng nào không có doanh_thu
months_with_dt = set()
for r in dt_data:
    if r.get('ngay'):
        months_with_dt.add(r['ngay'][:7])

months_with_cp = set()
for r in cp_data:
    if r.get('ngay'):
        months_with_cp.add(r['ngay'][:7])

# Tạo list tháng từ 2026-01 đến 2026-04
check_months = []
for y in range(2026, 2027):
    for m in range(1, 5):
        check_months.append(f"{y}-{m:02d}")

print("  Kiểm tra 2026-01 đến 2026-04:")
for ym in check_months:
    dt_ok = "✅" if ym in months_with_dt else "❌"
    cp_ok = "✅" if ym in months_with_cp else "❌"
    dt_n = len([r for r in dt_data if r.get('ngay','').startswith(ym)])
    cp_n = len([r for r in cp_data if r.get('ngay','').startswith(ym)])
    print(f"    {ym}: DT {dt_ok} ({dt_n:3} records) | CP {cp_ok} ({cp_n:3} records)")

# Kiểm tra năm trước
print("\n  Doanh Thu & Chi Phí theo tháng (2025):")
for m in range(1, 13):
    ym = f"2025-{m:02d}"
    dt_n = len([r for r in dt_data if r.get('ngay','').startswith(ym)])
    cp_n = len([r for r in cp_data if r.get('ngay','').startswith(ym)])
    flag = "⚠️ " if dt_n == 0 else "   "
    print(f"    {flag}{ym}: DT={dt_n:3} | CP={cp_n:3}")

# ══════════════════════════════════════════════════════════════
# TỔNG KẾT
# ══════════════════════════════════════════════════════════════
print("\n" + SEP)
print("  KẾT LUẬN AUDIT")
print(SEP)
print(f"  ✅ doanh_thu    : {dt_count} records")
print(f"  ✅ chi_phi      : {cp_count} records")
print(f"  ✅ ck_noi_bo    : {ck_count} records")
print(f"  ✅ don_hang     : {dh_count} records")
print(f"  ✅ khach_hang   : {kh_count} records")
print(f"  ✅ the_ltrình   : {tlt_count} records")
print(f"  ✅ nhan_vien    : {len(nv_data)} records")
print(f"  ✅ cham_cong    : {cc_count} records")
print(f"  ✅ kho_san_pham : {len(kho_data)} records")
print(f"\n  Dữ liệu DT sai : {len(invalid_ht)} records")
print(f"  DT > 30/04     : {len(future_dt)} records")
print(f"  CP > 30/04     : {len(future_cp)} records")
print(SEP)
