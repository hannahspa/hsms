import os
"""
Buoc 4: Cap nhat commission T5 vao bang_luong
- hoa_hong_dv = commission tu dich vu (% theo doanh thu)
- tien_tour   = tien tour NV
"""
import requests, pandas as pd
from pathlib import Path

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
H = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
folder = Path(r"D:\Hannah Spa\Database\Tu 01.05 den 26.05")
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

def pi(x, d=0):
    try:
        s = str(x).strip()
        return d if s in ("nan", "None", "") else int(float(s))
    except:
        return d

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".")
    except: return str(n)

# NV mapping
nv_list = fetch_all("nhan_vien", "select=id,ho_ten")
nv_map  = {x["ho_ten"].strip(): x["id"] for x in nv_list}

# Bang luong T5 hien tai
bl_list = fetch_all("bang_luong", "select=id,nhan_vien_id,hoa_hong_dv,tien_tour&thang=eq.5&nam=eq.2026")
bl_map  = {x["nhan_vien_id"]: x for x in bl_list}
print(f"Bang luong T5 trong DB: {len(bl_list)} records")
for bl in bl_list:
    nv_ten = next((x["ho_ten"] for x in nv_list if x["id"] == bl["nhan_vien_id"]), "?")
    print(f"  {nv_ten}: hoa_hong={fmt(bl.get('hoa_hong_dv',0))} | tour={fmt(bl.get('tien_tour',0))}")

# Doc file commission
df = pd.read_excel(folder / "danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx", dtype=str)
df = df.dropna(subset=["Ten nhan vien"] if "Ten nhan vien" in df.columns else ["Tên nhân viên"])
COL_TEN   = "Tên nhân viên"
COL_COMM  = "commission (%) tổng đơn hàng "
COL_TOUR  = "Tổng tiền tour NV"

print(f"\n{SEP}")
print("COMMISSION FILE:")
updates, inserts = [], []

for _, row in df.iterrows():
    ten = str(row.get(COL_TEN, "")).strip()
    if not ten or ten == "nan": continue
    comm = pi(row.get(COL_COMM, 0))
    tour = pi(row.get(COL_TOUR, 0))
    if comm == 0 and tour == 0: continue

    nv_id = nv_map.get(ten)
    if not nv_id:
        print(f"  WARN: Khong tim thay NV: {ten}")
        continue

    print(f"  {ten}: commission={fmt(comm)} | tour={fmt(tour)}")

    if nv_id in bl_map:
        # Update record da co
        updates.append({
            "id":        bl_map[nv_id]["id"],
            "nv_ten":    ten,
            "nv_id":     nv_id,
            "hoa_hong_dv": comm,
            "tien_tour":   tour,
        })
    else:
        # Insert record moi
        inserts.append({
            "nv_ten":    ten,
            "nv_id":     nv_id,
            "hoa_hong_dv": comm,
            "tien_tour":   tour,
        })

print(f"\n  Update: {len(updates)} NV | Insert moi: {len(inserts)} NV")

# PATCH tung record
print(f"\n{SEP}")
print("PATCH bang_luong...")
ok_u, err_u = 0, 0
for u in updates:
    bl_id = u["id"]
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/bang_luong?id=eq.{bl_id}",
        headers={**H, "Prefer": "return=minimal"},
        json={"hoa_hong_dv": u["hoa_hong_dv"], "tien_tour": u["tien_tour"]},
    )
    if r.status_code in [200, 201, 204]:
        ok_u += 1
        print(f"  PATCH {u['nv_ten']}: OK")
    else:
        err_u += 1
        print(f"  PATCH {u['nv_ten']}: LOI {r.status_code} | {r.text[:100]}")

# INSERT record moi
ok_i, err_i = 0, 0
for ins in inserts:
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/bang_luong",
        headers={**H, "Prefer": "return=minimal"},
        json={
            "nhan_vien_id": ins["nv_id"],
            "thang":        5,
            "nam":          2026,
            "hoa_hong_dv":  ins["hoa_hong_dv"],
            "tien_tour":    ins["tien_tour"],
            "luong_co_ban": 0,
            "tong_linh":    0,
        },
    )
    if r.status_code in [200, 201]:
        ok_i += 1
        print(f"  INSERT {ins['nv_ten']}: OK")
    else:
        err_i += 1
        print(f"  INSERT {ins['nv_ten']}: LOI {r.status_code} | {r.text[:100]}")

print(f"\n{SEP}")
print("TONG KET BUOC 4")
print(f"  Update: {ok_u}/{len(updates)} | Insert: {ok_i}/{len(inserts)}")

# Kiem tra lai
bl_after = fetch_all("bang_luong", "select=nhan_vien_id,hoa_hong_dv,tien_tour&thang=eq.5&nam=eq.2026&order=hoa_hong_dv.desc")
print(f"\n  Bang luong T5 sau khi cap nhat ({len(bl_after)} NV):")
for bl in bl_after:
    nv_ten = next((x["ho_ten"] for x in nv_list if x["id"] == bl["nhan_vien_id"]), "?")
    print(f"    {nv_ten:<30} commission={fmt(bl.get('hoa_hong_dv',0)):>12} | tour={fmt(bl.get('tien_tour',0)):>12}")
tong_comm = sum(bl.get("hoa_hong_dv", 0) or 0 for bl in bl_after)
tong_tour = sum(bl.get("tien_tour", 0) or 0 for bl in bl_after)
print(f"    {'TONG':<30} commission={fmt(tong_comm):>12} | tour={fmt(tong_tour):>12}")
print(SEP)
