import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.import")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# So lieu ngay le tich luy thang 4/2026
# Nguon: di lam ngay le (30/04, 01/05, Tet Am Lich...)
DATA = [
    ("Nguyễn Thị Thúy Hoanh", 2),
    ("Nguyễn Hoàng Anh Thư", 4),
    ("Đỗ Thị Khánh Duy", 2),
    ("Nguyễn Thị Tường Uyên", 2),
    ("Lê Thị Cẩm My", 2),
    ("Trương Thị Bé Thôn", 2),
    ("Lê Hoàng Phương Linh", 1),
    ("Hồ Ngọc Phương", 2),
    ("Nguyễn Hoa Đào", 2),
]

NAM = 2026
LY_DO = "Tich luy tu ngay le 2026 (30/04, 01/05, Tet Am Lich)"

print("=== SEED quy_ngay_off thang 4/2026 ===\n")

for ho_ten, so_ngay in DATA:
    # Lookup nhan_vien by ho_ten
    res = supabase.table("nhan_vien").select("id, ho_ten").eq("ho_ten", ho_ten).execute()
    nv_list = res.data
    if not nv_list:
        print(f"KHONG TIM THAY: {ho_ten}")
        continue

    nv = nv_list[0]
    nv_id = nv["id"]

    # Check if quy_ngay_off already exists for this nhan_vien + nam
    existing = supabase.table("quy_ngay_off") \
        .select("id") \
        .eq("nhan_vien_id", nv_id) \
        .eq("nam", NAM) \
        .execute()

    if existing.data:
        # Update
        supabase.table("quy_ngay_off") \
            .update({"so_ngay_tich": so_ngay, "ly_do_tich_luy": LY_DO}) \
            .eq("id", existing.data[0]["id"]) \
            .execute()
        print(f"CAP NHAT: {ho_ten} -> {so_ngay} ngay (da co)")
    else:
        # Insert
        supabase.table("quy_ngay_off").insert({
            "nhan_vien_id": nv_id,
            "nam": NAM,
            "so_ngay_tich": so_ngay,
            "so_ngay_da_dung": 0,
            "ly_do_tich_luy": LY_DO,
        }).execute()
        print(f"THEM MOI: {ho_ten} -> {so_ngay} ngay")

print("\n=== HOAN TAT ===")
