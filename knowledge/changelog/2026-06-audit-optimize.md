# Nhật Ký Tối Ưu 5 Module — Phiên 01–02/06/2026 (Claude)

> Mục đích: ghi lại TOÀN BỘ thay đổi Claude đã làm để Codex kiểm tra chéo chất lượng.
> Phạm vi: 5 module trọng điểm — POS, Sổ Thu Chi, Thẻ Liệu Trình, Nhân Sự, Đặt Hẹn.
> Trạng thái: build xanh suốt (`npm run build` exit 0). **CHƯA commit, CHƯA push.**

---

## TÓM TẮT NHANH (cho Codex review)

| Loại | Số lượng | Rủi ro |
|---|---|---|
| Bug logic đã fix | 1 (VAT → thuc_thu) | Tài chính — CẦN review kỹ |
| File tài liệu đối soát | 3 | Thấp |
| File code tách nhỏ | 2 → thành 7 file | Trung bình — review import/logic giữ nguyên |
| File UI sửa | 1 (DatePicker) | Thấp |
| Điểm GHI NHẬN chưa sửa | 2 (logic lương) | Chờ anh Nam quyết |

---

## PHASE 1 — SĂN BUG LOGIC

### 1.1 BUG ĐÃ FIX: VAT không vào `thuc_thu` (POS) — TÀI CHÍNH
**File:** `src/services/posService.js` (hàm `finalizeOrder`) + `src/apps/pos/PosApp.jsx` (dòng ~562, `handleConfirmOrder`).

**Triệu chứng:** Ô VAT trên màn POS (`vatPct`) dùng được, `tongCuoi` cộng `vatAmt`, khách trả tiền có VAT, bảng `doanh_thu` ghi đủ — NHƯNG `posService.finalizeOrder` KHÔNG truyền `p_vat` vào RPC `pos_finalize_order` → `don_hang.thuc_thu = tong_tien − giam_gia + 0` (thiếu VAT) → lệch đối soát (`thuc_thu < tổng tiền khách trả`).

**Nguyên nhân:** Comment cũ trong posService.js ghi "Migration 046 đã bỏ p_vat" — SAI. Migration 049 + 055 đã khôi phục RPC bản 7 tham số CÓ `p_vat`.

**Cách fix:** Thêm tham số `vat = 0` vào `finalizeOrder({ giamGia, vat, conNo, ghiChu })`, truyền `p_vat: vat`; PosApp truyền `vat: vatAmt`. An toàn: khi VAT=0 hành vi không đổi.

**Điểm Codex cần verify:** RPC production thực sự còn đúng 1 bản 7 tham số (migration 055 đã DROP bản 6 tham số chưa?). Chạy: `SELECT oid::regprocedure FROM pg_proc WHERE proname='pos_finalize_order';` → phải còn ĐÚNG 1 dòng.

### 1.2 ĐỐI SOÁT TÀI LIỆU (đã sửa)
- `knowledge/database/tables.md`: cột `don_hang_chi_tiet.tien_hoa_hong` ghi "sẽ xóa" → thực tế migration 049 **đã DROP**. Cột `ti_le_hoa_hong` ghi "không dùng" → thực tế code **vẫn dùng** (AdminCommissionPage, serviceCommission.js, pos_finalize_order). Đã sửa khớp.
- `knowledge/domain/staff-income.md`: phần `bang_luong` mô tả `hoa_hong_dv` = "Tiền Tour legacy" → **SAI**. Code thực tế (TabBangLuong.jsx + luong.js) dùng `hoa_hong_dv` = **Tiền Hoa Hồng** (SP+thẻ, =`pos.hoaHong`), `tien_tour` = **Tiền Tour** (=`pos.tour`). `tongKinhDoanh = hoa_hong_dv + tien_tour + hoa_hong_the` — 3 nguồn độc lập, KHÔNG cộng đôi. Đã sửa.

### 1.3 GHI NHẬN — ĐÃ SỬA BỞI CODEX (02/06/2026)
File `src/lib/luong.js`:
1. Bỏ biến chết `soOVConLai`.
2. Quỹ ngày lễ chỉ bù vào OV qua `soNgayLeBuOV = Math.min(soNgayLeDungThangNay, tongOV)`, không còn bù nhầm sang phạt T7/CN hoặc khấu trừ ngày công lẻ.

### 1.4 Các module SẠCH (đã rà, không bug)
- **Thẻ Liệu Trình** (`treatmentCardPolicy.js`): logic warranty/combo OK.
- **Sổ Thu Chi** (`DanhSachThuChi.jsx`): khoá đúng nút sửa/xóa bản ghi `nguon='pos'` + chuyển khoản nội bộ (hiện nhãn "khóa").
- **Đặt Hẹn** (`LichHenPage.jsx`): dùng `todayISO()` + DatePicker, timezone-safe.
- Không còn `console.log` debug trong pos/internal/checkin.

---

## PHASE 2 — TÁCH FILE LỚN (chỉ trích xuất thuần, KHÔNG đổi logic)

