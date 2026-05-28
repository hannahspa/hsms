# Sơ Đồ Database — Toàn Bộ Bảng

> Xác minh lần cuối: 08/05/2026 trên Supabase HannahSpa-production (aqyemkfbjqxpegingoil)

## nhan_vien

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ho_ten | text | NOT NULL | |
| vi_tri | text | | ktv / le_tan / tap_vu |
| luong_cung | integer | | Lương cơ bản (VNĐ) |
| ngay_bat_dau | date | | Ngày bắt đầu làm |
| trang_thai | text | | 'dang_lam' / 'dac_biet' (Phạm Thị Nhỏ) |
| avatar_url | text | | Base64 hoặc URL storage |
| pin_hash | text | | SHA-256 hash |
| gioi_han_off_thang | integer | MẶC ĐỊNH 3 | Giới hạn OFF/tháng (Khánh Duy = 4) |
| ky_quy_trang_thai | text | | 'dang_dong' / 'hoan_tat' |
| ky_quy_so_thang | integer | | Số tháng đã đóng ký quỹ |
| ky_quy_bat_dau | date | | Ngày bắt đầu đóng ký quỹ |
| so_dien_thoai | text | | |

## profiles

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK, FK→auth.users | |
| ho_ten | text | | |
| email | text | | |
| vai_tro | text | | admin / le_tan / ktv / tap_vu |
| trang_thai | boolean | | true = đang hoạt động |
| so_dien_thoai | text | | |

## cham_cong

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| nhan_vien_id | uuid | FK→nhan_vien | |
| ngay | date | | |
| gio_vao | text | | Định dạng "HH:MM:SS" |
| gio_ra | text | | Định dạng "HH:MM:SS" |
| loai | text | | di_lam / off_phep / off_ov / off_t7 / off_t7x |
| he_so | numeric | | Hệ số công (0.79 nếu về sớm) |
| he_so_tam | numeric | | Hệ số tạm |
| tang_ca_gio | numeric | | Giờ tăng ca |
| trang_thai_tang_ca | text | | khong_co / cho_duyet |
| ly_do_ve_som | text | | Lý do về sớm |
| nguoi_cham | text | | Người chấm công |

## dang_ky_off

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| nhan_vien_id | uuid | FK→nhan_vien | |
| ngay_off | date | | |
| loai_off | text | | off_phep / off_ov / off_t7 / off_t7x |
| ly_do | text | | |
| trang_thai | text | | cho_duyet / duoc_duyet / tu_choi |
| bat_kha_khang | boolean | MẶC ĐỊNH false | Bất khả kháng |
| ghi_chu_duyet | text | | Ghi chú của admin khi duyệt |
| duyet_boi | uuid | FK→profiles | Người duyệt |
| nguon | text | MẶC ĐỊNH 'nhan_vien' | 'admin' nếu admin tạo |
| dung_quy_off | boolean | MẶC ĐỊNH false | |
| so_ngay_quy_dung | numeric | MẶC ĐỊNH 0 | |

## bang_luong

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| nhan_vien_id | uuid | FK→nhan_vien | |
| thang | integer | | 1-12 |
| nam | integer | | Năm |
| luong_co_ban | integer | | Lương cơ bản đã tính |
| tien_tang_ca | integer | | Tiền tăng ca |
| tien_phat | integer | | Tiền phạt |
| ~~hoa_hong~~ | integer | | ⚠️ LEGACY — không dùng |
| hoa_hong_dv | integer | | Tổng Tiền Tour tháng (từ POS/MySpa import) — naming cũ giữ lại |
| hoa_hong_the | integer | | Thưởng Đạt Doanh Số |
| tien_tour | integer | | Tổng Tiền Tour tháng (alias của hoa_hong_dv, dùng thay thế) |
| tru_ung_luong | integer | | Trừ ứng lương |
| tru_ky_quy | integer | | Trừ ký quỹ |
| tong_linh | integer | | Tổng lĩnh |
| trang_thai | text | | Cột trạng thái cũ |
| trang_thai_lc | text | | Trạng thái Kỳ 1: chua_tinh / da_tinh / da_chot / da_phat_luong |
| trang_thai_lkd | text | | Trạng thái Kỳ 2: chua_tinh / da_tinh / da_chot / da_phat_luong |

## quy_ngay_off

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| nhan_vien_id | uuid | FK→nhan_vien | |
| nam | integer | | Năm |
| so_ngay_tich | integer | | Số ngày tích lũy |
| so_ngay_da_dung | integer | | Tổng số ngày đã dùng |
| so_dung_thang_nay | integer | | Số ngày dùng trong tháng này |
| ly_do_tich_luy | text | | Lý do tích lũy |

