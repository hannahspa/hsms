#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# POSTER FANPAGE THEO CÔNG THỨC CANVA THẬT CỦA HANNAH (học từ ảnh cũ tương tác cao, 16/07):
#   nền KEM SÁNG · logo Hannah script · tiêu đề serif NÂU ĐỎ + dòng chữ ký nghiêng · tagline in hoa
#   badge giá to "159K | 45 PHÚT" · bullet công dụng · ảnh AI (chỉ phần NGƯỜI/CẢNH) blend bên phải
#   footer chip địa chỉ + SĐT. Khổ dọc 1080×1350 (4:5 chuẩn Facebook). Chữ Việt 100% do máy vẽ.
# Fallback: OpenAI lỗi → poster vẫn dựng với nền kem trơn (không kẹt).
# Bản gốc VPS: /root/hsms_content_image.py — chạy TRƯỚC hsms_content_telegram.py trong cron.
import subprocess, json, io, base64, urllib.request

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ENV_FILE = '/root/supabase/docker/.env'
TG_ENV = '/root/.hsms_telegram_env'
API = 'https://api.hannahspa.vn'
BUCKET = 'marketing'

SERIF = '/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf'
SANS = '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf'
SANS_BOLD = '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf'
SCRIPT = '/root/hsms/fonts/DancingScript.ttf'

KEY = ''
for line in open(ENV_FILE):
    if line.startswith('SERVICE_ROLE_KEY='):
        KEY = line.strip().split('=', 1)[1]
OPENAI_KEY = ''
AI_PHOTO_OFF = False
try:
    for line in open(TG_ENV):
        if line.startswith('OPENAI_KEY='):
            OPENAI_KEY = line.strip().split('=', 1)[1]
        if line.strip() == 'AI_PHOTO=off':
            # Van tiền (anh Nam 16/07): quality high ~6k đ/ảnh đốt $5 khi test loạt.
            # off → poster nền kem 0 đồng; bật lại khi chốt được công thức ảnh đẹp từ mẫu anh gửi.
            AI_PHOTO_OFF = True
except FileNotFoundError:
    pass

