import os
from datetime import date, timedelta
from supabase import create_client

# ══════════════════════════════════════════════════════
# CẤU HÌNH — chỉ chỉnh phần này
# ══════════════════════════════════════════════════════
from dotenv import load_dotenv
load_dotenv(".env.import")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ══════════════════════════════════════════════════════
# DATA THÁNG 4/2026
# Ký hiệu: 11=đủ ca, 11.25=TC15p, 11.5=TC30p, 11.75=TC45p
#          10=về sớm, OFF=nghỉ phép, OV=off vượt, O7=off T7/CN
# Ngày bắt đầu: 01/04/2026 = Thứ 4
# ══════════════════════════════════════════════════════

LICH_THANG4 = {
  "Nguyễn Thị Thúy Hoanh": [
    "OFF","11","11.5","11","11","11","11","11","11","11",
    "11","11","OFF","11","11","11","11","11","11","11",
    "11","11","11","11.25","11.25","11","11","11","OFF","11","11"
  ],
  "Nguyễn Hoàng Anh Thư": [
    "11","11","11","11","11","11","11","11","11","11",
    "11","11","11","11","11","11","11","11","11","11",
    "11","11","11","11","11","11","OFF","OFF","OFF","11","11"
  ],
  "Đỗ Thị Khánh Duy": [
    "OFF","OFF","11.5","11","11","11","11","11.5","11","11",
    "11","11","11","OFF","11","11","11","11","11","11",
    "11","OFF","OV","OV","O7","11","11.25","11","11","11","11"
  ],
  "Nguyễn Thị Tường Uyên": [
    "11.25","11","11","11","11","OFF","OFF","11.5","11","11",
    "11","11","11.25","11","11","11","11","11","11","OFF",
    "11","11","11","11","11","11","OV","11","11","11","11"
  ],
  "Lê Thị Cẩm My": [
    "11","11","11","11","11","11","11","11.5","11","11",
    "11","11","11","11","11","OFF","11","11","11","11",
    "OFF","OFF","11","11","11","11","11","11","11","11","11"
  ],
  "Trương Thị Bé Thôn": [
    "11","OFF","11","11","11","11","11","11","11","11",
    "11","11","11","11","OFF","11","11","11","11","11",
    "11","11","11","11.25","11","11","OFF","10","11","11","11"
  ],
  "Lê Hoàng Phương Linh": [
    "11","11","11.25","11","11","11","11","11.25","11","11",
    "11","O7","OFF","11","11","11","11","11","11","OFF",
    "11","11","11","11","11","11","11","11","11","11","11"
  ],
  "Hồ Ngọc Phương": [
    "11.25","11","OFF","11","11","11","11","OFF","11","5",
    "11","11","11.25","11","11","11","11","11","11","11",
    "11","11","11","11.5","11.25","11","OFF","11","11","11","11"
  ],
  "Nguyễn Hoa Đào": [
    "11","11","11","11","11","11","11","OFF","11","11",
    "11","11","11","OFF","11","11","11","11","11","11",
    "OFF","11","11","11","11","11","11","11","11","11","11"
  ],
}

# Map ký hiệu → loại + hệ số
def parse_ky_hieu(kh):
    kh = str(kh).strip()
    if kh == "OFF":  return "off_phep",  1.0,  0
    if kh == "OV":   return "off_ov",    1.0,  0
    if kh == "O7":   return "off_t7",    2.0,  0  # x2 ngày công
    if kh == "5":    return "di_lam",    0.46, 0  # ~5 tiếng / 10h45
    if kh == "10":   return "di_lam",    0.93, 0  # ~10 tiếng / 10h45
    try:
        val = float(kh)
        if val == 11:    return "di_lam", 1.0,  0
        if val == 11.25: return "di_lam", 1.0,  0.25
        if val == 11.5:  return "di_lam", 1.0,  0.5
        if val == 11.75: return "di_lam", 1.0,  0.75
        if val == 12:    return "di_lam", 1.0,  1.0
    except:
        pass
    return "di_lam", 1.0, 0

