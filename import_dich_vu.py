"""
Import danh sách dịch vụ từ Excel vào Supabase
File Excel: DanhSachDichVu.xlsx (Desktop)
Chạy: python import_dich_vu.py

Yêu cầu: pip install openpyxl python-dotenv requests
"""

import os, json, sys, io, requests, openpyxl
from pathlib import Path
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv(".env.import")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://aqyemkfbjqxpegingoil.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_KEY:
    print("❌ Thiếu SUPABASE_KEY trong .env.import")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

EXCEL_FILE = Path(r"C:\Users\Quoc Nam\Desktop\DanhSachDichVu.xlsx")
if not EXCEL_FILE.exists():
    print(f"❌ Không tìm thấy: {EXCEL_FILE}")
    sys.exit(1)

# ── Mapping danh mục POS → nhóm hiển thị trên menu ───────────────────────────
# Danh mục gốc từ myspa.vn → nhóm chuẩn của Hannah Spa
NHOM_MAP = {
    "Gội Đầu":                  "Gội Đầu Dưỡng Sinh",
    "Massage Body":             "Massage Body",
    "Triệt Lông":               "Triệt Lông",
    "lASER":                    "Triệt Lông",          # typo trong POS
    "Công Nghệ Cao - Laser":    "Triệt Lông",
    "Chăm Sóc Da Mặt":          "Chăm Sóc Da",
    "PEEL DA SINH HỌC":         "Chăm Sóc Da",
    "Đắp Mặt Nạ":               "Chăm Sóc Da",
    "Tẩy Tế Bào Chết":          "Chăm Sóc Da",
    "Tắm Trắng Toàn Thân":      "Tắm Trắng & Giảm Béo",
    "Combo Khuyến Mãi":         "Combo",
    "Dịch Vụ Đồng GIá 29k":     "Combo",
    "Phụ Thu Dịch Vụ":          "Phụ Thu",
    "Phun Xăm":                 "Phun Xăm",
}

# Danh mục nào là phụ thu (add-on) → không hiển thị nổi bật trên menu
PHU_THU_CATEGORIES = {"Phụ Thu Dịch Vụ"}

# Danh mục nào ẩn khỏi menu khách (chỉ dùng nội bộ POS)
AN_KHOI_MENU = {"Phụ Thu Dịch Vụ", "Dịch Vụ Đồng GIá 29k", "Phun Xăm"}

# ── Đọc Excel ─────────────────────────────────────────────────────────────────
wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
ws = wb.active
print(f"📂 File: {EXCEL_FILE.name}")
print(f"📊 Sheet: {ws.title} — {ws.max_row - 1} dịch vụ")

# ── Parse từng dòng ───────────────────────────────────────────────────────────
services = []
duplicates = []
seen_names = {}

for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
    ten = str(row[0]).strip() if row[0] else ""
    if not ten or ten == "None":
        continue

    # Thời lượng
    try:
        phut = int(float(str(row[1]))) if row[1] else 0
    except:
        phut = 0

    # Danh mục gốc
    danh_muc = str(row[2]).strip() if row[2] else ""
    if danh_muc in ("None", "", "nan"):
        danh_muc = ""

    # Nhóm hiển thị
    nhom = NHOM_MAP.get(danh_muc, "Khác") if danh_muc else "Khác"

    # Giá
    try:
        gia = int(float(str(row[3]))) if row[3] else 0
    except:
        gia = 0

    # Flags
    la_phu_thu = danh_muc in PHU_THU_CATEGORIES
    hien_menu  = danh_muc not in AN_KHOI_MENU

    # Kiểm tra trùng tên
    ten_lower = ten.lower()
    if ten_lower in seen_names:
        duplicates.append(f"  Dòng {idx}: '{ten}' (trùng dòng {seen_names[ten_lower]})")
    seen_names[ten_lower] = idx

    services.append({
        "ten":            ten,
        "mo_ta":          "",
        "mo_ta_ngan":     "",
        "gia_co_ban":     gia,
        "ti_le_hoa_hong": 0,
        "is_active":      True,
        "danh_muc":       danh_muc if danh_muc else None,
        "nhom_hien_thi":  nhom,
        "la_phu_thu":     la_phu_thu,
        "thoi_gian_phut": phut,
        "thu_tu":         len(services) + 1,
        "hien_tren_menu": hien_menu,
        "la_hot":         False,
        "hinh_anh":       None,
    })

# ── Báo cáo trước khi import ──────────────────────────────────────────────────
print(f"\n📋 Tổng: {len(services)} dịch vụ")

# Thống kê theo nhóm
from collections import Counter
nhom_count = Counter(s["nhom_hien_thi"] for s in services)
print("\nTheo nhóm hiển thị:")
for nhom, cnt in sorted(nhom_count.items()):
    hien = sum(1 for s in services if s["nhom_hien_thi"] == nhom and s["hien_tren_menu"])
    print(f"  {nhom:<30} {cnt:>3} dịch vụ  ({hien} hiện trên menu)")

if duplicates:
    print(f"\n⚠️  {len(duplicates)} tên trùng:")
    for d in duplicates:
        print(d)

print("\nMẫu 5 dịch vụ:")
for s in services[:5]:
    print(f"  {s['thu_tu']:3}. {s['ten'][:38]:<38} | {s['nhom_hien_thi']:<22} | {s['gia_co_ban']:>10,}đ")

# ── Xác nhận ──────────────────────────────────────────────────────────────────
print(f"\n⚠️  Sắp insert {len(services)} dịch vụ vào Supabase (bảng dich_vu)")
ans = input("Tiếp tục? (y/n): ").strip().lower()
if ans != "y":
    print("Đã hủy.")
    sys.exit(0)

ans2 = input("Xóa toàn bộ dịch vụ cũ trước khi import? (y/n): ").strip().lower()
if ans2 == "y":
    r = requests.delete(
        f"{SUPABASE_URL}/rest/v1/dich_vu?id=neq.00000000-0000-0000-0000-000000000000",
        headers=HEADERS,
    )
    print(f"   {'✅ Đã xóa cũ' if r.status_code in (200,204) else f'⚠️ {r.status_code} {r.text[:100]}'}")

# ── Insert theo batch ─────────────────────────────────────────────────────────
BATCH = 50
ok = fail = 0

for i in range(0, len(services), BATCH):
    batch = services[i:i+BATCH]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/dich_vu",
        headers=HEADERS,
        data=json.dumps(batch, ensure_ascii=False).encode("utf-8"),
    )
    if r.status_code in (200, 201):
        ok += len(batch)
        print(f"   ✅ Batch {i//BATCH+1}: {len(batch)} dịch vụ OK")
    else:
        fail += len(batch)
        print(f"   ❌ Batch {i//BATCH+1}: {r.status_code} — {r.text[:200]}")

print(f"\n{'='*50}")
print(f"✅ Thành công: {ok}")
if fail:
    print(f"❌ Thất bại:  {fail}")
print("Done!")
