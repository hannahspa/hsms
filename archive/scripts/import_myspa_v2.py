"""Import MySpa data v2 — PATCH services, UPSERT customers/cards in batches."""
import os, sys, io, json, requests, openpyxl, time
from datetime import datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY = os.environ["SUPABASE_KEY"]
HEADERS = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
JSON_H = {**HEADERS, "Content-Type": "application/json"}
DB = r"D:\Hannah Spa\Database"

def clean_phone(s):
    s = str(s or "").strip().replace(" ", "").replace(".", "")
    if not s: return None
    if s.startswith("+84"): s = "0" + s[3:]
    elif not s.startswith("0"): s = "0" + s
    return s[:15] if len(s) >= 10 else None

def parse_money(s):
    if s is None: return 0
    if isinstance(s, (int, float)): return int(s)
    s = str(s).replace(",", "").replace(".00", "").replace("đ", "").strip()
    try: return int(float(s))
    except: return 0

def parse_dmy(s):
    """DD/MM/YYYY -> YYYY-MM-DD"""
    if not s: return None
    s = str(s).strip()
    parts = s.split(" ")[0].split("/")
    if len(parts) == 3:
        try: return parts[2].strip() + "-" + parts[1].strip().zfill(2) + "-" + parts[0].strip().zfill(2)
        except: return None
    try: return str(datetime.strptime(s[:10], "%Y-%m-%d").date())
    except: return None

def parse_commission(s):
    s = str(s or "").strip()
    if not s or s == "None": return (0, None)
    if "%" in s:
        try: return (float(s.replace("%", "").strip()), "percent")
        except: return (0, None)
    v = parse_money(s)
    return (v, "absolute" if v > 0 else None)