def run():
    print(f"\n{'═'*55}")
    print(f"  HSMS IMPORT — Tháng 4/2026")
    print(f"{'═'*55}\n")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Load danh sách NV
    nv_list = sb.table("nhan_vien").select("id, ho_ten").execute().data
    nv_map  = { nv["ho_ten"].strip(): nv["id"] for nv in nv_list }

    print(f"  Tìm thấy {len(nv_map)} nhân viên trong DB\n")

    success = 0
    failed  = 0
    skip    = 0

    for ho_ten, lich in LICH_THANG4.items():
        # Tìm ID nhân viên
        nv_id = None
        for name, id_ in nv_map.items():
            if ho_ten.strip() in name or name in ho_ten.strip():
                nv_id = id_
                break

        if not nv_id:
            print(f"  ⚠️  Không tìm thấy NV: {ho_ten}")
            failed += 1
            continue

        print(f"  📋 {ho_ten}")

        for i, ky_hieu in enumerate(lich):
            if i + 1 > 30:  # Tháng 4 chỉ có 30 ngày
                break
            ngay = date(2026, 4, i + 1)
            ngay_str = ngay.strftime("%Y-%m-%d")
            loai, he_so, tang_ca = parse_ky_hieu(ky_hieu)

            # Kiểm tra đã có chưa
            existing = sb.table("cham_cong").select("id")\
                .eq("nhan_vien_id", nv_id)\
                .eq("ngay", ngay_str)\
                .execute().data

            if existing:
                skip += 1
                continue

            if loai in ("off_phep", "off_ov", "off_t7"):
                # Lưu vào dang_ky_off
                sb.table("dang_ky_off").insert({
                    "nhan_vien_id": nv_id,
                    "ngay_off":     ngay_str,
                    "loai_off":     loai,
                    "ly_do":        "Import từ Excel tháng 4/2026",
                    "trang_thai":   "duoc_duyet",
                    "nguon":        "admin",
                }).execute()
            else:
                # Lưu vào cham_cong
                # Giờ vào/ra mặc định theo ca chuẩn
                gio_vao = "09:15:00"
                if loai == "di_lam" and he_so < 1.0:
                    gio_vao = "09:15:00"  # về sớm
                gio_ra = "20:00:00"
                if tang_ca == 0.25: gio_ra = "20:15:00"
                if tang_ca == 0.5:  gio_ra = "20:30:00"
                if tang_ca == 0.75: gio_ra = "20:45:00"
                if tang_ca == 1.0:  gio_ra = "21:00:00"
                if he_so == 0.46:   gio_ra = "14:30:00"  # ~5 tiếng
                if he_so == 0.93:   gio_ra = "19:30:00"  # ~10 tiếng

                trang_thai_tc = "khong_co"
                if tang_ca > 0: trang_thai_tc = "da_duyet"

                sb.table("cham_cong").insert({
                    "nhan_vien_id":        nv_id,
                    "ngay":                ngay_str,
                    "gio_vao":             gio_vao,
                    "gio_ra":              gio_ra,
                    "loai":                loai,
                    "he_so":               he_so,
                    "he_so_tam":           he_so,
                    "tang_ca_gio":         tang_ca,
                    "trang_thai_tang_ca":  trang_thai_tc,
                    "nguoi_cham":          "Import Excel",
                }).execute()

            success += 1

        print(f"     ✅ Xong\n")

    print(f"{'═'*55}")
    print(f"  KẾT QUẢ:")
    print(f"  ✅ Import : {success}")
    print(f"  ⏭️  Bỏ qua : {skip} (đã có)")
    print(f"  ❌ Lỗi    : {failed}")
    print(f"{'═'*55}\n")

if __name__ == "__main__":
    run()