"""Import MySpa orders — NO doanh_thu creation. Batch insert for speed."""
import os, sys, io, json, requests, openpyxl
from datetime import datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
HEADERS = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
JSON_H = {**HEADERS, "Content-Type": "application/json"}
fpath = r"D:\Hannah Spa\Database\danh_sach_ban_hang_tat_ca_chi_nhanh_1778311594.xlsx"

def parse_money(s):
    if s is None: return 0
    if isinstance(s, (int, float)): return int(s)
    s = str(s).replace(",", "").replace(".00", "").replace("đ", "").strip()
    try: return int(float(s))
    except: return 0

def parse_dmy(s):
    """DD/MM/YYYY HH:MM:SS -> YYYY-MM-DD"""
    if not s: return None
    s = str(s).strip()
    parts = s.split(" ")[0].split("/")
    if len(parts) == 3:
        try: return parts[2].strip() + "-" + parts[1].strip().zfill(2) + "-" + parts[0].strip().zfill(2)
        except: return None
    return s[:10] if len(s) >= 10 else None

def parse_ktv_commission(s):
    """Parse '|Nguyen Hoang Anh Thu: 5000|' -> [{'ten': ..., 'tien': ...}]"""
    if not s: return []
    s = str(s).strip()
    results = []
    parts = s.split("|")
    for p in parts:
        p = p.strip()
        if ":" in p:
            ten, tien = p.split(":", 1)
            results.append({"ten": ten.strip(), "tien": parse_money(tien.strip())})
    return results

print("=" * 60)
print("IMPORT DON HANG — KHONG TAO DOANH THU")
print("=" * 60)

# ── Step 1: Read Excel + Parse Orders ─────────────────
print("\n[1/4] Doc file Excel...")
wb = openpyxl.load_workbook(fpath, data_only=True, read_only=True)
ws = wb.active
headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}
total_rows = ws.max_row - 1
print(f"  {total_rows} dong")

# First pass: group rows by order code
print("[2/4] Nhom don hang...")
orders = {}  # ma_don -> {header: {...}, items: [...]}
current_order = None
order_count = 0

for r in range(2, ws.max_row + 1):
    def val(col):
        c = headers.get(col)
        return ws.cell(r, c).value if c else None

    ma_don = str(val("Mã đơn hàng") or "").strip()
    if not ma_don or ma_don == "None":
        # This row belongs to the previous order
        if current_order:
            ma_dv = str(val("Mã DV/SP") or "").strip()
            ten_dv = str(val("Tên DV/SP") or "").strip()
            if ma_dv and ma_dv != "None" and ten_dv:
                ktv_raw = str(val("Commission nhân viên") or "")
                ktv_list = parse_ktv_commission(ktv_raw)
                orders[current_order]["items"].append({
                    "ma_dv": ma_dv,
                    "ten_dv": ten_dv,
                    "so_luong": int(parse_money(val("Số lượng")) or 1),
                    "don_gia": parse_money(val("Giá DV/SP")),
                    "thanh_tien": parse_money(val("Thành tiền DV/SP")),
                    "ktv_list": ktv_list,
                })
        continue

    # New order
    current_order = ma_don
    order_count += 1

    ma_kh = str(val("Mã khách hàng") or "").strip()
    if ma_kh == "None": ma_kh = None

    ngay = parse_dmy(val("Ngày giờ"))

    # Payment amounts from columns
    tien_mat = parse_money(val("Tiền mặt"))
    tien_ck = parse_money(val("Khách Hàng Chuyển Khoản"))
    tien_qt = parse_money(val("Khách Quẹt Thẻ"))
    tien_momo = parse_money(val("MOMO"))
    tien_mpos = parse_money(val("MPOS (ATM, Visa, Master,...)"))
    tien_payon = parse_money(val("PAYON (QR Code)"))
    tien_tingbox = parse_money(val("TINGBOX (QR Code)"))
    tien_khac = parse_money(val("PT khác"))
    tien_tktt = parse_money(val("Tài khoản TT"))
    tien_tkthuong = parse_money(val("Tài khoản thưởng"))

    tong_tien = parse_money(val("Thành tiền ĐH/TLT"))
    giam_gia = parse_money(val("Chiết khấu ĐH/TLT"))
    thuc_thu = tong_tien - giam_gia

    # Determine primary payment method
    total_payments = tien_mat + tien_ck + tien_qt + tien_momo + tien_mpos + tien_payon + tien_tingbox + tien_khac + tien_tktt + tien_tkthuong

    # Map MySpa payment methods to HSMS
    if tien_ck > 0: hinh_thuc = "chuyen_khoan"
    elif tien_qt > 0: hinh_thuc = "quet_the"
    elif tien_tktt > 0 or tien_tkthuong > 0: hinh_thuc = "the_tra_truoc"
    elif tien_mat > 0: hinh_thuc = "tien_mat"
    elif tien_momo > 0 or tien_mpos > 0 or tien_payon > 0 or tien_tingbox > 0: hinh_thuc = "chuyen_khoan"
    elif tien_khac > 0: hinh_thuc = "chuyen_khoan"
    else: hinh_thuc = "chuyen_khoan"  # default

    orders[ma_don] = {
        "header": {
            "ma_don": ma_don,
            "ma_kh": ma_kh,
            "ngay": ngay,
            "tong_tien_hang": tong_tien,
            "giam_gia": giam_gia,
            "thuc_thu": thuc_thu,
            "trang_thai": "da_thanh_toan",
            "hinh_thuc": hinh_thuc,
            "tien_mat": tien_mat,
            "tien_ck": tien_ck,
            "tien_qt": tien_qt,
        },
        "items": [],
    }

    if order_count % 10000 == 0:
        print(f"  {order_count} don hang...")

