"""Import MySpa data into HSMS Supabase — SAFE (upsert, no doanh_thu creation)."""
import os, sys, io, json, re, requests, openpyxl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
HEADERS = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Content-Type": "application/json"}

MYSPA_DIR = r"D:\Hannah Spa\Database"

def api_get(path):
    r = requests.get(SUPABASE_URL + path, headers=HEADERS)
    return r.json() if r.ok else []

def api_post(table, data):
    r = requests.post(SUPABASE_URL + "/rest/v1/" + table, headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}, json=data)
    if not r.ok:
        print("  ERR:", r.status_code, r.text[:200])
    return r.ok

def clean_phone(s):
    """Normalize Vietnamese phone number."""
    s = str(s or "").strip().replace(" ", "").replace(".", "")
    if not s: return None
    if s.startswith("+84"): s = "0" + s[3:]
    if not s.startswith("0"): s = "0" + s
    return s[:15]

def parse_money(s):
    """Parse money value from various formats."""
    if s is None: return 0
    if isinstance(s, (int, float)): return int(s)
    s = str(s).replace(",", "").replace(".00", "").replace("đ", "").strip()
    try: return int(float(s))
    except: return 0

def parse_commission(s):
    """Parse commission: '20000.00' -> 20000 (absolute), '10%' -> 10 (percent).
    Returns (value, type) where type is 'percent' or 'absolute'."""
    s = str(s or "").strip()
    if "%" in s:
        try: return (float(s.replace("%", "").strip()), "percent")
        except: return (0, "percent")
    else:
        v = parse_money(s)
        return (v, "absolute")

