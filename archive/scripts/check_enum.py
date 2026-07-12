"""Kiểm tra enum chi_phi và chuẩn hóa"""
import os, sys, io
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from supabase import create_client

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
def fmt(n):
    if n is None: return "0d"
    return f"{int(n):,}d".replace(",", ".")

print("=" * 60)
print("KIEM TRA ENUM CHI PHI")
print("=" * 60)

# Check chi_phi hinh_thuc_thanh_toan
r = supabase.from_("chi_phi").select("hinh_thuc_thanh_toan, so_tien").execute()
cp_map = {}
for d in (r.data or []):
    t = d.get('hinh_thuc_thanh_toan', 'NULL')
    cp_map[t] = cp_map.get(t, 0) + (d['so_tien'] or 0)

print("\nChi phi phan theo hinh_thuc_thanh_toan:")
for t, v in sorted(cp_map.items(), key=lambda x: -x[1]):
    print(f"  {t:25s}  {fmt(v)}")

# Check doanh_thu hinh_thuc
r = supabase.from_("doanh_thu").select("hinh_thuc, so_tien").execute()
dt_map = {}
for d in (r.data or []):
    t = d.get('hinh_thuc', 'NULL')
    dt_map[t] = dt_map.get(t, 0) + (d['so_tien'] or 0)

print("\nDoanh thu phan theo hinh_thuc:")
for t, v in sorted(dt_map.items(), key=lambda x: -x[1]):
    print(f"  {t:25s}  {fmt(v)}")

# Check so luong records co hinh_thuc_thanh_toan = 'ngan_hang'
r = supabase.from_("chi_phi").select("id, ngay, so_tien, dien_giai").eq("hinh_thuc_thanh_toan", "ngan_hang").execute()
print(f"\nSo records chi_phi co hinh_thuc_thanh_toan = 'ngan_hang': {len(r.data or [])}")
for d in (r.data or [])[:5]:
    print(f"  {d['ngay']}  {fmt(d['so_tien'])}  {d.get('dien_giai','')[:60]}")

print("\n" + "=" * 60)
print("HOAN TAT")
