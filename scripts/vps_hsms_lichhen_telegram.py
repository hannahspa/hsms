#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# LƯỚI AN TOÀN thông báo lịch hẹn nhóm Telegram (16/07): bản THỜI GIAN THỰC do edge function
# telegram-notify bắn ngay khi lễ tân bấm Đặt Lịch (set tg_bao_luc). Cron này 5'/lần chỉ gửi
# những lịch tg_bao_luc IS NULL (client lỗi mạng/lịch tạo ngoài form) — không bao giờ trùng tin.
# Format đồng bộ với edge function: icon 🌷 + câu dễ thương + tag KTV (telegram_chat_id).
# Bản gốc VPS: /root/hsms_lichhen_telegram.py
import subprocess, urllib.request, urllib.parse, json, html

env = {}
for line in open('/root/.hsms_telegram_env'):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1); env[k] = v
TOKEN = env['TELEGRAM_TOKEN']
GROUP = env.get('TELEGRAM_GROUP', '')
if not GROUP:
    print('chua_setgroup')
    raise SystemExit(0)
API = f'https://api.telegram.org/bot{TOKEN}'

def q(sql):
    r = subprocess.run(['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres', '-tA', '-c', sql],
                       capture_output=True, text=True)
    return r.stdout.strip()

def send(text):
    """Gửi tin nhóm → trả message_id (để tin hủy sau này reply vào), None nếu lỗi."""
    data = urllib.parse.urlencode({'chat_id': GROUP, 'text': text, 'parse_mode': 'HTML'}).encode('utf-8')
    try:
        r = urllib.request.urlopen(urllib.request.Request(API + '/sendMessage', data=data), timeout=20)
        d = json.loads(r.read().decode('utf-8'))
        return (d.get('result') or {}).get('message_id') or True
    except Exception as e:
        print('Err send', e)
        return None

def dong_dv(r):
    """Mỗi dịch vụ 1 dòng 🌷; trùng nhau gộp '🌷 2 Massage...' (anh Nam 17/07)."""
    try:
        dl = json.loads(r.get('dich_vu_list') or '[]')
        names = [str(d.get('ten_dich_vu') or d.get('ten') or '').strip() for d in dl if isinstance(d, dict)]
    except Exception:
        names = []
    names = [n for n in [(r.get('ten_dich_vu') or '').strip()] + names if n]
    if not names:
        return ['🌷 Dịch vụ']
    dem = {}
    for n in names:
        dem[n] = dem.get(n, 0) + 1
    return [f"🌷 {str(c) + ' ' if c > 1 else ''}{html.escape(n)}"
            for n, c in sorted(dem.items(), key=lambda x: -x[1])]

rows = q("""SELECT row_to_json(t) FROM (
  SELECT lh.id::text, lh.ten_khach, to_char(lh.ngay_hen,'DD/MM') AS ngay, lh.gio_hen,
         lh.ten_dich_vu, lh.dich_vu_list::text AS dich_vu_list, lh.ghi_chu,
         COALESCE(nv.ho_ten,'') AS ktv, COALESCE(nv.telegram_chat_id,'') AS ktv_tg,
         CASE WHEN lh.ngay_hen = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 1 ELSE 0 END AS hom_nay
  FROM lich_hen lh LEFT JOIN nhan_vien nv ON nv.id = lh.nhan_vien_id
  WHERE lh.tg_bao_luc IS NULL
    AND lh.created_at > now() - interval '2 hours'
    AND lh.created_at < now() - interval '2 minutes'
    AND lh.trang_thai NOT IN ('huy','tu_choi')
  ORDER BY lh.created_at LIMIT 10) t""")

sent = 0
for line in [l for l in rows.split('\n') if l.strip()]:
    try:
        r = json.loads(line)
    except Exception:
        continue
    ktv = (r.get('ktv') or '').strip()
    if ktv:
        ten = html.escape(' '.join(ktv.split()[-2:]))
        if r.get('ktv_tg'):
            dong_ktv = f'💖 Khách Book chị <a href="tg://user?id={html.escape(r["ktv_tg"])}">{ten}</a> ạ'
        else:
            dong_ktv = f'💖 Khách Book chị {ten} ạ'
    else:
        dong_ktv = '💖 Chị yêu nào làm cũng được ạ'
    msg = ('🔔 CÓ KHÁCH ĐẶT HẸN 🌸\n'
           f"👤 {html.escape(r.get('ten_khach') or 'Khách')}\n"
           f'{dong_ktv}\n'
           + '\n'.join(dong_dv(r)) + '\n'
           f"⏰ {str(r.get('gio_hen') or '')[:5]}" + (' hôm nay ✨' if r.get('hom_nay') else f" ngày {r.get('ngay')} 📆"))
    if r.get('ghi_chu'):
        msg += f"\n📝 {html.escape(r['ghi_chu'])}"
    mid = send(msg)
    if mid:
        mid_sql = f", tg_message_id = {int(mid)}" if isinstance(mid, int) else ''
        q(f"UPDATE lich_hen SET tg_bao_luc = now(){mid_sql} WHERE id='{r['id']}'")
        sent += 1
print(f'sent={sent}')
