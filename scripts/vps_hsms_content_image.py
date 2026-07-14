#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Tự tạo ảnh bài đăng fanpage theo template thương hiệu Hannah (PIL) cho bài chờ duyệt CHƯA có ảnh:
# nền gradient champagne→nâu + logo + tiêu đề + địa chỉ → upload Storage bucket 'marketing' → gắn asset_urls.
# Chạy TRƯỚC hsms_content_telegram.py trong cùng cron. Bản gốc VPS: /root/hsms_content_image.py
import subprocess, json, io, urllib.request

from PIL import Image, ImageDraw, ImageFont

ENV_FILE = '/root/supabase/docker/.env'
API = 'https://api.hannahspa.vn'
BUCKET = 'marketing'
LOGO = '/root/hsms/assets/zns-logo-light.png'
SERIF_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SANS_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

KEY = ''
for line in open(ENV_FILE):
    if line.startswith('SERVICE_ROLE_KEY='):
        KEY = line.strip().split('=', 1)[1]

def q(sql):
    r = subprocess.run(['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres', '-tA', '-c', sql],
                       capture_output=True, text=True)
    return r.stdout.strip()

W, H = 1200, 630
C1, C2 = (201, 169, 110), (125, 90, 60)   # #C9A96E → #7D5A3C (Hannah Luxury)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def wrap(draw, text, font, max_w):
    lines, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def render(tieu_de, chu_de):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img, 'RGBA')
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp(C1, C2, y / H))
    # Vòng tròn trang trí mờ hai góc
    d.ellipse([W - 320, -160, W + 160, 320], outline=(255, 255, 255, 46), width=3)
    d.ellipse([W - 260, -100, W + 100, 260], outline=(255, 255, 255, 30), width=2)
    d.ellipse([-140, H - 240, 240, H + 140], outline=(255, 255, 255, 38), width=3)

    # Huy hiệu chữ H trong vòng tròn — logo PNG có padding lệch + chữ vàng chìm trên nền champagne
    top = 44
    R = 34
    d.ellipse([W // 2 - R, top, W // 2 + R, top + 2 * R], outline=(255, 255, 255, 220), width=3)
    f_h = ImageFont.truetype(SERIF_BOLD, 40)
    d.text((W // 2, top + R), 'H', font=f_h, fill=(255, 255, 255, 240), anchor='mm')
    top += 2 * R + 28

    # Tiêu đề — cỡ chữ theo độ dài, wrap giữa
    size = 56 if len(tieu_de) <= 32 else 48 if len(tieu_de) <= 60 else 40
    f_title = ImageFont.truetype(SERIF_BOLD, size)
    lines = wrap(d, tieu_de, f_title, W - 220)[:4]
    block_h = len(lines) * (size + 12)
    # Căn khối tiêu đề vào khoảng giữa còn lại (chừa footer 130px)
    y = max(top, top + (H - 130 - top - block_h) // 2 - (40 if chu_de else 0))
    for ln in lines:
        d.text((W // 2, y), ln, font=f_title, fill=(255, 255, 255, 255), anchor='ma')
        y += size + 12
    # Gạch trang trí + chủ đề phụ (cách hẳn tiêu đề, không chạm chữ có dấu tiếng Việt)
    y += 20
    d.line([(W // 2 - 60, y), (W // 2 + 60, y)], fill=(255, 255, 255, 170), width=3)
    if chu_de:
        f_sub = ImageFont.truetype(SANS, 26)
        d.text((W // 2, y + 22), chu_de[:70], font=f_sub, fill=(255, 255, 255, 215), anchor='ma')

    # Footer thương hiệu
    f_brand = ImageFont.truetype(SANS_BOLD, 27)
    f_addr = ImageFont.truetype(SANS, 20)
    d.text((W // 2, H - 92), 'H A N N A H   B E A U T Y   &   S P A', font=f_brand, fill=(255, 255, 255, 240), anchor='ma')
    d.text((W // 2, H - 54), '39 Nam Kỳ Khởi Nghĩa · Ninh Kiều · Cần Thơ  ·  9:15 – 20:00', font=f_addr, fill=(255, 255, 255, 200), anchor='ma')

    buf = io.BytesIO()
    img.save(buf, 'PNG')
    return buf.getvalue()

def upload(png, path):
    req = urllib.request.Request(f'{API}/storage/v1/object/{BUCKET}/{path}', data=png, method='POST', headers={
        'Authorization': 'Bearer ' + KEY, 'apikey': KEY,
        'Content-Type': 'image/png', 'x-upsert': 'true'})
    urllib.request.urlopen(req, timeout=60).read()
    return f'{API}/storage/v1/object/public/{BUCKET}/{path}'

rows = q("""SELECT row_to_json(t) FROM (
  SELECT id, tieu_de, chu_de FROM marketing_content_calendar
  WHERE trang_thai IN ('cho_duyet','da_duyet') AND kenh='facebook'
    AND (asset_urls IS NULL OR cardinality(asset_urls)=0)
  ORDER BY created_at LIMIT 10) t""")

done = 0
for line in [l for l in rows.split('\n') if l.strip()]:
    try:
        r = json.loads(line)
        png = render((r.get('tieu_de') or 'Hannah Beauty & Spa').strip(), (r.get('chu_de') or '').strip())
        url = upload(png, f"content/{r['id']}.png")
        q(f"UPDATE marketing_content_calendar SET asset_urls=ARRAY['{url}'] WHERE id='{r['id']}'")
        done += 1
    except Exception as e:
        print('Err', r.get('id') if isinstance(r, dict) else '?', e)
print(f'images={done}')
