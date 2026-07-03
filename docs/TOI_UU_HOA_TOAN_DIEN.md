# KẾ HOẠCH TỐI ƯU HÓA TOÀN DIỆN HSMS
> Khởi tạo: 30/06/2026 · Chủ trì: anh Nam · Thực hiện: Claude
> Mục tiêu: đưa từng module đến "hoàn hảo cuối cùng" — code chặt, logic đúng,
> bảo mật kín, chống thất thoát tiền, giao diện đồng bộ theo ngôn ngữ thiết kế 2026.

---

## 0. NGUYÊN TẮC LÀM VIỆC (BẮT BUỘC)

1. **KHÔNG fix vội.** Mỗi module: phân tích sâu TRƯỚC → chốt với anh Nam → mới sửa.
2. **Backup trước khi chạm source:** mỗi module tạo 1 git checkpoint local
   (`git add -A && git commit -m "checkpoint: trước tối ưu <module>"`) — KHÔNG push
   (theo feedback_no_push). Lỗi → `git revert`/`git reset` là khôi phục được.
3. **Changelog:** mỗi thay đổi ghi 1 dòng vào mục "NHẬT KÝ THAY ĐỔI" cuối file này.
4. **Đồng bộ UI:** dùng `components/ui/*` (Modal/Button/Field/Badge/Card) — KHÔNG
   tự viết popup/nút inline. Đọc `src/DESIGN_SYSTEM.md` + taste-skill trước khi sửa UI.
5. **Tiếng Việt** toàn bộ. Số tiền INTEGER, `getNowVN()`, `DatePicker.jsx`.

---

## 1. QUYẾT ĐỊNH ĐÃ CHỐT (từ anh Nam 30/06)

- **B1 — Lương NV vào/nghỉ giữa tháng:** ĐÚNG như mong muốn. NV vào ngày 20 →
  chỉ tính công từ ngày 20. "Đi làm bao nhiêu ngày trả bấy nhiêu ngày."
  → `tinhLuong` PHẢI đọc `ngay_bat_dau` (và ngày nghỉ việc) để giới hạn khung ngày,
  KHÔNG tính no-show cho ngày trước khi vào làm.
- **B2 — Sửa đơn phải đồng bộ TẤT CẢ:** 1 đơn liên kết khách + KTV làm + NV nhận
  hoa hồng/tour (thu nhập NV). Sửa đơn/đổi ngày → đồng bộ luôn `nhan_vien_thu_nhap`
  (tiền tour, hoa hồng, ngày ghi nhận) + công nợ + thẻ. Fix đồng bộ toàn diện.
- **B3 — Làm rõ PTTT vs Ví (nâng cấp):**
  - a. **Phương thức thanh toán (PTTT)** = cách khách trả: `Tiền Mặt · Chuyển Khoản ·
    Quẹt Thẻ · Tài Khoản Trả Trước`. Dùng cho ĐƠN HÀNG của khách.
  - b. **Ánh xạ PTTT → Tài khoản/Ví** là CẤU HÌNH có thể đổi theo thời gian
    (VD: Chuyển Khoản năm nay về TK X, sang năm về TK Y). Báo cáo số dư theo
    NGÂN HÀNG/VÍ, không theo PTTT. → cần bảng ánh xạ có hiệu lực theo thời gian
    + view số dư ví tính theo `vi_id` (không phải `hinh_thuc`).
  - → Kết quả: luôn biết "tiền đang nằm ở tài khoản nào, còn bao nhiêu".
- **B4 — Lễ Tân Ca A/Ca B:** Lễ Tân & KTV là 2 nhóm riêng biệt. 2 Lễ Tân tự hoán
  đổi ca A/B với nhau, tự quyết. Cuối tháng chỉ KIỂM ĐẾM & TỔNG HỢP, không ép hệ số.

## 1b. GHI NHẬN LÀM SAU (không làm bây giờ)

