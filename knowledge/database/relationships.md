# Quan Hệ Database

> Xác minh lần cuối: 08/05/2026

## Sơ Đồ Khóa Ngoại

```
nhan_vien
  └── dang_ky_off.nhan_vien_id
  └── cham_cong.nhan_vien_id
  └── bang_luong.nhan_vien_id
  └── quy_ngay_off.nhan_vien_id

profiles (← auth.users)
  └── dang_ky_off.duyet_boi
  └── kho_giao_dich.nguoi_thuc_hien

vi
  └── chi_phi.vi_id
  └── chuyen_khoan_noi_bo.tu_vi_id
  └── chuyen_khoan_noi_bo.den_vi_id

danh_muc_chi_phi (tự tham chiếu: parent_id)
  └── chi_phi.danh_muc_id

khach_hang
  └── the_lieu_trinh.khach_hang_id (XÓA CASCADE)

dich_vu
  └── khuyen_mai.dich_vu_id (XÓA CASCADE)

khuyen_mai
  └── chien_dich_marketing.khuyen_mai_id (ĐẶT NULL)

kho_san_pham (tự tham chiếu: san_pham_chiet_id)
  └── kho_giao_dich.san_pham_id (XÓA CASCADE)
```

## Ràng Buộc Chính

- `doi_soat_ngay`: UNIQUE(ngay, nguoi_doi_soat, muc_kiem_tra)
- `khach_hang.so_dien_thoai`: UNIQUE NOT NULL
- `the_lieu_trinh.so_buoi_con_lai`: TỰ SINH = (so_buoi_tong - so_buoi_da_dung) LƯU
- `khuyen_mai.phan_tram_giam`: TỰ SINH = ROUND((gia_goc-gia_km)/gia_goc*100,1) LƯU

## Liên Kết Nghiệp Vụ

- `kho_giao_dich` với `loai='nhap_kho'` → tự động tạo bản ghi `chi_phi`
- Xóa `kho_giao_dich` (nhập kho) → phải xóa cả `chi_phi` liên quan
- `cham_cong.loai != 'di_lam'` được coi là OFF khi tính lương
- `dang_ky_off.trang_thai = 'duoc_duyet'` được coi là OFF khi tính lương
- Cả OFF trong cham_cong và dang_ky_off đều được loại trùng theo ngày trong `tinhLuong()`