# ── STAGE 1: DỊCH VỤ — PATCH từng cái ─────────────────
def import_services():
    fpath = os.path.join(DB, "danh_sach_dich_vu_tat_ca_chi_nhanh_1778309994.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}

    # Get existing services mapped by name
    existing = requests.get(
        SUPABASE_URL + "/rest/v1/dich_vu?select=id,ten,ma_dv",
        headers=HEADERS
    ).json()
    name_map = {d["ten"]: d for d in existing}
    print(f"=== DICH VU: {ws.max_row - 1} DV (hien co: {len(name_map)}) ===")

    updated = 0
    new_count = 0
    for r in range(2, ws.max_row + 1):
        def val(col):
            c = headers.get(col)
            return ws.cell(r, c).value if c else None

        ma_dv = str(val("Mã DV") or "").strip()
        if not ma_dv or ma_dv == "None": continue
        ten = str(val("Tên dịch vụ") or "").strip()
        thoi_luong = parse_money(val("Thời lượng"))
        danh_muc = str(val("Danh mục") or "").strip()
        if danh_muc == "None": danh_muc = None
        gia = parse_money(val("Số tiền dịch vụ"))
        ktv_raw = str(val("Kỹ Thuật Viên-COMMISSION-11") or "0")
        comm_val, comm_type = parse_commission(ktv_raw)

        if comm_type == "percent": ti_le = comm_val
        elif comm_type == "absolute" and gia > 0: ti_le = round(comm_val / gia * 100, 1)
        else: ti_le = None

        existing_dv = name_map.get(ten)
        if existing_dv:
            r2 = requests.patch(
                SUPABASE_URL + "/rest/v1/dich_vu?id=eq." + str(existing_dv["id"]),
                headers=JSON_H,
                json={"ma_dv": ma_dv, "thoi_gian_phut": thoi_luong, "danh_muc": danh_muc, "gia_co_ban": gia, "ti_le_hoa_hong": ti_le}
            )
            if r2.ok: updated += 1
        else:
            # Insert new service
            r2 = requests.post(
                SUPABASE_URL + "/rest/v1/dich_vu",
                headers={**JSON_H, "Prefer": "return=minimal"},
                json={"ma_dv": ma_dv, "ten": ten, "thoi_gian_phut": thoi_luong, "danh_muc": danh_muc, "gia_co_ban": gia, "ti_le_hoa_hong": ti_le, "is_active": True, "hien_tren_menu": True}
            )
            if r2.ok: new_count += 1

        if (updated + new_count) % 50 == 0:
            print(f"  {updated} updated, {new_count} new...")

    print(f"  DONE: {updated} updated + {new_count} new")

# ── STAGE 2: KHÁCH HÀNG — batch upsert ───────────────
def import_customers():
    fpath = os.path.join(DB, "khach_hang_tat_ca_chi_nhanh_1778309550.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}
    total = ws.max_row - 1
    print(f"\n=== KHACH HANG: {total} KH ===")

    rows = []
    seen = set()
    skip = 0
    for r in range(2, ws.max_row + 1):
        def val(col):
            c = headers.get(col)
            return ws.cell(r, c).value if c else None

        ma_kh = str(val("Mã khách hàng") or "").strip()
        if not ma_kh or ma_kh == "None": continue

        ho_ten = str(val("Họ tên") or "").strip()
        so_dt = clean_phone(val("Số điện thoại"))
        if not so_dt or so_dt in seen:
            skip += 1; continue
        seen.add(so_dt)

        ngay_sinh = parse_dmy(val("Ngày sinh"))
        nguon = str(val("Nguồn KH") or "").strip()
        if not nguon or nguon == "None": nguon = "Walk-in"
        gioi_tinh_raw = str(val("Giới tính") or "").strip()
        gioi_tinh = "nu" if "Nữ" in gioi_tinh_raw else ("nam" if "Nam" in gioi_tinh_raw else "khac")
        ghi_chu = str(val("Thông tin bệnh lý") or "").strip()
        if ghi_chu == "None": ghi_chu = ""
        tong_tien = parse_money(val("Tổng tiền"))

        rows.append({
            "ma_kh": ma_kh, "ho_ten": ho_ten, "so_dien_thoai": so_dt,
            "ngay_sinh": ngay_sinh, "gioi_tinh": gioi_tinh, "nguon": nguon,
            "ghi_chu_da_lieu": ghi_chu if ghi_chu else None,
            "tong_chi_tieu": tong_tien, "is_active": True,
        })

        if len(rows) % 1000 == 0:
            print(f"  Dang doc... {len(rows)} KH")

    print(f"  Doc xong: {len(rows)} KH (bo qua {skip} trung/loi SĐT)")

    # Batch insert — 300 per request
    BATCH = 300
    ok_count = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i+BATCH]
        # Delete conflicting records first to ensure clean insert
        phones = [r["so_dien_thoai"] for r in batch]
        # Try direct insert (table is empty now, so no conflicts)
        r = requests.post(
            SUPABASE_URL + "/rest/v1/khach_hang",
            headers={**JSON_H, "Prefer": "return=minimal"},
            json=batch,
        )
        if r.ok:
            ok_count += len(batch)
        else:
            # Fall back to individual inserts
            for row in batch:
                r2 = requests.post(
                    SUPABASE_URL + "/rest/v1/khach_hang",
                    headers={**JSON_H, "Prefer": "return=minimal"},
                    json=row,
                )
                if r2.ok: ok_count += 1
        if i % 3000 == 0:
            print(f"  {min(i+BATCH, len(rows))}/{len(rows)} KH da import...")

    print(f"  DONE: {ok_count}/{len(rows)} KH")

# ── STAGE 3: THẺ LIỆU TRÌNH ─────────────────────────
def import_cards():
    fpath = os.path.join(DB, "danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1778310007.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}
    total = ws.max_row - 1
    print(f"\n=== THE LIEU TRINH: {total} THE ===")

    # Load KH map
    print("  Dang tai danh sach KH...")
    all_kh = requests.get(
        SUPABASE_URL + "/rest/v1/khach_hang?select=id,ma_kh&limit=10000",
        headers=HEADERS
    ).json()
    kh_map = {k.get("ma_kh"): k["id"] for k in all_kh if k.get("ma_kh")}
    print(f"  {len(kh_map)} KH da anh xa")

    rows = []
    skip = 0
    for r in range(2, ws.max_row + 1):
        def val(col):
            c = headers.get(col)
            return ws.cell(r, c).value if c else None

        ma_the = str(val("Mã Thẻ (Tự động được tạo bởi hệ thống)") or "").strip()
        if not ma_the or ma_the == "None": continue

        ma_kh = str(val("Mã khách hàng") or "").strip()
        kh_id = kh_map.get(ma_kh)
        if not kh_id:
            skip += 1; continue

        ten_goi = str(val("Tên gói") or "").strip()
        so_lan = int(parse_money(val("Tổng số lần")) or 0)
        da_dung = int(parse_money(val("Số lần đã sử dụng")) or 0)
        tong_tien = parse_money(val("Tổng tiền"))

        # Ngày tạo: YYYY-MM-DD HH:MM:SS
        ngay_tao_raw = str(val("Ngày tạo") or "").strip()[:10]
        ngay_tao = ngay_tao_raw if len(ngay_tao_raw) == 10 and "-" in ngay_tao_raw else None

        # Ngày hết hạn: có thể là "Không giới hạn" hoặc DD/MM/YYYY
        han_raw = str(val("Ngày hết hạn") or "").strip()
        ngay_het_han = None
        if han_raw and "Không" not in han_raw and han_raw != "None":
            # Try DD/MM/YYYY first, then YYYY-MM-DD
            parts = han_raw.split("/")
            if len(parts) == 3:
                try: ngay_het_han = parts[2].strip() + "-" + parts[1].strip().zfill(2) + "-" + parts[0].strip().zfill(2)
                except: pass
            elif len(han_raw) >= 10 and han_raw[4] == "-":
                ngay_het_han = han_raw[:10]

        con_lai = max(0, so_lan - da_dung)
        trang_thai = "active" if con_lai > 0 else "het_buoi"

        rows.append({
            "ma_the": ma_the, "khach_hang_id": kh_id,
            "ten_dich_vu": ten_goi, "so_buoi_tong": so_lan,
            "so_buoi_da_dung": da_dung, "gia_tri_the": tong_tien,
            "ngay_mua": ngay_tao, "ngay_het_han": ngay_het_han,
            "trang_thai": trang_thai,
        })

        if len(rows) % 500 == 0:
            print(f"  Dang doc... {len(rows)} the")

    print(f"  Doc xong: {len(rows)} the (bo qua {skip} khong co KH)")

    # Batch insert
    BATCH = 300
    ok_count = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i+BATCH]
        r = requests.post(
            SUPABASE_URL + "/rest/v1/the_lieu_trinh",
            headers={**JSON_H, "Prefer": "return=minimal"},
            json=batch,
        )
        if r.ok:
            ok_count += len(batch)
        else:
            # Fall back to individual
            for row in batch:
                r2 = requests.post(
                    SUPABASE_URL + "/rest/v1/the_lieu_trinh",
                    headers={**JSON_H, "Prefer": "return=minimal"},
                    json=row,
                )
                if r2.ok: ok_count += 1
        if i % 1500 == 0:
            print(f"  {min(i+BATCH, len(rows))}/{len(rows)} the da import...")

    print(f"  DONE: {ok_count}/{len(rows)} the")

# ── MAIN ────────────────────────────────────────────
if __name__ == "__main__":
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"
    print("=" * 60)
    print("HSMS — IMPORT MYSPA v2")
    print("=" * 60)
    if stage in ("services", "all"): import_services()
    if stage in ("customers", "all"): import_customers()
    if stage in ("cards", "all"):     import_cards()

    # Final count
    print("\n=== KET QUA CUOI CUNG ===")
    for t in ['dich_vu', 'khach_hang', 'the_lieu_trinh']:
        r = requests.get(SUPABASE_URL + '/rest/v1/' + t + '?select=count', headers=HEADERS)
        n = r.json()[0]['count'] if r.ok else 'ERR'
        print(f"  {t}: {n}")
    print("DONE")
