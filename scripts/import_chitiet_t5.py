"""
Fix: Insert chi tiet don hang + thanh_toan bo sung cho T5
loai_item hop le: dich_vu | san_pham | the_lieu_trinh
"""
import requests, pandas as pd, re
from pathlib import Path
from collections import Counter

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
H = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
folder = Path(r"D:\Hannah Spa\Database\Tu 01.05 den 26.05")
BATCH = 50
SEP = "=" * 60

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

def to_str(v):
    s = str(v).strip()
    return None if s in ("nan", "None", "") else s

def pi(x, d=0):
    try:
        s = str(x).strip()
        return d if s in ("nan", "None", "") else int(float(s))
    except:
        return d

def parse_commission(s):
    result = {}
    if not s or str(s).strip() in ("nan", "None", ""):
        return result
    for p in str(s).split("|"):
        p = p.strip()
        if ":" in p:
            try:
                name, amt = p.rsplit(":", 1)
                result[name.strip()] = int(float(amt.strip()))
            except:
                pass
    return result

def extract_the_lt(ghi_chu):
    m = re.search(r"THE-LT-(\d+)", str(ghi_chu) if ghi_chu else "")
    return f"THE-LT-{m.group(1)}" if m else None

# ── MAPPING TABLES ──────────────────────────────────────
print(SEP)
print("BUILD MAPPING TABLES")
kh_list = fetch_all("khach_hang", "select=id,ma_kh")
kh_map  = {x["ma_kh"]: x["id"] for x in kh_list if x.get("ma_kh")}
dv_list = fetch_all("dich_vu", "select=id,ma_dv")
dv_map  = {x["ma_dv"]: x["id"] for x in dv_list if x.get("ma_dv")}
sp_list = fetch_all("kho_san_pham", "select=id,ma_sp")
sp_map  = {x["ma_sp"]: x["id"] for x in sp_list if x.get("ma_sp")}
the_list= fetch_all("the_lieu_trinh", "select=id,ma_the")
the_map = {x["ma_the"]: x["id"] for x in the_list if x.get("ma_the")}
nv_list = fetch_all("nhan_vien", "select=id,ho_ten")
nv_map  = {x["ho_ten"].strip(): x["id"] for x in nv_list}

# Don hang T5 da insert
dh_list = fetch_all("don_hang", "select=id,ma_don&ngay=gte.2026-05-01&ngay=lte.2026-05-26")
dh_map  = {x["ma_don"]: x["id"] for x in dh_list}
print(f"  KH={len(kh_map)} | DV={len(dv_map)} | SP={len(sp_map)} | The={len(the_map)} | NV={len(nv_map)}")
print(f"  Don hang T5 trong DB: {len(dh_map)}")

# Thanh toan da co
tt_existing = fetch_all("thanh_toan", "select=don_hang_id")
tt_done_ids = {x["don_hang_id"] for x in tt_existing}

# PTTT mapping -> enum hop le
PTTT_COLS = {
    "Khach Hang Chuyen Khoan": ("Khách Hàng Chuyển Khoản", "chuyen_khoan"),
    "Kach Quet The":           ("Khách Quẹt Thẻ",          "quet_the"),
    "Tien mat":                ("Tiền mặt",                 "tien_mat"),
    "MOMO":                    ("MOMO",                     "chuyen_khoan"),
    "MPOS":                    ("MPOS (ATM, Visa, Master,...)", "quet_the"),
    "PT khac":                 ("PT khác",                  "tien_mat"),
}

# ── DOC FILE BAN HANG ──────────────────────────────────
df = pd.read_excel(folder / "danh_sach_ban_hang_tat_ca_chi_nhanh_1779852130.xlsx", dtype=str)
df_ok = df[df["Don hang da xoa"].isna() | (df["Don hang da xoa"] == " ")].copy() if "Don hang da xoa" in df.columns else df.copy()
# Dung ten cot goc tieng Viet
col_xoa = "Đơn hàng đã xóa"
if col_xoa in df.columns:
    df_ok = df[(df[col_xoa].isna()) | (df[col_xoa].str.strip() == "")].copy()
else:
    df_ok = df.copy()

print(f"\n  File ban hang: {len(df_ok)} dong | {df_ok['Ma don hang'].nunique() if 'Ma don hang' in df_ok.columns else '?'} don")
# su dung ten cot goc
COL_MADON  = "Mã đơn hàng"
COL_NGAY   = "Ngày giờ"
COL_MADV   = "Mã DV/SP"
COL_TENDV  = "Tên DV/SP"
COL_SL     = "Số lượng"
COL_GIADV  = "Giá DV/SP"
COL_THTDV  = "Thành tiền DV/SP"
COL_THTDH  = "Thành tiền ĐH/TLT"
COL_COMM   = "Commission nhân viên"
COL_GHICHU = "Ghi chú"
COL_NGUOI  = "Được tạo bởi"
COL_CK     = "Khách Hàng Chuyển Khoản"
COL_QT     = "Khách Quẹt Thẻ"
COL_TM     = "Tiền mặt"
COL_MOMO   = "MOMO"
COL_MPOS   = "MPOS (ATM, Visa, Master,...)"
COL_PTKHAC = "PT khác"

ct_payload = []
tt_extra   = []

