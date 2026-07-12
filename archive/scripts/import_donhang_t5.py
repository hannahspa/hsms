import os
"""
Import 442 đơn hàng T5 (01/05-26/05) vào don_hang + don_hang_chi_tiet + thanh_toan
"""
import requests, pandas as pd, re
from pathlib import Path

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
H = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
folder = Path(r"D:\Hannah Spa\Database\Tu 01.05 den 26.05")

SEP = "=" * 60
sep = "-" * 60

def fetch_all(table, params=""):
    result, offset = [], 0
    while True:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?{params}&limit=1000&offset={offset}", headers=H)
        data = r.json() if r.status_code in [200, 206] else []
        if not data: break
        result.extend(data)
        if len(data) < 1000: break
        offset += 1000
    return result

def to_str(val):
    s = str(val).strip()
    return None if s in ('nan', 'None', '') else s

def pi(x, d=0):
    try:
        s = str(x).strip()
        return d if s in ('nan', 'None', '') else int(float(s))
    except: return d

def parse_datetime(x):
    """26/05/2026 19:39:25 → 2026-05-26T19:39:25"""
    s = to_str(x)
    if not s: return None
    try:
        if '/' in s:
            parts = s.split(' ')
            dp = parts[0].split('/')
            d, m, y = dp[0].strip(), dp[1].strip(), dp[2].strip()
            time_part = parts[1] if len(parts) > 1 else '00:00:00'
            return f"{y}-{m.zfill(2)}-{d.zfill(2)}T{time_part}"
        return s
    except: return None

def parse_date(x):
    dt = parse_datetime(x)
    return dt[:10] if dt else None

def parse_commission(s):
    """'|NV1: 10000|NV2: 5000|' → {tên: số}"""
    result = {}
    if not s or str(s).strip() in ('nan', 'None', ''): return result
    parts = str(s).split('|')
    for p in parts:
        p = p.strip()
        if ':' in p:
            try:
                name, amount = p.rsplit(':', 1)
                result[name.strip()] = int(float(amount.strip()))
            except: pass
    return result

def extract_the_lt_from_note(ghi_chu):
    """'Sử dụng thẻ ... (Mã Thẻ: THE-LT-4875)' → 'THE-LT-4875'"""
    if not ghi_chu: return None
    m = re.search(r'THE-LT-(\d+)', str(ghi_chu))
    return f"THE-LT-{m.group(1)}" if m else None

# ── BUILD MAPPING TABLES ──────────────────────────────────
print(SEP)
print("BUILD MAPPING TABLES")
print(sep)

kh_list = fetch_all("khach_hang", "select=id,ma_kh")
kh_map = {x['ma_kh']: x['id'] for x in kh_list if x.get('ma_kh')}
print(f"  KH: {len(kh_map)}")

dv_list = fetch_all("dich_vu", "select=id,ma_dv,ten")
dv_map = {x['ma_dv']: x['id'] for x in dv_list if x.get('ma_dv')}
dv_ten_map = {x['ten']: x['id'] for x in dv_list}
print(f"  DV: {len(dv_map)}")

sp_list = fetch_all("kho_san_pham", "select=id,ma_sp")
sp_map = {x['ma_sp']: x['id'] for x in sp_list if x.get('ma_sp')}
print(f"  SP: {len(sp_map)}")

the_list = fetch_all("the_lieu_trinh", "select=id,ma_the")
the_map = {x['ma_the']: x['id'] for x in the_list if x.get('ma_the')}
print(f"  Thẻ LT: {len(the_map)}")

nv_list = fetch_all("nhan_vien", "select=id,ho_ten")
nv_map = {}
for nv in nv_list:
    ten = nv['ho_ten'].strip()
    nv_map[ten] = nv['id']
    # Alias thêm
    ten_lower = ten.lower().replace('đ','d').replace('ă','a').replace('â','a')
    nv_map[ten_lower] = nv['id']
# Thêm alias cho tên trong MySpa commission format
NV_ALIAS = {
    'Hồ Ngọc Phương': 'Hồ Ngọc Phương',
    'Đỗ Thị Khánh Duy': 'Đỗ Thị Khánh Duy',
    'Nguyễn Hoàng Anh Thư': 'Nguyễn Hoàng Anh Thư',
    'Lê Hoàng Phương Linh': 'Lê Hoàng Phương Linh',
    'Trương Thị Bé Thôn': 'Trương Thị Bé Thôn',
    'Nguyễn Thị Tường Uyên': 'Nguyễn Thị Tường Uyên',
    'Lê Thị Cẩm My': 'Lê Thị Cẩm My',
    'Nguyễn Thị Thúy Hoanh': 'Nguyễn Thị Thúy Hoanh',
    'Nguyễn Hoa Đào': 'Nguyễn Hoa Đào',
}
print(f"  NV: {len(nv_list)}")

