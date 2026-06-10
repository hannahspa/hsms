import sys, io, openpyxl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client
from collections import defaultdict
from datetime import datetime

SUPABASE_URL = 'https://aqyemkfbjqxpegingoil.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI'
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fmt(n):
    if n is None: return '0d'
    return '{:,}d'.format(int(n)).replace(',', '.')

r = supabase.from_('vi').select('id,ten').execute()
vi_map = {v['ten']: v['id'] for v in (r.data or [])}
tm_id = vi_map['Tiền Mặt']
mb_id = vi_map['MB Bank']

# ==========================================
# 1. HSMS: DOANH THU CK T6 THEO NGAY
# ==========================================
r = supabase.from_('doanh_thu').select('ngay,so_tien,dien_giai,nguon').eq('hinh_thuc','chuyen_khoan').gte('ngay','2026-06-01').lte('ngay','2026-06-09').order('ngay').execute()
hsms_dt = defaultdict(list)
for d in (r.data or []):
    hsms_dt[d['ngay']].append(d)

# ==========================================
# 2. HSMS: CHI PHI CK T6 THEO NGAY
# ==========================================
r = supabase.from_('chi_phi').select('ngay,so_tien,dien_giai,vi_id,hinh_thuc_thanh_toan').gte('ngay','2026-06-01').lte('ngay','2026-06-09').order('ngay').execute()
hsms_cp = defaultdict(list)
for d in (r.data or []):
    httt = d.get('hinh_thuc_thanh_toan') or 'NULL'
    vid = d.get('vi_id') or 'NULL'
    if httt == 'chuyen_khoan' or vid == mb_id:
        hsms_cp[d['ngay']].append(d)

# ==========================================
# 3. HSMS: CK NOI BO TM->MB T6
# ==========================================
r = supabase.from_('chuyen_khoan_noi_bo').select('ngay,so_tien').eq('tu_vi_id', tm_id).eq('den_vi_id', mb_id).gte('ngay','2026-06-01').lte('ngay','2026-06-09').order('ngay').execute()
hsms_ck = defaultdict(int)
for d in (r.data or []):
    hsms_ck[d['ngay']] += (d['so_tien'] or 0)

# ==========================================
# 4. SAO KE KHANH DUY T6
# ==========================================
base = r'D:\Hannah Spa\Thu Chi\Kiem Toan'
wb = openpyxl.load_workbook(base + r'\Khanh Duy 26.05 Den 09.06.xlsx', data_only=True)
ws = wb[wb.sheetnames[0]]

sk_thu = defaultdict(list)
sk_chi = defaultdict(list)
sk_dt_tm = defaultdict(int)

for row in range(20, ws.max_row + 1):
    date_val = ws.cell(row=row, column=5).value
    if date_val is None: continue
    debit = ws.cell(row=row, column=10).value
    credit = ws.cell(row=row, column=11).value
    desc = ws.cell(row=row, column=12).value

    try:
        dt = datetime.strptime(str(date_val).strip().split('.')[0], '%d/%m/%Y %H:%M')
        day = dt.strftime('%Y-%m-%d')
    except: continue
    if not day.startswith('2026-06'): continue

    no_val = 0; co_val = 0
    if debit:
        try: no_val = int(float(str(debit).replace(',','')))
        except: pass
    if credit:
        try: co_val = int(float(str(credit).replace(',','')))
        except: pass

    desc_str = str(desc).strip() if desc else ''

    if co_val > 0:
        if 'dt tm' in desc_str.lower():
            sk_dt_tm[day] += co_val
        else:
            # Loc bo tip/tien le
            is_tip = 'tip em' in desc_str.lower()
            if not is_tip:
                sk_thu[day].append({'amount': co_val, 'desc': desc_str})
    if no_val > 0:
        sk_chi[day].append({'amount': no_val, 'desc': desc_str})

# ==========================================
# 5. IN DOI CHIEU TUNG NGAY
# ==========================================
print('DOI CHIEU TUNG NGAY -- THANG 6/2026')
print('=' * 130)

days = sorted(set(list(hsms_dt.keys()) + list(hsms_cp.keys()) + list(hsms_ck.keys()) + list(sk_thu.keys()) + list(sk_chi.keys()) + list(sk_dt_tm.keys())))

total_hsms_dt = 0; total_sk_dt = 0
total_hsms_cp = 0; total_sk_cp = 0
total_hsms_ck = 0; total_sk_ck = 0