## yeu_cau_chinh_sua

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| loai_bang | text | | Bảng mục tiêu: doanh_thu / chi_phi / chuyen_khoan_noi_bo / cham_cong / quy_ngay_off |
| ban_ghi_id | uuid | | ID bản ghi trong bảng mục tiêu |
| loai_yeu_cau | text | | sua / xoa / duyet_tang_ca / dung_ngay_le |
| du_lieu_cu | jsonb | | Dữ liệu gốc |
| du_lieu_moi | jsonb | | Dữ liệu mới |
| trang_thai | text | | cho_duyet / da_duyet / tu_choi |
| ly_do | text | | Lý do |
| ghi_chu_duyet | text | | Ghi chú của admin |
| nguoi_yeu_cau | text | | Tên người yêu cầu |
| nguoi_duyet | text | | Tên người duyệt |
| created_at | timestamptz | | |

## vi

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ten | text | | Tiền Mặt / MB Bank / TP Bank |
| loai | loai_vi enum | | tien_mat / chuyen_khoan / quet_the |
| icon | text | | Emoji/icon |
| thu_tu | integer | | Thứ tự hiển thị (1=Tiền Mặt, 2=MB Bank, 3=TP Bank) |
| so_du_dau | integer | | Số dư đầu (cập nhật sau đối soát) |
| is_active | boolean | | |

## doanh_thu

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ngay | date | | |
| hinh_thuc | text | CHECK(tien_mat,chuyen_khoan,quet_the,the_tra_truoc) | Hình thức thanh toán |
| so_tien | integer | | Số tiền (VNĐ) |
| dien_giai | text | | Mô tả |
| nguoi_nhap | text | | Người nhập |
| chung_tu_url | text | | URL ảnh chứng từ |
| created_at | timestamptz | | |

## chi_phi

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ngay | date | | |
| danh_muc_id | uuid | FK→danh_muc_chi_phi | Danh mục chi phí |
| so_tien | integer | | Số tiền (VNĐ) |
| hinh_thuc_thanh_toan | text | CHECK(tien_mat,chuyen_khoan,quet_the) | Hình thức thanh toán |
| vi_id | uuid | FK→vi | Ví chi tiền |
| nguoi_nhap | text | | Người nhập |
| chung_tu_url | text | | URL ảnh chứng từ |
| dien_giai | text | | Mô tả |
| created_at | timestamptz | | |

## danh_muc_chi_phi

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ten | text | | Tên danh mục |
| icon | text | | |
| parent_id | uuid | FK tự tham chiếu | NULL=nhóm cha, có giá trị=hạng mục con |
| thu_tu | integer | | Thứ tự hiển thị |
| is_active | boolean | | |

Cấu trúc cây: 6 nhóm cha, 37 hạng mục con.

## chuyen_khoan_noi_bo

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ngay | date | | |
| tu_vi_id | uuid | FK→vi | Ví nguồn |
| den_vi_id | uuid | FK→vi | Ví đích |
| so_tien | integer | | |
| dien_giai | text | | |
| nguoi_thuc_hien | text | | |

## doi_soat_ngay

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ngay | date | | |
| nguoi_doi_soat | text | | Tên nhân viên |
| muc_kiem_tra | text | | Mã mục kiểm tra |
| ket_qua | boolean | | Đạt hay không |
| ghi_chu | text | | |
| created_at | timestamptz | | |

UNIQUE(ngay, nguoi_doi_soat, muc_kiem_tra)

## khach_hang

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ho_ten | text | NOT NULL | |
| so_dien_thoai | text | UNIQUE NOT NULL | |
| ngay_sinh | date | | |
| gioi_tinh | text | CHECK(nu,nam,khac), MẶC ĐỊNH 'nu' | |
| dia_chi | text | | |
| ghi_chu_da_lieu | text | | Ghi chú tình trạng da |
| nguon | text | | Facebook/Zalo/Walk-in/TikTok/Google/Khác |
| lan_cuoi_den | date | | Lần cuối đến (tính/cập nhật thủ công) |
| is_active | boolean | MẶC ĐỊNH true | |
| created_at | timestamptz | | |

## the_lieu_trinh

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| khach_hang_id | uuid | FK→khach_hang ON DELETE CASCADE | |
| ten_dich_vu | text | NOT NULL | |
| so_buoi_tong | integer | CHECK(>0) NOT NULL | Tổng số buổi |
| so_buoi_da_dung | integer | MẶC ĐỊNH 0, CHECK(>=0) | Số buổi đã dùng |
| so_buoi_con_lai | integer | TỰ SINH (so_buoi_tong - so_buoi_da_dung) LƯU | |
| gia_tri_the | integer | | Giá trị thẻ |
| ngay_mua | date | | Ngày mua |
| ngay_het_han | date | | Ngày hết hạn |
| trang_thai | text | CHECK(active,het_buoi,het_han,da_huy) | |
| ghi_chu | text | | |
| created_at | timestamptz | | |

