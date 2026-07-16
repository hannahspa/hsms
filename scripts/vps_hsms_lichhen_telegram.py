#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Bắn thông báo LỊCH HẸN vào GROUP TELEGRAM NHÂN SỰ (16/07 — thay NV nhắn tay "5h45: 1 cvg...").
# 2 loại tin: (1) lịch hẹn MỚI đặt · (2) NHẮC CHUẨN BỊ ~30 phút trước giờ hẹn.
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
NHAC = '/root/.hsms_lichhen_da_nhac'      # id lịch đã nhắc chuẩn bị

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
    ktv_ten = r['ktv'].split()[-2:] if r['ktv'] else []
    send('📅 LỊCH HẸN MỚI\n'
         f"🕐 {r['gio_hen']} {'HÔM NAY' if r['hom_nay'] else 'ngày ' + r['ngay']}\n"
         f"👤 {r['ten_khach'] or 'Khách'}{(' · ' + r['sdt_khach']) if r['sdt_khach'] else ''}\n"
         f"💆 {ten_dv(r)}\n"
         + (f"🙋 KTV: {' '.join(ktv_ten)}\n" if ktv_ten else '')
         + (f"📝 {r['ghi_chu']}\n" if r.get('ghi_chu') else '')
         + (f"(nhập bởi {r['nguoi_nhap']})" if r.get('nguoi_nhap') else ''))
open(LAST, 'w').write(q('SELECT now()::text'))

# ── 2. NHẮC CHUẨN BỊ ~30 PHÚT TRƯỚC GIỜ HẸN (25-40 phút để cron 5' không lọt) ──
da_nhac = set(open(NHAC).read().split('\n')) if os.path.exists(NHAC) else set()
rows = q("""SELECT row_to_json(t) FROM (
  SELECT lh.id::text, lh.ten_khach, lh.gio_hen, lh.ten_dich_vu, lh.dich_vu_list::text AS dich_vu_list,
         COALESCE(nv.ho_ten,'') AS ktv
  FROM lich_hen lh LEFT JOIN nhan_vien nv ON nv.id = lh.nhan_vien_id
  WHERE lh.ngay_hen = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    AND lh.trang_thai NOT IN ('huy','tu_choi','hoan_thanh','da_den')
    AND lh.gio_hen ~ '^[0-9]{1,2}:[0-9]{2}'
    AND (lh.gio_hen || ':00')::time BETWEEN ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '25 minutes')::time
                                        AND ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '40 minutes')::time
  ORDER BY lh.gio_hen LIMIT 10) t""")
moi = []
for line in [l for l in rows.split('\n') if l.strip()]:
    try:
        r = json.loads(line)
    except Exception:
        continue
    if r['id'] in da_nhac:
        continue
    ktv_ten = ' '.join(r['ktv'].split()[-2:]) if r['ktv'] else ''
    send('⏰ CHUẨN BỊ ĐÓN KHÁCH (còn ~30 phút)\n'
         f"🕐 {r['gio_hen']} — {r['ten_khach'] or 'Khách'}\n"
         f"💆 {ten_dv(r)}"
         + (f"\n🙋 KTV: {ktv_ten}" if ktv_ten else ''))
    da_nhac.add(r['id']); moi.append(r['id'])
if moi:
    open(NHAC, 'w').write('\n'.join(list(da_nhac)[-300:]))
print('done')
