# -*- coding: utf-8 -*-
"""STEP 2 — Import lại SẠCH toàn bộ đơn hàng tháng 5 từ MySpa.
1. Backup 442 đơn T5 (đơn+chi tiết+thanh toán) ra JSON
2. Xóa đơn T5 (CASCADE chi tiết + thanh toán)
3. Import lại 518 đơn từ file MySpa, map đúng loai_item + commission + thanh toán

Chạy:  python dongbo_step2_donhang.py           -> DRY RUN
       python dongbo_step2_donhang.py --apply   -> backup + xóa + import thật
"""
import sys, io, json, re, time, requests, pandas as pd
from pathlib import Path
from datetime import datetime
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
folder = Path(r"D:\Hannah Spa\Database\Data Thang 05")
FILE = folder / "danh_sach_ban_hang_tat_ca_chi_nhanh_1780241752.xlsx"
BACKUP = Path("scripts/backup_donhang_t5_20260531.json")

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

def to_str(v):
    s = str(v).strip()
    return None if s in ('nan','None','','NaT') else s
def pi(x, d=0):
    try:
        s = str(x).strip(); return d if s in ('nan','None','') else int(float(s))
    except: return d
def parse_dt(x):
    s = to_str(x)
    if not s: return None
    if '/' in s:
        p = s.split(' '); dp = p[0].split('/')
        d,m,y = dp[0].strip(), dp[1].strip(), dp[2].strip()
        tp = p[1] if len(p)>1 else '00:00:00'
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}T{tp}"
    return s.replace(' ','T')
def parse_date(x):
    dt = parse_dt(x); return dt[:10] if dt else None
def parse_comm(s):
    res = {}
    if not s or str(s).strip() in ('nan','None',''): return res
    for p in str(s).split('|'):
        p = p.strip()
        if ':' in p:
            try:
                n,a = p.rsplit(':',1); res[n.strip()] = int(float(a.strip()))
            except: pass
    return res
def extract_the(g):
    if not g: return None
    m = re.search(r'THE-LT-(\d+)', str(g))
    return f"THE-LT-{m.group(1)}" if m else None

# ── MAPPING ──
print("="*64); print(f"STEP 2 — IMPORT LẠI ĐƠN T5 {'(APPLY)' if APPLY else '(DRY RUN)'}"); print("="*64)
kh = {x['ma_kh']: x['id'] for x in fetch_all("khach_hang","select=id,ma_kh") if x.get('ma_kh')}
dv = {x['ma_dv']: x['id'] for x in fetch_all("dich_vu","select=id,ma_dv") if x.get('ma_dv')}
sp = {x['ma_sp']: x['id'] for x in fetch_all("kho_san_pham","select=id,ma_sp") if x.get('ma_sp')}
the = {x['ma_the']: x['id'] for x in fetch_all("the_lieu_trinh","select=id,ma_the") if x.get('ma_the')}
nv_rows = fetch_all("nhan_vien","select=id,ho_ten")
nv = {x['ho_ten'].strip(): x['id'] for x in nv_rows}
print(f"Map: KH {len(kh)} | DV {len(dv)} | SP {len(sp)} | Thẻ {len(the)} | NV {len(nv)}")

