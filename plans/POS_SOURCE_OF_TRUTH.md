# POS Source of Truth

> File nay la quy uoc nghiep vu cho POS HSMS. Khi code POS, uu tien file nay hon ghi chu cu neu co mau thuan.

## Muc tieu POS

POS cua Hannah Spa phai quen voi nhan vien dang dung MySpa, nhung du lieu phai dong bo sau hon:

- Don hang
- Thanh toan
- Doanh thu
- Kho
- CRM
- The lieu trinh
- Cong no
- Hoa hong
- Bao cao

## Mot don hang duy nhat

Mot don co the gom nhieu loai dong:

- `dich_vu`: dich vu le, co the co KTV thuc hien va hoa hong.
- `san_pham`: san pham ban khach, tru kho khi chot don.
- `the_lieu_trinh`: dung buoi tu the cu, khong tao dong tien moi.
- `the_moi`: mua the lieu trinh moi, co tien thanh toan, sau chot don tao record the.

Khong tach rieng don ban the va don dich vu neu khach thanh toan chung tai quay.

## Phuong thuc thanh toan

HSMS Hannah Spa hien tai chi van hanh 4 phuong thuc thanh toan:

- `tien_mat`
- `chuyen_khoan`: tien vao tai khoan MB Bank
- `quet_the`: tien vao tai khoan TP Bank
- `the_tra_truoc`

Nhom vao dong tien:

- Co vao dong tien: `tien_mat`, `chuyen_khoan`, `quet_the`
- Khong tao dong tien moi khi su dung no de tra no/khau tru so du da ban tu truoc: `the_tra_truoc`

Ghi chu nghiep vu:

- Chuong trinh the tra truoc moi dang dong; hien tai chi can xu ly tra no/khau tru so du cu cho khach.
- `the_lieu_trinh` khong duoc xem la phuong thuc thanh toan trong HSMS. No la loai dong hang `the_lieu_trinh` de ghi nhan viec dung buoi tu the cu, khong sinh dong tien moi.
- Moi khoan thanh toan trong `thanh_toan` sinh ra toi da mot dong `doanh_thu` tuong ung neu no la loai vao dong tien.

## Chot don

Chot don phai la thao tac an toan nhat trong he thong.

Khi chot don:

1. Khoa don `FOR UPDATE`.
2. Tinh tong tien hang tu `don_hang_chi_tiet`.
3. Tinh tong da thanh toan tu `thanh_toan`.
4. Chan khach le neu con no.
5. Cap nhat `don_hang`: tong tien, giam gia, thuc thu, con no, trang thai.
6. Sinh `doanh_thu` theo tung thanh toan hop le.
7. Tru kho voi `san_pham`.
8. Tru buoi va ghi `lich_su_dung_the` voi `the_lieu_trinh`.
9. Tao the moi voi `the_moi`.
10. Tao cong no neu co.
11. Cap nhat CRM: tong chi tieu, so lan den, lan cuoi den.
12. Tra ve ket qua gom `success`, `ma_don`, `thuc_thu`, `con_no`.

Nguyen tac: cac buoc tren nen nam trong mot RPC de tranh trang thai nua chung.

Trang thai Pha 2:

- Migration `018_pos_atomic_finalize_and_void.sql` la ban chuan moi cho `pos_finalize_order`.
- Migration `019_pos_zero_amount_card_usage.sql` cho phep don chi dung the cu tong thu `0`.
- Migration `020_split_tour_commission.sql` tach `tien_tour` va `tien_commission` tren dong hang POS.
- Frontend POS khong tu tao the moi sau khi chot don nua; viec tao the moi nam trong RPC.
- Neu RPC tra `success=false`, frontend phai xem do la loi nghiep vu va dung luong thanh toan.
- `the_tra_truoc` la PTTT hop le nhung khong sinh dong `doanh_thu` moi vi day la khau tru so du da ban tu truoc.

## Huy don

Huy don phai dao nguoc nhung gi chot don da tao:

- Xoa hoac danh dau doanh thu POS cua don.
- Hoan kho voi san pham da ban.
- Hoan buoi the cu da dung.
- Xoa lich su dung the cua don.
- Huy/xoa the moi sinh ra tu don `the_moi`.
- Xoa cong no phat sinh tu don.
- Tru lai tong chi tieu/so lan den cua khach neu truoc do da cong.
- Doi `don_hang.trang_thai = 'huy'`.

Neu khong the dao nguoc an toan, phai chan huy va yeu cau doi soat thu cong.

Trang thai Pha 2:

- `pos_void_order` hoan kho, hoan buoi the cu, xoa lich su dung the cua don, xoa doanh thu POS, xoa cong no phat sinh va tru lai thong ke CRM.
- Neu the moi sinh tu don da duoc su dung buoi, he thong chan huy don de doi soat thu cong truoc.

## Test Mode

Test Mode duoc dung khi le tan/chu spa tap thao tac.

- Don van co the tao va chot.
- Khong duoc lam ban So Thu Chi.
- Phai co dau hieu ro rang tren UI va DB de truy vet.
- Khong duoc dung Test Mode cho du lieu that.

## Hoa hong

Co hai loai can tach:

- Tien Tour: tien cho KTV/nhan vien thuc hien dich vu hoac thuc hien buoi tu the lieu trinh. Luu tren dong `dich_vu` hoac `the_lieu_trinh`.
- Commission / Hoa hong ban: tien cho nhan vien ban the lieu trinh hoac san pham. Luu tren dong `the_moi`/`san_pham` va/hoac `the_lieu_trinh.nhan_vien_ban_id`.
- Du lieu moi luu rieng `don_hang_chi_tiet.tien_tour` va `don_hang_chi_tiet.tien_commission`; cot cu `tien_hoa_hong` chi de tuong thich nguoc.
- Le tan co KPI va hoa hong ban rieng; khong gop nham voi Tien Tour thuc hien dich vu.

Bao cao luong kinh doanh phai tach tien tour va hoa hong ban the.

## Dung the lieu trinh cu

- Khach da tra tien tu truoc, nen khi dung buoi tu the cu khong bat buoc chon PTTT.
- Don chi co dong `the_lieu_trinh` co the co tong thu `0`.
- Van phai chon KTV thuc hien de tinh Tien Tour va ghi lich su dung the.
- Danh Sach Ban Hang phai hien ro "Dung the" va PTTT la "Khong thu tien".

## Cong no

- Chi khach hang co ho so moi duoc no.
- Khach le phai thanh toan du.
- Cong no la append-only trong `cong_no_khach_hang`.
- Moi phat sinh no phai lien ket `don_hang_id`.

## Trang thai chuan

Don hang:

- `draft`
- `da_thanh_toan`
- `no_mot_phan`
- `huy`

The lieu trinh nen thong nhat ve mot bo duy nhat:

- `active`
- `het_buoi`
- `het_han`
- `da_huy`

Neu UI muon hien thi tieng Viet thi map label, khong tao enum tieng Viet rieng.
