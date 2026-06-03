# -*- coding: utf-8 -*-
"""STEP 1 — Import KH + thẻ liệu trình CÒN THIẾU từ Data Thang 05.
Chỉ THÊM cái chưa có (idempotent). Không sửa/xóa cái đã có.
Chạy:  python dongbo_step1_kh_the.py           -> DRY RUN (chỉ in)
       python dongbo_step1_kh_the.py --apply   -> ghi DB
"""
import sys, io, time, requests, pandas as pd
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
APPLY = '--apply' in sys.argv

env = {}
for l in Path(".env.import").read_text(encoding='utf-8').splitlines():
    if '=' in l and not l.strip().startswith('#'):
        k, v = l.split('=', 1); env[k.strip()] = v.strip()
URL = env['SUPABASE_URL']; KEY = env['SUPABASE_KEY']
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
JH = {**H, "Content-Type": "application/json"}
folder = Path(r"D:\Hannah Spa\Database\Data Thang 05")

def fetch_all(table, select):
    rows, start = [], 0
    while True:
        r = requests.get(f"{URL}/rest/v1/{table}?select={select}", headers={**H, "Range": f"{start}-{start+999}"}, timeout=120)
        b = r.json(); rows.extend(b)
        if len(b) < 1000: return rows
        start += 1000

def s(v):
    t = str(v).strip()
    return None if t in ('nan','None','','NaT') else t

def clean_phone(v):
    t = str(v or "").strip().replace(" ","").replace(".","")
    if not t or t.lower()=="none" or t=="nan": return None
    if t.startswith("+84"): t = "0"+t[3:]
    elif t and t[0].isdigit() and not t.startswith("0"): t = "0"+t
    return t[:20]

def pmoney(v):
    if v is None: return 0
    t = str(v).replace(",","").replace("đ","").strip()
    if t in ('','nan','none','None'): return 0
    try: return int(float(t))
    except: return 0

def pdate(v):
    t = s(v)
    if not t: return None
    t = t.replace('T',' ')
    for fmt in ("%d/%m/%Y %H:%M:%S","%d/%m/%Y %H:%M","%d/%m/%Y","%Y-%m-%d %H:%M:%S","%Y-%m-%d"):
        try:
            from datetime import datetime
            txt = t[:19] if "%H" in fmt else t[:10]
            return datetime.strptime(txt, fmt).date().isoformat()
        except: pass
    return None

def post(table, payload):
    r = requests.post(f"{URL}/rest/v1/{table}", headers={**JH,"Prefer":"return=representation"}, json=payload, timeout=120)
    if not r.ok: raise RuntimeError(f"{table}: {r.status_code} {r.text[:300]}")
    d = r.json(); return d[0] if d else None

print("="*64); print(f"STEP 1 — KH + THẺ {'(APPLY)' if APPLY else '(DRY RUN)'}"); print("="*64)

# ── KHÁCH HÀNG ──
dfk = pd.read_excel(folder / "khach_hang_tat_ca_chi_nhanh_1780242088.xlsx", dtype=str)
db_kh = fetch_all("khach_hang", "id,ma_kh,so_dien_thoai")
by_code = {r['ma_kh']: r for r in db_kh if r.get('ma_kh')}
used_phones = {r['so_dien_thoai'] for r in db_kh if r.get('so_dien_thoai')}

new_kh = []
for _, row in dfk.iterrows():
    ma = s(row.get('Mã khách hàng'))
    if not ma or ma in by_code: continue
    g = str(row.get('Giới tính') or '').lower()
    phone = clean_phone(row.get('Số điện thoại'))
    note = None
    if not phone or phone in used_phones:
        note = f"MySpa phone gốc: {phone or 'trống'}"
        phone = f"MYSPA-{ma}"
    new_kh.append({
        "ma_kh": ma,
        "ho_ten": s(row.get('Họ tên')) or ma,
        "so_dien_thoai": phone,
        "ngay_sinh": pdate(row.get('Ngày sinh')),
        "gioi_tinh": "nu" if "nữ" in g else ("nam" if "nam" in g else "khac"),
        "dia_chi": s(row.get('Địa chỉ')),
        "ghi_chu_da_lieu": note,
        "nguon": "MySpa import T5",
        "is_active": True,
    })

