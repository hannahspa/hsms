# PHÂN TÍCH CHUYÊN SÂU HSMS — SAU ĐỢT TỐI ƯU 02–05/07/2026
> Trả lời 3 câu hỏi của anh Nam: (1) còn cần làm gì, (2) giao diện đã "macOS" chưa,
> (3) từng module cần tối ưu gì — trùng lặp/dư thừa nào cần bỏ.
> Số liệu đo thực tế trên code ngày 05/07/2026.

---

## PHẦN 1 · GIAO DIỆN ĐÃ "MACOS" CHƯA? — ĐO BẰNG SỐ

Chuẩn "macOS-like" = 4 tính chất: (a) 1 ngôn ngữ thị giác duy nhất, (b) chuyển động
đồng nhất, (c) chi tiết nhỏ chỉn chu (viền, focus, khoảng cách), (d) đi sâu vào đâu
cũng gặp cùng một "chất".

| Tiêu chí | Hiện trạng đo được | Điểm |
|---|---|---|
| Tông màu & token | ĐÃ đồng bộ kem-espresso 4 vùng (03/07); nhưng còn **60 chỗ hard-code #C9A96E/#A0714F** trong JSX thay vì token | 8/10 |
| Popup/Panel | ~27 file dùng primitive chuẩn; overlay tự vẽ giảm còn **~45** (admin 9 · internal 22 · pos 8 · checkin 6). Đã chuẩn hóa 11 popup 05/07. Còn lại chủ yếu: panel NS lương/chấm công (đã đúng thị giác) + internal cai-dat + POS | 6.5/10 (↑ từ 5) |
| Tiền tệ | formatCurrency phủ chính; còn **7 file fmt local** (kho, khuyến mãi ×2, checkin ×2 — thực chất là fmt GIỜ/NGÀY đặt tên nhầm, menu, wheel) | 7/10 |
| DatePicker | Chỉ còn **2 input type=date** (CRM ngày sinh — chủ ý; checkin mobile — chủ ý) | 9/10 |
| Chuyển động | Lệch nhịp: transition .15s/.2s/.22s/.24s trộn lẫn; RightPanel **chưa có phím ESC** (Modal có) | 6/10 |
| Mobile | Nền tốt sau 2 đợt; các trang chính 0 tràn khung | 8/10 |

**Kết luận:** lớp NGOÀI đã sang và nhất quán (~8/10). Cái kéo điểm xuống đúng như
anh chỉ ra từ 01/07: **lớp ĐI SÂU — popup**. 54 popup tự vẽ còn lại là khoảng cách
lớn nhất tới "macOS". Đường về đích rõ ràng vì 2 primitive + mẫu chuyển đã chứng
minh qua Lô 2 + Lô 3 + Lô 4-Thẻ.

**Việc cụ thể để đạt 9-10/10 (thứ tự):**
1. Lô 4 còn lại: nhan-su (12 popup trong Tabs) → crm → kho → dich-vu/khuyen-mai/cham-soc-khach.
2. Lô 5 internal cai-dat (20 overlay của QuanLyVi/QuanLyDanhMuc/HoSoNV/PheDuyet...).
3. Chuẩn chuyển động: 1 hằng `TRANSITION = 'all .2s cubic-bezier(.22,.61,.36,1)'` dùng chung; thêm ESC cho RightPanel.
4. Quét 60 màu hard-code → token C.*.
5. Đổi tên 7 fmt local (fmtGio/fmtNgay) + dùng formatCurrency.
6. **Viết DESIGN_SYSTEM.md v2** — tài liệu khớp token thật để mọi trang mới sinh ra đều giống nhau (chống tái phát).

---

## PHẦN 2 · TRÙNG LẶP & DƯ THỪA CẦN XỬ (xếp theo mức nghiêm trọng)

