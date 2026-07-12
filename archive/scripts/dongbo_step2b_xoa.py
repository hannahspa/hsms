# -*- coding: utf-8 -*-
"""STEP 2B — Xóa SẠCH toàn bộ đơn T5 (con trước, cha sau), adaptive chunk + retry."""
import sys, io, json, time, requests
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
APPLY = '--apply' in sys.argv
env = {}
for l in Path(".env.import").read_text(encoding='utf-8').splitlines():
    if '=' in l and not l.strip().startswith('#'):
        k, v = l.split('=', 1); env[k.strip()] = v.strip()
URL = env['SUPABASE_URL']; KEY = env['SUPABASE_KEY']
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

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

ids = [x['id'] for x in fetch_all("don_hang","select=id&ngay=gte.2026-05-01&ngay=lte.2026-05-31")]
print(f"Đơn T5 cần xóa: {len(ids)}")

# Backup nếu chưa có
BK = Path("scripts/backup_donhang_t5_full.json")
if not BK.exists():
    print("Backup...")
    old = fetch_all("don_hang","select=*&ngay=gte.2026-05-01&ngay=lte.2026-05-31")
    ct, tt = [], []
    for i in range(0, len(ids), 50):
        inl = ",".join(ids[i:i+50])
        ct += fetch_all("don_hang_chi_tiet", f"select=*&don_hang_id=in.({inl})")
        tt += fetch_all("thanh_toan", f"select=*&don_hang_id=in.({inl})")
    BK.write_text(json.dumps({"don_hang":old,"chi_tiet":ct,"thanh_toan":tt},ensure_ascii=False,default=str),encoding='utf-8')
    print(f"  Backup {len(old)} đơn + {len(ct)} CT + {len(tt)} TT -> {BK}")

if not APPLY:
    print("DRY RUN. Thêm --apply để xóa."); sys.exit(0)

def del_chunked(table, id_list, label):
    total = 0; i = 0; chunk = 80
    while i < len(id_list):
        sub = id_list[i:i+chunk]; inl = ",".join(sub)
        t = time.time()
        r = requests.delete(f"{URL}/rest/v1/{table}?don_hang_id=in.({inl})", headers={**H,"Prefer":"return=minimal"}, timeout=120)
        dt = time.time()-t
        if r.ok:
            total += len(sub); i += chunk
            print(f"  {label}: {i}/{len(id_list)} ({dt:.1f}s, chunk {chunk})")
            if dt < 3 and chunk < 120: chunk = min(120, chunk+20)
        elif r.status_code == 500 and chunk > 10:
            chunk = max(10, chunk//2); print(f"  {label}: timeout, giảm chunk -> {chunk}")
        else:
            print(f"  {label} LỖI {r.status_code}: {r.text[:150]}"); i += chunk
    return total

print("\n[1] Xóa thanh_toan...")
del_chunked("thanh_toan", ids, "TT")
print("[2] Xóa don_hang_chi_tiet...")
del_chunked("don_hang_chi_tiet", ids, "CT")
print("[3] Xóa don_hang (theo id, đã hết con)...")
# don_hang xóa theo id (cột id, không phải don_hang_id)
i = 0; chunk = 80; done = 0
while i < len(ids):
    sub = ids[i:i+chunk]; inl = ",".join(sub)
    t = time.time()
    r = requests.delete(f"{URL}/rest/v1/don_hang?id=in.({inl})", headers={**H,"Prefer":"return=minimal"}, timeout=120)
    dt = time.time()-t
    if r.ok:
        done += len(sub); i += chunk; print(f"  DH: {i}/{len(ids)} ({dt:.1f}s, chunk {chunk})")
        if dt < 3 and chunk < 120: chunk = min(120, chunk+20)
    elif r.status_code == 500 and chunk > 10:
        chunk = max(10, chunk//2); print(f"  DH timeout, giảm chunk -> {chunk}")
    else:
        print(f"  DH LỖI {r.status_code}: {r.text[:150]}"); i += chunk

# Kiểm tra còn lại
left = len(fetch_all("don_hang","select=id&ngay=gte.2026-05-01&ngay=lte.2026-05-31"))
print(f"\n✅ Đơn T5 còn lại: {left}")
