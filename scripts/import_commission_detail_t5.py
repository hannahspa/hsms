"""
Import chi tiet commission T5 vao nhan_vien_thu_nhap
- Xoa records T5 cu (don_hang_id IS NULL + nguon=myspa_commission)
- Import chi tiet tung DON HANG:
  * Group by ma_don
  * SUM commission tung dong DV per don (khong lay 1 lan, khong lay dong Tong cong)
  * SUM tour tung dong per don
  * 1 record loai=commission + 1 record loai=tour per don (neu > 0)
"""
import requests, pandas as pd
from pathlib import Path
from collections import defaultdict

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
H  = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
HR = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
folder = Path(r"D:\Hannah Spa\Database\Commission Tu 01.05 den 26.05")
BATCH = 100
SEP = "=" * 65

def fetch_all(table, params=""):
    result, offset = [], 0
    while True:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?{params}&limit=1000&offset={offset}", headers=HR)
        data = r.json() if r.status_code in [200, 206] else []
        if not data: break
        result.extend(data)
        if len(data) < 1000: break
        offset += 1000
    return result

def to_str(v):
    s = str(v).strip()
    return None if s in ("nan", "None", "") else s

def pi(x, d=0):
    try:
        s = str(x).strip()
        return d if s in ("nan", "None", "") else int(float(s))
    except:
        return d

def pf(x, d=0.0):
    try:
        s = str(x).strip()
        return d if s in ("nan", "None", "") else float(s)
    except:
        return d

def parse_datetime(x):
    s = to_str(x)
    if not s: return None
    return s[:10]

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".")
    except: return str(n)

# ── MAP TEN FILE -> TEN NV CHINH XAC ──────────────────
NV_FILE_MAP = {
    "do_thi_khanh_duy":           "Đỗ Thị Khánh Duy",
    "ho_ngoc_phuong":             "Hồ Ngọc Phương",
    "le_hoang_phuong_linh":       "Lê Hoàng Phương Linh",
    "le_thi_cam_my":              "Lê Thị Cẩm My",
    "nguyen_hoa_dao":             "Nguyễn Hoa Đào",
    "nguyen_hoang_anh_thu":       "Nguyễn Hoàng Anh Thư",
    "nguyen_thi_thuy_hoanh":      "Nguyễn Thị Thúy Hoanh",
    "nguyen_thi_tuong_uyen":      "Nguyễn Thị Tường Uyên",
    "truong_thi_be_thon":         "Trương Thị Bé Thôn",
}

# ── BUILD MAPPING TABLES ──────────────────────────────
print(SEP)
print("BUILD MAPPING")

nv_list = fetch_all("nhan_vien", "select=id,ho_ten")
nv_name_map = {x["ho_ten"].strip(): x["id"] for x in nv_list}

# Don hang T5: ma_don -> id
dh_list = fetch_all("don_hang", "select=id,ma_don&ngay=gte.2026-05-01&ngay=lte.2026-05-26")
dh_map  = {x["ma_don"]: x["id"] for x in dh_list}
print(f"  NV: {len(nv_name_map)} | Don hang T5: {len(dh_map)}")

# ── XOA RECORDS T5 CU ────────────────────────────────
print(f"\n{SEP}")
print("XOA RECORDS T5 CU...")
# Xoa tong hop (don_hang_id IS NULL)
r1 = requests.delete(
    f"{SUPABASE_URL}/rest/v1/nhan_vien_thu_nhap?ngay=gte.2026-05-01&ngay=lte.2026-05-26&don_hang_id=is.null",
    headers=HR
)
print(f"  Tong hop (don_hang_id NULL): {r1.status_code} -> {'OK' if r1.status_code in [200,204] else r1.text[:80]}")
# Xoa chi tiet da import lan truoc
r2 = requests.delete(
    f"{SUPABASE_URL}/rest/v1/nhan_vien_thu_nhap?ngay=gte.2026-05-01&ngay=lte.2026-05-26&nguon=eq.myspa_commission",
    headers=HR
)
print(f"  Chi tiet (nguon=myspa_commission): {r2.status_code} -> {'OK' if r2.status_code in [200,204] else r2.text[:80]}")