# ── ĐỌC FILE BÁN HÀNG ──────────────────────────────────
print(f"\n{SEP}")
print("ĐỌC FILE BÁN HÀNG")
print(sep)

df = pd.read_excel(folder / "danh_sach_ban_hang_tat_ca_chi_nhanh_1779852130.xlsx", dtype=str)
df_ok = df[df['Đơn hàng đã xóa'].isna() | (df['Đơn hàng đã xóa'] == ' ')].copy()
print(f"Tổng dòng: {len(df_ok)} | Đơn hàng: {df_ok['Mã đơn hàng'].nunique()}")

# Group theo mã đơn
COLS_PTTT = {
    'chuyen_khoan': 'Khách Hàng Chuyển Khoản',
    'quet_the':     'Khách Quẹt Thẻ',
    'tien_mat':     'Tiền mặt',
    'momo':         'MOMO',
    'pt_khac':      'PT khác',
}

# ── INSERT DON HANG ──────────────────────────────────────
print(f"\n{SEP}")
print("INSERT DON HANG")
print(sep)

don_hang_records = []
chi_tiet_records = []
thanh_toan_records = []

groups = df_ok.groupby('Mã đơn hàng', sort=False)
skip_count = 0

for ma_don, grp in groups:
    grp = grp.reset_index(drop=True)
    first = grp.iloc[0]

    ngay_gio = parse_datetime(first['Ngày giờ'])
    ngay = parse_date(first['Ngày giờ'])
    if not ngay: skip_count += 1; continue

    ma_kh = to_str(first['Mã khách hàng'])
    khach_hang_id = kh_map.get(ma_kh) if ma_kh else None

    # Tính tổng tiền từ dòng đầu (Thành tiền ĐH/TLT lặp lại mỗi dòng, lấy 1 lần)
    thuc_thu = pi(first['Thành tiền ĐH/TLT'])
    tong_tien = sum(pi(r['Giá DV/SP']) * pi(r['Số lượng'], 1) for _, r in grp.iterrows())
    giam_gia  = sum(pi(r['Chiết khấu DV/SP']) for _, r in grp.iterrows()) + pi(first['Chiết khấu ĐH/TLT'])

    # PTTT
    pttt = {}
    for hinh_thuc, col in COLS_PTTT.items():
        v = pi(first.get(col, 0))
        if v > 0:
            pttt[hinh_thuc] = v

    ghi_chu = to_str(first['Ghi chú']) or ''

    don_hang_records.append({
        "ma_don":       ma_don,
        "khach_hang_id": khach_hang_id,
        "ngay":         ngay,
        "tong_tien_hang": tong_tien,
        "giam_gia":     giam_gia,
        "thuc_thu":     thuc_thu,
        "con_no":       0,
        "trang_thai":   "da_thanh_toan",
        "ghi_chu":      ghi_chu[:200] if ghi_chu else '',
        "is_test":      False,
    })

    # Chi tiết từng dòng
    for _, row in grp.iterrows():
        ma_dv_sp = to_str(row.get('Mã DV/SP'))
        ten_dv_sp = to_str(row.get('Tên DV/SP'))
        sl = pi(row.get('Số lượng', 1), 1)
        don_gia = pi(row.get('Giá DV/SP', 0))
        thanh_tien_ct = pi(row.get('Thành tiền DV/SP', 0))
        ghi_chu_ct = to_str(row.get('Ghi chú')) or ''

        # Xác định loại
        dich_vu_id = san_pham_id = the_lt_id = None
        loai_item = 'dich_vu'

        if ma_dv_sp and ma_dv_sp.startswith('DV-'):
            loai_item = 'dich_vu'
            dich_vu_id = dv_map.get(ma_dv_sp)
            # Nếu sử dụng thẻ (giá = 0, có ghi chú thẻ) → ghi lại thẻ id
            ma_the_ghi = extract_the_lt_from_note(ghi_chu_ct)
            if ma_the_ghi:
                the_lt_id = the_map.get(ma_the_ghi)
                loai_item = 'su_dung_the'

        elif ma_dv_sp and ma_dv_sp.startswith('SP-'):
            loai_item = 'san_pham'
            san_pham_id = sp_map.get(ma_dv_sp)

        elif ma_dv_sp and ma_dv_sp.startswith('THE-LT-'):
            loai_item = 'ban_the'
            the_lt_id = the_map.get(ma_dv_sp)

        else:
            # NaN mã: check ghi chú có thẻ không
            ma_the_ghi = extract_the_lt_from_note(ghi_chu_ct)
            if ma_the_ghi:
                the_lt_id = the_map.get(ma_the_ghi)
                loai_item = 'su_dung_the'
                ten_dv_sp = ten_dv_sp or ghi_chu_ct[:50]

        if not ten_dv_sp and not ma_dv_sp: continue  # skip dòng trống

        # Parse commission
        comm = parse_commission(row.get('Commission nhân viên'))
        tien_comm = sum(comm.values())
        # Lấy NV đầu tiên từ commission
        nv_id = None
        for nv_ten in comm.keys():
            nv_id = nv_map.get(nv_ten) or nv_map.get(NV_ALIAS.get(nv_ten, ''))
            if nv_id: break

        chi_tiet_records.append({
            "ma_don":           ma_don,  # để map sau
            "loai_item":        loai_item,
            "dich_vu_id":       dich_vu_id,
            "san_pham_id":      san_pham_id,
            "the_lieu_trinh_id": the_lt_id,
            "nhan_vien_id":     nv_id,
            "so_luong":         sl,
            "don_gia":          don_gia,
            "thanh_tien":       thanh_tien_ct,
            "ti_le_hoa_hong":   0,
            "tien_hoa_hong":    tien_comm,
            "tien_commission":  tien_comm,
            "ghi_chu":          ghi_chu_ct[:200] if ghi_chu_ct else '',
            "meta":             {"commission_detail": comm} if comm else {},
        })

    # Thanh toán
    for hinh_thuc, so_tien in pttt.items():
        thanh_toan_records.append({
            "ma_don": ma_don,  # để map sau
            "hinh_thuc": hinh_thuc,
            "so_tien": so_tien,
        })