### 🔴 T1. "CHĂM SÓC KHÁCH" ĐANG CÓ 5 CỬA — trùng lặp lớn nhất hệ thống
| Trang | Đang làm gì |
|---|---|
| `/admin/cham-soc-khach` | 4 nhóm win-back/thẻ ngủ quên/sinh nhật/VIP rời bỏ + nút Gọi/Zalo |
| `/admin/marketing/cham-soc-lai` | Hàng đợi 40 khách/ngày, mời quay lại, ZNS 9h |
| `/admin/marketing/cham-soc-sau-dich-vu` | Chăm sau dịch vụ |
| `/admin/marketing/nhac-lich-lieu-trinh` | Nhắc lịch liệu trình tự động |
| `/admin/nhac-lieu-trinh` | Nhắc thẻ THỦ CÔNG — soạn tin AI gửi từng khách |

Cùng 1 việc "chạm lại khách" bị xé 5 nơi → Lễ tân/anh không biết vào đâu, khách có
thể bị nhắn TRÙNG từ 2 luồng khác nhau. **Đề xuất:** gom về 1 trung tâm
`/admin/cham-soc-khach` với 3 tab: *Hôm Nay Cần Chạm* (gộp danh sách 4 nhóm + hàng
đợi) · *Tự Động* (cấu hình các cron ZNS: sau DV, nhắc lịch, win-back) · *Soạn Tay AI*
(nhac-lieu-trinh cũ). Xóa 4 route thừa. Đây nên là việc UI/luồng lớn kế tiếp sau khi
cắt MySpa.

### 🟠 T2. BA MÀN "TỔNG QUAN" CHỒNG NHAU
`/admin` (lưới module + 4 strip) · `/admin/dashboard` (KPI 4 tab) · `/SoThuChi`
TongQuan (ví + thu chi kỳ). Nay có thêm Nhật Ký Ngày (chủ ý — báo cáo tổng).
**Đề xuất:** `/admin` → redirect thẳng `/admin/dashboard` (sidebar + MobileShell đã
đảm nhiệm điều hướng; lưới module là di sản thời chưa có sidebar). Dashboard thêm nút
"📔 Nhật ký hôm nay". TongQuan SoThuChi giữ (góc nhìn két/ví cho Lễ tân).

### 🟠 T3. `/admin/lich-su-nop-tien-mat` — trang mồ côi
Bản chất chỉ là bộ lọc "CK nội bộ Tiền Mặt → MB Bank". Danh Sách Thu Chi đã hiển thị
đủ loại giao dịch. **Đề xuất:** thêm 1 chip lọc "Nộp TM→MB" ở Danh Sách Thu Chi rồi
XÓA trang + route + card ở /admin (dead-weight thứ 3 của nhánh này — 2 cái trước đã
xóa 01/07).

### 🟡 T4. ĐỐI SOÁT NGÀY + CHỐT NGÀY = 1 luồng bị cắt đôi
Lễ tân cuối ngày: đối soát số → rồi qua trang khác bấm chốt. **Đề xuất:** gộp thành 1
trang "Chốt Ca Cuối Ngày" 2 bước trên cùng màn (xem lệch → xác nhận chốt). Giảm 1 tab.

### 🟡 T5. THẺ CỦA KHÁCH render 3 kiểu ở 3 nơi
POS (card vàng), CRM chi tiết khách, trang Thẻ Liệu Trình — 3 bộ code hiển thị khác
nhau, đã từng lệch cách đọc số ("7/10" đã dùng vs còn). **Đề xuất:** CardHistory +
1 component `TheCard` dùng chung; CRM chi tiết khách nhúng CardHistory (đã viết sẵn,
chỉ việc import). Thống nhất hiển thị "Còn X/Y buổi" (chờ anh chốt — đề xuất từ 04/07).

### 🟡 T6. 2 checkbox/toggle, 2 kiểu badge, confirmDialog vs window.confirm
Tồn dư nhỏ rải rác; xử dần trong các lô UI, không cần chiến dịch riêng.

