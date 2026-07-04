# HSMS DESIGN SYSTEM v2 — Hannah Luxury
> Cập nhật 05/07/2026 · KHỚP 100% code thật (colors.js + hannah-admin.css).
> Bản v1 (11/05) đã lỗi thời — thay toàn bộ. TRƯỚC KHI VIẾT BẤT KỲ UI NÀO:
> đọc file này + taste-skill (bố cục). Quy tắc ở đây là BẮT BUỘC.

## 1 · TÔNG MÀU — ẤM KEM-ESPRESSO (chốt 03/07/2026)
Nguồn duy nhất: `src/constants/colors.js` (object `C`, alias `LUX`/`COLORS`)
đồng bộ với `:root` trong `src/styles/hannah-admin.css`.

| Token JS (C.*) | CSS var | Giá trị | Dùng cho |
|---|---|---|---|
| bg | --bg | #f3ece1 | nền trang |
| surface | --surface | #fbf7ef | nền phụ/panel |
| card / surface2 | --surface2 | #ffffff | thẻ, hộp nội dung |
| text / ink | --ink | #2a201a | chữ chính |
| textSub / ink2 | --ink2 | #5a4a3e | chữ phụ |
| textMute / ink3 | --ink3 | #8e7a68 | nhãn mờ |
| border / line | --line | #e8dcc8 | viền nhẹ |
| line2 / --bord | --line2 --bord | #d4c4ad | viền input/khung |
| espresso | --espresso | #3d2c20 | header đậm |
| champagne / gold | --champagne | #c9a96e | accent (TIẾT CHẾ) |
| primary | — | #A0714F | nút chính |
| thu · chi · taiSan · ck | — | #2D7A4F · #C0392B · #1A5276 · #6C3483 | ngữ nghĩa tiền |
| grad | --grad-gold | 135deg C9A96E→A0714F→7D5A3C | nút vàng, bar |

**CẤM** hard-code mã màu trong JSX — luôn `C.*` hoặc `var(--*)`.
(Đang còn ~60 chỗ vi phạm cũ — thấy thì dọn.)

## 2 · POPUP: CHỈ 2 PRIMITIVE — KHÔNG TỰ VẼ OVERLAY
| | `components/ui/Modal` | `components/shared/RightPanel` |
|---|---|---|
| Dùng khi | Form NGẮN (≤6 trường), xác nhận, xem nhanh | Form DÀI, nội dung nhiều, chi tiết bản ghi |
| Kích thước | size sm 420 / md 560 / lg 760 / xl 960 | full cao, rộng = 100vw − sidebar |
| Có sẵn | overlay+blur, ESC, header icon/title/subtitle, footer, cuộn body | như Modal + header gradient serif, bodyStyle, zIndex |
| Ghi chú | createPortal body — không lệch vì transform | form nhiều input: `bodyStyle={{ background:'#fff' }}` |

- DatePicker (shared) zIndex 100001 — luôn nổi trên Modal/RightPanel.
- KHÔNG viết `position:'fixed', inset:0` mới. Còn ~50 popup di sản — chuyển dần theo lô.

## 3 · CHUYỂN ĐỘNG — 1 NHỊP DUY NHẤT
```js
import { TRANSITION } from 'constants/colors'  // 'all .2s cubic-bezier(.22,.61,.36,1)'
```
- Hover thẻ: `translateY(-2px)` + shadow. Panel: rpSlideIn .22s. Modal: hsmsModalIn .24s.
- CẤM tự chế .15s/.3s mới. ESC phải đóng được mọi popup (2 primitive đã có sẵn).

## 4 · TIỀN TỆ & NGÀY GIỜ
- Tiền: `formatCurrency(n)` (lib/utils — đã kèm ₫). Cần default khác
  ('—'/'Liên hệ') thì wrap lại nhưng PHẢI ra ₫, và cấm đặt tên `fmt` trần.
- Hàm format giờ đặt tên `fmtGio`, ngày `fmtNgay` — KHÔNG dùng tên `fmt`.
- Ô số tiền: `whiteSpace:'nowrap'` + `fontVariantNumeric:'tabular-nums'` + đủ rộng
  hoặc `overflow-wrap:anywhere` trên mobile — KHÔNG ellipsis số tiền.
- Ngày: `todayISO()/getNowVN()` (CẤM `new Date()` trực tiếp). Nhập ngày:
  `shared/DatePicker` (trừ 2 ngoại lệ chủ ý: ngày sinh CRM, checkin mobile).
- Hiển thị buổi thẻ: thống nhất theo mẫu MySpa `đã dùng/tổng` — ghi rõ nhãn
  nếu ngữ cảnh dễ nhầm (đề xuất "Còn X/Y" đang chờ anh Nam chốt).

## 5 · TYPOGRAPHY & MẬT ĐỘ
- Serif (`var(--serif)`/FONT.serif): tiêu đề trang, con số lớn, tên NV (Cormorant 600).
- Sans (FONT.sans): mọi chữ còn lại. Mono/tabular: cột số.
- Nhãn nhóm: 11px, 700-900, uppercase, letterSpacing .04-.08em, màu ink3.
- Trang NHIỀU dữ liệu (bảng, POS): padding 12-16, chữ 12.5-13.
- Trang ÍT nội dung (form, chi tiết): padding 18-24, khoảng thở rộng, bo `var(--r)`.

## 6 · RESPONSIVE (chuẩn từ 04/07)
- Breakpoint 768px. AdminShell tự chuyển MobileShell (header + bottom nav).
- Grid: `repeat(auto-fit, minmax(min(Xpx,100%),1fr))` — KHÔNG `repeat(N,1fr)` cứng.
- Bảng rộng: nằm trong `.page` tự cuộn ngang; danh sách grid tự viết thì thêm
  `overflow-x:auto` + `min-width` dòng (mẫu `.crm-list`).
- Nút chạm mobile ≥40px. Số tiền co bằng clamp (xem hannah-admin.css @media).

## 7 · DỮ LIỆU & HÀNH VI (nhắc lại từ CLAUDE.md — hay quên nhất)
- Supabase KHÔNG throw: luôn check `{ error }` và notify — cấm nuốt lỗi.
- Join foreign PHẢI kèm `id`: `nhan_vien:nhan_vien_id(id, ho_ten, avatar_url)`
  (thiếu id từng gây bug mất tour 02/07).
- Màn đọc nhiều bảng liên quan: gom 1 RPC JSON (mẫu `the_lieu_trinh_lich_su`).
- Avatar NV: URL Storage (bucket `avatars`) — không nhét base64 vào bảng.

## 8 · CHECKLIST TRƯỚC KHI PUSH UI
[ ] Không overlay tự vẽ mới · [ ] Không màu hard-code · [ ] formatCurrency
[ ] DatePicker chuẩn · [ ] TRANSITION token · [ ] Thử 390px + desktop
[ ] `npm run build` PASS · [ ] Popup test ESC + bấm nền đóng được