- **Dashboard + Báo cáo ngày:** hiện sơ sài, thiếu realtime, NV còn làm tay.
  Anh Nam muốn 1 báo cáo DUY NHẤT đọc là hiểu tình trạng spa + biết việc cần làm tiếp.
  → GOM vào GIAI ĐOẠN CUỐI, làm 1 lần toàn diện sau khi tối ưu xong các module nền.
  Trong lúc tối ưu từng module: GHI CHÚ số liệu nào cần để phục vụ báo cáo tổng.

---

## 2. BẢN ĐỒ MODULE (bức tranh toàn cảnh)

### Cổng vào (entry points — App.jsx)
| Path | App | Đối tượng |
|---|---|---|
| `/` | LandingPage (12 sections) | Khách (công khai) |
| `/menu` | CustomerMenuApp | Khách tại quầy (iPad) |
| `/quay` | CustomerWheelApp | Khách (vòng quay) |
| `/SoThuChi` | InternalApp (10 tab) | Lễ Tân |
| `/pos` | PosApp | Lễ Tân + Admin |
| `/admin` | AdminApp (21 module) | Admin |
| `/checkin` | CheckinApp (PIN) | KTV / Tạp vụ |
| `/portal` | HomePage | Nội bộ |
| `/shop` | (placeholder) | — |

### 13 Module nghiệp vụ (đơn vị tối ưu)
1. **Nền tảng chung** — Auth/phân quyền, RLS, Design System, `components/ui`, bảo mật.
2. **POS Bán Hàng** — đơn, dòng hàng, thanh toán, tour/hoa hồng, nợ, thẻ, combo.
3. **Sổ Thu Chi / Tài Chính** — 10 tab (Tổng Quan, Danh Sách, Đối Soát, Chốt Ngày,
   Kiểm Soát Chi, Nhật Ký Ngày, Báo Cáo, Nhập Liệu, Cài Đặt, Lịch Hẹn), ví, PTTT.
4. **Nhân Sự** — hồ sơ, chấm công, xét duyệt OFF, lịch điều động, tạo OFF.
5. **Lương & Thu Nhập** — bảng lương 2 kỳ, quỹ ngày lễ, báo cáo thu nhập, lương KTV.
6. **Check-in KTV** — home, chấm công, lịch, đăng ký OFF, đổi PIN/avatar, lương, thu nhập.
7. **CRM Khách Hàng** — hồ sơ, phân hạng, lịch sử.
8. **Thẻ Liệu Trình & Combo** — thẻ, combo, checkout buổi, công nợ, báo cáo, hết hạn.
9. **Kho Hàng & Sản Phẩm** — nhập/xuất, tồn, cảnh báo, kiểm kê, đơn vị quy đổi.
10. **Dịch Vụ & Khuyến Mãi** — CRUD DV, danh mục, giá; KM (giảm giá/mua X tặng Y), ROI.
11. **Lịch Hẹn & Điều Phối** — đặt hẹn, timeline, bảng điều phối realtime.
12. **Marketing / CSKH / Zalo OA** — hộp thư, chăm sóc lại, nhắc thẻ, win-back, voucher, vòng quay admin.
13. **Website công khai** — Landing, Menu iPad, Vòng quay khách.
14. **(GĐ cuối) Dashboard & Báo Cáo Tổng Hợp** — làm toàn diện 1 lần.

---

## 3. THỨ TỰ TỐI ƯU ĐỀ XUẤT

- **GĐ0 · Nền tảng** (Design System + audit bảo mật/RLS + chuẩn component) —
  điều kiện để đồng bộ UI mọi module.
- **GĐ1 · POS** (trái tim dòng tiền + B2)
- **GĐ2 · Tài Chính/Sổ Thu Chi** (B3 + dọn dead code)
- **GĐ3 · Nhân Sự + Lương** (B1, B4)
- **GĐ4 · CRM + Thẻ + Công nợ**
- **GĐ5 · Kho + Dịch Vụ + Khuyến Mãi**
- **GĐ6 · Lịch Hẹn**
- **GĐ7 · Check-in KTV**
- **GĐ8 · Marketing/CSKH**
- **GĐ9 · Website công khai**
- **GĐ10 · Dashboard + Báo cáo tổng hợp** (cuối cùng)

