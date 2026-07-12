# -*- coding: utf-8 -*-
"""
CHUYỂN AVATAR NHÂN VIÊN base64 → Supabase Storage URL (04/07/2026).

Vấn đề: nhan_vien.avatar_url lưu base64 ~35KB/người → mọi query join nhân viên
(POS list KTV, checkin, lịch sử thẻ...) đều cõng payload nặng.

Script: đọc avatar dạng data:image/... → decode → upload bucket `avatars`
(public) → update avatar_url = URL công khai. Chạy lại được (upsert) — nếu sau
này NV đổi avatar qua app checkin (ghi base64 mới) thì chạy lại script này.

Chạy:  python scripts/avatar_base64_to_storage.py
Cần: .env.import (SUPABASE_KEY service_role) + .env (VITE_SUPABASE_URL)
"""
import sys, io, os, base64, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.import')
load_dotenv('.env')
URL = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL') or 'https://api.hannahspa.vn'
sb = create_client(URL, os.environ['SUPABASE_KEY'])

rows = sb.table('nhan_vien').select('id, ho_ten, avatar_url').execute().data or []
done, skip = 0, 0
for nv in rows:
    au = nv.get('avatar_url') or ''
    if not au.startswith('data:image'):
        skip += 1
        continue
    m = re.match(r'data:image/(\w+);base64,(.*)', au, re.S)
    if not m:
        print(f'  ⚠ {nv["ho_ten"]}: định dạng lạ, bỏ qua')
        skip += 1
        continue
    ext = 'jpg' if m.group(1) in ('jpeg', 'jpg') else m.group(1)
    raw = base64.b64decode(m.group(2))
    path = f'nv_{nv["id"]}.{ext}'
    sb.storage.from_('avatars').upload(
        path, raw,
        {'content-type': f'image/{m.group(1)}', 'upsert': 'true'},
    )
    public_url = f'{URL}/storage/v1/object/public/avatars/{path}'
    sb.table('nhan_vien').update({'avatar_url': public_url}).eq('id', nv['id']).execute()
    print(f'  ✓ {nv["ho_ten"]}: {len(raw)//1024}KB → {public_url}')
    done += 1

print(f'\nXong: {done} chuyển sang Storage · {skip} bỏ qua (đã là URL / trống)')