groups = df_ok.groupby(COL_MADON, sort=False)
for ma_don, grp in groups:
    dh_id = dh_map.get(ma_don)
    if not dh_id:
        continue
    grp = grp.reset_index(drop=True)
    first = grp.iloc[0]

    # Chi tiet tung dong
    for _, row in grp.iterrows():
        ma_dv_sp     = to_str(row.get(COL_MADV))
        ten_dv_sp    = to_str(row.get(COL_TENDV))
        sl           = pi(row.get(COL_SL, 1), 1)
        don_gia      = pi(row.get(COL_GIADV, 0))
        thanh_tien_ct= pi(row.get(COL_THTDV, 0))
        ghi_chu_ct   = to_str(row.get(COL_GHICHU)) or ""

        dich_vu_id = san_pham_id = the_lt_id = None
        loai_item  = "dich_vu"

        if ma_dv_sp and ma_dv_sp.startswith("DV-"):
            dich_vu_id = dv_map.get(ma_dv_sp)
            ma_the_ghi = extract_the_lt(ghi_chu_ct)
            if ma_the_ghi:
                the_lt_id = the_map.get(ma_the_ghi)
                loai_item = "the_lieu_trinh"
            else:
                loai_item = "dich_vu"

        elif ma_dv_sp and ma_dv_sp.startswith("SP-"):
            loai_item  = "san_pham"
            san_pham_id= sp_map.get(ma_dv_sp)

        elif ma_dv_sp and ma_dv_sp.startswith("THE-LT-"):
            loai_item = "the_lieu_trinh"
            the_lt_id = the_map.get(ma_dv_sp)

        else:
            # NaN ma: xem ghi chu co the khong
            ma_the_ghi = extract_the_lt(ghi_chu_ct)
            if ma_the_ghi:
                the_lt_id = the_map.get(ma_the_ghi)
                loai_item = "the_lieu_trinh"
            elif not ten_dv_sp:
                continue  # dong trong, bo qua

        comm      = parse_commission(row.get(COL_COMM))
        tien_comm = sum(comm.values())
        nv_id     = None
        for nv_ten in comm.keys():
            nv_id = nv_map.get(nv_ten)
            if nv_id:
                break

        ct_payload.append({
            "don_hang_id":       dh_id,
            "loai_item":         loai_item,
            "dich_vu_id":        dich_vu_id,
            "san_pham_id":       san_pham_id,
            "the_lieu_trinh_id": the_lt_id,
            "nhan_vien_id":      nv_id,
            "so_luong":          sl,
            "don_gia":           don_gia,
            "thanh_tien":        thanh_tien_ct,
            "ti_le_hoa_hong":    0,
            "tien_hoa_hong":     tien_comm,
            "tien_commission":   tien_comm,
            "ghi_chu":           ghi_chu_ct[:200],
        })

    # Thanh toan bo sung (neu chua co)
    if dh_id not in tt_done_ids:
        for col, (col_name, hinh_thuc) in [
            (COL_CK,    ("CK",   "chuyen_khoan")),
            (COL_QT,    ("QT",   "quet_the")),
            (COL_TM,    ("TM",   "tien_mat")),
            (COL_MOMO,  ("MOMO", "chuyen_khoan")),
            (COL_MPOS,  ("MPOS", "quet_the")),
            (COL_PTKHAC,("PT",   "tien_mat")),
        ]:
            v = pi(first.get(col, 0))
            if v > 0:
                tt_extra.append({"don_hang_id": dh_id, "hinh_thuc": hinh_thuc, "so_tien": v})

print(f"\n  Chi tiet can insert: {len(ct_payload)}")
c = Counter(x["loai_item"] for x in ct_payload)
print(f"  loai_item: {dict(c)}")
print(f"  Thanh toan bo sung : {len(tt_extra)}")

# ── INSERT CHI TIET ─────────────────────────────────────
print(f"\n{SEP}")
print("INSERTING DON_HANG_CHI_TIET...")
ok_ct, err_ct = 0, 0
for i in range(0, len(ct_payload), BATCH):
    batch = ct_payload[i:i+BATCH]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet",
        headers={**H, "Prefer": "return=minimal"},
        json=batch,
    )
    if r.status_code in [200, 201]:
        ok_ct += len(batch)
    else:
        err_ct += len(batch)
        print(f"  LOI batch {i//BATCH+1}: {r.status_code} | {r.text[:150]}")
print(f"  Chi tiet: {ok_ct} OK | {err_ct} loi")

# ── INSERT THANH TOAN BO SUNG ───────────────────────────
print(f"\n{SEP}")
print("INSERTING THANH_TOAN bo sung...")
ok_tt, err_tt = 0, 0
for i in range(0, len(tt_extra), BATCH):
    batch = tt_extra[i:i+BATCH]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/thanh_toan",
        headers={**H, "Prefer": "return=minimal"},
        json=batch,
    )
    if r.status_code in [200, 201]:
        ok_tt += len(batch)
    else:
        err_tt += len(batch)
        print(f"  LOI: {r.status_code} | {r.text[:150]}")
print(f"  Thanh toan: {ok_tt} OK | {err_tt} loi")

# ── TONG KET ────────────────────────────────────────────
print(f"\n{SEP}")
print("TONG KET BUOC 3")
print(f"  Don hang   : {len(dh_map)} / 442")
print(f"  Chi tiet   : {ok_ct} / {len(ct_payload)}")
print(f"  Thanh toan : {169 + ok_tt} tong (169 truoc + {ok_tt} bo sung)")
print(SEP)