---

## PHẦN 3 · PHÂN TÍCH TỪNG MODULE (13)

### M1 · POS Bán Hàng — 8.5/10, module chín nhất
- ✅ Chặn cứng KTV+tour, 21 catch đã vá, RPC siết quyền, mobile 1 cột, RLS draft.
- Tối ưu tiếp: (1) 8 popup tự vẽ (OrderDetailPanel → RightPanel, StaffCommissionPanel,
  3 modal nhỏ trong PosApp → ui/Modal); (2) PosApp.jsx ~2100 dòng — tách CartSection/
  PaymentSection ra file riêng cho dễ bảo trì; (3) tính năng treo có chủ ý: upsale
  suất lẻ (spec sẵn), debt-aware hoa hồng P2.
- Trùng/dư: không đáng kể (PosPaymentModal dead code đã xóa 04/07).

### M2 · Sổ Thu Chi — 8/10
- ✅ Forms chuẩn RightPanel, Nhật Ký Ngày thành báo cáo tổng, tab mobile.
- Tối ưu: 20 overlay ở cai-dat/* (Lô 5); T3 (xóa lịch sử nộp TM); T4 (gộp đối soát+chốt).
- Dư: BaoCaoNgay bên trong BaoCaoPage trùng ~70% Nhật Ký Ngày → bỏ tab Ngày trong
  Báo Cáo, giữ Tuần/Tháng/Năm/Phân tích.

### M3 · Nhân Sự + Lương — 7/10, cần đợt riêng
- ✅ Lương B1 + tăng ca chuẩn + 17 test; báo cáo thu nhập khớp MySpa.
- Tối ưu: (1) **bundle 209KB lớn nhất hệ thống** — AdminNhanSuPage gánh 7 tab 1 file;
  tách lazy theo tab; (2) 12 popup tự vẽ (AdminSuaChamCong, TaoOff, TabHoSo...) —
  nhóm Lô 4 nặng nhất; (3) TabBangLuong tính lương client cho 10 NV × 30 ngày mỗi lần
  mở — nên RPC như mẫu lịch sử thẻ; (4) trang lương KTV trên app checkin đã có.
- Trùng: 2 bản tinhHeSo/tinhTangCa đã hợp nhất 02/07 ✅.

### M4 · CRM Khách Hàng — 7/10
- Tối ưu: (1) nhúng CardHistory vào chi tiết khách (đang render thẻ kiểu riêng — T5);
  (2) phân hạng khách đang tính lại ở FE trong khi DB có cột hạng → thống nhất 1 nguồn;
  (3) list 1.000 hồ sơ tải thẳng — phân trang server như thẻ liệu trình.
- Sau cắt MySpa: 5 khách SĐT 11 số + Quỳnh Tuyến không SĐT — Lễ tân bổ sung dần.

### M5 · Thẻ Liệu Trình — 9/10 (vừa đại tu)
- ✅ Panel full + 3 khối lịch sử như MySpa + RPC 1 round-trip + 4 popup chuẩn.
- Còn: 1 thẻ "Cần rà trước go-live"; đồng bộ nút Đóng/Mở/Hoàn tiền/Chuyển đổi
  (đang ở CRM theo commit 6205f0d) về cùng panel này cho 1 cửa duy nhất.

### M6 · Kho Hàng — 7.5/10
- ✅ DatePicker chuẩn, luồng nhập→chi_phi chặt.
- Tối ưu: 5 popup tự vẽ (KiemKho, Nhập/Xuất, SửaGD, Chiết) → RightPanel/Modal;
  fmt local; 31 SP đang dưới ngưỡng tồn (nghiệp vụ: Lễ tân cần nhập hàng!).

### M7 · Khuyến Mãi + Vòng Quay — 7/10
- Tối ưu: 2 fmt local; tab Gợi Ý KM tự động (kế hoạch cũ, chưa build); vòng quay còn
  thiếu gán POS mua-thẻ-tặng-lượt.

### M8 · Lịch Hẹn — 7.5/10
- ✅ Timeline + điều phối realtime tốt.
- Tối ưu: mobile timeline (đợt 3 mobile); nối chặt hơn với Nhật Ký Ngày (số hẹn mai).

### M9 · Check-in NV — 8.5/10
- ✅ RPC 100% + selfie + GPS server-side; bảo mật xong.
- Tối ưu nhỏ: đổi tên fmt (GIỜ/NGÀY) tránh nhầm; 6 popup mobile tự vẽ — kế hoạch đã
  chốt GIỮ bản mobile riêng (hợp lý), chỉ cần đồng bộ màu token.

### M10 · Marketing — 7/10 sau hợp nhất
- ✅ 1 module duy nhất, bản cũ 2.505 dòng đã xóa.
- Việc lớn: T1 (gom 5 cửa chăm sóc); đổi AI provider sang DeepSeek (đã chốt từ trước,
  code còn trỏ provider cũ); bật webhook/key.

### M11 · Website + Menu iPad + Shop — 6.5/10, ưu tiên thấp
- Menu iPad/Wheel: fmt local, màu chưa ăn token mới (2 app này có palette riêng —
  chấp nhận được vì hướng khách). Shop = placeholder, chưa đụng.

### M12 · Dashboard & Báo cáo — 7/10
- T2 (bỏ trang /admin launcher); Dashboard nên thêm: so sánh cùng kỳ, link Nhật Ký.
- Tầm nhìn "1 báo cáo duy nhất" đã có xương (Nhật Ký Ngày) — nuôi tiếp bằng: số hẹn
  ngày mai, sinh nhật khách tuần này, tổng nợ toàn hệ.

### M13 · Hạ tầng & Dữ liệu — 8.5/10
- ✅ RLS 3 lớp + RPC POS + backup 2 lớp + avatar Storage.
- Tối ưu tiếp: (1) nhân rộng mẫu "1 RPC thay N query" cho các màn nặng nhất còn lại
  (TabBangLuong, CRM list, Dashboard); (2) sau cắt MySpa: dọn cột di sản (meta
  myspaCommission, source cũ...), VACUUM; (3) index cho các cột lọc hay dùng
  (don_hang.ngay+trang_thai có rồi? — kiểm khi rảnh); (4) cron chạy lại script avatar.

---

## PHẦN 4 · LỘ TRÌNH ĐỀ XUẤT SAU ĐỢT NÀY

| Đợt | Việc | Vì sao |
|---|---|---|
| **Ngay (trước 15/07)** | NV xử 17 ca lệch buổi → export cuối → script → CẮT MYSPA | Deadline hợp đồng; mọi công cụ sẵn sàng |
| Sau cắt 1-2 ngày | Quan sát RLS 2b (có luồng Lễ tân nào bị chặn oan không) + dọn dữ liệu di sản MySpa | An toàn vận hành 1 hệ |
| Đợt UI-đồng-bộ | T1 gom 5 cửa chăm sóc khách → 1 trung tâm; T2/T3/T4 bỏ trang thừa; Lô 4 nhan-su + Lô 5 cai-dat; chuẩn chuyển động + ESC RightPanel; DESIGN_SYSTEM v2 | Trả lời trực tiếp mục tiêu "đồng bộ như macOS" |
| Đợt hiệu năng | Tách AdminNhanSuPage; RPC hóa bảng lương + CRM list; quét 60 màu hard-code | Nhanh + sạch nợ kỹ thuật |
| Đợt tính năng | Upsale suất lẻ POS; Gợi ý KM tự động; vòng quay gán POS; mobile đợt 3 (lịch hẹn) | Tăng doanh thu/trải nghiệm |

*File này là căn cứ làm việc — mỗi mục xử xong đánh dấu vào nhật ký TOI_UU_HOA_TOAN_DIEN.md.*
