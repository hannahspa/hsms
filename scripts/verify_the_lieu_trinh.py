"""
Diff danh sách thẻ liệu trình MySpa vs HSMS.

Đọc Excel MySpa, query toàn bộ the_lieu_trinh từ HSMS, so sánh qua ma_the.
Output: báo cáo chi tiết các thẻ khớp / lệch / thiếu / dư.
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import openpyxl
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.import')
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

EXCEL_PATH = r"D:\Hannah Spa\Database\danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1778310007.xlsx"

# ── 1. Đọc Excel MySpa ──
print("📄 Đọc Excel MySpa...")
wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
ws = wb.active

myspa = {}  # ma_the → dict
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0:
        continue  # header
    if not row[0]:  # bỏ dòng trống
        continue
    ma_the = str(row[0]).strip()
    def to_int(x):
        if x is None or x == '':
            return 0
        try:
            return int(float(str(x).replace(',', '')))
        except (ValueError, TypeError):
            return -1  # mark "Không giới hạn"
    myspa[ma_the] = {
        'ma_the': ma_the,
        'ngay_tao': row[1],
        'ma_kh': row[2],
        'ten_kh': row[3],
        'sdt': str(row[4]) if row[4] else '',
        'ten_goi': row[5],
        'ten_dv': row[7],
        'so_buoi_tong': to_int(row[8]),
        'so_buoi_da_dung': to_int(row[9]),
        'tong_tien': float(row[11] or 0),
        'ngay_het_han': row[15],
        'chi_nhanh': row[17],
    }

print(f"   MySpa: {len(myspa)} thẻ")

# ── 2. Query toàn bộ HSMS ──
print("🔎 Query HSMS the_lieu_trinh...")
hsms = {}
offset = 0
batch_size = 1000
while True:
    res = sb.table('the_lieu_trinh').select(
        'id, ma_the, ten_dich_vu, so_buoi_tong, so_buoi_da_dung, so_buoi_con_lai, '
        'trang_thai, ngay_mua, ngay_het_han, khach_hang_id, '
        'khach_hang:khach_hang_id(ho_ten, so_dien_thoai)'
    ).range(offset, offset + batch_size - 1).execute()
    rows = res.data or []
    if not rows:
        break
    for r in rows:
        if r.get('ma_the'):
            hsms[r['ma_the']] = r
    if len(rows) < batch_size:
        break
    offset += batch_size

print(f"   HSMS: {len(hsms)} thẻ có ma_the")

# Đếm thẻ HSMS không có ma_the
res_no_ma = sb.table('the_lieu_trinh').select('id', count='exact').is_('ma_the', 'null').execute()
print(f"   HSMS thẻ thiếu ma_the: {res_no_ma.count}")

# ── 3. Diff ──
print("\n🔍 So sánh...")
myspa_keys = set(myspa.keys())
hsms_keys = set(hsms.keys())

# Thẻ chỉ có MySpa (thiếu trong HSMS)
only_myspa = myspa_keys - hsms_keys
# Thẻ chỉ có HSMS (dư so với MySpa)
only_hsms = hsms_keys - myspa_keys
# Thẻ có ở cả 2
matched = myspa_keys & hsms_keys

print(f"   Khớp mã: {len(matched)}")
print(f"   Chỉ MySpa (thiếu HSMS): {len(only_myspa)}")
print(f"   Chỉ HSMS (dư): {len(only_hsms)}")

# So chi tiết các thẻ matched
khop_hoan_toan = 0
lech_so_buoi = []
lech_tong = []

for ma in matched:
    m = myspa[ma]
    h = hsms[ma]
    same_tong = m['so_buoi_tong'] == (h['so_buoi_tong'] or 0)
    same_dung = m['so_buoi_da_dung'] == (h['so_buoi_da_dung'] or 0)
    if same_tong and same_dung:
        khop_hoan_toan += 1
    else:
        item = {
            'ma_the': ma,
            'sdt': m['sdt'],
            'ten_kh': m['ten_kh'],
            'ten_dv_myspa': m['ten_goi'],
            'ten_dv_hsms': h['ten_dich_vu'],
            'myspa_tong': m['so_buoi_tong'],
            'hsms_tong': h['so_buoi_tong'] or 0,
            'myspa_dung': m['so_buoi_da_dung'],
            'hsms_dung': h['so_buoi_da_dung'] or 0,
        }
        if not same_tong:
            lech_tong.append(item)
        elif not same_dung:
            lech_so_buoi.append(item)

print(f"   Khớp 100% (cả tổng buổi + đã dùng): {khop_hoan_toan}")
print(f"   Lệch tổng số buổi: {len(lech_tong)}")
print(f"   Lệch số buổi đã dùng (tổng giống): {len(lech_so_buoi)}")

# ── 4. Ghi báo cáo ──
print("\n📝 Ghi báo cáo verify_TLT_report.txt...")
with open('verify_TLT_report.txt', 'w', encoding='utf-8') as f:
    f.write("="*80 + "\n")
    f.write("BÁO CÁO ĐỐI SOÁT THẺ LIỆU TRÌNH — MySpa vs HSMS\n")
    f.write("="*80 + "\n\n")
    f.write(f"MySpa: {len(myspa)} thẻ\n")
    f.write(f"HSMS:  {len(hsms)} thẻ\n\n")
    f.write(f"✅ Khớp 100% (tổng + đã dùng): {khop_hoan_toan} ({khop_hoan_toan*100/max(1,len(matched)):.1f}%)\n")
    f.write(f"⚠️  Lệch số buổi đã dùng:       {len(lech_so_buoi)}\n")
    f.write(f"⚠️  Lệch tổng số buổi:          {len(lech_tong)}\n")
    f.write(f"❌ MySpa có, HSMS thiếu:        {len(only_myspa)}\n")
    f.write(f"❌ HSMS có, MySpa không có:     {len(only_hsms)}\n\n")

    if lech_so_buoi:
        f.write("─"*80 + "\n")
        f.write(f"⚠️ {len(lech_so_buoi)} THẺ LỆCH SỐ BUỔI ĐÃ DÙNG (top 50)\n")
        f.write("─"*80 + "\n")
        f.write(f"{'Mã Thẻ':<14} {'SĐT':<12} {'KH':<25} {'MySpa':<8} {'HSMS':<8} {'Lệch':<6}\n")
        for x in lech_so_buoi[:50]:
            lech = x['myspa_dung'] - x['hsms_dung']
            f.write(f"{x['ma_the']:<14} {x['sdt']:<12} {(x['ten_kh'] or '')[:23]:<25} "
                    f"{x['myspa_dung']:<8} {x['hsms_dung']:<8} {lech:+d}\n")
        f.write("\n")

    if lech_tong:
        f.write("─"*80 + "\n")
        f.write(f"⚠️ {len(lech_tong)} THẺ LỆCH TỔNG SỐ BUỔI (top 50)\n")
        f.write("─"*80 + "\n")
        f.write(f"{'Mã Thẻ':<14} {'SĐT':<12} {'KH':<25} {'MySpa-T':<8} {'HSMS-T':<8} {'MySpa-D':<8} {'HSMS-D':<8}\n")
        for x in lech_tong[:50]:
            f.write(f"{x['ma_the']:<14} {x['sdt']:<12} {(x['ten_kh'] or '')[:23]:<25} "
                    f"{x['myspa_tong']:<8} {x['hsms_tong']:<8} "
                    f"{x['myspa_dung']:<8} {x['hsms_dung']:<8}\n")
        f.write("\n")

    if only_myspa:
        f.write("─"*80 + "\n")
        f.write(f"❌ {len(only_myspa)} THẺ CHỈ CÓ Ở MYSPA (top 30)\n")
        f.write("─"*80 + "\n")
        f.write(f"{'Mã Thẻ':<14} {'SĐT':<12} {'KH':<25} {'DV':<35} {'Tổng':<6} {'Đã dùng':<8}\n")
        for ma in list(only_myspa)[:30]:
            m = myspa[ma]
            f.write(f"{m['ma_the']:<14} {m['sdt']:<12} {(m['ten_kh'] or '')[:23]:<25} "
                    f"{(m['ten_goi'] or '')[:33]:<35} {m['so_buoi_tong']:<6} {m['so_buoi_da_dung']:<8}\n")
        f.write("\n")

    if only_hsms:
        f.write("─"*80 + "\n")
        f.write(f"❌ {len(only_hsms)} THẺ CHỈ CÓ Ở HSMS (sort theo ngày mua)\n")
        f.write("─"*80 + "\n")
        f.write(f"{'Mã Thẻ':<14} {'Ngày Mua':<12} {'SĐT':<12} {'KH':<22} {'DV':<33} {'Tổng':<5}\n")
        only_hsms_sorted = sorted(only_hsms, key=lambda m: hsms[m].get('ngay_mua') or '', reverse=True)
        for ma in only_hsms_sorted:
            h = hsms[ma]
            sdt = (h.get('khach_hang') or {}).get('so_dien_thoai') or ''
            ten = (h.get('khach_hang') or {}).get('ho_ten') or ''
            ngay = str(h.get('ngay_mua') or '')[:10]
            f.write(f"{h['ma_the']:<14} {ngay:<12} {sdt:<12} {ten[:20]:<22} "
                    f"{(h['ten_dich_vu'] or '')[:31]:<33} {h['so_buoi_tong'] or 0:<5}\n")
        f.write("\n")
        # Tính số thẻ sau 30/04/2026
        sau_30_4 = sum(1 for ma in only_hsms if str(hsms[ma].get('ngay_mua') or '')[:10] > '2026-04-30')
        f.write(f"  → {sau_30_4} thẻ mua SAU 30/04/2026 (sau ngày export Excel)\n")
        f.write(f"  → {len(only_hsms) - sau_30_4} thẻ mua TRƯỚC 30/04/2026 (CẦN ĐIỀU TRA)\n\n")

print("✓ Đã ghi verify_TLT_report.txt")
print(f"\n{'='*60}")
print(f"TÓM TẮT:")
print(f"  MySpa: {len(myspa)} thẻ | HSMS: {len(hsms)} thẻ")
print(f"  ✅ Khớp 100%:  {khop_hoan_toan} ({khop_hoan_toan*100/max(1,len(matched)):.1f}% của matched)")
print(f"  ⚠️  Lệch buổi: {len(lech_so_buoi)} (lệch đã dùng) + {len(lech_tong)} (lệch tổng)")
print(f"  ❌ Thẻ thiếu HSMS: {len(only_myspa)}")
print(f"  ❌ Thẻ dư HSMS:    {len(only_hsms)}")
print(f"{'='*60}")