# ── PARSE FILE ──
df = pd.read_excel(FILE, dtype=str)
df_ok = df[df['Đơn hàng đã xóa'].isna() | (df['Đơn hàng đã xóa'].str.strip()=='')].copy()
PTTT_MAP = {
    'Khách Hàng Chuyển Khoản':'chuyen_khoan', 'MOMO':'chuyen_khoan',
    'PAYON (QR Code)':'chuyen_khoan', 'TINGBOX (QR Code)':'chuyen_khoan',
    'Khách Quẹt Thẻ':'quet_the', 'MPOS (ATM, Visa, Master,...)':'quet_the',
    'Tiền mặt':'tien_mat', 'PT khác':'tien_mat',
}
don_records, ct_records, tt_records = [], [], []
stat_loai = defaultdict(int); unmatched_dv = set(); unmatched_sp = set(); nv_miss = set()
skip = 0
for ma_don, grp in df_ok.groupby('Mã đơn hàng', sort=False):
    grp = grp.reset_index(drop=True); first = grp.iloc[0]
    ngay = parse_date(first['Ngày giờ'])
    if not ngay: skip += 1; continue
    ma_kh = to_str(first['Mã khách hàng'])
    kh_id = kh.get(ma_kh) if ma_kh else None
    # PTTT từ dòng đầu
    pttt = defaultdict(int)
    for col, ht in PTTT_MAP.items():
        v = pi(first.get(col, 0))
        if v > 0: pttt[ht] += v
    thuc_thu = sum(pttt.values())
    tong_hang = sum(pi(r['Giá DV/SP']) * pi(r['Số lượng'],1) for _,r in grp.iterrows())
    giam = sum(pi(r['Chiết khấu DV/SP']) for _,r in grp.iterrows()) + pi(first['Chiết khấu ĐH/TLT'])
    thanh_tien_dh = pi(first['Thành tiền ĐH/TLT'])
    ghi_chu = to_str(first['Ghi chú']) or ''
    don_records.append({
        "ma_don": ma_don, "khach_hang_id": kh_id, "ngay": ngay,
        "tong_tien_hang": tong_hang, "giam_gia": giam, "thuc_thu": thuc_thu,
        "con_no": 0, "trang_thai": "da_thanh_toan",
        "ghi_chu": (f"[MySpa T5] Thành tiền ĐH/TLT={thanh_tien_dh}. " + ghi_chu)[:300],
        "is_test": False,
    })
    # Chi tiết
    for _, row in grp.iterrows():
        ma = to_str(row.get('Mã DV/SP'))
        ten = to_str(row.get('Tên DV/SP'))
        sl = pi(row.get('Số lượng',1),1)
        gia = pi(row.get('Giá DV/SP',0))
        tt_ct = pi(row.get('Thành tiền DV/SP',0))
        gc = to_str(row.get('Ghi chú')) or ''
        dv_id = sp_id = the_id = None; loai = 'dich_vu'
        the_note = extract_the(gc)
        if ma and ma.startswith('DV-'):
            dv_id = dv.get(ma)
            if not dv_id: unmatched_dv.add(ma)
            if gia == 0 and the_note:
                loai = 'the_lieu_trinh'; the_id = the.get(the_note)
            else:
                loai = 'dich_vu'
        elif ma and ma.startswith('SP-'):
            loai = 'san_pham'; sp_id = sp.get(ma)
            if not sp_id: unmatched_sp.add(ma)
        elif ma and ma.startswith('THE-LT-'):
            loai = 'the_moi'; the_id = the.get(ma)
        else:
            if the_note:
                loai = 'the_lieu_trinh'; the_id = the.get(the_note)
                ten = ten or gc[:50]
            else:
                # Dòng không mã/tên: phân loại theo ghi chú
                gcl = gc.lower()
                if 'thẻ liệu trình' in gcl or 'the lieu trinh' in gcl or 'sử dụng thẻ' in gcl:
                    loai = 'the_lieu_trinh'
                else:
                    loai = 'dich_vu'
                if not ten: ten = (gc[:50] or 'Dịch vụ thực hiện')
        comm = parse_comm(row.get('Commission nhân viên'))
        tien_comm = sum(comm.values())
        # Chỉ bỏ dòng hoàn toàn rỗng (không tên, không mã, KHÔNG commission)
        if not ten and not ma and tien_comm == 0: continue
        # Tách bản ghi theo TỪNG NV có commission (để phân bổ đúng người).
        # Dòng đầu giữ thanh_tien/don_gia/so_luong; bản phụ chỉ ghi commission.
        comm_items = [(n, v) for n, v in comm.items() if v != 0]
        if not comm_items:
            comm_items = [(None, 0)]  # dòng không commission (dùng thẻ/bán không KTV)
        for idx, (nvt, ctien) in enumerate(comm_items):
            nv_id = nv.get(nvt) if nvt else None
            if nvt and not nv_id: nv_miss.add(nvt)
            rec = {
                "ma_don": ma_don, "loai_item": loai,
                "dich_vu_id": dv_id, "san_pham_id": sp_id, "the_lieu_trinh_id": the_id,
                "nhan_vien_id": nv_id,
                "so_luong": sl if idx == 0 else 1,
                "don_gia": gia if idx == 0 else 0,
                "thanh_tien": tt_ct if idx == 0 else 0,
                "ti_le_hoa_hong": 0, "ghi_chu": gc[:200],
                "meta": {"commission": comm} if (idx == 0 and comm) else {},
            }
            if loai in ('dich_vu','the_lieu_trinh'):
                rec["tien_tour"] = ctien; rec["tien_commission"] = 0
            else:
                rec["tien_commission"] = ctien; rec["tien_tour"] = 0
            ct_records.append(rec); stat_loai[loai] += 1
    # Thanh toán
    for ht, st in pttt.items():
        if st > 0:
            tt_records.append({"ma_don": ma_don, "hinh_thuc": ht, "so_tien": st})

