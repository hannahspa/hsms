# HSMS Test Matrix

> Moi tinh nang tien/kho/the/cong no phai co kich ban test truoc khi dung that.

## Ket qua test gan nhat - 2026-05-22

| Ma | Trang thai | Ghi chu |
|---|---|---|
| DB-025 | PASS | Remote da co `don_hang.vat`; `pos_finalize_order` nhan tham so `p_vat`. |
| DB-026 | PASS | Sua `pos_finalize_order`/`pos_void_order` khong ghi truc tiep `the_lieu_trinh.so_buoi_con_lai` vi cot nay la generated column. |
| POS-001/COM-001/FIN-001 | PASS ROLLBACK | Ban dich vu: chot don thanh cong, tao 1 `doanh_thu`, tao 1 ledger `tour`. Transaction rollback, khong de lai du lieu. |
| CARD-001/COM-002 | PASS ROLLBACK | Ban the lieu trinh moi: tao 1 `the_lieu_trinh`, tao 1 ledger `commission`, tao 1 `doanh_thu`. Transaction rollback. |
| CARD-003/CARD-007/COM-004 | PASS ROLLBACK | Dung the lieu trinh cu 0d: chot don khong PTTT, tao 1 `lich_su_dung_the`, tao 1 ledger `tour`, `so_buoi_da_dung` tang 2->3 va `so_buoi_con_lai` tu tinh 7. Transaction rollback. |
| CARD-005/COM-003 | PASS ROLLBACK | Huy don dung the cu: xoa ledger, xoa `lich_su_dung_the`, hoan `so_buoi_da_dung` 3->2 va `so_buoi_con_lai` ve 8. Transaction rollback. |
| CRM-001/COM-001 | PASS ROLLBACK | Audit ban dich vu doc lai duoc `lich_su_dich_vu_kh`: khach `Chi Thu Thao`, NV `Le Thi Cam My`, Tour 100,000d, Commission 0d. Transaction rollback. |
| CRM-002/COM-002 | PASS ROLLBACK | Audit ban the doc lai duoc `lich_su_dich_vu_kh`, tao 1 the moi gan NV ban, Commission 1,000,000d, Tour 0d. Transaction rollback. |
| UI-POS-002 | PASS TEST MODE | Tao don dich vu tu UI: chon KTV `Le Thi Cam My`, bat `TEST`, chot tien mat. Don `DH-20260522-003` co `is_test=true`, `doanh_thu_count=0`, ledger Tour test 40,089d. |
| UI-POS-003 | PASS | Sua vung bam Test Mode: bam vao ca cum label/cong tac deu toggle, tranh nham nhu chi bam duoc switch nho. |
| UI-POS-004 | PASS | Danh Sach Ban Hang hien ngay theo `don_hang.ngay` va gio Asia/Ho_Chi_Minh: `DH-20260522-003` hien `22/05/2026 · 11:36`, khong bi lech ve 21/05 theo timezone may. |
| UI-POS-005 | CLEANED | Don UI test tao nham khi Test Mode chua bat (`DH-20260522-002`) da duoc `pos_void_order`, `doanh_thu_count=0`, ledger=0, trang thai `huy`. |

## Ket qua test gan nhat - 2026-05-21

| Ma | Trang thai | Ghi chu |
|---|---|---|
| DB-022/023 | PASS | Supabase local/remote da len migration 023. `lich_su_dich_vu_kh` doc duoc 60,529 dong, khong timeout sau migration 023. |
| FIN-005 | PASS | Don test `is_test=true` khong ghi `doanh_thu` that. |
| COM-001 | PASS | Don `DH-20260521-001` sinh ledger `tour` 20,000d, `is_test=true`. |
| CARD-001/COM-002 | PASS TEST MODE | Don `DH-20260521-002` dong `the_moi` sinh ledger `commission` 20,000d; test mode khong tao the that. |
| POS-005/FIN-010 | PASS TEST MODE | Don `DH-20260521-003` trang thai `no_mot_phan`, con_no 500,000d; test mode khong tao `cong_no_khach_hang`. |
| CARD-003/CARD-007 | BLOCKED DATA | Bang `the_lieu_trinh` hien co 0 the. Can tao seed test/co che sandbox de test dung the cu 0d ma khong anh huong du lieu that. |
| INV-001..003 | BLOCKED DATA | Chua co san pham ton kho doc duoc qua test hien tai. Can seed san pham test hoac chon san pham co ton kho trong UI auth. |
| UI-POS-001 | PARTIAL | Browser da click them dich vu vao gio va hien thanh toan dung; buoc chon KTV bang automation chua on dinh, can test tay/bo sung selector ro hon. |

