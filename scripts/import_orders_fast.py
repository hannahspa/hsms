"""Import MySpa orders FAST — pandas + batch insert. NO doanh_thu creation."""
import os, sys, io, json, requests, numpy as np
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import pandas as pd

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
HEADERS = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
JSON_H = {**HEADERS, "Content-Type": "application/json"}

fpath = r"D:\Hannah Spa\Database\danh_sach_ban_hang_tat_ca_chi_nhanh_1778311594.xlsx"

def parse_money(s):
    if pd.isna(s): return 0
    if isinstance(s, (int, float)): return int(s)
    s = str(s).replace(",", "").replace(".00", "").replace("d", "").strip()
    try: return int(float(s))
    except: return 0

def parse_dmy(s):
    if pd.isna(s): return None
    s = str(s).strip()
    parts = s.split(" ")[0].split("/")
    if len(parts) == 3:
        try: return parts[2].strip() + "-" + parts[1].strip().zfill(2) + "-" + parts[0].strip().zfill(2)
        except: return None
    return s[:10] if len(s) >= 10 else None

def parse_ktv(s):
    if pd.isna(s) or not s: return []
    results = []
    for p in str(s).split("|"):
        p = p.strip()
        if ":" in p:
            ten, tien = p.split(":", 1)
            results.append({"ten": ten.strip(), "tien": parse_money(tien)})
    return results

print("=" * 60)
print("IMPORT DON HANG — PANDAS + BATCH (KHONG TAO DOANH THU)")
print("=" * 60)

# ── Step 1: Read Excel with pandas ─────────────────
print("\n[1/4] Doc file Excel bang pandas...")
df = pd.read_excel(fpath, dtype=str, engine='openpyxl')
df.columns = [str(c).strip() for c in df.columns]
print("  " + str(len(df)) + " dong, " + str(len(df.columns)) + " cot")

# ── Step 2: Parse orders ───────────────────────────
print("[2/4] Phan tich don hang...")

# Fill forward order code for line items
current_order = None
order_rows = []  # List of (order_header, [line_items])
header_row = None
items = []

for idx, row in df.iterrows():
    ma_don = str(row.get("Mã đơn hàng", "")).strip() if pd.notna(row.get("Mã đơn hàng")) else ""

    if not ma_don or ma_don == "nan" or ma_don == "None":
        continue

    ma_dv = str(row.get("Mã DV/SP", "")).strip() if pd.notna(row.get("Mã DV/SP")) else ""
    ten_dv = str(row.get("Tên DV/SP", "")).strip() if pd.notna(row.get("Tên DV/SP")) else ""
    has_dv = (ma_dv and ma_dv != "nan")

    # Logic: same Ma DH as current header AND has DV -> line item
    if header_row is not None and ma_don == header_row["ma_don"] and has_dv:
        ktv_list = parse_ktv(row.get("Commission nhân viên"))
        items.append({
            "ma_dv": ma_dv, "ten_dv": ten_dv,
            "so_luong": int(parse_money(row.get("Số lượng")) or 1),
            "don_gia": parse_money(row.get("Giá DV/SP")),
            "thanh_tien": parse_money(row.get("Thành tiền DV/SP")),
            "ktv_list": ktv_list,
        })
        continue

    # New order — save previous
    if header_row is not None:
        order_rows.append((header_row, items))

    # Parse this row as header (with or without DV)
    ngay = parse_dmy(row.get("Ngày giờ"))
    ma_kh = str(row.get("Mã khách hàng", "")).strip()
    if ma_kh in ("nan", "None", ""): ma_kh = None

    # Tong tien: from header row if available, else from DV row
    tong_tien = parse_money(row.get("Thành tiền ĐH/TLT"))
    giam_gia = parse_money(row.get("Chiết khấu ĐH/TLT"))
    if tong_tien == 0 and has_dv:
        tong_tien = parse_money(row.get("Thành tiền DV/SP"))

    tien_mat = parse_money(row.get("Tiền mặt"))
    tien_ck = parse_money(row.get("Khách Hàng Chuyển Khoản"))
    tien_qt = parse_money(row.get("Khách Quẹt Thẻ"))
    tien_tktt = parse_money(row.get("Tài khoản TT"))
    tien_tkthuong = parse_money(row.get("Tài khoản thưởng"))

    if tien_ck > 0: hinh_thuc = "chuyen_khoan"
    elif tien_qt > 0: hinh_thuc = "quet_the"
    elif tien_tktt > 0 or tien_tkthuong > 0: hinh_thuc = "the_tra_truoc"
    elif tien_mat > 0: hinh_thuc = "tien_mat"
    else: hinh_thuc = "chuyen_khoan"

    header_row = {
        "ma_don": ma_don, "ma_kh": ma_kh, "ngay": ngay,
        "tong_tien_hang": tong_tien, "giam_gia": giam_gia,
        "thuc_thu": tong_tien - giam_gia, "trang_thai": "da_thanh_toan",
        "hinh_thuc": hinh_thuc,
    }
    items = []

    # If this row also has DV info, add as first line item
    if has_dv:
        ktv_list = parse_ktv(row.get("Commission nhân viên"))
        items.append({
            "ma_dv": ma_dv, "ten_dv": ten_dv,
            "so_luong": int(parse_money(row.get("Số lượng")) or 1),
            "don_gia": parse_money(row.get("Giá DV/SP")),
            "thanh_tien": parse_money(row.get("Thành tiền DV/SP")),
            "ktv_list": ktv_list,
        })

    if (idx + 1) % 20000 == 0:
        print("  " + str(idx + 1) + "/" + str(len(df)) + " dong da doc...")

