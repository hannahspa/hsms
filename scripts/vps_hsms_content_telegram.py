#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Gửi bài fanpage CHỜ DUYỆT → Telegram anh Nam, kèm nút ✅Duyệt / 🚀Đăng ngay / ❌Bỏ.
# Cron 15 phút. Bản gốc VPS: /root/hsms_content_telegram.py
import subprocess, urllib.request, urllib.parse, json

env = {}
for line in open('/root/.hsms_telegram_env'):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1); env[k] = v
TOKEN, CHAT = env['TELEGRAM_TOKEN'], env['TELEGRAM_CHAT']
API = f'https://api.telegram.org/bot{TOKEN}'

def q(sql):
    r = subprocess.run(['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres', '-tA', '-c', sql],
                       capture_output=True, text=True)
    return r.stdout.strip()

def send(payload, method='sendMessage'):
    data = urllib.parse.urlencode(payload).encode('utf-8')
    try:
        urllib.request.urlopen(urllib.request.Request(f'{API}/{method}', data=data), timeout=30)
        return True
    except Exception as e:
        print('Err', method, e)
        return False

# row_to_json: caption có xuống dòng vẫn nằm gọn 1 dòng JSON/row
rows = q("""SELECT row_to_json(t) FROM (
  SELECT id, tieu_de, noi_dung, array_to_string(hashtags,' ') AS tags,
         asset_urls[1] AS anh,
         to_char(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM HH24:MI') AS lich
  FROM marketing_content_calendar
  WHERE trang_thai='cho_duyet' AND kenh='facebook'
    AND COALESCE(metadata->>'tg_sent','') <> '1'
  ORDER BY created_at LIMIT 5) t""")

sent = 0
for line in [l for l in rows.split('\n') if l.strip()]:
    try:
        r = json.loads(line)
    except Exception:
        continue
    rid = r['id']
    caption = (r.get('noi_dung') or '').strip()
    tags = (r.get('tags') or '').strip()
    text = ('📝 BÀI FANPAGE CHỜ DUYỆT\n'
            f"🗓 Lịch đăng: {r.get('lich') or 'chưa hẹn — duyệt xong tự xếp giờ vàng'}\n"
            f"{'🖼 Có ảnh đính kèm' if r.get('anh') else '📄 Bài chữ (chưa có ảnh)'}\n"
            '━━━━━\n' + caption + (('\n\n' + tags) if tags else ''))
    kb = json.dumps({'inline_keyboard': [
        [{'text': '✅ Duyệt (đăng theo lịch)', 'callback_data': f'ct_ok|{rid}'}],
        [{'text': '🚀 Đăng ngay', 'callback_data': f'ct_now|{rid}'},
         {'text': '❌ Bỏ', 'callback_data': f'ct_no|{rid}'}]]})
    ok = False
    if r.get('anh'):
        ok = send({'chat_id': CHAT, 'photo': r['anh'], 'caption': text[:1000], 'reply_markup': kb}, 'sendPhoto')
    if not ok:
        ok = send({'chat_id': CHAT, 'text': text[:3900], 'reply_markup': kb})
    if ok:
        q("UPDATE marketing_content_calendar SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{tg_sent}','\"1\"') "
          f"WHERE id='{rid}'")
        sent += 1
print(f'sent={sent}')