# ── DOC 9 FILE COMMISSION CHI TIET ────────────────────
print(f"\n{SEP}")
print("DOC FILE COMMISSION CHI TIET...")
print("  Logic: group by ma_don, SUM commission va tour per don")
print()

COL_NGAY   = "Thời gian thanh toán"
COL_MADON  = "Mã đơn hàng/Thẻ dịch vụ"
COL_DICHVU = "Dịch vụ/Sản phẩm"
COL_KH     = "Khách hàng"
COL_DSAD   = "Doanh số sau giảm"
COL_PCT    = "%"
COL_COMM   = "commission (%) tổng đơn hàng"
COL_TOUR   = "Tiền tour NV"

records = []
summary = defaultdict(lambda: {"comm": 0, "tour": 0, "don_hang_c": 0, "don_hang_t": 0, "skip": 0})
no_match = []

files = sorted(folder.glob("*.xlsx"))
for f in files:
    stem = f.stem
    nv_key = stem.replace("commission_nhan_vien_", "").split("_tat_ca")[0]
    nv_ten = NV_FILE_MAP.get(nv_key)
    if not nv_ten:
        print(f"  WARN: Khong map duoc NV tu file: {f.name}")
        continue
    nv_id = nv_name_map.get(nv_ten)
    if not nv_id:
        print(f"  WARN: NV '{nv_ten}' khong co trong DB")
        continue

    df = pd.read_excel(f, dtype=str)

    # ── GROUP BY ma_don, SUM commission va tour ──────
    # - Chi lay dong co ma_don bat dau bang "ĐH-" (bo Tong cong, dong rong)
    # - Dòng "Tổng cộng" cua MySpa co commission = tong_tour (xuat nham) -> LOAI BO
    # - Cộng dồn commission va tour theo tung dong DV
    dh_seen = {}  # ma_don -> {ngay, comm, tour, dich_vu, kh, doanh_so}

    for _, row in df.iterrows():
        ma_don = to_str(row.get(COL_MADON))
        comm   = pi(row.get(COL_COMM, 0))
        tour   = pi(row.get(COL_TOUR, 0))

        # Chi xu ly dong co ma don hop le (ĐH-xxxxx)
        if not ma_don or not ma_don.startswith("ĐH-"):
            continue

        # Bo qua dong khong co ca commission lan tour
        if comm == 0 and tour == 0:
            continue

        if ma_don not in dh_seen:
            dh_seen[ma_don] = {
                "ngay":     parse_datetime(row.get(COL_NGAY)),
                "doanh_so": pi(row.get(COL_DSAD, 0)),
                "ti_le":    pf(row.get(COL_PCT, 0)),
                "comm":     comm,
                "tour":     tour,
                "dich_vu":  to_str(row.get(COL_DICHVU)) or "",
                "kh":       to_str(row.get(COL_KH)) or "",
            }
        else:
            # CONG DON commission va tour (tung dong DV co the khac nhau)
            dh_seen[ma_don]["comm"] += comm
            dh_seen[ma_don]["tour"] += tour
            # Cap nhat ngay neu chua co
            if not dh_seen[ma_don]["ngay"]:
                dh_seen[ma_don]["ngay"] = parse_datetime(row.get(COL_NGAY))

    # ── TAO RECORDS insert ────────────────────────────
    comm_total = 0
    tour_total = 0
    skip_count = 0

    for ma_don, d in dh_seen.items():
        dh_id = dh_map.get(ma_don)
        if not dh_id:
            no_match.append(f"{ma_don} ({nv_ten})")
            skip_count += 1
            continue

        ghi_chu = f"{d['dich_vu']} | KH: {d['kh']}"[:200]

        if d["comm"] > 0:
            records.append({
                "don_hang_id":          dh_id,
                "don_hang_chi_tiet_id": None,   # tranh UNIQUE constraint
                "nhan_vien_id":         nv_id,
                "loai":                 "commission",
                "nguon":                "myspa_commission",
                "ngay":                 d["ngay"],
                "doanh_so_tinh":        d["doanh_so"],
                "ti_le":                d["ti_le"],
                "so_tien":              d["comm"],
                "trang_thai":           "doi_soat",
                "is_test":              False,
                "ghi_chu":              ghi_chu,
            })
            comm_total += d["comm"]
            summary[nv_ten]["comm"] += d["comm"]
            summary[nv_ten]["don_hang_c"] += 1

        if d["tour"] > 0:
            records.append({
                "don_hang_id":          dh_id,
                "don_hang_chi_tiet_id": None,
                "nhan_vien_id":         nv_id,
                "loai":                 "tour",
                "nguon":                "myspa_commission",
                "ngay":                 d["ngay"],
                "doanh_so_tinh":        0,
                "ti_le":                0,
                "so_tien":              d["tour"],
                "trang_thai":           "doi_soat",
                "is_test":              False,
                "ghi_chu":              ghi_chu,
            })
            tour_total += d["tour"]
            summary[nv_ten]["tour"] += d["tour"]
            summary[nv_ten]["don_hang_t"] += 1

        summary[nv_ten]["skip"] += skip_count

    print(f"  {nv_ten:<30}: {len(df)} rows | {len(dh_seen)} don | comm={fmt(comm_total):>12} | tour={fmt(tour_total):>12} | skip={skip_count}")

