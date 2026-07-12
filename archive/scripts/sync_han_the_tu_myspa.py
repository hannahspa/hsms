# -*- coding: utf-8 -*-
"""
ĐỒNG BỘ NGÀY HẾT HẠN THẺ từ MySpa → HSMS (04/07/2026).

Bối cảnh: đợt sửa 28/06 xóa ngay_het_han quá tay — HSMS chỉ còn 103 thẻ có hạn
trong khi MySpa ghi hạn cụ thể cho 351 thẻ (228 đã quá hạn, vd THE-LT-2989
hết hạn 24/04/2024 nhưng HSMS hiện 'Không giới hạn').

Quy tắc (anh Nam chốt 22/06): hạn thẻ lấy theo CỘT NGÀY HẾT HẠN MySpa;
'Không giới hạn' → NULL. Hết hạn = trạng thái het_han nhưng POS VẪN hiển thị.

Match (KHÔNG tin mã thẻ mù):
  - ma_the khớp + SĐT khách khớp  → dùng (dải cũ ≤31/05 trùng mã 2 hệ)
  - mã không khớp/khác khách       → fallback (SĐT + tên DV chuẩn hóa) nếu
    nhóm đó CHỈ có 1 thẻ mỗi bên (tránh gán nhầm)
Trạng thái tính lại cho thẻ được sửa: con<=0 → het_buoi; con>0 + quá hạn →
het_han; con>0 + còn hạn → active.

Backup đã tạo: the_lieu_trinh_bak_han_20260704 (4.807 dòng).
Chạy:  python scripts/sync_han_the_tu_myspa.py <file_excel> [--apply]
       (mặc định DRY-RUN chỉ in ra, thêm --apply mới ghi DB)
"""
import sys, io, os, re, unicodedata
from datetime import datetime, date
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import openpyxl
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.import')
load_dotenv('.env')
URL = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL') or 'https://api.hannahspa.vn'
sb = create_client(URL, os.environ['SUPABASE_KEY'])

APPLY = '--apply' in sys.argv
EXCEL = next((a for a in sys.argv[1:] if not a.startswith('--')), None) or \
    r'D:\Hannah Spa\Database\danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1783140295.xlsx'
TODAY = date(2026, 7, 4)

def chuan_sdt(s):
    d = re.sub(r'\D', '', str(s or ''))
    if d.startswith('84') and len(d) > 9: d = '0' + d[2:]
    if d and not d.startswith('0'): d = '0' + d
    return d if len(d) >= 9 else ''

def bo_dau(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('đ','d').replace('Đ','D')

def chuan_dv(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', bo_dau(s).lower())
    return re.sub(r'\s+', ' ', s).strip()

# ── 1. MySpa: các thẻ có HẠN CỤ THỂ ──────────────────────────────────────────
wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
ws = wb.active
my_han = []   # thẻ MySpa có hạn cụ thể
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0 or not row[0]: continue
    hh = str(row[15] or '').strip()
    if not hh or hh == 'Không giới hạn': continue
    try:
        d = datetime.strptime(hh, '%d/%m/%Y').date()
    except ValueError:
        continue
    my_han.append({
        'ma_the': str(row[0]).strip(), 'sdt': chuan_sdt(row[4]),
        'dv_key': chuan_dv(row[5] or row[7]), 'ten': row[3], 'hh': d,
    })
print(f'MySpa thẻ có hạn cụ thể: {len(my_han)}')

# ── 2. HSMS: toàn bộ thẻ ─────────────────────────────────────────────────────
hs, offset = [], 0
while True:
    r = sb.table('the_lieu_trinh').select(
        'id, ma_the, ten_dich_vu, so_buoi_tong, so_buoi_da_dung, ngay_het_han, '
        'trang_thai, khach_hang:khach_hang_id(so_dien_thoai)'
    ).range(offset, offset + 999).execute()
    hs.extend(r.data or [])
    if len(r.data or []) < 1000: break
    offset += 1000
for h in hs:
    h['sdt'] = chuan_sdt((h.get('khach_hang') or {}).get('so_dien_thoai'))
    h['dv_key'] = chuan_dv(h.get('ten_dich_vu'))
    h['con'] = max(0, (h.get('so_buoi_tong') or 0) - (h.get('so_buoi_da_dung') or 0))
by_mathe = {}
by_sdt_dv = {}
for h in hs:
    by_mathe.setdefault(str(h.get('ma_the')), []).append(h)
    if h['sdt']:
        by_sdt_dv.setdefault((h['sdt'], h['dv_key']), []).append(h)
print(f'HSMS thẻ: {len(hs)}')

# ── 3. Match + so hạn ────────────────────────────────────────────────────────
updates, khong_match, da_khop = [], [], 0
for m in my_han:
    target = None
    # 3a. mã khớp + SĐT khớp
    for h in by_mathe.get(m['ma_the'], []):
        if h['sdt'] and h['sdt'] == m['sdt']:
            target = h; break
    # 3b. fallback (SĐT, DV) duy nhất 2 bên
    if target is None and m['sdt']:
        ds = by_sdt_dv.get((m['sdt'], m['dv_key']), [])
        cung_nhom_my = [x for x in my_han if x['sdt'] == m['sdt'] and x['dv_key'] == m['dv_key']]
        if len(ds) == 1 and len(cung_nhom_my) == 1:
            target = ds[0]
    if target is None:
        khong_match.append(m); continue
    cur = (target.get('ngay_het_han') or '')[:10]
    new = m['hh'].isoformat()
    if cur == new:
        da_khop += 1; continue
    # trạng thái mới
    if target['con'] <= 0:
        tt = 'het_buoi'
    elif m['hh'] < TODAY:
        tt = 'het_han'
    else:
        tt = 'active'
    updates.append((target['id'], target.get('ma_the'), m['ten'], m['sdt'],
                    cur or 'NULL', new, target['trang_thai'], tt))

print(f'\nĐã khớp hạn sẵn: {da_khop} | Cần cập nhật: {len(updates)} | Không match được: {len(khong_match)}')
for u in updates[:15]:
    print(f'  {u[1]} | {u[2]} {u[3]} | HH {u[4]} → {u[5]} | tt {u[6]} → {u[7]}')
if len(updates) > 15: print(f'  ... và {len(updates)-15} thẻ nữa')
for m in khong_match[:10]:
    print(f'  ⚠ KHÔNG MATCH: {m[chr(109)+chr(97)+chr(95)+chr(116)+chr(104)+chr(101)] if False else m["ma_the"]} | {m["ten"]} {m["sdt"]} | HH {m["hh"]}')

# ── 4. Apply ─────────────────────────────────────────────────────────────────
if APPLY and updates:
    ok = 0
    for tid, *_rest, tt_new in [(u[0], u[7]) for u in updates]:
        pass  # placeholder không dùng
    for u in updates:
        tid, hh_new, tt_new = u[0], u[5], u[7]
        sb.table('the_lieu_trinh').update({'ngay_het_han': hh_new, 'trang_thai': tt_new}).eq('id', tid).execute()
        ok += 1
    print(f'\n✅ ĐÃ CẬP NHẬT {ok} thẻ (backup: the_lieu_trinh_bak_han_20260704)')
elif updates:
    print('\n(DRY-RUN — thêm --apply để ghi thật)')
