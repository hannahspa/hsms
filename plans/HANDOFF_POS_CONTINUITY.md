# HSMS POS Continuity Handoff

Cap nhat: 2026-05-20

Tai lieu nay dung de Codex, Claude, hoac mot AI khac tiep tuc dung mach lam viec neu het usage.

## Muc tieu hien tai

Hoan thien dut diem POS Hannah Spa theo logic MySpa desktop, nhung giu dung phong cach Hannah Spa va khong lam lai tu dau.

POS la trung tam du lieu:

1. Tao don
2. Thanh toan
3. Ghi nhan khach hang da lam gi
4. Ghi nhan KTV/le tan/nhan su lien quan
5. Sinh doanh thu va cong no
6. Tru kho/ghi lich su su dung the
7. Sinh tien Tour va Commission cho nhan vien
8. Cap nhat CRM/report/payroll

## MySpa reference da doi chieu

MySpa order list desktop co cot:

- Ma don hang / Ngay gio
- Khach hang
- Trang thai
- NV thuc hien / Tong Commission
- Giuong
- Don gia
- VAT
- Giam gia
- Tong tien Thanh toan / Cong no
- Duoc tao boi / Chi nhanh / Ma don hang chi nhanh
- Nen tang
- Ghi chu

MySpa report co cac muc lien quan nhan su:

- Bao cao Commission
- Bao cao Tien luong

Bao cao Commission MySpa tach ro:

- commission (%) tong don hang
- Tien tour NV
- Chi tiet commission theo nhan vien

Ket luan nghiep vu: HSMS phai co so phat sinh thu nhap nhan vien rieng, khong chi doc truc tiep tu don_hang_chi_tiet.

## Quy tac thanh toan Hannah Spa

Chi co 4 phuong thuc thanh toan:

- tien_mat
- chuyen_khoan: tien vao MB Bank
- quet_the: tien vao TP Bank
- the_tra_truoc: chi de tra no/so du cu, chuong trinh ban the tra truoc da dong

Quan trong:

- the_lieu_trinh khong phai phuong thuc thanh toan.
- Dung the lieu trinh la dong hang 0d vi khach da tra tien tu truoc.
- Dung the lieu trinh van phai sinh tien Tour cho KTV neu co cau hinh.

## Staff earning rules

Nhan vien co 2 dong tien chinh:

- Tour: tien KTV/nhan vien nhan khi thuc hien dich vu hoac su dung buoi the lieu trinh.
- Commission: hoa hong khi ban the lieu trinh moi hoac ban san pham.

Le tan co KPI/commission rieng khi ban the lieu trinh.

Danh sach don POS can hien thi ten ngan:

- Le Hoang Phuong Linh -> Phuong Linh
- Do Thi Khanh Duy -> Khanh Duy
- Ho Ngoc Phuong -> Ngoc Phuong

Duoi ten nhan vien hien:

- Tour 20.000d
- HH 400.890d

## Migrations da ap dung

Da push remote Supabase den migration 021.

Quan trong:

- 017_pos_test_mode.sql: them test mode cho POS
- 018_pos_atomic_finalize_and_void.sql: chot/huy don atomic
- 019_pos_zero_amount_card_usage.sql: cho phep don dung the 0d
- 020_split_tour_commission.sql: tach tien_tour va tien_commission tren don_hang_chi_tiet
- 021_staff_income_ledger.sql: tao bang nhan_vien_thu_nhap va sinh ledger khi chot don

Bang moi:

`nhan_vien_thu_nhap`

Cot quan trong:

- don_hang_id
- don_hang_chi_tiet_id
- nhan_vien_id
- loai: tour | commission | kpi | adjustment
- nguon: pos | manual | payroll
- ngay
- doanh_so_tinh
- ti_le
- so_tien
- trang_thai: phat_sinh | doi_soat | da_chot | da_tra | huy
- is_test

## Files quan trong

- `src/apps/pos/PosApp.jsx`: man tao/chot don POS
- `src/apps/pos/PosOrderHistory.jsx`: danh sach ban hang POS
- `src/apps/pos/PosPaymentModal.jsx`: thanh toan
- `src/apps/pos/PosProductCatalog.jsx`: dich vu/san pham/the lieu trinh
- `src/services/posService.js`: service POS, summarize order, finalize/void RPC
- `src/apps/admin/commission/AdminCommissionPage.jsx`: Luong Kinh Doanh, doi soat Tour/Commission
- `supabase/migrations/021_staff_income_ledger.sql`: source of truth cho ledger nhan vien

