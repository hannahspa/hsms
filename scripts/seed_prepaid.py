# -*- coding: utf-8 -*-
"""Seed số dư ví trả trước từ MySpa (đối soát 04/06/2026) vào HSMS.
Set số dư tuyệt đối qua RPC pos_dieu_chinh_tra_truoc (KHÔNG ghi doanh thu).
Idempotent: chạy lại set cùng giá trị → delta 0 → không đổi."""
import json, io, sys, requests
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

env = {}
for line in Path('.env.import').read_text(encoding='utf-8').splitlines():
    if '=' in line and not line.strip().startswith('#'):
        k, v = line.split('=', 1); env[k.strip()] = v.strip()
URL = env['SUPABASE_URL']; KEY = env['SUPABASE_KEY']
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

raw = json.loads(Path('scripts/_prepaid_balances.json').read_text(encoding='utf-8'))
data = raw.get('result', raw) if isinstance(raw, dict) and 'result' in raw else raw
members = json.loads(Path('scripts/_prepaid_members.json').read_text(encoding='utf-8'))

# Map ma_kh -> id từ HSMS
kh = []; off = 0
while True:
    r = requests.get(f'{URL}/rest/v1/khach_hang?select=id,ma_kh&limit=1000&offset={off}', headers=H)
    d = r.json()
    if not d: break
    kh += d
    if len(d) < 1000: break
    off += 1000
by_makh = {x['ma_kh']: x['id'] for x in kh if x.get('ma_kh')}

ok = fail = skip = 0
tong = 0
for m in members:
    d = data.get(str(m['member_id'])) or {}
    sd = d.get('sd', 0)
    if sd <= 0:
        continue
    kid = by_makh.get(m['ma_kh'])
    if not kid:
        print(f"  ⚠ KHÔNG có HSMS: {m['ma_kh']} {m['ten']}"); fail += 1; continue
    body = {
        'p_khach_hang_id': kid,
        'p_so_du_moi': sd,
        'p_nguoi': 'Đối soát MySpa',
        'p_ghi_chu': 'Số dư ban đầu từ MySpa (đối soát 04/06/2026)',
    }
    rr = requests.post(f'{URL}/rest/v1/rpc/pos_dieu_chinh_tra_truoc', headers=H, json=body)
    if rr.status_code in (200, 204):
        res = rr.json() if rr.text else {}
        if isinstance(res, dict) and res.get('success') is False:
            print(f"  ✗ {m['ma_kh']} {m['ten']}: {res.get('error')}"); fail += 1
        else:
            ok += 1; tong += sd
    else:
        print(f"  ✗ {m['ma_kh']} {m['ten']}: HTTP {rr.status_code} {rr.text[:120]}"); fail += 1

print('=' * 50)
print(f'SEED XONG: {ok} khách OK | {fail} lỗi | tổng số dư đã nạp: {tong:,}đ')
