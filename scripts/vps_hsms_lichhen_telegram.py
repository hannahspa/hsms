#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Bắn thông báo LỊCH HẸN MỚI vào GROUP TELEGRAM NHÂN SỰ (16/07 — thay NV nhắn tay "5h45: 1 cvg...").
# CHỈ báo lịch mới đặt — anh Nam dặn KHÔNG nhắc lại trước giờ hẹn (tránh loãng group).
# Format: Có 1 Khách - Book <KTV> - dùng <dịch vụ> - Vào lúc <giờ>.
# Cron */5. Cần TELEGRAM_GROUP trong /root/.hsms_telegram_env (anh Nam /setgroup <id>).
# Bản gốc VPS: /root/hsms_lichhen_telegram.py
import subprocess, urllib.request, urllib.parse, json, os

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
LAST = '/root/.hsms_last_lichhen'         # mốc created_at cho lịch MỚI

def q(sql):
    r = subprocess.run(['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres', '-tA', '-c', sql],
                       capture_output=True, text=True)
    return r.stdout.strip()

def send(text):
    data = urllib.parse.urlencode({'chat_id': GROUP, 'text': text}).encode('utf-8')
    try:
        urllib.request.urlopen(urllib.request.Request(API + '/sendMessage', data=data), timeout=20)
    except Exception as e:
        print('Err send', e)

def ten_dv(r):
    """Ghép tên dịch vụ: ưu tiên dich_vu_list (đặt nhiều DV), fallback ten_dich_vu."""
    try:
        dl = json.loads(r.get('dich_vu_list') or '[]')
        names = [str(d.get('ten_dich_vu') or d.get('ten') or '').strip() for d in dl if isinstance(d, dict)]
        names = [n for n in names if n]
        if names:
            return ' + '.join(names)
    except Exception:
        pass
    return (r.get('ten_dich_vu') or 'Dịch vụ').strip()

# ── 1. LỊCH HẸN MỚI ĐẶT ──
last = open(LAST).read().strip() if os.path.exists(LAST) else q("SELECT (now() - interval '6 minutes')::text")
rows = q(f"""SELECT row_to_json(t) FROM (
  SELECT lh.ten_khach, lh.sdt_khach, to_char(lh.ngay_hen,'DD/MM') AS ngay, lh.gio_hen,
         lh.ten_dich_vu, lh.dich_vu_list::text AS dich_vu_list, lh.ghi_chu, lh.nguoi_nhap,
         COALESCE(nv.ho_ten,'') AS ktv,
         CASE WHEN lh.ngay_hen = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 1 ELSE 0 END AS hom_nay
  FROM lich_hen lh LEFT JOIN nhan_vien nv ON nv.id = lh.nhan_vien_id
  WHERE lh.created_at > '{last}'::timestamptz AND lh.trang_thai NOT IN ('huy','tu_choi')
  ORDER BY lh.created_at LIMIT 10) t""")
for line in [l for l in rows.split('\n') if l.strip()]:
    try:
        r = json.loads(line)
    except Exception:
        continue
    # Format anh Nam chốt 16/07 (bản icon vui): KTV gọn 2 chữ cuối, dịch vụ nguyên văn
    ktv_ten = ' '.join((r['ktv'] or '').strip().split()[-2:])
    khach = (r['ten_khach'] or '').strip()
    msg = ('🔔 CÓ KHÁCH ĐẶT HẸN 🌸\n'
           f"👤 {khach or 'Khách'}\n"
           + (f'💖 Book: {ktv_ten}\n' if ktv_ten else '')
           + f'💆‍♀️ {ten_dv(r)}\n'
           + f"⏰ {r['gio_hen']}" + (' hôm nay ✨' if r['hom_nay'] else f" ngày {r['ngay']} 📆"))
    if r.get('ghi_chu'):
        msg += f"\n📝 {r['ghi_chu']}"
    send(msg)
open(LAST, 'w').write(q('SELECT now()::text'))
print('done')