def q(sql):
    r = subprocess.run(['docker', 'exec', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres', '-tA', '-c', sql],
                       capture_output=True, text=True)
    return r.stdout.strip()

W, H = 1080, 1350
KEM1, KEM2 = (247, 237, 224), (238, 219, 197)     # nền kem sáng như poster mẫu
NAU_DO = (107, 47, 35)                             # chữ tiêu đề đỏ đô
NAU = (92, 58, 40)                                 # badge/logo nâu đậm
NAU_NHAT = (139, 105, 78)

def F(path, size, bold_var=False):
    f = ImageFont.truetype(path, size)
    if bold_var:
        try: f.set_variation_by_axes([700])
        except Exception: pass
    return f

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def ai_photo(ai_prompt):
    """AI vẽ ẢNH THẬT (người/cảnh spa, KHÔNG chữ) khổ dọc — làm nửa phải poster."""
    if not OPENAI_KEY or AI_PHOTO_OFF:
        return None
    prompt = ((ai_prompt or '').strip() + '. ' if ai_prompt else '') + (
        'Vertical portrait composition. Photorealistic professional spa photography, '
        'warm cream and soft brown tones matching a light beige background, gentle natural light, '
        'shallow depth of field, magazine editorial quality. '
        'ABSOLUTELY NO text, no words, no letters, no logo, no watermark.')
    body = json.dumps({'model': 'gpt-image-1', 'prompt': prompt[:3500], 'size': '1024x1536', 'quality': 'high'}).encode('utf-8')
    req = urllib.request.Request('https://api.openai.com/v1/images/generations', data=body, headers={
        'Authorization': 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json'})
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=300).read().decode('utf-8'))
        return Image.open(io.BytesIO(base64.b64decode(r['data'][0]['b64_json']))).convert('RGB')
    except Exception as e:
        print('AI photo err (poster nen kem tron):', str(e)[:200])
        return None

def wrap(draw, text, font, max_w):
    lines, cur = [], ''
    for w_ in text.split():
        t = (cur + ' ' + w_).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w_
    if cur: lines.append(cur)
    return lines

def render(bai):
    meta = bai.get('metadata') or {}
    ten_chinh = (meta.get('ten_chinh') or bai.get('tieu_de') or 'Hannah Spa').strip()
    ten_script = (meta.get('ten_script') or '').strip()
    tagline = (bai.get('chu_de') or '').strip()
    gia, phut = (meta.get('gia') or '').strip(), (meta.get('phut') or '').strip()
    bullets = [b for b in (meta.get('bullets') or []) if str(b).strip()][:5]

    # ── Nền kem gradient dọc ──
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img, 'RGBA')
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp(KEM1, KEM2, y / H))

    # ── Ảnh AI bên phải, blend mềm vào nền kem ──
    photo = ai_photo(bai.get('ai_prompt'))
    if photo is not None:
        pw = 640                                     # vùng ảnh: x từ W-pw → W
        scale = max(pw / photo.width, H / photo.height)
        photo = photo.resize((int(photo.width * scale), int(photo.height * scale)))
        px = (photo.width - pw) // 2
        py = (photo.height - H) // 2
        photo = photo.crop((px, py, px + pw, py + H))
        img.paste(photo, (W - pw, 0))
        # blend: dải kem alpha giảm dần phủ mép trái của ảnh (mềm như poster designer)
        fade = 300
        ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        do = ImageDraw.Draw(ov)
        for i in range(fade):
            x = W - pw + i
            a = int(255 * (1 - i / fade))
            do.line([(x, 0), (x, H)], fill=(*lerp(KEM1, KEM2, 0.5), a))
        # + dải kem mờ dưới đáy cho footer nổi trên ảnh
        for yy in range(H - 190, H):
            a = int(230 * (yy - (H - 190)) / 190)
            do.line([(W - pw, yy), (W, yy)], fill=(*KEM2, a))
        img = Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')
        d = ImageDraw.Draw(img, 'RGBA')

    LX = 64            # lề trái cột chữ
    COL_W = 460        # bề rộng cột chữ (ảnh chiếm phải)

    # ── Logo ──
    f_logo = F(SCRIPT, 88, bold_var=True)
    d.text((LX, 44), 'Hannah', font=f_logo, fill=NAU)
    f_sub = F(SANS, 25)
    d.text((LX + 6, 148), 'B E A U T Y   &   S P A', font=f_sub, fill=NAU_NHAT)
    y = 235

    # ── Tiêu đề serif nâu đỏ + dòng chữ ký ──
    f_title = F(SERIF, 88 if len(ten_chinh) <= 12 else 72 if len(ten_chinh) <= 20 else 58)
    for ln in wrap(d, ten_chinh.upper(), f_title, COL_W + 40)[:2]:
        d.text((LX, y), ln, font=f_title, fill=NAU_DO)
        y += f_title.size + 8
    if ten_script:
        f_scr = F(SCRIPT, 84, bold_var=True)
        d.text((LX + 4, y + 14), ten_script, font=f_scr, fill=NAU_DO)   # +14: không chạm descender dòng serif
        y += 120
    y += 6
    if tagline:
        f_tag = F(SANS_BOLD, 27)
        for ln in wrap(d, tagline.upper(), f_tag, COL_W)[:2]:
            d.text((LX + 2, y), ln, font=f_tag, fill=NAU)
            y += 38
    y += 22

    # ── Badge giá to (nếu có) ──
    if gia:
        f_gia = F(SERIF, 74)
        f_phut = F(SANS_BOLD, 30)
        gw = d.textlength(gia, font=f_gia)
        pw2 = max(d.textlength(phut, font=f_phut) if phut else 0, 10)
        bh = 108
        bw = int(44 + gw + (34 + pw2 + 34 if phut else 44))
        d.rounded_rectangle([LX, y, LX + bw, y + bh], radius=22, fill=(*NAU, 255))
        d.text((LX + 34, y + bh // 2), gia, font=f_gia, fill=KEM1, anchor='lm')
        if phut:
            sx = LX + 34 + gw + 26
            d.line([(sx, y + 22), (sx, y + bh - 22)], fill=(*KEM1, 150), width=2)
            d.text((sx + 24, y + bh // 2), phut, font=f_phut, fill=KEM1, anchor='lm')
        y += bh + 34
    else:
        y += 8

    # ── Bullet công dụng ──
    f_b = F(SANS, 31)
    for b in bullets:
        d.ellipse([LX + 2, y + 14, LX + 14, y + 26], fill=(*NAU_DO, 255))
        lines = wrap(d, str(b), f_b, COL_W - 30)[:2]
        for j, ln in enumerate(lines):
            d.text((LX + 30, y), ln, font=f_b, fill=NAU_DO)
            y += 40
        y += 8

    # ── Footer: 2 chip bo tròn viền nâu ──
    f_c = F(SANS_BOLD, 27)
    chips = ['39 Nam Kỳ Khởi Nghĩa · Cần Thơ', '0379 080 909  ·  hannahspa.vn']
    cw = [int(d.textlength(c, font=f_c)) + 56 for c in chips]
    total = sum(cw) + 24
    x0 = (W - total) // 2
    fy = H - 108
    for c, w_ in zip(chips, cw):
        d.rounded_rectangle([x0, fy, x0 + w_, fy + 62], radius=31, outline=(*NAU, 230), width=3,
                            fill=(*KEM1, 235))
        d.text((x0 + w_ // 2, fy + 31), c, font=f_c, fill=NAU, anchor='mm')
        x0 += w_ + 24

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
  SELECT id, tieu_de, chu_de, ai_prompt, metadata FROM marketing_content_calendar
  WHERE trang_thai IN ('cho_duyet','da_duyet') AND kenh='facebook'
    AND (asset_urls IS NULL OR cardinality(asset_urls)=0)
  ORDER BY created_at LIMIT 10) t""")

done = 0
for line in [l for l in rows.split('\n') if l.strip()]:
    try:
        r = json.loads(line)
        png = render(r)
        url = upload(png, f"content/{r['id']}.png")
        q(f"UPDATE marketing_content_calendar SET asset_urls=ARRAY['{url}'] WHERE id='{r['id']}'")
        done += 1
    except Exception as e:
        print('Err', r.get('id') if isinstance(r, dict) else '?', e)
print(f'images={done}')
