"""Import MySpa data FAST — batch upsert, no doanh_thu creation."""
import os, sys, io, json, requests, openpyxl
from datetime import datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
HEADERS = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
JSON_H = {**HEADERS, "Content-Type": "application/json"}
DB = r"D:\Hannah Spa\Database"
BATCH = 300

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

def parse_date_dmy(s):
    if not s: return None
    s = str(s).strip()
    parts = s.split(" ")[0].split("/")
    if len(parts) == 3:
        try: return parts[2] + "-" + parts[1].zfill(2) + "-" + parts[0].zfill(2)
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

def upsert_batch(table, rows, on_conflict="ma_kh"):
    """Batch upsert via REST API."""
    total = len(rows)
    ok_count = 0
    for i in range(0, total, BATCH):
        batch = rows[i:i+BATCH]
        r = requests.post(
            SUPABASE_URL + "/rest/v1/" + table,
            headers={**JSON_H, "Prefer": "resolution=merge-duplicates"},
            json=batch,
        )
        if r.ok: ok_count += len(batch)
        else:
            # Try with return=minimal
            r2 = requests.post(
                SUPABASE_URL + "/rest/v1/" + table,
                headers={**JSON_H, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=batch,
            )
            if r2.ok: ok_count += len(batch)
            else:
                print("  ERR batch:", r.status_code, r.text[:200])
    return ok_count

# ── STAGE 1: DỊCH VỤ ────────────────────────────────
def import_services():
    fpath = os.path.join(DB, "danh_sach_dich_vu_tat_ca_chi_nhanh_1778309994.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}
    print(f"\n=== DICH VU: {ws.max_row - 1} DV ===")

    rows = []
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

        if comm_type == "percent":
            ti_le = comm_val
        elif comm_type == "absolute" and gia > 0:
            ti_le = round(comm_val / gia * 100, 1)
        else:
            ti_le = None

        rows.append({
            "ma_dv": ma_dv,
            "ten": ten,
            "thoi_gian_phut": thoi_luong,
            "danh_muc": danh_muc,
            "gia_co_ban": gia,
            "ti_le_hoa_hong": ti_le,
            "is_active": True,
            "hien_tren_menu": True,
        })

    n = upsert_batch("dich_vu", rows, "ma_dv")
    print(f"  DONE: {n}/{len(rows)} DV")

# ── STAGE 2: KHÁCH HÀNG ─────────────────────────────
def import_customers():
    fpath = os.path.join(DB, "khach_hang_tat_ca_chi_nhanh_1778309550.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}
    print(f"\n=== KHACH HANG: {ws.max_row - 1} KH ===")

    rows = []
    seen_phones = set()
    skip = 0
    for r in range(2, ws.max_row + 1):
        def val(col):
            c = headers.get(col)
            return ws.cell(r, c).value if c else None

        ma_kh = str(val("Mã khách hàng") or "").strip()
        if not ma_kh or ma_kh == "None": continue

        ho_ten = str(val("Họ tên") or "").strip()
        so_dt = clean_phone(val("Số điện thoại"))
        if not so_dt:
            skip += 1
            continue
        # Skip duplicate phones (keep first occurrence)
        if so_dt in seen_phones:
            skip += 1
            continue
        seen_phones.add(so_dt)

        ngay_sinh = parse_date_dmy(val("Ngày sinh"))
        nguon = str(val("Nguồn KH") or "").strip()
        if not nguon or nguon == "None": nguon = "Walk-in"

        gioi_tinh_raw = str(val("Giới tính") or "").strip()
        gioi_tinh = "nu" if "Nữ" in gioi_tinh_raw else ("nam" if "Nam" in gioi_tinh_raw else "khac")

        ghi_chu = str(val("Thông tin bệnh lý") or "").strip()
        if ghi_chu == "None": ghi_chu = ""

        tong_tien = parse_money(val("Tổng tiền"))

        rows.append({
            "ma_kh": ma_kh,
            "ho_ten": ho_ten,
            "so_dien_thoai": so_dt,
            "ngay_sinh": ngay_sinh,
            "gioi_tinh": gioi_tinh,
            "nguon": nguon,
            "ghi_chu_da_lieu": ghi_chu if ghi_chu else None,
            "tong_chi_tieu": tong_tien,
            "is_active": True,
        })

        if len(rows) % 1000 == 0:
            print(f"  Reading... {len(rows)} KH")

    print(f"  Read {len(rows)} KH (skipped {skip} duplicates/no-phone)")
    print(f"  Upserting in batches of {BATCH}...")
    n = upsert_batch("khach_hang", rows, "so_dien_thoai")
    print(f"  DONE: {n}/{len(rows)} KH")

# ── STAGE 3: THẺ LIỆU TRÌNH ─────────────────────────
def import_cards():
    fpath = os.path.join(DB, "danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1778310007.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}
    print(f"\n=== THE LIEU TRINH: {ws.max_row - 1} THE ===")

    # Load customer map: ma_kh -> id
    print("  Loading customer IDs...")
    all_kh = requests.get(
        SUPABASE_URL + "/rest/v1/khach_hang?select=id,ma_kh",
        headers={**HEADERS, "Accept-Profile": "public"}
    ).json()
    kh_map = {k["ma_kh"]: k["id"] for k in all_kh if k.get("ma_kh")}
    print(f"  {len(kh_map)} KH mapped")

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
            skip += 1
            continue

        ten_goi = str(val("Tên gói") or "").strip()
        so_lan = int(parse_money(val("Tổng số lần")) or 0)
        da_dung = int(parse_money(val("Số lần đã sử dụng")) or 0)
        tong_tien = parse_money(val("Tổng tiền"))
        thanh_toan = parse_money(val("Thanh toán"))
        cong_no = parse_money(val("Công nợ"))

        ngay_tao = str(val("Ngày tạo") or "").strip()[:10]  # YYYY-MM-DD
        han_raw = str(val("Ngày hết hạn") or "").strip()
        ngay_het_han = None
        if han_raw and "Không" not in han_raw and han_raw != "None":
            ngay_het_han = han_raw[:10] if len(han_raw) >= 10 else None

        rows.append({
            "ma_the": ma_the,
            "khach_hang_id": kh_id,
            "ten_dich_vu": ten_goi,
            "so_buoi_tong": so_lan,
            "so_buoi_da_dung": da_dung,
            "gia_tri_the": tong_tien,
            "ngay_mua": ngay_tao if ngay_tao else None,
            "ngay_het_han": ngay_het_han,
            "trang_thai": "active" if (so_lan - da_dung) > 0 else "het_buoi",
        })

        if len(rows) % 500 == 0:
            print(f"  Reading... {len(rows)} the")

    print(f"  Read {len(rows)} the (skipped {skip} no-KH-match)")
    print(f"  Upserting in batches of {BATCH}...")
    n = upsert_batch("the_lieu_trinh", rows, "ma_the")
    print(f"  DONE: {n}/{len(rows)} the")

# ── MAIN ────────────────────────────────────────────
if __name__ == "__main__":
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"
    print("=" * 60)
    print("HSMS — IMPORT MYSPA (BATCH UPSERT)")
    print("=" * 60)
    print("  doanh_thu: KHONG bi anh huong")
    print("  so_du_vi:  KHONG bi anh huong")
    print()

    if stage in ("services", "all"): import_services()
    if stage in ("customers", "all"): import_customers()
    if stage in ("cards", "all"):     import_cards()

    print("\nDONE. Kiem tra Supabase Dashboard.")
