# MÔ HÌNH THU NHẬP POS — CHUẨN CHỐT (Source of Truth)

> Chốt ngày 03/06/2026 theo yêu cầu anh Nam. Đây là **nguồn sự thật duy nhất** cho toàn bộ
> khái niệm tiền nhân viên trong POS. Mọi code/doc/MCP phải tuân theo. **KHÔNG còn khái niệm
> "commission".** Chỉ có **Tiền Tour** và **Tiền Hoa Hồng**.

---

## 1. HAI LOẠI THU NHẬP DUY NHẤT

| Khái niệm | Khi nào | Ai nhận | Sinh ra từ loai_item |
|---|---|---|---|
| **Tiền Tour** | Nhân viên **THỰC HIỆN** dịch vụ / buổi liệu trình cho khách | KTV thực hiện | `dich_vu`, `the_lieu_trinh` (dùng thẻ) |
| **Tiền Hoa Hồng** | Nhân viên **BÁN** (thẻ liệu trình mới / sản phẩm) | NV bán (KTV hoặc Lễ Tân) | `the_moi` (bán thẻ), `san_pham` |

> Tuyệt đối không dùng từ "commission" ở UI, biến, cột, doc. Cột vật lý sẽ đổi tên `tien_commission` → `tien_hoa_hong`.

---

## 2. GIAO DIỆN BÁN HÀNG — 2 LUỒNG TÁCH BẠCH

### Luồng A — BÁN THẺ LIỆU TRÌNH (the_moi)
- **Chỉ bán thẻ**, KHÔNG liên quan thực hiện dịch vụ.
- Hiện **ô gán NV bán → Tiền Hoa Hồng** (panel phía dưới).
- **ẨN hoàn toàn ô Tiền Tour** (tránh tích nhầm).
- Giá thẻ = giá bán/buổi (sau giảm) × số buổi mua. Doanh thu = giá khách trả thật.

### Luồng B — DÙNG THẺ + DỊCH VỤ/SẢN PHẨM LẺ
- Khách dùng thẻ (`the_lieu_trinh`) hoặc làm dịch vụ lẻ (`dich_vu`): **bắt buộc gán NV thực hiện → Tiền Tour**. **ẨN ô Hoa Hồng** cho các dòng này.
- Sản phẩm lẻ (`san_pham`): gán NV bán → **Tiền Hoa Hồng** (vì là bán hàng).

> Quy tắc UI: stick **Tour ở trên** (NV thực hiện), stick **Hoa Hồng ở dưới** (NV bán).
> Mỗi dòng chỉ hiện đúng 1 loại theo `loai_item` — không cho tích nhầm loại còn lại.

---

## 3. TIỀN HOA HỒNG GẮN VỚI SỐ TIỀN KHÁCH TRẢ (debt-aware)

**Nguyên tắc:** Hoa hồng = tỉ lệ × **số tiền khách ĐÃ TRẢ** (không phải giá trị đơn).
- Khách trả ĐỦ → NV nhận **đủ** hoa hồng.
- Khách **NỢ** → NV chỉ nhận hoa hồng trên **phần đã trả**. Khi khách **thu nợ** thêm → cộng thêm hoa hồng tương ứng.

```
tien_hoa_hong = ti_le_hoa_hong% × (số tiền khách đã thanh toán cho phần đó)
```
- Lúc chốt đơn: hoa hồng tính trên số đã trả lúc đó.
- Lúc thu nợ (RPC thu nợ): cộng thêm hoa hồng cho phần vừa trả.

> Tiền Tour KHÔNG phụ thuộc nợ (NV thực hiện là nhận đủ tour khi dịch vụ hoàn thành).

---

## 4. TỈ LỆ HOA HỒNG BÁN THẺ (theo KM, KHÔNG dùng ti_le_hoa_hong gốc dịch vụ)

KM_ref% = (số buổi tặng / số buổi mua × 100) + % giảm giá/buổi.

| Tình huống | KTV | Lễ Tân |
|---|---|---|
| KTV tư vấn, KM < 30% | 10% | 0% |
| KTV tư vấn, KM ≥ 30% | 5% | 0% |
| KTV + LT, KM < 30% | 7% | 3% |
| KTV + LT, KM ≥ 30% | 5% | 3% |
| Chỉ LT tư vấn | 0% | 3% |

> Đã có trong `src/lib/serviceCommission.js` (`calcCommissionRates`). Base hoa hồng = giá NET khách trả.

---

## 5. LƯƠNG KINH DOANH NHÂN VIÊN (chốt module — KHÔNG khái niệm nào khác)

### KTV
```
Lương Kinh Doanh KTV = Tiền Tour + Tiền Hoa Hồng
```
(không có khái niệm nào khác)

### Lễ Tân
```
Lương Kinh Doanh Lễ Tân = Lương KD (công thức doanh số) + Tiền Hoa Hồng
```
Công thức Lương KD Lễ Tân (mỗi người):
```
Cơ sở bậc 1 = max(0, 150.000.000 − DS_KhánhDuy − DS_NgọcPhương − DT_MỹPhẩm)
HH bậc 1    = Cơ sở bậc 1 × 1%
Vượt        = max(0, Tổng_DT − 150.000.000)
HH bậc 2    = Vượt × 1.5%
Lương KD    = HH bậc 1 + HH bậc 2
```

---

## 6. PHƯƠNG THỨC THANH TOÁN (4 loại — TÁCH KHỎI ví/ngân hàng)

```
tien_mat | chuyen_khoan | quet_the | the_tra_truoc
```
- PTTT chỉ là **cách khách trả**. Việc tiền về ví nào (MB Bank / TP Bank / Két) là **cấu hình riêng** (bảng ánh xạ PTTT → ví), KHÔNG gắn cứng vào định nghĩa PTTT.
- Mặc định cấu hình hiện tại: tien_mat→Két, chuyen_khoan→MB Bank, quet_the→TP Bank, the_tra_truoc→Két. Có thể đổi ở cấu hình.

---

## 7. CỘT DB CHUẨN (sau khi đổi tên)

`don_hang_chi_tiet`:
- `tien_tour` — Tiền Tour (dich_vu, the_lieu_trinh)
- `tien_hoa_hong` — Tiền Hoa Hồng (the_moi, san_pham) ← **đổi tên từ tien_commission**
- `ti_le_hoa_hong` — tỉ lệ % hoa hồng áp dụng (theo quy tắc KM)

`nhan_vien_thu_nhap.loai`: chỉ `'tour'` | `'hoa_hong'` (+ kpi/adjustment nếu cần).

> Xem thêm [[staff-income]] (mapping cũ), [[project-unified-data-model]].
