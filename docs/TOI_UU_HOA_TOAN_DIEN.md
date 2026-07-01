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