## dich_vu

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ten | text | NOT NULL | |
| mo_ta | text | | |
| mo_ta_ngan | text | | Mô tả ngắn |
| gia_co_ban | integer | | Giá cơ bản |
| ti_le_hoa_hong | numeric | | Tỉ lệ hoa hồng |
| is_active | boolean | MẶC ĐỊNH true | |
| danh_muc | text | | Danh mục |
| nhom_hien_thi | text | | Nhóm hiển thị |
| la_phu_thu | boolean | | Là phụ thu |
| thoi_gian_phut | integer | | Thời gian (phút) |
| thu_tu | integer | | Thứ tự hiển thị |
| hien_tren_menu | boolean | MẶC ĐỊNH true | Hiện trên menu iPad |
| la_hot | boolean | | Đánh dấu hot |
| hinh_anh | text | | URL hình ảnh |
| created_at | timestamptz | | |

## khuyen_mai

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ten | text | NOT NULL | |
| mo_ta | text | | |
| dich_vu_id | uuid | FK→dich_vu ON DELETE CASCADE | |
| gia_goc | integer | NOT NULL | |
| gia_km | integer | NOT NULL | |
| phan_tram_giam | numeric | TỰ SINH ROUND((gia_goc-gia_km)/gia_goc*100,1) LƯU | |
| ngay_bat_dau | date | NOT NULL | |
| ngay_ket_thuc | date | NOT NULL | |
| trang_thai | text | CHECK(active,expired,draft) | |
| so_luot_dat | integer | MẶC ĐỊNH 0 | |
| created_at | timestamptz | | |

## chien_dich_marketing

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ten | text | NOT NULL | |
| kenh | text | CHECK(facebook,zalo,tiktok,google,in_an,khac) | Kênh |
| ngan_sach | integer | | Ngân sách |
| ngay_bat_dau | date | | |
| ngay_ket_thuc | date | | |
| trang_thai | text | CHECK(draft,active,ended) | |
| mo_ta | text | | |
| khuyen_mai_id | uuid | FK→khuyen_mai ON DELETE SET NULL | |
| so_luot_tiep_can | integer | | Lượt tiếp cận |
| so_kh_moi | integer | | Khách mới |
| doanh_thu_uoc_tinh | integer | | Doanh thu ước tính |
| ghi_chu | text | | |
| created_at | timestamptz | | |

## kho_san_pham

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ten | text | NOT NULL | |
| loai | text | CHECK(tieu_hao,ban_khach,vat_tu) | Loại sản phẩm |
| don_vi | text | | Đơn vị (cái, chai, lọ, hộp, gói, thùng...) |
| mo_ta | text | | |
| gia_nhap | integer | | Giá nhập |
| gia_ban | integer | | Giá bán |
| ton_kho | numeric | | Tồn kho hiện tại |
| canh_bao_ton | numeric | | Ngưỡng cảnh báo hết hàng |
| co_the_chiet | boolean | | Có thể chiết |
| san_pham_chiet_id | uuid | FK tự tham chiếu | Sản phẩm cha |
| he_so_chiet | numeric | | Hệ số chiết |
| is_active | boolean | | |
| created_at | timestamptz | | |

## kho_giao_dich

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| san_pham_id | uuid | FK→kho_san_pham ON DELETE CASCADE | |
| loai | text | CHECK(nhap_kho,xuat_su_dung,xuat_ban,chiet_ra,chiet_vao,dieu_chinh,tra_nha_cc) | Loại giao dịch |
| so_luong | numeric | NOT NULL, >0 | Số lượng dương |
| gia_don_vi | integer | | Đơn giá |
| ghi_chu | text | | |
| lien_quan_id | uuid | | Ghép cặp chiet_ra ↔ chiet_vao |
| ngay | date | | |
| nguoi_thuc_hien | uuid | FK→profiles | |
| created_at | timestamptz | | |