print(f"\n  Tong records can insert: {len(records)}")
if no_match:
    print(f"  Ma don khong tim thay trong DB: {len(no_match)}")
    for m in no_match[:10]: print(f"    {m}")

# ── INSERT ────────────────────────────────────────────
print(f"\n{SEP}")
print(f"INSERTING {len(records)} RECORDS...")
ok, err = 0, 0
for i in range(0, len(records), BATCH):
    batch = records[i:i+BATCH]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/nhan_vien_thu_nhap",
        headers={**H, "Prefer": "return=minimal"},
        json=batch,
    )
    if r.status_code in [200, 201]:
        ok += len(batch)
    else:
        err += len(batch)
        print(f"  LOI batch {i//BATCH+1}: {r.status_code} | {r.text[:200]}")

print(f"  Ket qua: {ok} OK | {err} loi")

# ── KIEM TRA TONG KET ─────────────────────────────────
print(f"\n{SEP}")
print("SO SANH TONG HOP:")
print(f"  {'Ten NV':<30} {'Comm import':>12} {'Tour import':>12} {'DH-C':>6} {'DH-T':>6}")
print(f"  {'-'*72}")
tong_comm = tong_tour = 0
for nv_ten, s in sorted(summary.items(), key=lambda x: -x[1]["comm"]):
    print(f"  {nv_ten:<30} {fmt(s['comm']):>12} {fmt(s['tour']):>12} {s['don_hang_c']:>6} {s['don_hang_t']:>6}")
    tong_comm += s["comm"]
    tong_tour += s["tour"]
print(f"  {'TONG':<30} {fmt(tong_comm):>12} {fmt(tong_tour):>12}")

CHUAN_COMM = 7_516_061
CHUAN_TOUR = 15_549_400
print(f"\n  Chuan (MySpa tong hop): commission={fmt(CHUAN_COMM)} | tour={fmt(CHUAN_TOUR)}")
print(f"  Import chi tiet       : commission={fmt(tong_comm)} | tour={fmt(tong_tour)}")
diff_c = tong_comm - CHUAN_COMM
diff_t = tong_tour - CHUAN_TOUR
if diff_c == 0 and diff_t == 0:
    print("  => KHOP 100% ✓")
else:
    sign_c = "+" if diff_c > 0 else ""
    sign_t = "+" if diff_t > 0 else ""
    print(f"  => LECH: commission={sign_c}{fmt(diff_c)} | tour={sign_t}{fmt(diff_t)}")
    if diff_c != 0:
        print(f"     (co the do {fmt(abs(diff_c))}d thuoc don hang khong tim thay trong DB)")
print(SEP)
