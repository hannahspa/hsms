#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Tổng kết 3 máy chăm khách ZNS sáng nay → Telegram anh Nam. Cron 45 9 * * *.
# Bản gốc VPS: /root/hsms_zns_tongket.py
import subprocess, urllib.request, urllib.parse, json

env = {}
for line in open('/root/.hsms_telegram_env'):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1); env[k] = v
TOKEN, CHAT = env['TELEGRAM_TOKEN'], env['TELEGRAM_CHAT']

def q(sql):
    r = subprocess.run(['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres', '-tA', '-c', sql],
                       capture_output=True, text=True)
    return r.stdout.strip()

def send(text):
    data = urllib.parse.urlencode({'chat_id': CHAT, 'text': text}).encode('utf-8')
    try:
        urllib.request.urlopen(urllib.request.Request(f'https://api.telegram.org/bot{TOKEN}/sendMessage', data=data), timeout=20)
    except Exception as e:
        print('Err', e)

def dem(bang):
    row = q(f"""SELECT count(*) FILTER (WHERE trang_thai='da_gui'), count(*) FILTER (WHERE trang_thai='gui_loi')
        FROM {bang} WHERE ngay_du_kien = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date""")
    c = (row.split('|') + ['0', '0'])[:2]
    return int(c[0] or 0), int(c[1] or 0)

wb_ok, wb_loi = dem('winback_hang_doi')
le_ok, le_loi = dem('le_hang_doi')
tong_ok, tong_loi = wb_ok + le_ok, wb_loi + le_loi

# Khách quay lại 14 ngày nhờ tin nhắn — tiền thật từ marketing
den = q("""SELECT (SELECT count(*) FROM winback_hang_doi WHERE da_den AND gui_luc > now() - interval '14 days')
    + (SELECT count(*) FROM le_hang_doi WHERE da_den AND gui_luc > now() - interval '14 days')""")

if tong_ok + tong_loi == 0:
    send('🤖 MÁY CHĂM KHÁCH SÁNG NAY: không có khách trong hàng đợi (hàng đợi chốt lúc 21h tối qua).')
else:
    canh_bao = '\n⚠️ TOÀN BỘ LỖI — kiểm tra tiền ZBS!' if tong_ok == 0 and tong_loi > 0 else ''
    send('🤖 MÁY CHĂM KHÁCH SÁNG NAY\n'
         f'• Win-back voucher: {wb_ok} gửi · {wb_loi} lỗi\n'
         f'• Mời khách lẻ: {le_ok} gửi · {le_loi} lỗi\n'
         f'• Khách QUAY LẠI 14 ngày nhờ tin nhắn: {den or 0}'
         + canh_bao)
print('done')