wb.close()
print(f"  Tong: {order_count} don hang")

# ── Step 3: Load lookup maps ──────────────────────────
print("[3/4] Tai anh xa KH + DV...")
# Load customer map
all_kh = requests.get(
    SUPABASE_URL + "/rest/v1/khach_hang?select=id,ma_kh&limit=10000",
    headers=HEADERS
).json()
kh_map = {k.get("ma_kh"): k["id"] for k in all_kh if k.get("ma_kh")}
print(f"  {len(kh_map)} KH")

# Load service map
all_dv = requests.get(
    SUPABASE_URL + "/rest/v1/dich_vu?select=id,ma_dv&limit=500",
    headers=HEADERS
).json()
dv_map = {d.get("ma_dv"): d["id"] for d in all_dv if d.get("ma_dv")}
print(f"  {len(dv_map)} DV")

# Load KTV map
all_nv = requests.get(
    SUPABASE_URL + "/rest/v1/nhan_vien?select=id,ho_ten&limit=50",
    headers=HEADERS
).json()
# Build fuzzy name match map (match by last 2 words of name)
def match_nv(ten):
    if not ten: return None
    ten = ten.strip().lower()
    for nv in all_nv:
        nv_ten = nv["ho_ten"].lower()
        # Try exact match first
        if ten == nv_ten: return nv["id"]
        # Try last name match
        parts = ten.split()
        if len(parts) >= 2:
            last2 = " ".join(parts[-2:])
            if last2 in nv_ten: return nv["id"]
    return None

print(f"  {len(all_nv)} NV")

# ── Step 4: Batch insert ──────────────────────────────
print("[4/4] Import don hang...")
BATCH = 200
order_list = list(orders.values())
total = len(order_list)
ok_orders = 0
ok_items = 0
skip_kh = 0

for i in range(0, total, BATCH):
    batch = order_list[i:i+BATCH]

    # Prepare don_hang rows
    dh_rows = []
    for o in batch:
        h = o["header"]
        kh_id = kh_map.get(h["ma_kh"]) if h["ma_kh"] else None
        if not kh_id and h["ma_kh"]:
            skip_kh += 1
        dh_rows.append({
            "ma_don": h["ma_don"],
            "khach_hang_id": kh_id,
            "ngay": h["ngay"],
            "tong_tien_hang": h["tong_tien_hang"],
            "giam_gia": h["giam_gia"],
            "thuc_thu": h["thuc_thu"],
            "trang_thai": h["trang_thai"],
        })

    # Insert don_hang batch
    r = requests.post(
        SUPABASE_URL + "/rest/v1/don_hang",
        headers={**JSON_H, "Prefer": "return=representation"},
        json=dh_rows,
    )
    if not r.ok:
        print(f"  ERR don_hang batch {i}: {r.status_code} {r.text[:200]}")
        continue

    inserted = r.json()
    ok_orders += len(inserted)

    # Build ma_don -> id map
    don_id_map = {d["ma_don"]: d["id"] for d in inserted}

    # Prepare don_hang_chi_tiet rows
    dhct_rows = []
    for o in batch:
        don_id = don_id_map.get(o["header"]["ma_don"])
        if not don_id: continue
        for item in o["items"]:
            dv_id = dv_map.get(item["ma_dv"])
            ktv_id = None
            tien_hh = 0
            if item["ktv_list"]:
                first_ktv = item["ktv_list"][0]
                ktv_id = match_nv(first_ktv["ten"])
                tien_hh = first_ktv["tien"]

            dhct_rows.append({
                "don_hang_id": don_id,
                "loai_item": "dich_vu",
                "dich_vu_id": dv_id,
                "nhan_vien_id": ktv_id,
                "so_luong": item["so_luong"],
                "don_gia": item["don_gia"],
                "thanh_tien": item["thanh_tien"],
                "tien_hoa_hong": tien_hh,
            })

    # Insert chi tiet batch
    if dhct_rows:
        r2 = requests.post(
            SUPABASE_URL + "/rest/v1/don_hang_chi_tiet",
            headers={**JSON_H, "Prefer": "return=minimal"},
            json=dhct_rows,
        )
        if r2.ok:
            ok_items += len(dhct_rows)

    if i % 5000 == 0:
        print(f"  {min(i+BATCH, total)}/{total} don hang ({ok_orders} OK, {skip_kh} skip KH)...")

print(f"\n  DONE: {ok_orders} don hang + {ok_items} dong chi tiet")
print(f"  KH khong tim thay: {skip_kh}")

# ── Final count ───────────────────────────────────────
print("\n=== KET QUA ===")
for t in ['don_hang', 'don_hang_chi_tiet']:
    r = requests.get(SUPABASE_URL + '/rest/v1/' + t + '?select=count', headers=HEADERS)
    n = r.json()[0]['count'] if r.ok else 'ERR'
    print(f"  {t}: {n}")
print("IMPORT DON HANG HOAN TAT")
