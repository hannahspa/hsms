import os
"""Tim chinh xac cac khoan chi con thieu"""
import sys, openpyxl
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')
from supabase import create_client

url = 'https://aqyemkfbjqxpegingoil.supabase.co'
key = os.environ["SUPABASE_KEY"]
supabase = create_client(url, key)

def fmt(n):
    return f'{int(n):>12,}'.replace(',', '.')

base = r'D:\Hannah Spa\Thu Chi\Kiem Toan'

# Load all HSMS CP CK amounts by month
r = supabase.from_('chi_phi').select('ngay,so_tien,dien_giai').eq('hinh_thuc_thanh_toan','chuyen_khoan').lte('ngay','2026-05-09').execute()
hsms_amts = defaultdict(set)
for d in (r.data or []):
    if d.get('ngay'):
        m = d['ngay'][:7]
        hsms_amts[m].add(d['so_tien'] or 0)

# Read ALL bank outflows
all_bank_out = []
for fname in ['QuocNam.xlsx', 'KhanhDuy.xlsx']:
    wb = openpyxl.load_workbook(base + '\\' + fname, data_only=True)
    ws = wb[wb.sheetnames[0]]
    for row in ws.iter_rows(min_row=20, max_row=ws.max_row, values_only=True):
        stt = row[1]; ngay = str(row[4] or '').strip()
        phat_sinh_no = row[9]; noi_dung = str(row[11] or ''); nguoi_nhan = str(row[17] or '')
        if stt is None or str(stt).strip() == '' or 'STT' in str(stt): continue
        try: no_amt = int(float(str(phat_sinh_no).replace(',',''))) if phat_sinh_no else 0
        except: continue
        if no_amt <= 0: continue
        parts = ngay[:10].split('/')
        if len(parts) != 3: continue
        iso = parts[2] + '-' + parts[1].zfill(2) + '-' + parts[0].zfill(2)
        m = parts[2] + '-' + parts[1].zfill(2)
        all_bank_out.append({'date': iso[:10], 'month': m, 'amt': no_amt, 'desc': noi_dung.strip(), 'to': nguoi_nhan.strip()})

# Remove QN->KD
all_bank_out = [t for t in all_bank_out if not (t['amt'] == 45587362 and 'KHANH DUY' in t['desc'].upper())]

# Categorize and check if in HSMS
def is_tip(desc):
    d = desc.upper()
    return 'TIP EM' in d or (('TIP' in d or 'BO' in d) and 'KHACH' in d)

def is_luong(desc):
    return 'LUONG' in desc.upper()

def categorize(desc):
    d = desc.upper()
    if is_tip(d): return 'TIP EM'
    if is_luong(d): return 'LUONG'
    if 'QC' in d or ('FB' in d and 'HANNAH' in d): return 'QC FB'
    if ('NHA' in d and ('TIEN' in d or 'THUE' in d)) or 'TT TIEN NHA' in d or 'THUE NHA' in d: return 'TIEN NHA'
    if 'DIEN' in d or 'EVN' in d: return 'DIEN'
    if 'WATER' in d or 'NUOC' in d: return 'NUOC'
    if 'MY PHAM' in d or 'SKINDOM' in d or 'DAU GOI' in d or 'MP ' in d: return 'MY PHAM'
    if 'KY QUY' in d: return 'KY QUY'
    if 'UNG LUONG' in d: return 'UNG LUONG'
    if 'THUE' in d: return 'THUE'
    if 'ANH NAM' in d or 'HONG NGOC' in d: return 'ANH NAM'
    if 'RUT TIEN' in d or 'ATM' in d: return 'RUT TIEN (ko phai CP)'
    if 'LAI' in d or 'THU NO' in d: return 'LAI (ko phai CP)'
    if 'THUONG' in d or 'DAT DS' in d or 'NONG' in d: return 'THUONG'
    if 'MAY LANH' in d or 'MAY GIAT' in d or 'MAY SAY' in d or 'MAY NUOC' in d or 'TRIET LONG' in d or 'SUA' in d: return 'SUA CHUA/THIET BI'
    if '13949' in d or '13849' in d: return '13849 (lai NH)'
    if 'GIUONG' in d: return 'NOI THAT'
    if 'HUI' in d: return 'HUI (ko phai CP)'
    if 'DAY HOC' in d: return 'DAY HOC VIEN'
    if 'IN ' in d: return 'IN AN'
    if 'WIFI' in d: return 'WIFI'
    if 'PHI XE' in d: return 'PHI XE'
    if 'TRAI CAY' in d: return 'TRAI CAY'
    if 'COC' in d: return 'COC'
    if 'HOAN' in d: return 'HOAN TIEN (ko phai CP)'
    if 'TIEN MAT' in d or 'DT TM' in d: return 'NOP TM (noi bo)'
    if 'CHUYEN TIEN' in d and ('KHANH DUY' in d or 'DO THI KHANH DUY' in d): return 'CHUYEN KD (ko phai CP)'
    return 'KHAC'

missing_items = []
for t in all_bank_out:
    amt = t['amt']; m = t['month']; cat = categorize(t['desc'])

    # Skip tips (not business expense)
    if cat == 'TIP EM':
        t['cat'] = cat; missing_items.append(t); continue

    # Check if amount exists in HSMS for this month
    if amt in hsms_amts.get(m, set()):
        continue  # Found match

    # Also check neighboring months
    found = False
    for nm in [m]:
        if amt in hsms_amts.get(nm, set()):
            found = True; break
    if found: continue

    t['cat'] = cat
    missing_items.append(t)

# Print by category
cats = defaultdict(list)
for t in missing_items:
    cats[t['cat']].append(t)

print('CAC KHOAN CHI CHUA CO TRONG HSMS (theo nhom):')
print('='*85)
grand_total = 0
for cat in sorted(cats.keys()):
    items = cats[cat]
    cat_total = sum(t['amt'] for t in items)
    grand_total += cat_total
    is_expense = 'KO PHAI CP' not in cat and cat != 'TIP EM' and 'noi bo' not in cat.lower()
    marker = '[CHI PHI]' if is_expense else '[KO CP]'
    print(f'\n{marker} {cat}: {cat_total:,} ({len(items)} gd)')
    for t in sorted(items, key=lambda x: -x['amt']):
        d = t['date']; a = fmt(t['amt']); desc = t['desc'][:80]; to_who = t['to'][:20]
        print('  ' + d + ' | ' + a + ' | ' + desc + ' | -> ' + to_who)

print()
print('='*85)
expense_total = sum(sum(t['amt'] for t in cats[cat]) for cat in cats if 'KO PHAI CP' not in cat and cat != 'TIP EM' and 'noi bo' not in cat.lower())
non_expense = sum(sum(t['amt'] for t in cats[cat]) for cat in cats if 'KO PHAI CP' in cat or cat == 'TIP EM' or 'noi bo' in cat.lower())
print(f'TONG CAC KHOAN CHUA CO: {grand_total:,}')
print(f'  Trong do CHI PHI KD: {expense_total:,}')
print(f'  Trong do KO PHAI CP: {non_expense:,}')
print(f'  (Bao gom tip: {sum(t[\"amt\"] for t in cats.get(\"TIP EM\", [])):,})')
