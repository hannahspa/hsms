"""
Phân tích chi tiết 15 thẻ lệch giữa MySpa và HSMS.
Mỗi thẻ: thông tin đầy đủ + phân tích vấn đề nằm ở đâu.
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import openpyxl
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.import')
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

EXCEL = r"D:\Hannah Spa\Database\danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1778310007.xlsx"

# Đọc Excel
wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
ws = wb.active
myspa = {}
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0 or not row[0]:
        continue
    def to_int(x):
        if x is None or x == '':
            return 0
        try:
            return int(float(str(x).replace(',', '')))
        except (ValueError, TypeError):
            return -1
    ma = str(row[0]).strip()
    myspa[ma] = {
        'ma_the': ma, 'ngay_tao': row[1], 'ten_kh': row[3], 'sdt': str(row[4] or ''),
        'ten_goi': row[5], 'ten_dv': row[7],
        'so_buoi_tong': to_int(row[8]), 'so_buoi_da_dung': to_int(row[9]),
        'tong_tien': float(row[11] or 0), 'thanh_toan': row[12],
        'cong_no': float(row[13] or 0), 'ngay_het_han': row[15], 'ghi_chu': row[16],
        'chi_nhanh': row[17],
    }

# Danh sách 15 mã thẻ lệch
LECH_DUNG = ['THE-LT-7', 'THE-LT-3777', 'THE-LT-234', 'THE-LT-121', 'THE-LT-1279', 'THE-LT-2714']
LECH_TONG = ['THE-LT-3614', 'THE-LT-1643', 'THE-LT-3052', 'THE-LT-1377', 'THE-LT-2011',
             'THE-LT-4560', 'THE-LT-4433', 'THE-LT-1107', 'THE-LT-4484']
ALL_LECH = LECH_DUNG + LECH_TONG

with open('lech_TLT_chi_tiet.txt', 'w', encoding='utf-8') as f:
    f.write("="*90 + "\n")
    f.write("CHI TIẾT 15 THẺ LỆCH GIỮA MYSPA VÀ HSMS\n")
    f.write("="*90 + "\n\n")

    f.write(f"Tổng đối soát: 4,684 thẻ MySpa | 4,740 thẻ HSMS\n")
    f.write(f"Khớp 100%: 4,669 thẻ (99.7%)\n")
    f.write(f"Lệch: 15 thẻ (chi tiết bên dưới)\n")
    f.write(f"Dư HSMS: 56 thẻ (đều mua sau 30/04 — KHÔNG phải lỗi)\n\n")

    for idx, ma in enumerate(ALL_LECH, 1):
        m = myspa.get(ma)
        h_res = sb.table('the_lieu_trinh').select(
            'id, ma_the, ten_dich_vu, so_buoi_tong, so_buoi_da_dung, so_buoi_con_lai, '
            'trang_thai, ngay_mua, ngay_het_han, gia_tri_the, ghi_chu, '
            'khach_hang:khach_hang_id(ho_ten, so_dien_thoai)'
        ).eq('ma_the', ma).maybe_single().execute()
        h = h_res.data

        # Đếm số lần dùng trong don_hang_chi_tiet
        dung_res = sb.table('don_hang_chi_tiet').select(
            'id, dh:don_hang_id(ngay, ma_don, trang_thai)', count='exact'
        ).eq('the_lieu_trinh_id', h['id']).eq('loai_item', 'the_lieu_trinh').execute()
        dung_data = [r for r in (dung_res.data or []) if r.get('dh') and r['dh'].get('trang_thai') != 'huy']
        so_lan_dung_dh = len(dung_data)

        # ngày dùng đầu/cuối
        ngay_dung = sorted([r['dh']['ngay'] for r in dung_data if r.get('dh')])

        f.write(f"\n{'─'*90}\n")
        f.write(f"[{idx}/15] {ma}  —  {h.get('khach_hang', {}).get('ho_ten')} ({h.get('khach_hang', {}).get('so_dien_thoai')})\n")
        f.write(f"{'─'*90}\n")
        f.write(f"  Dịch vụ:\n")
        f.write(f"    MySpa: {m['ten_goi']}\n")
        f.write(f"    HSMS:  {h['ten_dich_vu']}\n")
        f.write(f"  Ngày mua: MySpa={m['ngay_tao']} | HSMS={h.get('ngay_mua')}\n")
        f.write(f"  Hết hạn:  MySpa={m['ngay_het_han']} | HSMS={h.get('ngay_het_han')}\n")
        f.write(f"  Trạng thái HSMS: {h.get('trang_thai')}\n\n")

        f.write(f"  ┌─────────────────┬──────────┬──────────┬─────────┐\n")
        f.write(f"  │ Chỉ số          │  MySpa   │  HSMS    │  Lệch   │\n")
        f.write(f"  ├─────────────────┼──────────┼──────────┼─────────┤\n")
        f.write(f"  │ Tổng buổi       │ {m['so_buoi_tong']:>8} │ {h['so_buoi_tong'] or 0:>8} │ {(h['so_buoi_tong'] or 0) - m['so_buoi_tong']:>+7} │\n")
        f.write(f"  │ Đã dùng         │ {m['so_buoi_da_dung']:>8} │ {h['so_buoi_da_dung'] or 0:>8} │ {(h['so_buoi_da_dung'] or 0) - m['so_buoi_da_dung']:>+7} │\n")
        f.write(f"  │ Còn lại (HSMS)  │    —     │ {h['so_buoi_con_lai'] or 0:>8} │    —    │\n")
        f.write(f"  └─────────────────┴──────────┴──────────┴─────────┘\n\n")

        f.write(f"  Lịch sử dùng thẻ trong đơn hàng HSMS: {so_lan_dung_dh} lượt\n")
        if ngay_dung:
            f.write(f"    Từ {ngay_dung[0]} → {ngay_dung[-1]}\n")

        # Phân tích vấn đề
        f.write(f"\n  🔍 VẤN ĐỀ:\n")
        m_tong, m_dung = m['so_buoi_tong'], m['so_buoi_da_dung']
        h_tong, h_dung = h['so_buoi_tong'] or 0, h['so_buoi_da_dung'] or 0

        if m_tong < 0:
            f.write(f"    ⚠️ MySpa LỖI: tổng buổi = {m_tong} (số âm — không hợp lý)\n")
            f.write(f"       HSMS = {h_tong} CÓ KHẢ NĂNG ĐÚNG HƠN\n")
        elif m_tong == 0 and m_dung > 0:
            f.write(f"    ⚠️ MySpa MÂU THUẪN: tổng = 0 nhưng đã dùng = {m_dung}\n")
            f.write(f"       HSMS đã sửa: tổng = {h_tong}, đã dùng = {h_dung}\n")
        elif m_dung > h_dung:
            f.write(f"    📌 MySpa GHI NHIỀU HƠN HSMS {m_dung - h_dung} buổi đã dùng\n")
            f.write(f"       Có thể KH đã dùng nhưng HSMS chưa ghi lượt vào đơn hàng\n")
            f.write(f"       Hành động: UPDATE HSMS so_buoi_da_dung = {m_dung} → khớp MySpa\n")
        elif h_tong > m_tong:
            f.write(f"    📌 HSMS có TỔNG buổi nhiều hơn MySpa {h_tong - m_tong} buổi\n")
            f.write(f"       Có thể là buổi tặng/khuyến mãi import sau\n")
            f.write(f"       Hành động: kiểm tra trên MySpa — nếu KH chỉ trả tiền {m_tong} buổi thì UPDATE HSMS = {m_tong}\n")

    f.write(f"\n{'='*90}\n")
    f.write("ĐỀ XUẤT KIỂM TRA TRÊN MYSPA:\n")
    f.write("="*90 + "\n")
    f.write("""
1. Mở MySpa → Khách hàng → tìm SĐT của thẻ
2. Xem chi tiết thẻ + lịch sử dùng từng lượt
3. Đối chiếu:
   • Tổng buổi gốc (lúc mua)
   • Số lượt đã dùng thực tế
   • Tên dịch vụ
4. Báo cho em cách xử lý từng thẻ:
   • [Khớp với MySpa]   — em UPDATE HSMS theo MySpa
   • [Khớp với HSMS]    — giữ nguyên HSMS (MySpa sai)
   • [Khác cả 2]        — em UPDATE theo số anh báo
""")

print("✓ Đã ghi lech_TLT_chi_tiet.txt")
