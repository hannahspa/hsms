"""So sanh theo thang: Bank vs HSMS"""
import sys, openpyxl
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')
from supabase import create_client

url = 'https://aqyemkfbjqxpegingoil.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI'
supabase = create_client(url, key)

def fmt(n):
    return f'{int(n):>15,}'.replace(',', '.')

base = r'D:\Hannah Spa\Thu Chi\Kiem Toan'

# READ BANK TRANSACTIONS
def read_bank(filepath):
    wb = openpyxl.load_workbook(filepath, data_only=True)
    ws = wb['Lịch sử giao dịch']
    txns = []
    for row in ws.iter_rows(min_row=20, max_row=ws.max_row, values_only=True):
        stt = row[1]; ngay = str(row[4] or '').strip()
        phat_sinh_no = row[9]; phat_sinh_co = row[10]
        noi_dung = str(row[11] or '')
        if stt is None or str(stt).strip() == '' or 'STT' in str(stt): continue
        try:
            no_amt = float(str(phat_sinh_no).replace(',','')) if phat_sinh_no else 0
            co_amt = float(str(phat_sinh_co).replace(',','')) if phat_sinh_co else 0
        except: continue
        parts = ngay[:10].split('/')
        if len(parts) == 3:
            month = parts[2] + '-' + parts[1].zfill(2)
        else:
            month = ngay[:7] if len(ngay) >= 7 else ngay
        txns.append({'month': month, 'debit': int(no_amt), 'credit': int(co_amt), 'desc': noi_dung.upper().strip()})
    return txns

all_bank = read_bank(base + '\\QuocNam.xlsx') + read_bank(base + '\\KhanhDuy.xlsx')

# Remove QN->KD internal transfer
all_bank = [t for t in all_bank if not (t['debit'] == 45587362 and 'KHANH DUY' in t['desc'])]
all_bank = [t for t in all_bank if not (t['credit'] == 45587362 and 'QUOC NAM' in t['desc'])]

# CATEGORIZE
bank_in = defaultdict(lambda: {'ck': 0, 'cash': 0, 'tp': 0, 'other': 0})
bank_out = defaultdict(lambda: {'luong': 0, 'tip': 0, 'qc': 0, 'nha': 0, 'dien_nuoc': 0, 'my_pham': 0, 'ky_quy': 0, 'ung_luong': 0, 'thue': 0, 'anh_nam': 0, 'khac': 0})

for t in all_bank:
    m = t['month']; d = t['desc']
    if t['credit'] > 0:
        if 'DT TM' in d or 'TIEN MAT DT' in d:
            bank_in[m]['cash'] += t['credit']
        elif 'DIEM MY' in d or 'QUET THE' in d:
            bank_in[m]['tp'] += t['credit']
        else:
            bank_in[m]['ck'] += t['credit']
    if t['debit'] > 0:
        if 'TIP EM' in d or (('TIP' in d or 'BO' in d) and 'KHACH' in d):
            bank_out[m]['tip'] += t['debit']
        elif 'LUONG' in d:
            bank_out[m]['luong'] += t['debit']
        elif 'QC' in d:
            bank_out[m]['qc'] += t['debit']
        elif 'NHA' in d:
            bank_out[m]['nha'] += t['debit']
        elif 'DIEN' in d or 'NUOC' in d or 'WATER' in d or 'EVN' in d:
            bank_out[m]['dien_nuoc'] += t['debit']
        elif 'MY PHAM' in d or 'SKINDOM' in d or 'DAU GOI' in d:
            bank_out[m]['my_pham'] += t['debit']
        elif 'KY QUY' in d:
            bank_out[m]['ky_quy'] += t['debit']
        elif 'UNG LUONG' in d:
            bank_out[m]['ung_luong'] += t['debit']
        elif 'THUE' in d:
            bank_out[m]['thue'] += t['debit']
        elif 'ANH NAM' in d or 'HONG NGOC' in d:
            bank_out[m]['anh_nam'] += t['debit']
        else:
            bank_out[m]['khac'] += t['debit']

# HSMS DATA
r = supabase.from_('doanh_thu').select('ngay,so_tien').eq('hinh_thuc','chuyen_khoan').lte('ngay','2026-05-09').execute()
hsms_dt_ck = defaultdict(int)
for d in (r.data or []):
    if d.get('ngay'): hsms_dt_ck[d['ngay'][:7]] += d['so_tien'] or 0

