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

loai = (sys.argv[1] if len(sys.argv) > 1 else 'in').strip()
if loai == 'out':
    msg = ('🌙 19:50 rồi cả nhà ơi!\n'
           '✅ Nhớ CHECK-OUT trên HSMS trước khi về nha 💖\n'
           '📝 Lễ tân nhớ hoàn tất Phiếu Tư Vấn cho khách hôm nay luôn nè.\n'
           'Cả nhà về cẩn thận, mai gặp lại nhaaa 🌸')
else:
    msg = ('☀️ Chào buổi sáng cả nhà 🌸\n'
           '⏰ 9:10 rồi — ai tới spa rồi nhớ CHECK-IN trên HSMS liền nha!\n'
           'Chúc cả nhà hôm nay đông khách, việc nhẹ tay, tip dày ví 💖✨')

data = urllib.parse.urlencode({'chat_id': GROUP, 'text': msg}).encode('utf-8')
try:
    urllib.request.urlopen(urllib.request.Request(f'https://api.telegram.org/bot{TOKEN}/sendMessage', data=data), timeout=20)
    print('sent', loai)
except Exception as e:
    print('Err', e)