## don_hang (POS — MỚI 08/05/2026)

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| ma_don | text | UNIQUE NOT NULL, AUTO | DH-YYYYMMDD-NNN |
| khach_hang_id | uuid | FK→khach_hang ON DELETE SET NULL | |
| nguoi_tao | uuid | FK→profiles | |
| tong_tien_hang | integer | DEFAULT 0 | Tổng trước giảm giá |
| giam_gia | integer | DEFAULT 0 | |
| thuc_thu | integer | DEFAULT 0 | Thực thu |
| con_no | integer | DEFAULT 0 | Còn nợ |
| trang_thai | text | CHECK(draft,da_thanh_toan,no_mot_phan,huy) | |
| tien_tour | integer | DEFAULT 0 | |
| ghi_chu | text | | |
| ngay | date | NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

## don_hang_chi_tiet (POS — MỚI 08/05/2026)

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| don_hang_id | uuid | FK→don_hang ON DELETE CASCADE | |
| loai_item | text | CHECK(dich_vu,san_pham,the_lieu_trinh,the_moi) | |
| dich_vu_id | uuid | FK→dich_vu, nullable | |
| san_pham_id | uuid | FK→kho_san_pham, nullable | |
| the_lieu_trinh_id | uuid | FK→the_lieu_trinh, nullable | |
| nhan_vien_id | uuid | FK→nhan_vien, nullable | KTV thực hiện |
| so_luong | integer | DEFAULT 1, CHECK(>0) | |
| don_gia | integer | NOT NULL | |
| thanh_tien | integer | NOT NULL | |
| **tien_tour** | integer | DEFAULT 0 | **CHUẨN** — Tiền Tour KTV từ dich_vu / the_lieu_trinh |
| **tien_commission** | integer | DEFAULT 0 | **CHUẨN** — Tiền Hoa Hồng KTV từ san_pham / the_moi |
| ~~tien_hoa_hong~~ | integer | | ⚠️ LEGACY — bằng tien_tour HOẶC tien_commission, sẽ xóa |
| ~~ti_le_hoa_hong~~ | numeric | | ⚠️ LEGACY — không dùng trong POS mới, sẽ xóa |
| ghi_chu | text | | |
| created_at | timestamptz | DEFAULT now() | |

> **Quy tắc thu nhập NV theo loai_item:**
> - `dich_vu`, `the_lieu_trinh` → **Tiền Tour** (`tien_tour`) — KTV thực hiện dịch vụ
> - `san_pham`, `the_moi` → **Tiền Hoa Hồng** (`tien_commission`) — KTV bán SP/thẻ

## thanh_toan (POS — MỚI 08/05/2026)

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| don_hang_id | uuid | FK→don_hang ON DELETE CASCADE | |
| hinh_thuc | text | CHECK(tien_mat,chuyen_khoan,quet_the,the_tra_truoc,the_lieu_trinh) | |
| so_tien | integer | NOT NULL, CHECK(>0) | |
| ghi_chu | text | | |
| created_at | timestamptz | DEFAULT now() | |

## cong_no_khach_hang (POS — MỚI 08/05/2026)

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| khach_hang_id | uuid | FK→khach_hang ON DELETE CASCADE | |
| don_hang_id | uuid | FK→don_hang ON DELETE SET NULL | |
| loai | text | CHECK(phat_sinh,thanh_toan,xoa_no) | |
| so_tien | integer | NOT NULL, CHECK(>0) | |
| so_du_con_lai | integer | NOT NULL | Running balance |
| ngay | date | NOT NULL | |
| ghi_chu | text | | |
| created_at | timestamptz | DEFAULT now() | |

## lich_su_dung_the (POS — MỚI 08/05/2026)

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| the_lieu_trinh_id | uuid | FK→the_lieu_trinh ON DELETE CASCADE | |
| don_hang_id | uuid | FK→don_hang ON DELETE SET NULL | |
| nguoi_thuc_hien | uuid | FK→nhan_vien | |
| ngay | date | NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |

## lich_hen (POS — MỚI 08/05/2026)

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| id | uuid | PK | |
| khach_hang_id | uuid | FK→khach_hang ON DELETE SET NULL | |
| ho_ten_kh | text | | KH vãng lai |
| so_dien_thoai | text | | |
| dich_vu_id | uuid | FK→dich_vu ON DELETE SET NULL | |
| nhan_vien_id | uuid | FK→nhan_vien ON DELETE SET NULL | |
| thoi_gian_bat_dau | timestamptz | NOT NULL | |
| thoi_gian_ket_thuc | timestamptz | | |
| trang_thai | text | CHECK(cho_xac_nhan,da_xac_nhan,da_den,khong_den,da_huy,online) | |
| ghi_chu | text | | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

## homepage_config

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|---|---|---|---|
| key | text | PK | hero / contact / about / marquee / testimonials / faq |
| value | jsonb | NOT NULL | |
| mo_ta | text | | |
| updated_at | timestamptz | Tự động qua trigger | |