vi_map = {v['loai']: v['id'] for v in supabase.from_('vi').select('id,loai').execute().data or []}
r = supabase.from_('chuyen_khoan_noi_bo').select('ngay,so_tien,tu_vi_id,den_vi_id').lte('ngay','2026-05-09').execute()
hsms_tm_mb = defaultdict(int)
hsms_tp_mb = defaultdict(int)
for d in (r.data or []):
    if d.get('ngay'):
        m = d['ngay'][:7]
        if d['tu_vi_id'] == vi_map.get('tien_mat') and d['den_vi_id'] == vi_map.get('chuyen_khoan'):
            hsms_tm_mb[m] += d['so_tien'] or 0
        if d['tu_vi_id'] == vi_map.get('quet_the') and d['den_vi_id'] == vi_map.get('chuyen_khoan'):
            hsms_tp_mb[m] += d['so_tien'] or 0

r = supabase.from_('chi_phi').select('ngay,so_tien').eq('hinh_thuc_thanh_toan','chuyen_khoan').lte('ngay','2026-05-09').execute()
hsms_cp_ck = defaultdict(int)
for d in (r.data or []):
    if d.get('ngay'): hsms_cp_ck[d['ngay'][:7]] += d['so_tien'] or 0

# COMPARE
all_months = sorted(set(list(bank_in.keys()) + list(bank_out.keys()) + list(hsms_dt_ck.keys()) + list(hsms_cp_ck.keys())))

print(f'{"Thang":<8s} {"Bank CK":>14s} {"Bank Cash":>14s} {"HSMS DT CK":>14s} {"HSMS TM->MB":>14s} {"Gap IN":>12s}')
print('-'*85)
for m in all_months:
    b_ck = bank_in[m]['ck']
    b_cash = bank_in[m]['cash'] + bank_in[m]['tp']
    h_ck = hsms_dt_ck[m]
    h_tm = hsms_tm_mb[m]
    gap_in = (b_ck + b_cash) - (h_ck + h_tm)
    print(f'{m:<8s} {fmt(b_ck)} {fmt(b_cash)} {fmt(h_ck)} {fmt(h_tm)} {fmt(gap_in)}')

total_b_in = sum(bank_in[m]['ck']+bank_in[m]['cash']+bank_in[m]['tp'] for m in all_months)
total_h_in = sum(hsms_dt_ck[m]+hsms_tm_mb[m] for m in all_months)
print('-'*85)
print(f'{"TONG":<8s} {fmt(total_b_in)} {"":>14s} {fmt(total_h_in)} {"":>14s} {fmt(total_b_in-total_h_in)}')
print()

print(f'{"Thang":<8s} {"Bank Out":>14s} {"Bank Tip":>12s} {"HSMS CP CK":>14s} {"Gap (excl tip)":>16s}')
print('-'*75)
total_b_out = 0; total_b_tip = 0; total_h_cp = 0
for m in all_months:
    b_out = sum(v for k, v in bank_out[m].items() if k != 'tip')
    b_tip = bank_out[m]['tip']
    h_cp = hsms_cp_ck[m]
    gap_out = b_out - h_cp
    total_b_out += b_out; total_b_tip += b_tip; total_h_cp += h_cp
    print(f'{m:<8s} {fmt(b_out)} {fmt(b_tip)} {fmt(h_cp)} {fmt(gap_out)}')

print('-'*75)
print(f'{"TONG":<8s} {fmt(total_b_out)} {fmt(total_b_tip)} {fmt(total_h_cp)} {fmt(total_b_out-total_h_cp)}')
print()

# Show where the gap is
print('BANK OUTFLOW DETAIL BY MONTH:')
for m in all_months:
    items = []
    for k, v in bank_out[m].items():
        if v > 0: items.append(f'{k}={v:,}')
    if items:
        print(f'  {m}: {", ".join(items)}')

# Show HSMS CP CK detail by month
print()
print('HSMS CP CK BY MONTH:')
for m in all_months:
    amt = hsms_cp_ck[m]
    if amt > 0:
        print(f'  {m}: {amt:,}')

# SHOW HSMS CP CK detail for months with large gaps
print()
print('THANG CO GAP LON:')
for m in all_months:
    b_out = sum(v for k, v in bank_out[m].items() if k != 'tip')
    h_cp = hsms_cp_ck[m]
    gap = b_out - h_cp
    if abs(gap) > 10000000:  # > 10M
        print(f'\n  {m}: Bank={b_out:,} HSMS={h_cp:,} Gap={gap:,}')
        r_det = supabase.from_('chi_phi').select('ngay,so_tien,dien_giai').eq('hinh_thuc_thanh_toan','chuyen_khoan').gte('ngay', m+'-01').lte('ngay', m+'-31').execute()
        for d in (r_det.data or []):
            print(f'    {d["ngay"]} | {d["so_tien"]:,} | {(d.get("dien_giai","") or "")[:70]}')