print(f"\nĐơn: {len(don_records)} | Chi tiết: {len(ct_records)} | Thanh toán: {len(tt_records)} | Bỏ qua: {skip}")
print(f"Loại chi tiết: {dict(stat_loai)}")
print(f"Tổng thực thu (PTTT): {sum(d['thuc_thu'] for d in don_records):,}đ")
tong_tt = defaultdict(int)
for t in tt_records: tong_tt[t['hinh_thuc']] += t['so_tien']
print("Thanh toán theo hình thức:")
for k,v in sorted(tong_tt.items()): print(f"   {k:14}: {v:>14,}đ")
print(f"   {'TỔNG':14}: {sum(tong_tt.values()):>14,}đ")
if unmatched_dv: print(f"⚠️ DV không map ({len(unmatched_dv)}):", list(unmatched_dv)[:10])
if unmatched_sp: print(f"⚠️ SP không map ({len(unmatched_sp)}):", list(unmatched_sp)[:10])
if nv_miss: print(f"⚠️ NV không map ({len(nv_miss)}):", list(nv_miss))

# Verify commission per NV (mô phỏng VIEW: tour+commission gộp = tổng thu nhập)
id2ten = {v: k for k, v in nv.items()}
comm_nv = defaultdict(int)
for ct in ct_records:
    comm_nv[ct['nhan_vien_id']] += ct.get('tien_tour',0) + ct.get('tien_commission',0)
print("\nCommission/tour per NV (sẽ ghi DB):")
for nid, tong in sorted(comm_nv.items(), key=lambda x:-x[1]):
    if tong == 0: continue
    print(f"   {id2ten.get(nid, str(nid)[:10] if nid else 'KHÔNG NV'):28} {tong:>12,}đ")
print(f"   {'TỔNG':28} {sum(comm_nv.values()):>12,}đ")

if not APPLY:
    print("\nDRY RUN — chưa xóa/ghi gì. Thêm --apply để thực thi."); sys.exit(0)

INSERT_ONLY = '--insert-only' in sys.argv
if INSERT_ONLY:
    print("\n--- INSERT-ONLY: bỏ qua backup & xóa (đã làm ở step2b) ---")
    id_map = {}; BATCH = 50
    ok = 0
    for i in range(0, len(don_records), BATCH):
        batch = don_records[i:i+BATCH]
        r = requests.post(f"{URL}/rest/v1/don_hang", headers={**JH,"Prefer":"return=representation"}, json=batch, timeout=120)
        if r.status_code in (200,201):
            for rec in r.json(): id_map[rec['ma_don']] = rec['id']
            ok += len(batch)
        else:
            print(f"  Lỗi đơn batch {i//BATCH+1}: {r.status_code} {r.text[:200]}")
    print(f"Đơn: {ok}/{len(don_records)} | mapped {len(id_map)}")
    ctp = []
    for ct in ct_records:
        md = ct.pop('ma_don'); did = id_map.get(md)
        if not did: continue
        ct['don_hang_id'] = did; ctp.append(ct)
    okc = 0
    for i in range(0, len(ctp), BATCH):
        batch = ctp[i:i+BATCH]
        r = requests.post(f"{URL}/rest/v1/don_hang_chi_tiet", headers={**JH,"Prefer":"return=minimal"}, json=batch, timeout=120)
        if r.status_code in (200,201): okc += len(batch)
        else: print(f"  Lỗi CT batch {i//BATCH+1}: {r.status_code} {r.text[:250]}")
    print(f"Chi tiết: {okc}/{len(ctp)}")
    ttp = []
    for tt in tt_records:
        md = tt.pop('ma_don'); did = id_map.get(md)
        if not did: continue
        tt['don_hang_id'] = did; ttp.append(tt)
    okt = 0
    for i in range(0, len(ttp), BATCH):
        batch = ttp[i:i+BATCH]
        r = requests.post(f"{URL}/rest/v1/thanh_toan", headers={**JH,"Prefer":"return=minimal"}, json=batch, timeout=120)
        if r.status_code in (200,201): okt += len(batch)
        else: print(f"  Lỗi TT batch {i//BATCH+1}: {r.status_code} {r.text[:250]}")
    print(f"Thanh toán: {okt}/{len(ttp)}")
    print("\n✅ HOÀN TẤT INSERT-ONLY"); sys.exit(0)