## Da kiem thu

Lenh build:

`npm run build`

Ket qua gan nhat: pass.

Supabase:

`supabase migration list` cho thay local/remote deu den 021.

Test order:

- `DH-20260520-002`
- is_test = true
- Dich vu: RF - Tre Hoa Bap Tay
- Nhan vien: Le Thi Cam My
- Tour sinh ra: 20.000d
- Ledger co dong `loai = tour`, `so_tien = 20000`, `is_test = true`

UI da verify:

- `/pos/danh-sach`: hien `Cam My` va `Tour 20.000d`
- `/admin/commission`: hien Luong Kinh Doanh, tach Tour va HH ban the

## Nguyen tac khi tiep tuc

1. Khong tao/sua/xoa don that tren MySpa neu chua hoi user ngay truoc thao tac.
2. Test tren HSMS thi bat test mode hoac dung `is_test = true`.
3. Du lieu that cua So Thu Chi khong duoc lam roi.
4. POS phai uu tien desktop truoc, mobile/iPad lam sau.
5. MySpa la reference luong nghiep vu, Hannah Spa la reference giao dien/mau sac.
6. Khi thay thieu logic, sua vao data flow/source of truth truoc, UI sau.

## Viec tiep theo uu tien

1. Hoan thien doi soat nhan vien:
   - Loc theo trang thai phat_sinh/doi_soat/da_chot/da_tra.
   - Chot tung nhan vien/tung thang.
   - Tao but toan sang bang_luong khi chot thang.

2. Hoan thien POS order detail:
   - Hien lich su ledger cua don.
   - Hien link truy nguoc: don -> dong hang -> nhan vien -> Tour/HH.

3. Hoan thien the lieu trinh:
   - Ban the moi.
   - Dung buoi cu 0d.
   - Lich su dung the giong MySpa note: "Su dung the lieu trinh ... 6/14".

4. Hoan thien bao cao:
   - Commission report giong MySpa.
   - Salary report doc tu bang_luong + nhan_vien_thu_nhap.

## Ke hoach dong bo du lieu MySpa cu

Muc tieu: du lieu MySpa da import phai hien trong CRM HSMS de tim tung khach hang da dung dich vu nao, ngay nao, ai lam, mua/dung the nao. Khong ghi trung doanh thu that vao So Thu Chi.

1. Xac dinh bang staging/file import MySpa dang nam o dau.
2. Chuan hoa khach hang theo so dien thoai truoc, sau do moi fallback theo ten.
3. Chuan hoa dich vu theo ten da lam sach; neu khong match thi giu ten goc trong `don_hang_chi_tiet.meta`.
4. Chuan hoa nhan vien theo ten. Neu khong co trong danh sach hien tai thi gan vao nhan vien inactive/old staff ten `Nhan Vien Nghi Viec`, hoac tao tung nhan vien cu voi trang thai nghi viec neu schema cho phep.
5. Dua lich su MySpa ve canonical HSMS:
   - `don_hang`
   - `don_hang_chi_tiet`
   - `thanh_toan`
   - `the_lieu_trinh`
   - `lich_su_dung_the`
   - `nhan_vien_thu_nhap`
6. Gan metadata nguon import, ma don MySpa, va khong tao lai `doanh_thu` cho lich su cu neu chi muc tieu la CRM/doi soat khach.
7. Kiem tra view `lich_su_dich_vu_kh` de CRM tra loi dung: khach da lam gi, ai lam, tien tour/HH bao nhieu, the con bao nhieu buoi.

## Cau prompt de dua cho Claude neu can tiep tuc

Hay doc file `plans/HANDOFF_POS_CONTINUITY.md`, `plans/POS_SOURCE_OF_TRUTH.md`, `src/services/posService.js`, `src/apps/pos/PosApp.jsx`, `src/apps/pos/PosOrderHistory.jsx`, `src/apps/admin/commission/AdminCommissionPage.jsx`, va cac migration 017-021. Muc tieu la hoan thien dut diem POS Hannah Spa theo logic MySpa desktop, khong lam lai tu dau, khong anh huong du lieu that cua So Thu Chi. Tiep tuc tu module doi soat Tour/Commission nhan vien va luong kinh doanh.