for day in days:
    h_dt = sum(d['so_tien'] for d in hsms_dt.get(day, []))
    h_cp = sum(d['so_tien'] for d in hsms_cp.get(day, []))
    h_ck = hsms_ck.get(day, 0)

    s_dt = sum(t['amount'] for t in sk_thu.get(day, []))
    s_cp = sum(t['amount'] for t in sk_chi.get(day, []))
    s_tm = sk_dt_tm.get(day, 0)

    total_hsms_dt += h_dt; total_sk_dt += s_dt
    total_hsms_cp += h_cp; total_sk_cp += s_cp
    total_hsms_ck += h_ck; total_sk_ck += s_tm

    dt_diff = h_dt - s_dt
    cp_diff = h_cp - s_cp
    ck_diff = h_ck - s_tm

    has_data = h_dt > 0 or h_cp > 0 or h_ck > 0 or s_dt > 0 or s_cp > 0 or s_tm > 0

    if has_data:
        print()
        print('--- {} ---'.format(day))
        print('  DOANH THU CK:')
        print('    HSMS: {:>12s} ({})  |  SK: {:>12s} ({})  |  Chenh: {:>10s}'.format(
            fmt(h_dt), len(hsms_dt.get(day, [])), fmt(s_dt), len(sk_thu.get(day, [])), fmt(dt_diff)))
        if dt_diff != 0:
            print('    >>> HSMS records:')
            for d in hsms_dt.get(day, []):
                print('        {} | {} | {}'.format(fmt(d['so_tien']), d.get('nguon','?'), d.get('dien_giai','')[:50]))
            if s_dt > 0:
                print('    >>> SK thu (khach CK):')
                for t in sk_thu.get(day, []):
                    print('        {} | {}'.format(fmt(t['amount']), t['desc'][:70]))

        print('  CHI PHI CK:')
        print('    HSMS: {:>12s} ({})  |  SK: {:>12s} ({})  |  Chenh: {:>10s}'.format(
            fmt(h_cp), len(hsms_cp.get(day, [])), fmt(s_cp), len(sk_chi.get(day, [])), fmt(cp_diff)))
        if cp_diff != 0:
            print('    >>> HSMS CP:')
            for d in hsms_cp.get(day, []):
                print('        {} | {}'.format(fmt(d['so_tien']), d.get('dien_giai','')[:60]))
            if s_cp > 0:
                print('    >>> SK chi:')
                for t in sk_chi.get(day, []):
                    print('        {} | {}'.format(fmt(t['amount']), t['desc'][:70]))

        print('  CK TM->MB:')
        print('    HSMS: {:>12s}  |  SK DT TM: {:>10s}  |  Chenh: {:>10s}'.format(
            fmt(h_ck), fmt(s_tm), fmt(ck_diff)))

print()
print('=' * 130)
print('TONG KET THANG 6')
print('=' * 130)
print('  DT CK:      HSMS {:>12s}  |  SK {:>12s}  |  Chenh {:>10s}'.format(fmt(total_hsms_dt), fmt(total_sk_dt), fmt(total_hsms_dt - total_sk_dt)))
print('  CP CK:      HSMS {:>12s}  |  SK {:>12s}  |  Chenh {:>10s}'.format(fmt(total_hsms_cp), fmt(total_sk_cp), fmt(total_hsms_cp - total_sk_cp)))
print('  CK TM->MB:  HSMS {:>12s}  |  SK {:>12s}  |  Chenh {:>10s}'.format(fmt(total_hsms_ck), fmt(total_sk_ck), fmt(total_hsms_ck - total_sk_ck)))
print()
print('  NET HSMS T6:  DT {} - CP {} + CK {} = {}'.format(fmt(total_hsms_dt), fmt(total_hsms_cp), fmt(total_hsms_ck), fmt(total_hsms_dt - total_hsms_cp + total_hsms_ck)))
print('  NET SK T6:    DT {} - CP {} + CK {} = {}'.format(fmt(total_sk_dt), fmt(total_sk_cp), fmt(total_sk_ck), fmt(total_sk_dt - total_sk_cp + total_sk_ck)))
print('  NET CHENH T6: {}'.format(fmt((total_hsms_dt - total_hsms_cp + total_hsms_ck) - (total_sk_dt - total_sk_cp + total_sk_ck))))
