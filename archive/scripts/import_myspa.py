"""Import MySpa data into HSMS Supabase — AN TOAN (no doanh_thu creation).
Usage: python scripts/import_myspa.py [stage]
  stage: services | customers | orders | cards | all
  default: all (asks before each stage)
"""
import os, sys, io, re, json, requests, openpyxl, time
from datetime import datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY = os.environ["SUPABASE_KEY"]
HEADERS = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
JSON_H = {**HEADERS, "Content-Type": "application/json"}

DB = r"D:\Hannah Spa\Database"

# ── Helpers ─────────────────────────────────────────
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
    """Parse DD/MM/YYYY -> YYYY-MM-DD"""
    if not s: return None
    s = str(s).strip()
    # Try DD/MM/YYYY HH:MM:SS
    parts = s.split(" ")[0].split("/")
    if len(parts) == 3:
        try: return parts[2] + "-" + parts[1].zfill(2) + "-" + parts[0].zfill(2)
        except: return None
    # Try YYYY-MM-DD
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

def api_get(path):
    r = requests.get(SUPABASE_URL + path, headers=HEADERS)
    return r.json() if r.ok else []

def api_patch(table, obj_id, data):
    data = {k: v for k, v in data.items() if v is not None}
    if not data: return True
    return requests.patch(
        SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + str(obj_id),
        headers=JSON_H, json=data
    ).ok

def api_post(table, data):
    data = {k: v for k, v in data.items() if v is not None}
    if not data: return None
    r = requests.post(
        SUPABASE_URL + "/rest/v1/" + table,
        headers={**JSON_H, "Prefer": "return=representation"},
        json=data
    )
    if r.ok and r.text:
        try: return r.json()[0]
        except: return True
    return None if not r.ok else True

# ── STAGE 1: DỊCH VỤ ────────────────────────────────
def import_services():
    fpath = os.path.join(DB, "danh_sach_dich_vu_tat_ca_chi_nhanh_1778309994.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}
    total = ws.max_row - 1
    print(f"\n=== STAGE 1: IMPORT DICH VU ({total} DV) ===")

    updated = 0
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

        # Parse commission from KTV column
        ktv_raw = str(val("Kỹ Thuật Viên-COMMISSION-11") or "0")
        comm_val, comm_type = parse_commission(ktv_raw)

        # Get existing record by name (since ma_dv may not exist yet)
        existing = api_get("/rest/v1/dich_vu?select=id,ma_dv&ten=eq." + requests.utils.quote(ten))

        if comm_type == "percent":
            ti_le = comm_val
            tien_cd = round(gia * comm_val / 100) if gia > 0 else 0
        elif comm_type == "absolute":
            ti_le = round(comm_val / gia * 100, 1) if gia > 0 else None
            tien_cd = comm_val
        else:
            ti_le = None
            tien_cd = None

        data = {
            "ma_dv": ma_dv,
            "ten": ten,
            "thoi_gian_phut": thoi_luong,
            "danh_muc": danh_muc,
            "gia_co_ban": gia,
            "ti_le_hoa_hong": ti_le,
            "is_active": True,
        }

        if existing:
            rid = existing[0]["id"]
            ok = api_patch("dich_vu", rid, data)
            # Also patch ma_dv if not set
            if ok and not existing[0].get("ma_dv"):
                requests.patch(
                    SUPABASE_URL + "/rest/v1/dich_vu?id=eq." + str(rid),
                    headers=JSON_H, json={"ma_dv": ma_dv}
                )
            if ok: updated += 1
        else:
            result = api_post("dich_vu", data)
            if result: updated += 1

        if updated % 50 == 0:
            print(f"  {updated}/{total} DV...")

    print(f"  DONE: {updated}/{total} DV updated with ma_dv + commission")

# ── STAGE 2: KHÁCH HÀNG ─────────────────────────────
def import_customers():
    fpath = os.path.join(DB, "khach_hang_tat_ca_chi_nhanh_1778309550.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = {str(ws.cell(1, c).value): c for c in range(1, ws.max_column+1)}
    total = ws.max_row - 1
    print(f"\n=== STAGE 2: IMPORT KHACH HANG ({total} KH) ===")

    inserted = 0
    updated = 0
    errors = 0
    batch = []

    for r in range(2, ws.max_row + 1):
        def val(col):
            c = headers.get(col)
            return ws.cell(r, c).value if c else None

        ma_kh = str(val("Mã khách hàng") or "").strip()
        if not ma_kh or ma_kh == "None": continue

        ho_ten = str(val("Họ tên") or "").strip()
        so_dt = clean_phone(val("Số điện thoại"))
        if not so_dt:
            errors += 1
            continue

        ngay_sinh = parse_date_dmy(val("Ngày sinh"))
        nguon = str(val("Nguồn KH") or "").strip()
        if not nguon or nguon == "None": nguon = "Walk-in"

        gioi_tinh_raw = str(val("Giới tính") or "").strip()
        gioi_tinh = "nu" if gioi_tinh_raw == "Nữ" else ("nam" if gioi_tinh_raw == "Nam" else "khac")

        ghi_chu = str(val("Thông tin bệnh lý") or "").strip()
        if ghi_chu == "None": ghi_chu = ""

        tong_tien = parse_money(val("Tổng tiền"))

        # Check if exists by phone number
        existing = api_get("/rest/v1/khach_hang?select=id,ma_kh&so_dien_thoai=eq." + requests.utils.quote(so_dt))

        data = {
            "ma_kh": ma_kh,
            "ho_ten": ho_ten,
            "so_dien_thoai": so_dt,
            "ngay_sinh": ngay_sinh,
            "gioi_tinh": gioi_tinh,
            "nguon": nguon,
            "ghi_chu_da_lieu": ghi_chu if ghi_chu else None,
            "tong_chi_tieu": tong_tien,
            "is_active": True,
        }

        try:
            if existing:
                ok = api_patch("khach_hang", existing[0]["id"], data)
                if not existing[0].get("ma_kh"):
                    requests.patch(
                        SUPABASE_URL + "/rest/v1/khach_hang?id=eq." + str(existing[0]["id"]),
                        headers=JSON_H, json={"ma_kh": ma_kh}
                    )
                if ok: updated += 1
            else:
                result = api_post("khach_hang", data)
                if result: inserted += 1
                else: errors += 1
        except Exception as e:
            errors += 1

        done = inserted + updated + errors
        if done % 500 == 0:
            print(f"  {done}/{total} (new:{inserted} upd:{updated} err:{errors})...")

    print(f"  DONE: {inserted} new + {updated} updated + {errors} errors = {inserted+updated}/{total}")


# ── MAIN ────────────────────────────────────────────
if __name__ == "__main__":
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"

    print("=" * 60)
    print("HSMS — IMPORT MYSPA DATA (AN TOAN)")
    print("=" * 60)
    print()
    print("WARNING: This writes to PRODUCTION database.")
    print("  - doanh_thu: KHONG bi anh huong")
    print("  - so_du_vi:  KHONG bi anh huong")
    print("  - chi_phi:   KHONG bi anh huong")
    print()

    if stage in ("services", "all"):
        import_services()

    if stage in ("customers", "all"):
        import_customers()

    print("\n" + "=" * 60)
    print("DONE. Kiem tra trong Supabase Dashboard.")
    print("=" * 60)
