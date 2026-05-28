# MySpa -> HSMS Gap Analysis

> Muc tieu: doi chieu cac module desktop MySpa voi HSMS hien tai de phat trien tiep, khong lam lai tu dau.

## Ket luan tong quan

HSMS da co nen tot hon MySpa o cac diem:

- Co So Thu Chi rieng, vi tien, doi soat.
- Co cham cong, off, luong, ky quy.
- Co kho hang co lien ket chi phi.
- Co landing page, menu iPad, check-in mobile.
- Co schema POS, CRM, the lieu trinh, cong no, hoa hong.

MySpa dang manh hon HSMS o cac diem:

- Desktop list/detail pattern da day du va quen tay.
- POS flow co nhieu lien ket thuc chien.
- Danh sach ban hang co nhieu cot doi soat.
- Bao cao MySpa tach nhieu nhom theo don, PTTT, cong no, the dich vu, commission.

Chien luoc:

- Giu schema/logic HSMS.
- Hoc bo cuc va flow MySpa desktop.
- Nang cap POS/RPC de dong bo du lieu chat hon MySpa.

## Mapping module

| MySpa | HSMS hien tai | Trang thai | Huong lam |
|---|---|---|---|
| Home/Dashboard | `/admin/dashboard`, `/admin` | Co | Desktop dashboard can gom KPI van hanh + tai chinh + canh bao |
| Khach hang | `/admin/crm` | Co | Can them table day du, search/filter, dung `so_lan_den` that |
| Dat hen | `lich_hen` schema, UI chua uu tien | Thieu UI | Lam sau POS desktop |
| Tao don hang | `/pos` | Co, dang phat trien | Can chot logic atomic, desktop UX giong MySpa |
| Danh sach ban hang | `/pos/danh-sach` | Co | Can them cot doi soat, cong no, commission, ghi chu, action |
| The lieu trinh | `/admin/the-lieu-trinh` | Co | Can link nguon don, lich su dung, so buoi tang, trang thai chuan |
| The tra truoc | Chua ro module rieng | Thieu/khong uu tien | Chi ho tro so du cu/tra no/khau tru |
| Thu chi tien hang | `/SoThuChi` | Co va manh hon | Can noi POS thuc thu vao vi dung, test mode tach rieng |
| Bao cao doanh thu | `/SoThuChi/bao-cao`, dashboard | Co | Can tach thuc thu, PTTT, the, san pham, chi phi, loi nhuan |
| Bao cao cong no | `cong_no_khach_hang`, UI chua ro | Thieu UI | Can trang cong no theo khach/don |
| Bao cao the dich vu | `/admin/the-lieu-trinh` | Mot phan | Can bao cao ban the/dung the/doanh thu thuc hien |
| Bao cao commission | `/admin/commission` | Co | Can lay du lieu tu line item va loai don huy |
| Nhan vien | `/admin/nhan-su` | Co va manh hon | Giu HSMS, bo sung table desktop neu can |
| Dich vu | `dich_vu`, menu iPad | Co | Can admin CRUD/list desktop MySpa-like neu chua du |
| San pham | `/admin/kho-hang` | Co | Can list san pham + kho + giao dich ro hon |
| Kho ban | `/admin/kho-hang` | Co | Can can ton, lich su nhap/xuat, phieu nhap/xuat |
| PTTT | Constants + vi | Co | Chot 4 PTTT Hannah, khong mo rong theo MySpa |

## Uu tien desktop

### Uu tien 1: POS core

Can lam truoc:

- Sua flow chot don thanh mot RPC an toan.
- Chuan hoa `the_moi`, `the_lieu_trinh`, `the_tra_truoc`.
- Danh sach ban hang desktop day du cot.
- Huy don dao nguoc du lieu.
- Test matrix cho don hang, the, kho, cong no, hoa hong.

Ly do:

- POS la goc cua doanh thu, cong no, the, commission, CRM, kho.
- Neu POS sai, cac module sau deu sai.

### Uu tien 2: CRM + The lieu trinh

Can lam sau POS:

- CRM table desktop day du hon.
- Ho so khach doc tong chi tieu, so lan den, lan cuoi den tu don hang.
- The lieu trinh link don goc, lich su dung, so buoi tang, han the.
- Cong no theo khach.

### Uu tien 3: Bao cao

Can lam khi data POS on:

- Bao cao doanh thu theo PTTT.
- Bao cao cong no.
- Bao cao the lieu trinh.
- Bao cao commission.
- Bao cao thu chi/lai lo co chi phi.

### Uu tien 4: Kho va dich vu

Can lam song song sau POS:

- Danh sach dich vu desktop.
- Danh sach san pham.
- Kho ban, nhap/xuat, can ton.
- Giao dich POS ban san pham lien ket kho.

## Nhung gi khong lam lai

Khong lam lai:

- Auth/context goc.
- Router tong neu chua can.
- Landing page.
- Check-in mobile.
- Menu iPad.
- So Thu Chi da co.
- Bang luong da co logic nen.

Chi refactor khi:

- Co loi build/runtime.
- Can de noi POS atomic.
- Mau thuan enum/trang thai lam sai du lieu.

## Dieu can kiem tra trong code HSMS truoc khi sua

- `src/apps/pos/PosApp.jsx`
- `src/services/posService.js`
- `src/apps/pos/PosOrderHistory.jsx`
- `src/apps/admin/the-lieu-trinh/AdminTheLieuTrinhPage.jsx`
- `src/apps/admin/crm/AdminCRMPage.jsx`
- `src/apps/admin/commission/AdminCommissionPage.jsx`
- `supabase/migrations/017_pos_test_mode.sql`
- `supabase/migrations/016_pos_buy_card.sql`
- `supabase/migrations/011_fix_rpc_functions.sql`
- `src/constants/enums.js`

## Dinh nghia buoc tiep theo

Buoc tiep theo sau khi note MySpa:

1. Chay build de biet loi hien tai.
2. Sua loi nen tang desktop neu co.
3. Sua `AdminShell` hook/order neu can.
4. Doi chieu enum 4 PTTT trong frontend + SQL + knowledge.
5. Lap patch POS atomic theo `POS_SOURCE_OF_TRUTH.md`.

