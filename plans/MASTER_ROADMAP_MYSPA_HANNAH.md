# HSMS Master Roadmap: MySpa Flow, Hannah Spa System

> Muc tieu: mo phong luong van hanh quen thuoc cua myspa.vn, nhung xay thanh he thong Hannah Spa dong bo hon: POS, CRM, the lieu trinh, kho, thu chi, hoa hong, luong va bao cao cung dung mot nguon du lieu.

## Nguyen tac san pham

1. MySpa la tham chieu UX, khong phai gioi han san pham.
2. POS la trung tam phat sinh du lieu van hanh.
3. Moi dong tien phai di qua enum thanh toan thong nhat.
4. Moi thay doi anh huong tien, kho, the, cong no phai co kha nang doi soat va huy/dao nguoc.
5. Giao dien Admin giu phong cach Hannah Luxury: espresso sidebar, champagne accent, table-first, thao tac nhanh.

## Nguon context bat buoc

- `AGENTS.md`
- `src/DESIGN_SYSTEM.md`
- `knowledge/architecture/unified-data-model.md`
- `knowledge/database/tables.md`
- `knowledge/business/finance.md`
- `knowledge/business/salary.md`
- `knowledge/business/attendance.md`
- `knowledge/domain/data-migration.md`
- `plans/pos-fix-plan.md`

## Phase 0: Dong bo du an

Muc tieu: bien repo hien tai thanh mot du an co truc lam viec ro rang.

- Tao bo tai lieu roadmap, POS source of truth, test matrix.
- Xac dinh file nao la source of truth khi code.
- Khong tao repo moi neu chua can; tiep tuc tren `C:\Users\Quoc Nam\Projects\hsms`.
- Moi thay doi lon phai cap nhat `plans/` hoac `knowledge/` tuong ung.

Ket qua mong doi:

- Codex va anh Nam cung nhin mot ban do.
- Lan sau mo lai van tiep tuc duoc, khong phai giai thich lai tu dau.

## Phase 1: On dinh nen tang

Muc tieu: app chay on dinh truoc khi mo rong nghiep vu.

- Kiem tra build hien tai.
- Sua loi hooks/order trong `AdminShell`.
- Xac minh route chinh: `/admin`, `/pos`, `/SoThuChi`, `/checkin`, `/menu`.
- Xac minh dang nhap local va phan quyen admin/le_tan.
- Chuan hoa 4 phuong thuc thanh toan dang dung cua Hannah: tien mat, chuyen khoan MB, quet the TP, the tra truoc.
- Tach ro `the_lieu_trinh` la dong su dung buoi, khong phai phuong thuc thanh toan.
- Chuan hoa trang thai the lieu trinh giua frontend, SQL, knowledge.

Uu tien: cao.

## Phase 2: POS loi giong MySpa, manh hon MySpa

Muc tieu: tao mot don hang duy nhat gom dich vu, san pham, mua the moi, dung the cu, nhieu phuong thuc thanh toan, cong no.

- POS khong chi la man hinh thanh toan; POS phai noi khach hang, nhan su/KTV, So Thu Chi, kho, the lieu trinh, cong no, CRM, hoa hong va bao cao.
- Truoc khi thay doi logic POS, doi chieu `plans/POS_DATA_FLOW_BLUEPRINT.md`.
- Truoc khi nhan su test tren he thong chinh, Test Mode phai khong cham du lieu that: So Thu Chi, kho, the lieu trinh, CRM counters, cong no.
- Chot don qua mot RPC duy nhat.
- `the_moi` phai duoc tao the lieu trinh trong cung giao dich chot don.
- Huy don phai dao nguoc: doanh thu, kho, cong no, lich su dung the, the moi da tao.
- Test mode khong lam ban So Thu Chi.
- Luu day du hoa hong KTV thuc hien va nhan vien ban the.
- Tao lich su don hang de tra cuu nhu MySpa.

Uu tien: rat cao.

## Phase 3: CRM va The Lieu Trinh

Muc tieu: moi khach hang co ho so song, cap nhat tu don hang that.

- Tong chi tieu, so lan den, lan cuoi den lay tu `don_hang`.
- The lieu trinh co trang thai thong nhat.
- Xem lich su dung the theo don.
- Canh bao sap het buoi, sap het han.
- Tim kiem theo ten, so dien thoai, ma khach, ma the.

Uu tien: cao.

## Phase 4: Thu Chi, Kho, Bao Cao

Muc tieu: MySpa chi ghi doanh thu, HSMS phai dong bo tai chinh that.

- POS sinh doanh thu dung theo tung khoan `thanh_toan`.
- Doanh thu khong vao dong tien: `the_tra_truoc`, `the_lieu_trinh` phai duoc xu ly dung ban chat.
- Ban san pham tru kho.
- Nhap kho co lien ket chi phi khi can.
- Doi soat ngay khoa so lieu theo vi.
- Dashboard lay tu nguon thong nhat, khong tinh chay tung man hinh.

Uu tien: cao.

## Phase 5: Hoa Hong va Luong

Muc tieu: cuoi thang tinh duoc tien tra that.

- Tien tour tu `don_hang_chi_tiet`.
- Hoa hong ban the lieu trinh tach rieng.
- Luong kinh doanh doc tu POS thay vi import thu cong.
- Luong cung doc tu cham cong, off, tang ca, ky quy.
- Trang thai chot luong va khoa ky luong.
- KTV xem luong truc tiep tren app; khong xuat phieu luong PDF.

Uu tien: trung-cao.

## Phase 6: MySpa UX + Hannah Luxury UI

Muc tieu: nhan vien thao tac quen nhu MySpa, nhung giao dien thuoc ve Hannah Spa.

- Table-first cho danh sach.
- Search/filter/action nam o dau trang.
- Badge trang thai thong nhat.
- Admin desktop uu tien 1280px+.
- POS toi uu cho le tan thao tac nhanh.
- Checkin mobile rieng, Menu iPad rieng.

Uu tien: lien tuc trong moi phase.

## Dinh nghia hoan thanh

Mot tinh nang chi duoc xem la xong khi:

- Chay duoc tren local.
- Build khong loi.
- Co it nhat mot kich ban test trong `TEST_MATRIX.md`.
- Neu anh huong tien/kho/the/cong no thi co duong huy hoac doi soat.
- UI dung `src/DESIGN_SYSTEM.md`.
