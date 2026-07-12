# -*- coding: utf-8 -*-
"""STEP 5 (data) — Đổ doanh thu POS vào bảng doanh_thu (giống RPC pos_finalize).
1. Backup + xóa 73 doanh_thu T5 nguon='manual' (nhập tay cũ, trùng POS)
2. Tạo doanh_thu nguon='pos' từ thanh_toan POS T5 (tien_mat/chuyen_khoan/quet_the)
   - dien_giai='POS '||ma_don, don_hang_id, nguon='pos'
Chạy:  python ...py           -> DRY RUN
       python ...py --apply    -> ghi DB
"""
import sys, io, json, requests
from pathlib import Path
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
APPLY = '--apply' in sys.argv
env = {}
for l in Path(".env.import").read_text(encoding='utf-8').splitlines():
    if '=' in l and not l.strip().startswith('#'):
        k, v = l.split('=', 1); env[k.strip()] = v.strip()
URL = env['SUPABASE_URL']; KEY = env['SUPABASE_KEY']
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
JH = {**H, "Content-Type": "application/json"}

def fetch_all(table, params=""):
    out, off = [], 0
    while True:
        r = requests.get(f"{URL}/rest/v1/{table}?{params}&limit=1000&offset={off}", headers=H, timeout=120)
        d = r.json() if r.status_code in (200,206) else []
        if not d: break
        out.extend(d)
        if len(d) < 1000: break
        off += 1000
    return out
def pi(x):
    try: return int(float(str(x)))
    except: return 0

print("="*60); print(f"STEP 5 — ĐỔ DOANH THU POS {'(APPLY)' if APPLY else '(DRY RUN)'}"); print("="*60)

# Đơn T5: id -> (ma_don, ngay)
dh = fetch_all("don_hang", "select=id,ma_don,ngay&ngay=gte.2026-05-01&ngay=lte.2026-05-31")
dhmap = {x['id']: x for x in dh}
ids = list(dhmap.keys())
# Thanh toán POS (3 loại tiền thật)
tt = []
for i in range(0, len(ids), 60):
    inl = ",".join(ids[i:i+60])
    tt += fetch_all("thanh_toan", f"select=id,don_hang_id,hinh_thuc,so_tien&don_hang_id=in.({inl})")
tt3 = [x for x in tt if x['hinh_thuc'] in ('tien_mat','chuyen_khoan','quet_the')]
print(f"Đơn T5: {len(dh)} | Thanh toán 3 loại: {len(tt3)} (bỏ the_tra_truoc/the_lieu_trinh)")
by_ht = defaultdict(int)
for x in tt3: by_ht[x['hinh_thuc']] += pi(x['so_tien'])
for k,v in sorted(by_ht.items()): print(f"   {k:14}: {v:>14,}đ")
print(f"   {'TỔNG POS':14}: {sum(by_ht.values()):>14,}đ")

# doanh_thu manual T5 hiện có
old = fetch_all("doanh_thu", "select=*&ngay=gte.2026-05-01&ngay=lte.2026-05-31")
print(f"\ndoanh_thu T5 hiện có: {len(old)} (tổng {sum(pi(x['so_tien']) for x in old):,}đ) — sẽ XÓA & thay POS")

if not APPLY:
    print("\nDRY RUN. Thêm --apply để ghi."); sys.exit(0)

# Backup
BK = Path("scripts/backup_doanhthu_t5_manual.json")
BK.write_text(json.dumps(old, ensure_ascii=False, default=str), encoding='utf-8')
print(f"Backup {len(old)} doanh_thu -> {BK}")

# Xóa manual T5
del_ok = 0
for i in range(0, len(old), 100):
    ids_del = [x['id'] for x in old[i:i+100]]
    inl = ",".join(ids_del)
    r = requests.delete(f"{URL}/rest/v1/doanh_thu?id=in.({inl})", headers={**H,"Prefer":"return=minimal"}, timeout=120)
    if r.ok: del_ok += len(ids_del)
    else: print("  Lỗi xóa:", r.status_code, r.text[:150])
print(f"Đã xóa {del_ok} doanh_thu manual")

# Tạo doanh_thu pos
recs = []
for x in tt3:
    d = dhmap[x['don_hang_id']]
    recs.append({
        "ngay": d['ngay'], "hinh_thuc": x['hinh_thuc'], "so_tien": pi(x['so_tien']),
        "dien_giai": f"POS {d['ma_don']}", "nguoi_nhap": "MySpa import",
        "don_hang_id": x['don_hang_id'], "nguon": "pos",
    })
ok = 0
for i in range(0, len(recs), 100):
    batch = recs[i:i+100]
    r = requests.post(f"{URL}/rest/v1/doanh_thu", headers={**JH,"Prefer":"return=minimal"}, json=batch, timeout=120)
    if r.status_code in (200,201): ok += len(batch)
    else: print(f"  Lỗi insert batch {i//100+1}: {r.status_code} {r.text[:200]}")
print(f"Đã tạo {ok}/{len(recs)} doanh_thu nguon='pos'")

# Verify
new = fetch_all("doanh_thu", "select=so_tien,hinh_thuc,nguon&ngay=gte.2026-05-01&ngay=lte.2026-05-31")
print(f"\ndoanh_thu T5 sau: {len(new)} records, tổng {sum(pi(x['so_tien']) for x in new):,}đ")
print("✅ HOÀN TẤT STEP 5 (data)")