## POS: don co ban

| Ma | Kich ban | Ket qua dung |
|---|---|---|
| POS-001 | Khach le mua 1 dich vu, tra tien mat du | Don `da_thanh_toan`, tao 1 `doanh_thu tien_mat`, CRM khong bat buoc cap nhat |
| POS-002 | Khach co ho so mua 1 dich vu, tra chuyen khoan du | Don `da_thanh_toan`, tao 1 `doanh_thu chuyen_khoan`, cap nhat tong chi tieu/lan cuoi den |
| POS-003 | Don tra 2 phuong thuc: tien mat + chuyen khoan | Tao 2 dong `thanh_toan` va 2 dong `doanh_thu` dung so tien |
| POS-004 | Khach le tra thieu | Bi chan, khong cho chot don |
| POS-005 | Khach co ho so tra thieu | Don `no_mot_phan`, tao cong no |

## POS: the lieu trinh

| Ma | Kich ban | Ket qua dung |
|---|---|---|
| CARD-001 | Khach mua the moi 10 buoi | Don co dong `the_moi`, sau chot tao `the_lieu_trinh` |
| CARD-002 | Mua the moi co tang buoi | `so_buoi_tong = so_buoi_mua + so_buoi_tang` |
| CARD-003 | Dung 1 buoi tu the cu | Khong tao dong tien moi, tang `so_buoi_da_dung`, ghi `lich_su_dung_the` |
| CARD-004 | Dung buoi cu den het | Trang thai the thanh `het_buoi` |
| CARD-005 | Huy don co dung the cu | Hoan lai so buoi da dung va xoa lich su dung the cua don |
| CARD-006 | Huy don co mua the moi | The moi sinh tu don bi huy hoac xoa an toan |
| CARD-007 | Don chi dung the cu, tong thu 0d | Cho chot khong can PTTT, van bat buoc chon KTV va ghi Tien Tour |

## POS: kho

| Ma | Kich ban | Ket qua dung |
|---|---|---|
| INV-001 | Ban san pham | Tao `kho_giao_dich xuat_ban`, tru ton kho |
| INV-002 | Huy don co san pham | Hoan ton kho |
| INV-003 | Ban qua ton kho | Bi chan truoc khi chot |

## POS: hoa hong

| Ma | Kich ban | Ket qua dung |
|---|---|---|
| COM-001 | Dich vu co KTV | Dong hang co `nhan_vien_id`, `ti_le_hoa_hong`, `tien_hoa_hong` |
| COM-002 | Mua the co nhan vien ban | Bao cao hoa hong ban the tinh rieng |
| COM-003 | Don huy | Hoa hong don huy khong tinh vao bao cao |
| COM-004 | Dung the lieu trinh cu | Tien nhan vien hien la `Tien Tour`, khong hien la Commission |
| COM-005 | Ban the lieu trinh/san pham | Tien nhan vien ban hien la `Commission` / hoa hong ban |

## Tai chinh va doi soat

| Ma | Kich ban | Ket qua dung |
|---|---|---|
| FIN-001 | POS tien mat | Vi tien mat tang dung so tien |
| FIN-002 | POS chuyen khoan | Vi ngan hang loai `chuyen_khoan` tang dung so tien |
| FIN-003 | POS quet the | Vi loai `quet_the` tang dung so tien |
| FIN-004 | Dung buoi bang the lieu trinh | Khong tao thanh toan moi, khong lam tang vi |
| FIN-005 | Test mode | Don co `is_test=true`, khong ghi doanh thu that vao So Thu Chi |
| FIN-006 | Test mode co san pham | Khong tru ton kho that, khong tao `kho_giao_dich` |
| FIN-007 | Test mode co the lieu trinh cu | Khong tru buoi that, khong tao `lich_su_dung_the` |
| FIN-008 | Test mode co mua the moi | Khong tao `the_lieu_trinh` that |
| FIN-009 | Test mode co khach hang | Khong cong `tong_chi_tieu`, `so_lan_den`, `lan_cuoi_den` |
| FIN-010 | Test mode con no | Khong tao `cong_no_khach_hang` that |

## Auth va layout

| Ma | Kich ban | Ket qua dung |
|---|---|---|
| APP-001 | Admin vao `/admin` | Thay AdminShell va dung phan quyen |
| APP-002 | Le tan vao `/admin` | Bi chan, dieu huong ve khu duoc phep |
| APP-003 | Resize desktop/mobile | Khong loi hooks, khong crash |
| APP-004 | Build production | `npm run build` pass |