# ── BACKUP ──
print("\n--- BACKUP đơn T5 hiện tại ---")
old = fetch_all("don_hang","select=*&ngay=gte.2026-05-01&ngay=lte.2026-05-31")
old_ids = [x['id'] for x in old]
old_ct, old_tt = [], []
# lấy chi tiết & thanh toán theo batch id
for i in range(0, len(old_ids), 50):
    chunk = old_ids[i:i+50]
    inlist = ",".join(chunk)
    old_ct += fetch_all("don_hang_chi_tiet", f"select=*&don_hang_id=in.({inlist})")
    old_tt += fetch_all("thanh_toan", f"select=*&don_hang_id=in.({inlist})")
BACKUP.write_text(json.dumps({"don_hang":old,"chi_tiet":old_ct,"thanh_toan":old_tt}, ensure_ascii=False, default=str), encoding='utf-8')
print(f"Đã backup {len(old)} đơn + {len(old_ct)} chi tiết + {len(old_tt)} thanh toán -> {BACKUP}")

# ── XÓA ──
print("\n--- XÓA đơn T5 (CASCADE) ---")
del_ok = 0
for i in range(0, len(old_ids), 50):
    chunk = old_ids[i:i+50]; inlist = ",".join(chunk)
    r = requests.delete(f"{URL}/rest/v1/don_hang?id=in.({inlist})", headers={**H,"Prefer":"return=minimal"}, timeout=120)
    if r.ok: del_ok += len(chunk)
    else: print("  Lỗi xóa:", r.status_code, r.text[:200])
print(f"Đã xóa {del_ok}/{len(old_ids)} đơn")

# ── INSERT ĐƠN ──
print("\n--- INSERT đơn mới ---")
BATCH = 50; id_map = {}; ok = 0
for i in range(0, len(don_records), BATCH):
    batch = don_records[i:i+BATCH]
    r = requests.post(f"{URL}/rest/v1/don_hang", headers={**JH,"Prefer":"return=representation"}, json=batch, timeout=120)
    if r.status_code in (200,201):
        for rec in r.json(): id_map[rec['ma_don']] = rec['id']
        ok += len(batch)
    else:
        print(f"  Lỗi đơn batch {i//BATCH+1}: {r.status_code} {r.text[:200]}")
print(f"Đơn: {ok}/{len(don_records)} | mapped {len(id_map)}")

# ── INSERT CHI TIẾT ──
ctp = []
for ct in ct_records:
    md = ct.pop('ma_don'); did = id_map.get(md)
    if not did: continue
    ct['don_hang_id'] = did; ctp.append(ct)
okc = 0
for i in range(0, len(ctp), BATCH):
    batch = ctp[i:i+BATCH]
    r = requests.post(f"{URL}/rest/v1/don_hang_chi_tiet", headers={**JH,"Prefer":"return=minimal"}, json=batch, timeout=120)
    if r.status_code in (200,201): okc += len(batch)
    else: print(f"  Lỗi CT batch {i//BATCH+1}: {r.status_code} {r.text[:250]}")
print(f"Chi tiết: {okc}/{len(ctp)}")

# ── INSERT THANH TOÁN ──
ttp = []
for tt in tt_records:
    md = tt.pop('ma_don'); did = id_map.get(md)
    if not did: continue
    tt['don_hang_id'] = did; ttp.append(tt)
okt = 0
for i in range(0, len(ttp), BATCH):
    batch = ttp[i:i+BATCH]
    r = requests.post(f"{URL}/rest/v1/thanh_toan", headers={**JH,"Prefer":"return=minimal"}, json=batch, timeout=120)
    if r.status_code in (200,201): okt += len(batch)
    else: print(f"  Lỗi TT batch {i//BATCH+1}: {r.status_code} {r.text[:250]}")
print(f"Thanh toán: {okt}/{len(ttp)}")
print("\n✅ HOÀN TẤT STEP 2")