print(f"  Đơn hàng: {len(don_hang_records)} | Chi tiết: {len(chi_tiet_records)} | Thanh toán: {len(thanh_toan_records)}")
print(f"  Bỏ qua: {skip_count}")

# ── INSERT DON HANG ──────────────────────────────────────
print(f"\n{SEP}")
print("INSERTING DON_HANG...")
print(sep)

# Bỏ ma_don ra, dùng để map
BATCH = 50
inserted_don_hang = {}  # ma_don → uuid
ok_dh, err_dh = 0, 0

for i in range(0, len(don_hang_records), BATCH):
    batch = don_hang_records[i:i+BATCH]
    # Bỏ ma_don khỏi payload (nếu bảng không có cột này) - kiểm tra schema
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/don_hang",
        headers={**H, "Prefer": "return=representation"},
        json=batch
    )
    if r.status_code in [200, 201]:
        for rec in r.json():
            inserted_don_hang[rec['ma_don']] = rec['id']
        ok_dh += len(batch)
        print(f"  Batch {i//BATCH+1}: OK ({len(batch)})")
    else:
        err_dh += len(batch)
        print(f"  Batch {i//BATCH+1}: LỖI {r.status_code} | {r.text[:200]}")

print(f"\n  Don hang: {ok_dh} OK | {err_dh} lỗi | Mapped: {len(inserted_don_hang)}")

# ── INSERT CHI TIET ──────────────────────────────────────
print(f"\n{SEP}")
print("INSERTING DON_HANG_CHI_TIET...")
print(sep)

# Map ma_don → don_hang_id
ct_payload = []
for ct in chi_tiet_records:
    ma_don = ct.pop('ma_don')
    dh_id = inserted_don_hang.get(ma_don)
    if not dh_id: continue
    ct['don_hang_id'] = dh_id
    ct_payload.append(ct)

ok_ct, err_ct = 0, 0
for i in range(0, len(ct_payload), BATCH):
    batch = ct_payload[i:i+BATCH]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet",
        headers={**H, "Prefer": "return=minimal"},
        json=batch
    )
    if r.status_code in [200, 201]:
        ok_ct += len(batch)
    else:
        err_ct += len(batch)
        print(f"  CT Batch {i//BATCH+1}: LỖI {r.status_code} | {r.text[:150]}")

print(f"  Chi tiet: {ok_ct} OK | {err_ct} lỗi")

# ── INSERT THANH TOAN ────────────────────────────────────
print(f"\n{SEP}")
print("INSERTING THANH_TOAN...")
print(sep)

tt_payload = []
for tt in thanh_toan_records:
    ma_don = tt.pop('ma_don')
    dh_id = inserted_don_hang.get(ma_don)
    if not dh_id: continue
    tt['don_hang_id'] = dh_id
    tt_payload.append(tt)

ok_tt, err_tt = 0, 0
for i in range(0, len(tt_payload), BATCH):
    batch = tt_payload[i:i+BATCH]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/thanh_toan",
        headers={**H, "Prefer": "return=minimal"},
        json=batch
    )
    if r.status_code in [200, 201]:
        ok_tt += len(batch)
    else:
        err_tt += len(batch)
        print(f"  TT Batch {i//BATCH+1}: LỖI {r.status_code} | {r.text[:150]}")

print(f"  Thanh toan: {ok_tt} OK | {err_tt} lỗi")

print(f"\n{SEP}")
print("TỔNG KẾT BƯỚC 3")
print(sep)
print(f"  ✅ Don hang     : {ok_dh} / {len(don_hang_records)}")
print(f"  ✅ Chi tiet     : {ok_ct} / {len(ct_payload)}")
print(f"  ✅ Thanh toan   : {ok_tt} / {len(tt_payload)}")
print(SEP)
