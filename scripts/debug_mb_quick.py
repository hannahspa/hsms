"""
Quick debug: Tinh tay chinh xac theo logic view migration 007
v.loai = vi.loai, chi_ra theo hinh_thuc_thanh_toan = v.loai
"""
import requests

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"

H = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def fmt(n):
    try: return f"{int(n):,}".replace(",", ".")
    except: return str(n)

def fetch_all(table, params=""):
    result = []
    limit = 1000
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?{params}&limit={limit}&offset={offset}"
        r = requests.get(url, headers=H, timeout=30)
        data = r.json() if r.status_code in [200, 206] else []
        if not data:
            break
        result.extend(data)
        if len(data) < limit:
            break
        offset += limit
    return result

MB_ID = "6d69df42-9d5a-4f03-9370-a0b6e007e12d"
TM_ID = "3cee1999-15a3-43a8-9b90-f92831641b83"
TP_ID = "8db03ac2-e092-40b0-8f0c-abda1f1993e1"

SEP = "=" * 60
sep = "-" * 60

# 1. Tong CP theo hinh_thuc_thanh_toan (chinh xac nhu view dung)
print(SEP)
print("TONG CP THEO HINH_THUC_THANH_TOAN (logic view)")
print(sep)

cp_tm = fetch_all("chi_phi", "hinh_thuc_thanh_toan=eq.tien_mat&select=id,so_tien,vi_id")
cp_ck = fetch_all("chi_phi", "hinh_thuc_thanh_toan=eq.chuyen_khoan&select=id,so_tien,vi_id")
cp_qt = fetch_all("chi_phi", "hinh_thuc_thanh_toan=eq.quet_the&select=id,so_tien,vi_id")
cp_null = fetch_all("chi_phi", "hinh_thuc_thanh_toan=is.null&select=id,so_tien,vi_id,dien_giai")

tong_cp_tm = sum(x.get('so_tien',0) or 0 for x in cp_tm)
tong_cp_ck = sum(x.get('so_tien',0) or 0 for x in cp_ck)
tong_cp_qt = sum(x.get('so_tien',0) or 0 for x in cp_qt)
tong_cp_null = sum(x.get('so_tien',0) or 0 for x in cp_null)

print(f"  CP hinh_thuc=tien_mat      : {len(cp_tm):3d} records | tong={fmt(tong_cp_tm)}")
print(f"  CP hinh_thuc=chuyen_khoan  : {len(cp_ck):3d} records | tong={fmt(tong_cp_ck)}")
print(f"  CP hinh_thuc=quet_the      : {len(cp_qt):3d} records | tong={fmt(tong_cp_qt)}")
print(f"  CP hinh_thuc=NULL          : {len(cp_null):3d} records | tong={fmt(tong_cp_null)}")
print(f"  TONG TAT CA                : {len(cp_tm)+len(cp_ck)+len(cp_qt)+len(cp_null):3d} records | tong={fmt(tong_cp_tm+tong_cp_ck+tong_cp_qt+tong_cp_null)}")

if cp_null:
    print(f"\n  CP NULL hinh_thuc (chi tiet):")
    for x in cp_null:
        vi_name = {MB_ID:'MB', TM_ID:'TM', TP_ID:'TP'}.get(x.get('vi_id',''), x.get('vi_id','?')[:8])
        print(f"    vi={vi_name} | {fmt(x.get('so_tien'))} | {x.get('dien_giai','?')[:40]}")

# 2. Tinh tay theo dung logic view migration 007
print(f"\n{SEP}")
print("TINH TAY THEO LOGIC VIEW (v.loai = hinh_thuc)")
print(sep)

# Lay so_du_dau
vi_all = requests.get(f"{SUPABASE_URL}/rest/v1/vi?select=*&order=thu_tu", headers=H).json()

for v in vi_all:
    vi_id = v['id']
    vi_ten = v['ten']
    vi_loai = v['loai']  # tien_mat | chuyen_khoan | quet_the
    sd_dau = v.get('so_du_dau', 0) or 0

    # Thu vao theo loai
    dt_data = fetch_all("doanh_thu", f"hinh_thuc=eq.{vi_loai}&select=so_tien")
    thu_vao = sum(x.get('so_tien',0) or 0 for x in dt_data)
    # Voi tien_mat: tru them the_tra_truoc? -> the_tra_truoc khong = tien_mat, nen khong bi anh huong

    # Chi ra theo loai
    cp_data = fetch_all("chi_phi", f"hinh_thuc_thanh_toan=eq.{vi_loai}&select=so_tien")
    chi_ra = sum(x.get('so_tien',0) or 0 for x in cp_data)

    # CK vao / ra
    ck_vao = fetch_all("chuyen_khoan_noi_bo", f"den_vi_id=eq.{vi_id}&select=so_tien")
    tong_ck_vao = sum(x.get('so_tien',0) or 0 for x in ck_vao)

    ck_ra = fetch_all("chuyen_khoan_noi_bo", f"tu_vi_id=eq.{vi_id}&select=so_tien")
    tong_ck_ra = sum(x.get('so_tien',0) or 0 for x in ck_ra)

    so_du_tinh = sd_dau + thu_vao - chi_ra + tong_ck_vao - tong_ck_ra

    print(f"\n  [{vi_ten}] loai={vi_loai}")
    print(f"    so_du_dau = {fmt(sd_dau)}")
    print(f"    + thu_vao = {fmt(thu_vao)}  ({len(dt_data)} DT records)")
    print(f"    - chi_ra  = {fmt(chi_ra)}  ({len(cp_data)} CP records)")
    print(f"    + ck_vao  = {fmt(tong_ck_vao)}  ({len(ck_vao)} CK records)")
    print(f"    - ck_ra   = {fmt(tong_ck_ra)}  ({len(ck_ra)} CK records)")
    print(f"    = SO DU   = {fmt(so_du_tinh)}")
    print(f"    VIEW shows= {['−140.000', '63.358.021', '47.093.000'][['tien_mat','chuyen_khoan','quet_the'].index(vi_loai)]}")

# 3. Kiem tra co CP nao co the_tra_truoc khong (view migration 007 exclude trong DT nhung chi_phi thi khong)
print(f"\n{SEP}")
print("TT: CP voi the_tra_truoc (neu co)")
print(sep)
r_ttp = requests.get(f"{SUPABASE_URL}/rest/v1/chi_phi?hinh_thuc_thanh_toan=eq.the_tra_truoc&select=id", headers=H).json()
print(f"  CP hinh_thuc=the_tra_truoc: {len(r_ttp)} records")

# 4. Tong DT tien_mat (co the_tra_truoc khong? View tru ra)
print(f"\n{SEP}")
print("DT TIEN MAT CHI TIET")
print(sep)
dt_tm_data = fetch_all("doanh_thu", "hinh_thuc=eq.tien_mat&select=ngay,so_tien&order=ngay.desc")
print(f"  DT TM: {len(dt_tm_data)} records | tong = {fmt(sum(x.get('so_tien',0) or 0 for x in dt_tm_data))}")
dt_ttp_data = fetch_all("doanh_thu", "hinh_thuc=eq.the_tra_truoc&select=ngay,so_tien")
print(f"  DT TTP: {len(dt_ttp_data)} records | tong = {fmt(sum(x.get('so_tien',0) or 0 for x in dt_ttp_data))}")
print(f"  -> View exclude TTP: {fmt(sum(x.get('so_tien',0) or 0 for x in dt_ttp_data))} khong tinh vao TM")

print(f"\n{SEP}")
print("XONG")
print(SEP)
