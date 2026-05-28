# Working Agreement: Anh Nam + Codex

> Cach lam viec de hoan thien HSMS bang goi Plus truoc, tiet kiem context va tranh lam lech du an.

## Dung cua so hien tai hay tao lai?

Dung cua so hien tai de bat dau la duoc.

Lan sau, cach tot nhat:

1. Mo Codex tai thu muc `C:\Users\Quoc Nam\Projects\hsms`.
2. Dam bao local dev server dang chay neu can test UI.
3. Noi ro muc tieu ngan: vi du "tiep tuc Phase 1" hoac "sua POS chot don".
4. Neu MCP chua hien resource, Codex se doc truc tiep `knowledge/` va `plans/`.

Khong can tao repo moi. Repo `hsms` chinh la du an lam viec chung.

## Cac file bat buoc doc truoc khi code

- `plans/MASTER_ROADMAP_MYSPA_HANNAH.md`
- `plans/POS_SOURCE_OF_TRUTH.md`
- `plans/TEST_MATRIX.md`
- `src/DESIGN_SYSTEM.md`
- File code lien quan truc tiep den task

## Cách dung goi Plus 20 USD

De tiet kiem:

- Moi ngay lam 1-2 muc tieu ro, khong mo qua nhieu nhanh cung luc.
- Uu tien task co tac dong cao: POS, enum, RPC, test.
- Dung `plans/` de giam viec giai thich lai.
- Khi can phan tich MySpa, uu tien anh chup man hinh/flow cu the thay vi yeu cau doc het web nhieu lan.

## Nhip lam viec de xong nhanh

Moi phien nen theo mau:

1. Chon mot phase va mot module.
2. Codex doc file lien quan.
3. Codex sua nho, build/test.
4. Anh Nam xem UI va noi "dung/sai voi spa".
5. Cap nhat plan neu nghiep vu thay doi.

## Uu tien dau tien

1. Phase 1: sua nen tang va build.
2. Phase 2: dua POS chot don ve mot luong an toan.
3. Sau do moi mo rong CRM, the, bao cao, luong.

## Quy tac an toan

- Khong revert file anh Nam da sua neu khong duoc yeu cau.
- Khong chay migration production neu chua xac nhan.
- Khong dung credential that trong plan.
- Moi logic tien/kho/the/cong no phai co test case trong `TEST_MATRIX.md`.

