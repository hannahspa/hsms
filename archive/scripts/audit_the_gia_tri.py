import os
"""Xem các ten_dich_vu trong the_lieu_trinh vs dich_vu để chuẩn bị fix gia_tri_the"""
import sys, io, requests
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY  = os.environ["SUPABASE_KEY"]
H = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}

def fetch(table, select, filter_str="", limit=100000):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit={limit}"
    if filter_str:
        url += f"&{filter_str}"
    r = requests.get(url, headers=H, timeout=60)
    return r.json() if r.status_code == 200 else []

# Lấy thẻ có gia_tri_the = 0
the_zero = fetch("the_lieu_trinh", "id,ten_dich_vu,so_buoi_tong,gia_tri_the", "gia_tri_the=eq.0", limit=10000)

# Đếm theo ten_dich_vu
by_ten = defaultdict(lambda: {"count": 0, "buoi_list": []})
for t in the_zero:
    ten = t.get("ten_dich_vu") or "(trống)"
    by_ten[ten]["count"] += 1
    by_ten[ten]["buoi_list"].append(t.get("so_buoi_tong") or 0)

# Lấy tất cả dịch vụ
dv_all = fetch("dich_vu", "id,ten,gia_co_ban,ti_le_hoa_hong,danh_muc", "is_active=eq.true")
dv_map = {d["ten"]: d for d in dv_all}

print(f"Tổng dịch vụ trong DB: {len(dv_all)}")
print(f"Tổng thẻ gia_tri_the=0: {len(the_zero)}")
print(f"Số loại tên dịch vụ: {len(by_ten)}\n")

print(f"{'Tên DV trong thẻ':<50} {'Số thẻ':>7} {'Buổi TB':>8} {'Giá cơ bản':>12} {'Match?'}")
print("-"*95)

matched = 0
unmatched = 0
for ten, info in sorted(by_ten.items(), key=lambda x: -x[1]["count"]):
    cnt = info["count"]
    buoi_avg = round(sum(info["buoi_list"]) / len(info["buoi_list"])) if info["buoi_list"] else 0
    dv = dv_map.get(ten)
    if dv:
        gia = dv.get("gia_co_ban") or 0
        matched += cnt
        print(f"  {ten:<50} {cnt:>7} {buoi_avg:>8} {gia:>12,.0f}  ✓ MATCH")
    else:
        # Fuzzy search
        lower_ten = ten.lower()
        candidates = [d for d in dv_all if lower_ten[:20] in d["ten"].lower() or d["ten"].lower()[:20] in lower_ten]
        unmatched += cnt
        cand_str = candidates[0]["ten"][:40] if candidates else "—"
        cand_gia  = f"{candidates[0]['gia_co_ban']:,.0f}" if candidates else "—"
        print(f"  {ten:<50} {cnt:>7} {buoi_avg:>8} {'?':>12}  ✗ (gần: {cand_str}, {cand_gia})")

print(f"\nMatch được: {matched}/{len(the_zero)} ({matched*100//len(the_zero) if the_zero else 0}%)")
print(f"Không match: {unmatched}")
