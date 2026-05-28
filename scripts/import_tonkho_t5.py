"""
Buoc 5: Cap nhat ton kho thuc te tu 2 file xuat_can_ton_kho
Dung cot "Ton kho can can bang" lam gia tri thuc te
"""
import requests, pandas as pd
from pathlib import Path

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"
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

# Doc 2 file kho, merge theo ma_sp (dedup, file 2 uu tien)
df1 = pd.read_excel(folder / "xuat_can_ton_kho_kho_tong_1779852268.xlsx", dtype=str)
df2 = pd.read_excel(folder / "xuat_can_ton_kho_kho_tong_1779852301.xlsx", dtype=str)
df_all = pd.concat([df2, df1]).drop_duplicates(subset=["Ma SP"] if "Ma SP" in df1.columns else ["Mã SP"], keep="first")

COL_MA    = "Mã SP"
COL_TEN   = "Tên sản phẩm"
COL_TON_HT= "Tồn kho hiện tại"
COL_TON_CB= "Tồn kho cần cân bằng"

print(SEP)
print(f"File kho_1: {len(df1)} SP | File kho_2: {len(df2)} SP | Sau dedup: {len(df_all)} SP")

# Lay mapping ma_sp -> id tu DB
sp_list = fetch_all("kho_san_pham", "select=id,ma_sp,ten,ton_kho")
sp_map  = {x["ma_sp"]: x for x in sp_list if x.get("ma_sp")}
print(f"SP trong DB: {len(sp_map)}")

# Cap nhat ton kho
print(f"\n{SEP}")
print("CAP NHAT TON KHO...")
ok, err, skip, no_change = 0, 0, 0, 0

for _, row in df_all.iterrows():
    ma_sp = str(row.get(COL_MA, "")).strip()
    if not ma_sp or ma_sp == "nan":
        skip += 1
        continue

    sp = sp_map.get(ma_sp)
    if not sp:
        print(f"  WARN: SP {ma_sp} ({str(row.get(COL_TEN,''))[:30]}) khong co trong DB")
        skip += 1
        continue

    ton_cb  = pi(row.get(COL_TON_CB, 0))
    ton_ht  = pi(row.get(COL_TON_HT, 0))
    # Uu tien "can can bang", fallback sang "hien tai"
    ton_moi = ton_cb if ton_cb >= 0 else ton_ht

    ton_cu  = sp.get("ton_kho", 0) or 0
    if ton_moi == ton_cu:
        no_change += 1
        continue

    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/kho_san_pham?id=eq.{sp['id']}",
        headers={**H, "Prefer": "return=minimal"},
        json={"ton_kho": ton_moi},
    )
    if r.status_code in [200, 201, 204]:
        ok += 1
        if ton_moi > 0:
            print(f"  OK {ma_sp} ({str(row.get(COL_TEN,''))[:25]}): {ton_cu} -> {ton_moi}")
    else:
        err += 1
        print(f"  LOI {ma_sp}: {r.status_code} | {r.text[:80]}")

print(f"\n{SEP}")
print("TONG KET BUOC 5")
print(f"  Cap nhat OK  : {ok}")
print(f"  Khong thay doi: {no_change}")
print(f"  Bo qua / loi : {skip} / {err}")

# Kiem tra sau khi update: SP co ton kho > 0
sp_after = fetch_all("kho_san_pham", "select=ma_sp,ten,ton_kho,loai&ton_kho=gt.0&order=ton_kho.desc")
print(f"\n  SP co ton kho > 0 ({len(sp_after)} SP):")
for sp in sp_after[:20]:
    print(f"    {sp['ma_sp']} | {sp['ten'][:35]:<35} | {sp['loai']:<12} | ton={sp['ton_kho']}")
if len(sp_after) > 20:
    print(f"    ... va {len(sp_after)-20} SP khac")
print(SEP)
