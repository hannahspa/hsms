#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Nhắc nhân viên CHECK-IN (cron 9:10) / CHECK-OUT (cron 19:50) trong nhóm Telegram nhân sự.
# Dùng: python3 hsms_nhac_checkin.py in|out — bản gốc VPS: /root/hsms_nhac_checkin.py (anh Nam 17/07)
import sys, urllib.request, urllib.parse

env = {}
for line in open('/root/.hsms_telegram_env'):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1); env[k] = v
TOKEN = env['TELEGRAM_TOKEN']
GROUP = env.get('TELEGRAM_GROUP', '')
if not GROUP:
    print('chua_setgroup')
    raise SystemExit(0)

# Câu chữ do anh Nam chốt 17/07 — đổi thì sửa đúng 2 chuỗi này
loai = (sys.argv[1] if len(sys.argv) > 1 else 'in').strip()
if loai == 'out':
    msg = ('🌙 19:50 Rồi các chị yêu ơi! Nhớ CHECK-OUT trước khi về nha các chị 💖 '
           'Lễ tân nhớ hoàn tất Phiếu Tư Vấn cho khách hôm nay luôn dùm em ạ.')
else:
    msg = ('☀️ Chào buổi sáng cả nhà 🌸 9:10 rồi — chị yêu nào tới spa rồi nhớ CHECK-IN '
           'trên Hệ Thống dùm em ạ! Chúc cả nhà hôm nay đông khách, làm việc vui vẻ, tip dày ví 💖✨')

data = urllib.parse.urlencode({'chat_id': GROUP, 'text': msg}).encode('utf-8')
try:
    urllib.request.urlopen(urllib.request.Request(f'https://api.telegram.org/bot{TOKEN}/sendMessage', data=data), timeout=20)
    print('sent', loai)
except Exception as e:
    print('Err', e)