print(f"\n[KH] File {len(dfk)} | DB {len(db_kh)} | CẦN THÊM: {len(new_kh)}")
for k in new_kh[:50]: print(f"   + {k['ma_kh']:12} {k['ho_ten'][:25]:25} {k['so_dien_thoai']}")

created_kh = 0
if APPLY:
    for k in new_kh:
        ins = post("khach_hang", k)
        if ins: by_code[k['ma_kh']] = ins; used_phones.add(k['so_dien_thoai']); created_kh += 1
    print(f"   >> Đã tạo {created_kh} KH")

# ── THẺ LIỆU TRÌNH ──
dft = pd.read_excel(folder / "danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1780241952.xlsx", dtype=str)
db_the = fetch_all("the_lieu_trinh", "ma_the")
have = {r['ma_the'] for r in db_the if r.get('ma_the')}

new_the, skip_no_kh = [], []
for _, row in dft.iterrows():
    ma_the = s(row.get('Mã Thẻ (Tự động được tạo bởi hệ thống)'))
    if not ma_the or ma_the in have: continue
    ma_kh = s(row.get('Mã khách hàng'))
    kh = by_code.get(ma_kh)
    if not kh:
        skip_no_kh.append((ma_the, ma_kh)); continue
    total_raw = str(row.get('Tổng số lần') or '').strip()
    hethan_raw = str(row.get('Ngày hết hạn') or '').strip()
    unlimited_buoi = 'không' in total_raw.lower()      # số buổi không giới hạn
    unlimited_han = 'không' in hethan_raw.lower()       # thời hạn không giới hạn
    total = pmoney(total_raw); promo = pmoney(row.get('Số lần khuyến mãi')); used = pmoney(row.get('Số lần đã sử dụng'))
    # MySpa export: "Tong so lan" is already the final session count.
    # Do not add "So lan khuyen mai" again, otherwise 14 + 4 becomes 18.
    tot = total
    if not unlimited_buoi and tot <= 0: tot = max(used, 1)
    remaining = 999999 if unlimited_buoi else max(0, tot - used)
    ten = s(row.get('Tên gói')) or s(row.get('Tên dịch vụ / Tên combo')) or ma_the
    new_the.append({
        "ma_the": ma_the,
        "khach_hang_id": kh['id'],
        "ten_dich_vu": ten,
        "so_buoi_tong": tot if not unlimited_buoi else max(used, 1),
        "so_buoi_da_dung": used,
        "gia_tri_the": pmoney(row.get('Tổng tiền')),
        "ngay_mua": pdate(row.get('Ngày tạo')),
        "ngay_het_han": None if unlimited_han else pdate(row.get('Ngày hết hạn')),
        "trang_thai": "active" if (unlimited_buoi or remaining > 0) else "het_buoi",
        "loai_the": "combo_lieu_trinh" if 'combo' in ten.lower() else "lieu_trinh",
        "is_khong_gioi_han": unlimited_buoi,
        "source": "myspa_t5_31",
        "ghi_chu": s(row.get('Ghi chú')),
        "meta": {"myspa_ma_kh": ma_kh, "import": "dongbo_t5_31", "myspa_so_lan_khuyen_mai": promo},
    })

print(f"\n[THẺ] File {len(dft)} | DB {len(db_the)} | CẦN THÊM: {len(new_the)} | Bỏ (thiếu KH): {len(skip_no_kh)}")
for t in new_the[:50]: print(f"   + {t['ma_the']:14} {t['ten_dich_vu'][:30]:30} buổi {t['so_buoi_da_dung']}/{t['so_buoi_tong']}")
if skip_no_kh: print("   Thẻ thiếu KH:", skip_no_kh)

created_the = 0
if APPLY:
    for t in new_the:
        post("the_lieu_trinh", t); created_the += 1
    print(f"   >> Đã tạo {created_the} thẻ")

print("\n" + ("ĐÃ GHI DB" if APPLY else "DRY RUN — chưa ghi gì. Thêm --apply để ghi."))
