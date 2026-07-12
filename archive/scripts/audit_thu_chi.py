"""Kiểm toán Sổ Thu Chi HSMS — tìm nguyên nhân sai lệch số dư"""
import os, sys, io
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fmt(n):
    if n is None: return "0đ"
    return f"{int(n):,}đ".replace(",", ".")

print("=" * 70)
print("KIỂM TOÁN SỔ THU CHI — HANNAH SPA")
print("=" * 70)

# 1. Xem view so_du_vi_thuc_te
print("\n1. SỐ DƯ HIỆN TẠI (view so_du_vi_thuc_te):")
print("-" * 50)
r = supabase.from_("so_du_vi_thuc_te").select("*").order("thu_tu").execute()
vi_list = r.data or []
for vi in vi_list:
    print(f"  {vi.get('ten','?'):15s}  so_du_hien_tai = {fmt(vi.get('so_du_hien_tai'))}")

total = sum(v.get('so_du_hien_tai', 0) or 0 for v in vi_list)
print(f"  {'TỔNG TÀI SẢN':15s}  = {fmt(total)}")

# 2. Xem bảng vi gốc (so_du_dau)
print("\n2. BẢNG VI GỐC (so_du_dau):")
print("-" * 50)
r = supabase.from_("vi").select("*").order("thu_tu").execute()
for vi in (r.data or []):
    print(f"  {vi.get('ten','?'):15s}  so_du_dau = {fmt(vi.get('so_du_dau'))}")

# 3. Tổng doanh thu
print("\n3. TỔNG DOANH THU (tất cả):")
print("-" * 50)
r = supabase.from_("doanh_thu").select("hinh_thuc, so_tien").execute()
dt_by_type = {}
for d in (r.data or []):
    t = d['hinh_thuc']
    dt_by_type[t] = dt_by_type.get(t, 0) + (d['so_tien'] or 0)
for t, v in sorted(dt_by_type.items()):
    print(f"  {t:20s}  {fmt(v)}")
tong_dt = sum(dt_by_type.values())
print(f"  {'TỔNG DOANH THU':20s}  {fmt(tong_dt)}")
tt_truoc = dt_by_type.get('the_tra_truoc', 0)
thuc_thu = tong_dt - tt_truoc
print(f"  {'Thẻ Trả Trước':20s}  {fmt(tt_truoc)} (loại khỏi cashflow)")
print(f"  {'THỰC THU':20s}  {fmt(thuc_thu)}")

# 4. Tổng chi phí — phân theo hinh_thuc_thanh_toan (vi nào chi)
print("\n4. TỔNG CHI PHÍ:")
print("-" * 50)
r = supabase.from_("chi_phi").select("hinh_thuc_thanh_toan, so_tien").execute()
cp_by_type = {}
for d in (r.data or []):
    t = d.get('hinh_thuc_thanh_toan', 'khong_xac_dinh')
    cp_by_type[t] = cp_by_type.get(t, 0) + (d['so_tien'] or 0)
for t, v in sorted(cp_by_type.items()):
    print(f"  {t:20s}  {fmt(v)}")
tong_cp = sum(cp_by_type.values())
print(f"  {'TỔNG CHI PHÍ':20s}  {fmt(tong_cp)}")

# 5. Chuyển khoản nội bộ
print("\n5. CHUYỂN KHOẢN NỘI BỘ:")
print("-" * 50)
r = supabase.from_("chuyen_khoan_noi_bo").select("tu_vi_id, den_vi_id, so_tien").execute()
ck_by_vi = {}
for d in (r.data or []):
    tu_id = d['tu_vi_id']
    den_id = d['den_vi_id']
    st = d['so_tien'] or 0
    ck_by_vi[tu_id] = ck_by_vi.get(tu_id, 0) + st   # tiền đi ra
    ck_by_vi[den_id] = ck_by_vi.get(den_id, 0) - st  # tiền đi vào (âm = vào)

for vi in (r2 := supabase.from_("vi").select("id,ten").execute()).data or []:
    net = ck_by_vi.get(vi['id'], 0)
    print(f"  {vi['ten']:15s}  net CK = {fmt(-net)} (dương = nhận vào, âm = chuyển đi)")

# 6. Kiểm tra chéo: so_du_hien_tai có khớp so_du_dau + thu - chi + ck?
print("\n6. KIỂM TRA CHÉO SỐ DƯ:")
print("-" * 50)

# Lấy vi_id cho từng loại hình thức
# Tiền Mặt -> vi_id của ví Tiền Mặt
# Chuyển Khoản -> vi_id của ví MB Bank
# Quẹt Thẻ -> vi_id của ví TP Bank

vi_map = {}
for vi in (supabase.from_("vi").select("id,ten,loai").execute().data or []):
    vi_map[vi['loai']] = vi
    vi_map[vi['id']] = vi

