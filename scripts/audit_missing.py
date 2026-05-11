"""Tim chinh xac cac khoan chi con thieu"""
import sys, openpyxl
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')
from supabase import create_client

url = 'https://aqyemkfbjqxpegingoil.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI'
supabase = create_client(url, key)

base = r'D:\Hannah Spa\Thu Chi\Kiem Toan'

# Load HSMS amounts by month
r = supabase.from_('chi_phi').select('ngay,so_tien').eq('hinh_thuc_thanh_toan','chuyen_khoan').lte('ngay','2026-05-09').execute()
hsms_set = defaultdict(set)
for d in (r.data or []):
    if d.get('ngay'):
        hsms_set[d['ngay'][:7]].add(d['so_tien'] or 0)

# Read bank outflows
all_out = []
fnames = ['QuocNam.xlsx', 'KhanhDuy.xlsx']
for fname in fnames:
    path = base + '\\' + fname
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[wb.sheetnames[0]]
    for row in ws.iter_rows(min_row=20, max_row=ws.max_row, values_only=True):
        stt = row[1]
        ngay = str(row[4] or '').strip()
        no_amt = row[9]
        desc = str(row[11] or '')
        to_acct = str(row[17] or '')
        if stt is None or str(stt).strip() == '' or 'STT' in str(stt):
            continue
        try:
            amt = int(float(str(no_amt).replace(',',''))) if no_amt else 0
        except:
            continue
        if amt <= 0:
            continue
        parts = ngay[:10].split('/')
        if len(parts) != 3:
            continue
        iso = parts[2] + '-' + parts[1].zfill(2) + '-' + parts[0].zfill(2)
        m = parts[2] + '-' + parts[1].zfill(2)
        all_out.append((iso, m, amt, desc.strip(), to_acct.strip()))

# Remove QN->KD
all_out = [t for t in all_out if not (t[2] == 45587362 and 'KHANH DUY' in t[3].upper())]

def categorize(desc):
    d = desc.upper()
    if 'TIP EM' in d or (('TIP' in d or 'BO' in d) and 'KHACH' in d):
        return 'TIP EM'
    if 'LUONG' in d:
        return 'LUONG'
    if 'QC FB' in d or ('QC' in d and 'HANNAH' in d):
        return 'QC FB'
    if 'NHA' in d and ('TIEN' in d or 'THUE' in d or 'TT' in d):
        return 'TIEN NHA'
    if 'EVN' in d or 'DIEN' in d:
        return 'DIEN'
    if 'WATER' in d:
        return 'NUOC'
    if 'MY PHAM' in d or 'SKINDOM' in d or 'DAU GOI' in d:
        return 'MY PHAM'
    if 'KY QUY' in d:
        return 'KY QUY'
    if 'UNG LUONG' in d:
        return 'UNG LUONG'
    if 'ANH NAM' in d or 'HONG NGOC' in d:
        return 'ANH NAM'
    if 'RUT TIEN' in d or 'ATM' in d:
        return 'RUT TIEN (ko CP)'
    if 'LAI' in d and 'TRA' not in d:
        return 'LAI (ko CP)'
    if 'THUONG' in d or 'DAT DS' in d or 'NONG DAT' in d:
        return 'THUONG/KHEN'
    if 'MAY LANH' in d or 'MAY GIAT' in d or 'TRIET LONG' in d:
        return 'THIET BI/SUA CHUA'
    if '13949' in d or '13849' in d:
        return '13849 (lai NH)'
    if 'GIUONG' in d:
        return 'NOI THAT'
    if 'HUI' in d:
        return 'HUI (ko CP)'
    if 'DAY HOC' in d:
        return 'DAY HOC VIEN'
    if 'WIFI' in d:
        return 'WIFI'
    if 'THUE' in d:
        return 'THUE'
    return 'KHAC'

cats = defaultdict(list)
for iso, m, amt, desc, to_acct in all_out:
    cat = categorize(desc)
    if amt in hsms_set.get(m, set()):
        continue
    found = False
    for nm in [m]:
        if amt in hsms_set.get(nm, set()):
            found = True
            break
    if found:
        continue
    cats[cat].append((iso, amt, desc, to_acct))

grand = 0
expense_total = 0
non_expense_total = 0
cat_order = ['LUONG','THUONG/KHEN','QC FB','TIEN NHA','DIEN','NUOC','MY PHAM','KY QUY','UNG LUONG','ANH NAM','THIET BI/SUA CHUA','NOI THAT','WIFI','THUE','DAY HOC VIEN','KHAC','TIP EM','RUT TIEN (ko CP)','LAI (ko CP)','HUI (ko CP)','13849 (lai NH)']

for cat in cat_order:
    if cat not in cats:
        continue
    items = cats[cat]
    t = sum(x[1] for x in items)
    grand += t
    is_exp = 'ko CP' not in cat and cat != 'TIP EM'
    if is_exp:
        expense_total += t
    else:
        non_expense_total += t
    label = '[CHI PHI]' if is_exp else '[KO CP]'
    print()
    print(label, cat + ':', '{:,}'.format(t), '(' + str(len(items)) + ' gd)')
    for iso, amt, desc, to_acct in sorted(items, key=lambda x: -x[1]):
        print('  ' + iso + ' | ' + '{:>12,}'.format(amt) + ' | ' + desc[:80] + ' | -> ' + to_acct[:25])

print()
print('='*70)
print('TONG CHUA CO TRONG HSMS: ' + '{:,}'.format(grand))
print('  Chi phi KD: ' + '{:,}'.format(expense_total))
print('  Ko phai CP: ' + '{:,}'.format(non_expense_total))
print()
print('Neu them ' + '{:,}'.format(expense_total) + ' vao HSMS CP CK:')
print('  MB Bank = 80,359,066 - ' + '{:,}'.format(expense_total) + ' = ' + '{:,}'.format(80359066 - expense_total))
print('  KD thuc te = 73,916,234')
print('  Chenh = ' + '{:,}'.format((80359066 - expense_total) - 73916234))