# ═══════════════════════════════════════════════════
# IMPORT 1: DỊCH VỤ (200 DV)
# ═══════════════════════════════════════════════════
def import_services():
    fpath = os.path.join(MYSPA_DIR, "danh_sach_dich_vu_tat_ca_chi_nhanh_1778309994.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = [ws.cell(1, c).value for c in range(1, ws.max_column+1)]
    print(f"\n=== IMPORT DICH VU: {ws.max_row - 1} DV ===")

    # Map column names from MySpa -> HSMS
    # Find column indices
    def col(name): return next((i for i, h in enumerate(headers) if name in str(h)), -1)

    updated = 0
    for r in range(2, ws.max_row+1):
        vals = {headers[c]: ws.cell(r, c+1).value for c in range(len(headers))}

        ma_dv = str(vals.get("Mã DV", "")).strip()
        if not ma_dv or ma_dv == "None": continue

        ten = str(vals.get("Tên dịch vụ", "")).strip()
        thoi_luong = parse_money(vals.get("Thời lượng", 0))
        danh_muc = str(vals.get("Danh mục", "")).strip()
        gia = parse_money(vals.get("Số tiền dịch vụ", 0))

        # Commission: KTV-COMMISSION-11 is the KTV commission
        ktv_comm_raw = vals.get("Kỹ Thuật Viên-COMMISSION-11", "0")
        comm_val, comm_type = parse_commission(ktv_comm_raw)

        # Handle both percentage and absolute commission
        ti_le = None
        tien_cd = None
        if comm_type == "percent":
            ti_le = comm_val
        else:
            tien_cd = comm_val
            # If gia > 0, calculate percentage for display
            if gia > 0:
                ti_le = round(comm_val / gia * 100, 1)

        data = {
            "ma_dv": ma_dv,
            "ten": ten,
            "thoi_gian_phut": thoi_luong,
            "danh_muc": danh_muc if danh_muc and danh_muc != "None" else None,
            "gia_co_ban": gia,
            "ti_le_hoa_hong": ti_le,
            "is_active": True,
            "hien_tren_menu": True,
        }

        # Upsert by ma_dv
        existing = api_get("/rest/v1/dich_vu?select=id,ma_dv&ma_dv=eq." + requests.utils.quote(ma_dv))
        if existing:
            r = requests.patch(
                SUPABASE_URL + "/rest/v1/dich_vu?id=eq." + str(existing[0]["id"]),
                headers=HEADERS,
                json=data,
            )
        else:
            r = requests.post(
                SUPABASE_URL + "/rest/v1/dich_vu",
                headers={**HEADERS, "Prefer": "return=minimal"},
                json=data,
            )

        if r.ok: updated += 1
        if updated % 50 == 0:
            print(f"  {updated}/{ws.max_row - 1} DV processed...")

    print(f"  DONE: {updated} DV updated/inserted")

# ═══════════════════════════════════════════════════
# IMPORT 2: KHÁCH HÀNG (5,966 KH)
# ═══════════════════════════════════════════════════
def import_customers():
    fpath = os.path.join(MYSPA_DIR, "khach_hang_tat_ca_chi_nhanh_1778309550.xlsx")
    wb = openpyxl.load_workbook(fpath, data_only=True)
    ws = wb.active
    headers = [ws.cell(1, c).value for c in range(1, ws.max_column+1)]
    print(f"\n=== IMPORT KHACH HANG: {ws.max_row - 1} KH ===")

    updated = 0
    errors = 0
    for r in range(2, ws.max_row+1):
        vals = {headers[c]: ws.cell(r, c+1).value for c in range(len(headers))}

        ma_kh = str(vals.get("Mã khách hàng", "")).strip()
        if not ma_kh or ma_kh == "None": continue

        ho_ten = str(vals.get("Họ tên", "")).strip()
        so_dt = clean_phone(vals.get("Số điện thoại", ""))

        if not so_dt:
            errors += 1
            continue

        ngay_sinh_raw = vals.get("Ngày sinh")
        ngay_sinh = None
        if ngay_sinh_raw:
            try:
                if isinstance(ngay_sinh_raw, str):
                    parts = ngay_sinh_raw.split("/")
                    if len(parts) == 3:
                        ngay_sinh = parts[2] + "-" + parts[1].zfill(2) + "-" + parts[0].zfill(2)
            except: pass

        nguon = str(vals.get("Nguồn KH", "")).strip()
        if nguon == "None" or not nguon: nguon = "Walk-in"

        ngay_tham_gia_raw = vals.get("Ngày tham gia")
        ngay_tham_gia = None
        if ngay_tham_gia_raw:
            try:
                if isinstance(ngay_tham_gia_raw, str):
                    parts = ngay_tham_gia_raw.split("/")
                    if len(parts) == 3:
                        ngay_tham_gia = parts[2] + "-" + parts[1].zfill(2) + "-" + parts[0].zfill(2)
            except: pass

        ghi_chu = str(vals.get("Thông tin bệnh lý", "") or "").strip()
        if ghi_chu == "None": ghi_chu = ""

        tong_tien = parse_money(vals.get("Tổng tiền", 0))

        data = {
            "ma_kh": ma_kh,
            "ho_ten": ho_ten,
            "so_dien_thoai": so_dt,
            "ngay_sinh": ngay_sinh,
            "gioi_tinh": "nu" if str(vals.get("Giới tính", "")).strip() == "Nữ" else "nam",
            "nguon": nguon,
            "ghi_chu_da_lieu": ghi_chu if ghi_chu else None,
            "tong_chi_tieu": tong_tien,
            "is_active": True,
        }

        # Use upsert via SO_DIEN_THOAI unique constraint
        existing = api_get("/rest/v1/khach_hang?select=id,ma_kh&so_dien_thoai=eq." + requests.utils.quote(so_dt))
        try:
            if existing:
                r = requests.patch(
                    SUPABASE_URL + "/rest/v1/khach_hang?id=eq." + str(existing[0]["id"]),
                    headers=HEADERS,
                    json={k: v for k, v in data.items() if v is not None},
                )
            else:
                r = requests.post(
                    SUPABASE_URL + "/rest/v1/khach_hang",
                    headers={**HEADERS, "Prefer": "return=minimal"},
                    json={k: v for k, v in data.items() if v is not None and k != "ma_kh"},
                )
            if r.ok: updated += 1
            else: errors += 1
        except Exception as e:
            errors += 1

        if (updated + errors) % 500 == 0:
            print(f"  {updated} inserted, {errors} errors...")

    print(f"  DONE: {updated} KH imported, {errors} errors")

# ═══════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("HSMS — IMPORT MYSPA DATA")
    print("=" * 60)
    print("\nWARNING: This imports into PRODUCTION database.")
    print("Doanh thu/chi_phi hiện tại sẽ KHÔNG bị ảnh hưởng.")
    ans = input("\nContinue? (y/N): ").strip().lower()
    if ans != "y":
        print("Cancelled.")
        sys.exit(0)

    import_services()
    import_customers()

    print("\n" + "=" * 60)
    print("DONE. Verify in Supabase dashboard.")
    print("=" * 60)