# Doanh thu theo từng ví (dựa vào hinh_thuc)
r = supabase.from_("doanh_thu").select("hinh_thuc, so_tien").execute()
dt_by_vi = {}
for d in (r.data or []):
    if d['hinh_thuc'] == 'the_tra_truoc':
        continue  # không vào cashflow
    # Match doanh_thu.hinh_thuc -> vi.loai directly (tien_mat/chuyen_khoan/quet_the)
    vid = vi_map.get(d['hinh_thuc'], {}).get('id')
    if not vid:
        continue
    dt_by_vi[vid] = dt_by_vi.get(vid, 0) + (d['so_tien'] or 0)

# Chi phí theo từng ví
r = supabase.from_("chi_phi").select("vi_id, so_tien").execute()
cp_by_vi = {}
for d in (r.data or []):
    vid = d.get('vi_id')
    if vid:
        cp_by_vi[vid] = cp_by_vi.get(vid, 0) + (d['so_tien'] or 0)

# CK theo từng ví
r = supabase.from_("chuyen_khoan_noi_bo").select("tu_vi_id, den_vi_id, so_tien").execute()
ck_net_by_vi = {}
for d in (r.data or []):
    ck_net_by_vi[d['tu_vi_id']] = ck_net_by_vi.get(d['tu_vi_id'], 0) - (d['so_tien'] or 0)
    ck_net_by_vi[d['den_vi_id']] = ck_net_by_vi.get(d['den_vi_id'], 0) + (d['so_tien'] or 0)

for vi in (supabase.from_("vi").select("id,ten,loai,so_du_dau").order("thu_tu").execute().data or []):
    vid = vi['id']
    sd_dau = vi.get('so_du_dau') or 0
    thu = dt_by_vi.get(vid, 0)
    chi = cp_by_vi.get(vid, 0)
    ck = ck_net_by_vi.get(vid, 0)
    tinh_tay = sd_dau + thu - chi + ck

    sd_view = next((v.get('so_du_hien_tai', 0) or 0 for v in vi_list if v.get('id') == vid), 0)

    match = "✅ KHỚP" if tinh_tay == sd_view else f"❌ LỆCH {fmt(tinh_tay - sd_view)}"
    print(f"  {vi['ten']:15s}  so_du_dau={fmt(sd_dau)} + thu={fmt(thu)} - chi={fmt(chi)} + ck={fmt(ck)} = {fmt(tinh_tay)}")
    print(f"  {'':15s}  view so_du_hien_tai = {fmt(sd_view)}  →  {match}")

# 7. Tổng kết
print("\n7. KẾT LUẬN:")
print("-" * 50)
loi_nhuan = thuc_thu - tong_cp
print(f"  Thực Thu:     {fmt(thuc_thu)}")
print(f"  Tổng Chi:     {fmt(tong_cp)}")
print(f"  Lợi Nhuận:    {fmt(loi_nhuan)}")
print(f"  Tổng Tài Sản: {fmt(total)}")

# Check the_tra_truoc handling in view
print("\n8. KIỂM TRA THE_TRA_TRUOC TRONG VIEW:")
print("-" * 50)
# Nếu view không loại trừ the_tra_truoc, thì so_du se cao hon thuc te
# Tổng the_tra_truoc = ?
print(f"  Tổng Thẻ Trả Trước (đã loại khỏi cashflow): {fmt(tt_truoc)}")
if tt_truoc > 0:
    # Kiểm tra xem view có loại trừ đúng không
    # Nếu total == (sd_dau_sum + thuc_thu - tong_cp + ck_net) thì OK
    # Nếu total == (sd_dau_sum + tong_dt - tong_cp + ck_net) thì SAI (chưa loại the_tra_truoc)
    sd_dau_sum = sum(v.get('so_du_dau', 0) or 0 for v in (supabase.from_("vi").select("so_du_dau").execute().data or []))
    ck_net_total = sum(ck_net_by_vi.values())
    with_tt = sd_dau_sum + tong_dt - tong_cp + ck_net_total
    without_tt = sd_dau_sum + thuc_thu - tong_cp + ck_net_total
    print(f"  Nếu view KHÔNG loại thẻ TT: total = {fmt(with_tt)}")
    print(f"  Nếu view CÓ loại thẻ TT:   total = {fmt(without_tt)}")
    print(f"  View thực tế:               total = {fmt(total)}")
    if total == with_tt:
        print("  ⚠️  VIEW ĐANG KHÔNG LOẠI TRỪ THẺ TRẢ TRƯỚC!")
    elif total == without_tt:
        print("  ✅ View đã loại trừ thẻ trả trước đúng.")

print("\n" + "=" * 70)
print("HOÀN TẤT KIỂM TOÁN")