Mỗi GĐ = 1 chu trình: PHÂN TÍCH SÂU → chốt → BACKUP → SỬA → GHI CHANGELOG → build → báo cáo.

---

## 4. NHẬT KÝ THAY ĐỔI
| Ngày | Module | Thay đổi | Commit |
|---|---|---|---|
| 30/06 | — | Khởi tạo kế hoạch, chốt B1–B4, bản đồ 13 module | (chưa) |
| 30/06 | GĐ0-A | Audit bảo mật VPS: phát hiện anon mở toàn quyền ~120 object (xem memory project_lo_hong_bao_mat_rls) | — |
| 30/06 | GĐ0-A | Soạn migration `129_bao_mat_lop1a_revoke_anon.sql` (REVOKE anon, giữ whitelist 13). CHỜ anh Nam duyệt → backup → chạy | (chưa) |
| 01/07 | GĐ0-A | ✅ ĐÃ CHẠY 129 trên VPS (backup /tmp/schema_before_129.sql + rollback_grants_anon_129.sql). Verify: 13 whitelist đọc OK, bảng tiền anon bị chặn. Internet không còn truy cập DB tiền/khách/profiles | (migration only) |
| 01/07 | GĐ0-A 1b-1 | ✅ ĐÃ CHẠY `130_checkin_rpc_secure.sql`: bảng checkin_session + login_attempt, cột selfie/gps trên cham_cong, 13 RPC SECURITY DEFINER (đăng nhập/me/home/lich/luong/thu_nhap/cham_cong+GPS server+selfie/bổ sung giờ ra/off/đổi pin/avatar). Test PASS: KTV chỉ thấy data mình, token rác bị từ chối, PIN sai khóa. GPS verify SERVER-SIDE. CHƯA revoke (app cũ vẫn chạy) | (migration only) |
| 01/07 | GĐ0-A 1b-3 | ✅ 10/10 màn checkin → RPC + SelfieCapture. migration 131-134. Build+RPC test PASS. PUSH main (885efe5) → Vercel. CHỜ nhân viên test check-in ngày mai → rồi 1b-4 REVOKE | 885efe5 |
| 01/07 | GĐ0-B | Xóa 3 dead code (DoiSoatNgay, NopTienMat, bao-cao/components/LichSuNopTienMat) — build PASS. Phát hiện: JS tokens ĐÃ hợp nhất (lux.js re-export colors.js); còn LỆCH GIÁ TRỊ JS↔CSS var (nền #FAF7F4 vs #f3ece1, chữ #1A1209 vs #2a201a). DESIGN_SYSTEM.md lỗi thời | (chưa commit) |
| 02/07 | GĐ0-B Lô2 Nhóm1 | ✅ FormDoanhThu + FormChiPhi + EditTransactionModal → RightPanel chuẩn (bỏ overlay/sheet/header tự vẽ, nút Lưu vào footer). ExpenseEntryForm = card nhúng inline (không phải popup, đã dùng ui/Modal) → giữ nguyên. Build PASS. Xác minh chrome-devtools: FormChiPhi + FormDoanhThu render đúng (header gradient, footer cố định, sub-picker OK) | (chưa commit) |
| 02/07 | F1-POS | ✅ QUY TẮC MỚI (anh Nam): chốt đơn POS CHẶN CỨNG khi (a) dòng dịch vụ/dùng thẻ chưa gán KTV, (b) chưa STICK TIỀN TOUR — thông báo nêu ĐÍCH DANH tên dịch vụ còn thiếu. PHỤ THU được quyền gán hoặc không gán tour (0đ hợp lệ); bảo hành free_warranty = 0đ chính thức. Chống sót tiền tour KTV. Vá 21 catch nuốt lỗi POS: update tiền (qty/giảm giá/gán KTV/toggle thẻ/upsale) nay CHECK error + báo + không lệch UI/DB; voidOrder fail → dừng báo ngay; update khách/ngày đơn fail → THROW dừng chốt; còn lại console.warn. PosApp/posService/PosOrderHistory/PosProductCatalog/PosCustomerSelect | checkpoint |
| 02/07 | F2-Lương | ✅ B1 VÀO CODE: tinhLuong đọc ngay_bat_dau — NV vào giữa tháng không bị no-show/không công ngày trước khi vào (trả về ngayTruocVaoLam); TabBangLuong select thêm ngay_bat_dau; thiếu cột (RPC cũ) → hành xử như cũ. Hợp nhất tinhHeSo/tinhTangCa (2 bản copy CheckinChamCong + AdminSuaChamCong) → lib/luong.js exports tinhHeSoChamCong/tinhTangCaChamCong/toPhut/CA_*_CHUAN | checkpoint |
| 02/07 | F3-Vệ sinh | ✅ zns.js sai NGÀY UTC (tin gửi 0h–7h sáng ghi ngày hôm trước) → todayISO(); CRM so hạn thẻ theo giờ máy → so chuỗi ISO với todayISO(); CustomerMenuApp/KhoHang bỏ 5 bản convert-VN tự viết → dùng lib/utils; VongQuay giờ lịch sử thêm timeZone VN. AdminApp useStats bắt lỗi (hết treo "..."); App.jsx so path Lễ Tân theo ĐOẠN (chặn /admin/crm-xyz lọt). KhuyenMai form: 2 input type=date → DatePicker chuẩn + bỏ todayISO local. KHÔNG đụng AdminMarketingPage/MarketingModulePage (session khác đang dở) | checkpoint |
| 02/07 | F4-Test | ✅ Bộ test lương ĐẦU TIÊN: scripts/test_luong.mjs — 15 case (full công/OFF hạn/vượt/T7 ×2/no-show/B1 ×3/về sớm/tăng ca/ký quỹ/Lễ Tân Ca A/hệ số chung/todayRef) → 15 PASS. Lệnh `npm run test:luong` (bundle rolldown). QUY TẮC: sửa luong.js phải chạy lại | checkpoint |
| 02/07 | F3b-CÒN LẠI | ⏳ input type=date còn: KhoHang (4 form + 2 filter), CRM (ngày sinh — cân nhắc DatePicker khó lùi năm xa), Checkin mobile (GIỮ native — mobile picker tốt hơn). Làm ở Lô 4 UI kèm screenshot | — |
| 02/07 | BUG MẤT TOUR | 🔴→✅ TÌM RA + FIX bug ăn tour âm thầm: join `nhan_vien:nhan_vien_id(ho_ten, avatar_url)` THIẾU `id` → KtvPopup mở sửa tour dòng resume → lưu → nhan_vien_id thành NULL (chip vẫn hiện tên!). Fix 3 lớp: (1) posService join thêm id (2 chỗ), (2) KtvPopup bổ sung id từ nhan_vien_id, (3) handleAssignKTV không ghi đè null. Đã vá snapshot yc 4d566be8 (Chị Duyên — Cẩm My). ⚠ CÒN 6 dòng T5-T7/2026 mất KTV cần gán lại tay (xem báo cáo 02/07); các dòng 2019 là import MySpa — bỏ qua | checkpoint |
| 02/07 | B1+TĂNG CA CHỐT | ✅ Anh Nam chốt: (1) B1 — ngày nào CHECK-IN là tính công ngày đó (code đúng, giữ nguyên); (2) TĂNG CA — thực làm mới tính: tinhLuong đổi NGUỒN sang cột tang_ca_gio (app checkin ghi 0 + cho_duyet; admin duyệt = điền số thật qua Sửa Chấm Công); hết trả ảo 20 ca ra trễ 15-30p T6. Fallback tự tính chỉ khi bản ghi không mang cột. QUÊN CHECK-OUT: gio_ra null/bổ sung hôm sau → tang_ca_gio=0 → không ảo. Test 17/17 PASS | checkpoint |
| 02/07 | TIẾN ĐỘ ĐÃ XONG (tránh làm lại!) | ✅ 1b-4 REVOKE: migration 136 ĐÃ CHẠY VPS — verify 02/07: nhan_vien/cham_cong/bang_luong/doanh_thu... anon BỊ CHẶN, chỉ còn dich_vu+khuyen_mai+homepage_config đọc công khai (đúng thiết kế). ✅ BACKUP VPS 2 LỚP ĐÃ CHẠY ĐỀU: cron 19:00 `/root/backup.sh` — pg_dump 79MB/ngày giữ 7 ngày local + rclone lên `gdrive:hsms-backups/` giữ 30 bản (verify: bản 01/07+02/07 đủ, test run 03/07 OK). KHÔNG cần làm lại 2 việc này | — |
| 02/07 | MARKETING PORT (việc kế tiếp — 1 PHIÊN RIÊNG) | ⏳ Khảo sát xong: bản mới MarketingModulePage ĐÃ CÓ FanpageActions/CampaignsPage/ChannelSettings/duyệt ai_examples. CÒN THIẾU 5 cụm GHI từ bản cũ (AdminMarketingPage): (1) CRUD chien_dich_marketing (dòng ~100/520), (2) CRUD marketing_leads (~862/964), (3) marketing_content_calendar insert (~1056), (4) ĐẶT HẸN TỪ LEAD → tạo khach_hang + lich_hen (~1194-1231), (5) duyệt marketing_ai_actions (~1849-1861). Port xong 5 cụm → xóa AdminMarketingPage + route ban-cu + 2 link (MarketingModulePage:435,740) | — |

## 6. GĐ0-B · CHUẨN HÓA MÀU (khuyến nghị của Claude — anh Nam giao tự quyết)
**Chọn TÔNG ẤM (kem-espresso) làm chuẩn CHUNG.** Lý do: (1) hợp thương hiệu spa sang
trọng ấm áp; (2) Admin (anh Nam xem nhiều từ Mỹ) đang tông ấm → không xáo trộn;
(3) DESIGN_SYSTEM.md mô tả tông này → tài liệu khớp lại. Accent giữ champagne #c9a96e.

**Bản đồ đồng bộ (chỉ sửa colors.js cho khớp hannah-admin.css :root):**
| Token | Đổi C.* trong colors.js thành | (khớp CSS var) |
|---|---|---|
| bg | #f3ece1 | --bg |
| surface | #fbf7ef | --surface |
| card/surface2 | #ffffff | --surface2 |
| text/ink | #2a201a | --ink |
| textSub/ink2 | #5a4a3e | --ink2 |
| textMute/ink3 | #8e7a68 | --ink3 |
| border/line | #e8dcc8 | --line |
| line2 | #d4c4ad | --line2 |
| espresso | #3d2c20 (giữ, tách khỏi ink) | --espresso |
→ Sau đổi: LUX/COLORS tự khớp (re-export). Internal/Checkin/POS đổi sang tông ấm = đồng bộ Admin.

**QUAN TRỌNG — thực thi có kiểm tra thị giác:** đổi màu ảnh hưởng TOÀN giao diện.
KHÔNG đổi "mù" rồi push. Cần: sửa colors.js → chạy dev/screenshot từng vùng
(Admin/Internal/Checkin/POS/Menu) đối chiếu → chỉnh → mới push. Làm khi có thể xem UI.

**Còn lại GĐ0-B:** viết DESIGN_SYSTEM.md v2 (khớp token thật + nguyên tắc 2026:
khoảng trắng rộng, bo mềm, accent tiết chế, quy tắc mật độ nhiều/ít nội dung, mọi
popup qua ui/Modal, mọi nút qua ui/Button); phủ ui/Modal+Button thay popup/nút inline.

## 7. GĐ0-B · CHUẨN HÓA "THỐNG NHẤT" (anh Nam chỉ ra 01/07 — VẤN ĐỀ CHÍNH)
Anh Nam: các trang NGOÀI đã đẹp, nhưng ĐI SÂU thì "mỗi popup một kiểu", tiền tệ
"đ đ" 2 chữ / số dài bị cắt-ẩn — "không có sự thống nhất nào hết". Đã đo:

### 7.1 Tiền tệ (gốc: nhiều hàm format lẫn lộn)
- `formatCurrency(n)` (utils) = ĐÃ kèm "đ". Chỗ thêm "đ" nữa → "đđ" (đã fix TongQuanPage:330).
- `fmt` local ở mỗi file KHÁC nhau: printReceipt=không đ; wheel/AdminNhacLieuTrinh=có đ;
  CheckinChamCong `fmt`=GIỜ; CheckinDangKyOff `fmt`=NGÀY → nhập nhằng nghĩa.
- `fmtInput`/`fmtNumber` (posShared/marketing) = không đ → phải thêm "đ" tay.
- Số dài bị cắt: ô tiền có `whiteSpace:nowrap`+overflow/ellipsis hoặc width hẹp.
- **CHUẨN:** tiền LUÔN dùng `formatCurrency` (có đ). Cấm định nghĩa fmt-tiền local.
  Đổi tên fmt giờ→`fmtGio`, ngày→`fmtNgay`. Ô tiền: `nowrap` + đủ rộng + `tabular-nums`,
  KHÔNG ellipsis. Cân nhắc component `<Money value/>` dùng chung.

### 7.2 Popup (76 overlay `position:fixed;inset:0` ở 52 file, chỉ 1 dùng ui/Modal)
- Mỗi popup tự viết: overlay bg (rgba .5/.6/.42...), radius (16/20/28), animation có/không,
  header/footer/nút đóng mỗi kiểu → KHÔNG đồng bộ.
- **CHUẨN:** mọi popup qua `components/ui/Modal` (overlay+blur+animation+ESC+size sm/md/lg/xl
  + header icon/title/subtitle + footer nút). Nút trong modal qua `ui/Button`.

### 7.3 Thực thi theo LÔ (làm khi context tươi, mỗi lô 1 lượt, build+screenshot mỗi lô)
- Lô 1: Tiền tệ toàn hệ thống (rà + fix double/thiếu/cắt + chuẩn formatCurrency).
- Lô 2: Popup Internal (thu-chi forms, cai-dat, tong-quan).
- Lô 3: Popup POS (payment, cartline, ktv, debt, naptra).
- Lô 4: Popup Admin (nhan-su, the-lieu-trinh, crm, kho).
- Lô 5: Popup Checkin (mobile) — ChamCong/DangKyOff/... về ui/Modal (bản mobile).
| | | ⚠️ Phát hiện: avatar_url lưu base64 khổng lồ trong nhan_vien → tối ưu sau (chuyển Storage URL). Không chặn tiến độ |

## 5. TRẠNG THÁI BẢO MẬT GĐ0-A
- [x] Audit RLS/grant toàn DB
- [x] LỚP 1a: REVOKE anon nhóm an toàn (migration 129 — ĐÃ CHẠY 01/07, verify OK)
- [~] LỚP 1b: RPC-hoá app /checkin
  - [x] 1b-1 DB core: migration 130 (13 RPC + session + selfie/gps) — ĐÃ CHẠY + test PASS 01/07
  - [ ] 1b-2 Storage bucket `checkin-selfie` + policy
  - [~] 1b-3 Sửa frontend gọi RPC + selfie:
    - [x] migration 131 (checkin_off_data, checkin_xin_doi_off, checkin_luong mở rộng Lễ Tân) — ĐÃ CHẠY
    - [x] `checkinApi.js` (helper token + RPC) + backup checkin/ vào scratchpad
    - [x] CheckinLogin + CheckinApp → RPC (đăng nhập/khôi phục phiên/đăng xuất). BUILD PASS
    - [x] TẤT CẢ 10 màn → RPC: Login, App, Home, ChamCong(+selfie), Lich, Luong, ThuNhap, DangKyOff, DoiPin, DoiAvatar
    - [x] SelfieCapture.jsx (camera trước 480px base64 0.6)
    - [x] migration 132/133/134 (home v2 quen_checkout+lịch hẹn, thu_nhap all_rows, luong chi_tiet, xin_dung_ngay_le). BUILD PASS + RPC runtime test PASS
    - [ ] TEST trên điện thoại thật (PIN + chấm công selfie + GPS) — CẦN ANH NAM
  - [ ] 1b-4 REVOKE 9 bảng checkin khỏi anon + ẩn pin_hash/luong_cung (SAU khi test điện thoại OK)
  - Trạng thái: 10/10 màn xong, build+RPC test pass. CHƯA push. App vẫn chạy lai an toàn.
- [ ] LỚP 2: bật RLS theo vai_tro (siết `authenticated`/Lễ Tân) + RPC hoá ghi nhạy cảm

### Whitelist anon (13) — nguồn: quét .from()/.rpc() luồng công khai + checkin
Catalog công khai: `dich_vu, khuyen_mai, homepage_config, danh_gia`
Checkin (tạm, gỡ ở 1b): `nhan_vien, cham_cong, dang_ky_off, yeu_cau_chinh_sua, lich_hen, bang_luong, quy_ngay_off, don_hang_chi_tiet, v_nhan_vien_thu_nhap`
Vòng quay: 3 RPC (không cần grant bảng)

## 8. GĐ0-B LÔ 2 — MẪU CHUẨN (bắt đầu 02/07)
2 primitive chuẩn ĐÃ CÓ: `components/shared/RightPanel` (panel form trượt phải) +
`components/ui/Modal` (hộp giữa cho popup ngắn/xác nhận). Vấn đề: nhiều form tự vẽ
overlay/sheet/header riêng (object `S`) → lệch. CHUẨN HÓA = thay bằng 2 primitive này.

**MẪU chuyển form → RightPanel** (đã làm FormChuyenKhoan, commit local, build PASS):
- import RightPanel; bỏ S.panelOverlay/sheet/handle/header/closeBtn tự vẽ.
- `return (<RightPanel open onClose title subtitle bodyStyle footer={<nút Lưu/>}> <DatePicker/> <div>...nội dung...</div> </RightPanel>)`
- Nút Lưu chuyển vào prop `footer`. Sub-picker (chọn ví) tạm giữ; sau chuyển ui/Modal.

**Thứ tự Lô 2 còn lại (mỗi nhóm 1 lượt PHIÊN MỚI cho rẻ token):**
- Nhóm 1 (Internal thu-chi): FormDoanhThu, FormChiPhi (theo mẫu FormChuyenKhoan) + ExpenseEntryForm + EditTransactionModal.
- Nhóm 2: cai-dat/* (QuanLyVi, QuanLyDanhMuc, HoSoNhanVien, DoiMatKhau, PheDuyetThuChi...).
- Nhóm 3: POS (PosPaymentModal, DebtPaymentModal, NapTraTruocModal, KtvPopup → RightPanel).
- Nhóm 4: Admin (nhan-su Tabs, the-lieu-trinh modals, crm, kho).
- Nhóm 5: Checkin mobile (ChamCong/DangKyOff popup — bản mobile riêng, cân nhắc giữ).
CÁCH XÁC MINH: dev server + chrome-devtools chụp trước/sau mỗi nhóm.