### 2.1 POS — `PosOrderHistory.jsx`: 1135 → 633 dòng
File mới:
- `src/apps/pos/orderHistoryUtils.js` (156 dòng): constants `STATUS_MAP/STATUS_TABS/PTTT_LABEL/PAGE_SIZE/DATE_TABS` + 17 helper thuần (`shortStaffName, fmtBusinessDate, fmtDateTime, displayDate, getYesterdayISO, getWeekStartISO, getMonthStartISO, paymentMethodLabel, historyTypeLabel, ledgerStatusLabel, orderItemName, treatmentOrderNote, itemStaffName, itemTypeLabel, itemIncomeInfo, orderItemsPreview, orderMatchesType`).
- `src/apps/pos/OrderDetailPanel.jsx` (364 dòng): component panel chi tiết đơn (drawer phải).
- Đã prune import thừa trong file chính (`addDaysISO, getWeekdayISO, HINH_THUC_THU_LABEL`).

**Codex verify:** so sánh nội dung helper trong utils với bản gốc (phải y hệt); `itemIncomeInfo` dùng `||` (không phải `??`) để fallback `tien_tour`/`tien_commission`=0 đúng.

### 2.2 Đặt Hẹn — `LichHenPage.jsx`: 587 → 201 dòng
File mới:
- `src/apps/internal/lich-hen/lichHenShared.jsx` (77): palette `C`, `TRANG_THAI`, time-slots (`SLOTS/ROW_H/HOUR_START/SLOT_MIN/GIO_LIST`), helper (`fmtDate, dayOfWeek, gioToMin, shortName, getInitials, normalizePhone, dedupeHints, weekDaysOf, monthMatrixOf, monthOf`), component `Avatar`, styles `navBtn/miniBtn`, `VIEW_TABS`.
- `src/apps/internal/lich-hen/ModalDatHen.jsx` (246): modal đặt/sửa lịch + gợi ý CRM.
- `src/apps/internal/lich-hen/LichHenViews.jsx` (80): `WeekView` + `MonthView`.

### 2.3 CHƯA tách (monolithic — khuyến nghị làm khi có giám sát trực quan)
- `src/apps/pos/PosApp.jsx` (1162) — component checkout cốt lõi, đã extract sẵn 6 component con + `posShared`. Phần còn lại là state + handler thanh toán; tách tiếp = decompose component có state → rủi ro trên luồng doanh thu.
- `src/apps/admin/nhan-su/components/TabBangLuong.jsx` (1064) — 1 component lương khổng lồ.
- `src/apps/admin/the-lieu-trinh/AdminTheLieuTrinhPage.jsx` (624) — 1 component lớn.

---

## PHASE 3 — DỌN UI

### 3.1 ĐÃ SỬA: DatePicker chuẩn
`src/apps/admin/the-lieu-trinh/components/CardReviewModal.jsx`: đổi `<input type="date">` (ngày hết hạn mới) → component `DatePicker` chuẩn dự án (nút hiển thị ngày + state `showExpiry` + element DatePicker render qua portal). Đây là vi phạm DatePicker DUY NHẤT trong 5 module.

### 3.2 CHƯA SỬA: 9 ô `<input type="date">` ở trang Admin NGOÀI 5 module
Vị trí: `AdminKhuyenMaiPage.jsx` (2), `AdminKhoHangPage.jsx` (3), `AdminCRMPage.jsx` (1 — `ngay_sinh`), `AdminMarketingPage.jsx` (2), `AdminPosReadinessPage.jsx` (1).
**Lý do chưa đổi:** ngoài scope 5 module + cần xem trực quan từng ô. ĐẶC BIỆT `ngay_sinh` (CRM) đổi sang DatePicker lịch-tháng sẽ KÉM UX hơn native (khó chọn năm sinh xa) → KHÔNG nên đổi mù.

---

## CHUẨN HOÁ KHÁI NIỆM commission → tour/hoa_hong (do Codex làm, Claude đã đối soát)
ĐỒNG BỘ HOÀN TOÀN ở 3 lớp: tài liệu (CLAUDE.md/AGENTS.md/staff-income.md/roadmap) + migration DB (049: đổi `nhan_vien_thu_nhap.loai` `'commission'→'hoa_hong'`, DROP `don_hang_chi_tiet.tien_hoa_hong`, cập nhật `pos_finalize_order`) + code (dùng `loai==='hoa_hong'`/`'tour'`). Chữ "commission" còn lại chỉ là tên file/biến + key `promotion_config` của MySpa (giữ tên vật lý có chủ đích). Cột `tien_commission` (don_hang_chi_tiet) và `tien_hoa_hong` (kho_san_pham) là 2 cột KHÁC NHAU — không phải bug.

---

## DANH SÁCH FILE THAY ĐỔI (cho Codex đối chiếu git)

**Sửa (M):**
- src/services/posService.js (fix VAT)
- src/apps/pos/PosApp.jsx (truyền vat)
- src/apps/pos/PosOrderHistory.jsx (tách nhỏ)
- src/apps/internal/lich-hen/LichHenPage.jsx (tách nhỏ)
- src/apps/admin/the-lieu-trinh/components/CardReviewModal.jsx (DatePicker)
- knowledge/database/tables.md, knowledge/domain/staff-income.md (đối soát doc)

**Mới (??):**
- src/apps/pos/orderHistoryUtils.js, src/apps/pos/OrderDetailPanel.jsx
- src/apps/internal/lich-hen/lichHenShared.jsx, ModalDatHen.jsx, LichHenViews.jsx
- knowledge/changelog/2026-06-audit-optimize.md (file này)

**KHÔNG đụng tới:** src/lib/luong.js (chỉ ghi nhận 2 điểm, chưa sửa).