# Save last order
if header_row is not None:
    order_rows.append((header_row, items))

print("  Tong: " + str(len(order_rows)) + " don hang")

# ── Step 3: Load lookup maps ───────────────────────
print("[3/4] Tai anh xa KH + DV + NV...")

# Load all KH (pagination)
kh_map = {}
offset = 0
while True:
    r = requests.get(
        SUPABASE_URL + "/rest/v1/khach_hang?select=id,ma_kh&limit=1000&offset=" + str(offset),
        headers=HEADERS
    )
    data = r.json()
    if not data: break
    for k in data:
        if k.get("ma_kh"): kh_map[k["ma_kh"]] = k["id"]
    if len(data) < 1000: break
    offset += 1000
print("  " + str(len(kh_map)) + " KH")

# Load all DV
dv_map = {}
offset = 0
while True:
    r = requests.get(
        SUPABASE_URL + "/rest/v1/dich_vu?select=id,ma_dv&limit=1000&offset=" + str(offset),
        headers=HEADERS
    )
    data = r.json()
    if not data: break
    for d in data:
        if d.get("ma_dv"): dv_map[d["ma_dv"]] = d["id"]
    if len(data) < 1000: break
    offset += 1000
print("  " + str(len(dv_map)) + " DV")

# Load NV for KTV matching
all_nv = requests.get(
    SUPABASE_URL + "/rest/v1/nhan_vien?select=id,ho_ten&limit=50",
    headers=HEADERS
).json()

def match_ktv(ten):
    if not ten: return None
    ten = ten.strip().lower()
    for nv in all_nv:
        nv_ten = nv["ho_ten"].lower()
        if ten == nv_ten: return nv["id"]
        parts = ten.split()
        if len(parts) >= 2:
            if " ".join(parts[-2:]) in nv_ten: return nv["id"]
    return None

print("  " + str(len(all_nv)) + " NV")

# ── Step 4: Batch insert ───────────────────────────
print("[4/4] Import don hang...")
BATCH = 150
total = len(order_rows)
ok_orders = 0
ok_items = 0
skip_kh = 0

for i in range(0, total, BATCH):
    batch = order_rows[i:i+BATCH]

    # Prepare don_hang rows
    dh_rows = []
    for hdr, _ in batch:
        kh_id = kh_map.get(hdr["ma_kh"]) if hdr["ma_kh"] else None
        if not kh_id and hdr["ma_kh"]:
            skip_kh += 1
        dh_rows.append({
            "ma_don": hdr["ma_don"],
            "khach_hang_id": kh_id,
            "ngay": hdr["ngay"],
            "tong_tien_hang": hdr["tong_tien_hang"],
            "giam_gia": hdr["giam_gia"],
            "thuc_thu": hdr["thuc_thu"],
            "trang_thai": hdr["trang_thai"],
        })

    # Insert don_hang batch
    r = requests.post(
        SUPABASE_URL + "/rest/v1/don_hang",
        headers={**JSON_H, "Prefer": "return=representation"},
        json=dh_rows,
    )
    if not r.ok:
        print("  ERR batch " + str(i) + ": " + str(r.status_code) + " " + r.text[:150])
        continue

    inserted = r.json()
    ok_orders += len(inserted)

    # Build ma_don -> id map
    don_id_map = {d["ma_don"]: d["id"] for d in inserted}

    # Prepare chi tiet rows
    dhct_rows = []
    for hdr, items in batch:
        don_id = don_id_map.get(hdr["ma_don"])
        if not don_id: continue
        for item in items:
            dv_id = dv_map.get(item["ma_dv"])
            ktv_id = None
            tien_hh = 0
            if item["ktv_list"]:
                ktv_id = match_ktv(item["ktv_list"][0]["ten"])
                tien_hh = item["ktv_list"][0]["tien"]

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
        else:
            print("  ERR chi tiet: " + r2.text[:150])

    if i % 5000 == 0 or (i + BATCH) >= total:
        pct = min(i + BATCH, total) * 100 // total
        print("  " + str(pct) + "% — " + str(min(i + BATCH, total)) + "/" + str(total) + " don (" + str(ok_orders) + " OK, " + str(skip_kh) + " skip KH)")

print("")
print("  DONE: " + str(ok_orders) + " don hang + " + str(ok_items) + " dong chi tiet")
print("  KH khong tim thay: " + str(skip_kh))

# ── Final ──────────────────────────────────────────
print("")
for t in ['don_hang', 'don_hang_chi_tiet']:
    r = requests.get(SUPABASE_URL + '/rest/v1/' + t + '?select=count', headers=HEADERS)
    n = r.json()[0]['count'] if r.ok else 'ERR'
    print(t + ": " + str(n))
print("HOAN TAT")
