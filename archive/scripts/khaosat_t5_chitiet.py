# -*- coding: utf-8 -*-
"""Kiểm tra chi tiết tình trạng thanh_toan & chi_tiet của đơn tháng 5 trong DB."""
import sys, io, requests, pandas as pd
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
env = {}
for line in Path(".env.import").read_text(encoding='utf-8').splitlines():
    if '=' in line and not line.strip().startswith('#'):
        k, v = line.split('=', 1); env[k.strip()] = v.strip()
URL = env['SUPABASE_URL']; KEY = env['SUPABASE_KEY']
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def fetch_all(table, params=""):
    out, off = [], 0
    while True:
        r = requests.get(f"{URL}/rest/v1/{table}?{params}&limit=1000&offset={off}", headers=H)
        d = r.json() if r.status_code in (200,206) else []
        if not d: break
        out.extend(d)
        if len(d) < 1000: break
        off += 1000
    return out
def pi(x,d=0):
    try:
        s=str(x).strip(); return d if s in ('nan','None','') else int(float(s))
    except: return d

# Lấy đơn T5
dh = fetch_all("don_hang", "select=id,ma_don,ngay,thuc_thu&ngay=gte.2026-05-01&ngay=lte.2026-05-31")
print(f"Đơn T5 trong DB: {len(dh)}")
dh_ids = [x['id'] for x in dh]
dh_by_id = {x['id']: x for x in dh}

# Thanh toán cho các đơn T5
tt = fetch_all("thanh_toan", "select=don_hang_id,hinh_thuc,so_tien")
tt_t5 = [x for x in tt if x['don_hang_id'] in set(dh_ids)]
print(f"Tổng thanh_toan DB: {len(tt)} | của đơn T5: {len(tt_t5)}")
don_co_tt = set(x['don_hang_id'] for x in tt_t5)
print(f"Số đơn T5 CÓ thanh_toan: {len(don_co_tt)} | THIẾU thanh_toan: {len(dh)-len(don_co_tt)}")
from collections import defaultdict
by_ht = defaultdict(int)
for x in tt_t5: by_ht[x['hinh_thuc']] += pi(x['so_tien'])
print("Thanh toán T5 theo hình thức (DB):")
for k,v in sorted(by_ht.items()): print(f"  {k:16}: {v:>14,}đ")
print(f"  {'TỔNG':16}: {sum(by_ht.values()):>14,}đ")

# Chi tiết
ct = fetch_all("don_hang_chi_tiet", "select=don_hang_id,loai_item,tien_commission")
ct_t5 = [x for x in ct if x['don_hang_id'] in set(dh_ids)]
print(f"\nChi tiết của đơn T5: {len(ct_t5)}")
don_co_ct = set(x['don_hang_id'] for x in ct_t5)
print(f"Đơn T5 CÓ chi tiết: {len(don_co_ct)} | THIẾU: {len(dh)-len(don_co_ct)}")
comm_t5 = sum(pi(x.get('tien_commission')) for x in ct_t5)
print(f"Tổng commission ghi trong chi tiết T5: {comm_t5:,}đ")
by_loai = defaultdict(int)
for x in ct_t5: by_loai[x['loai_item']] += 1
print("Chi tiết theo loại:", dict(by_loai))

# bang_luong tháng 5 (commission)
bl = fetch_all("bang_luong", "select=nhan_vien_id,thang,nam,hoa_hong_dv,hoa_hong_the,tien_tour,tong_linh&thang=eq.5&nam=eq.2026")
print(f"\nbang_luong T5/2026: {len(bl)} bản ghi")
for b in bl:
    print(f"  NV {b['nhan_vien_id'][:8]} | HHdv={pi(b['hoa_hong_dv']):,} | HHthe={pi(b['hoa_hong_the']):,} | tour={pi(b['tien_tour']):,}")
