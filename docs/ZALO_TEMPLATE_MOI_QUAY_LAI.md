# Template ZNS "Mời quay lại dùng liệu trình" — Hannah Spa

Tạo tại: ZBS Console → Công cụ gửi tin → Quản lý Template → **Tạo Template**
(account.zalo.solutions/8BUM96AP8W68G7VK/tool/zns/manage/template)

## Thông tin chung
- **Tên template:** MỜI QUAY LẠI DÙNG LIỆU TRÌNH Hannah Spa
- **Loại tin:** Chăm sóc khách hàng (hậu mãi) — cho phép nội dung mời quay lại
- **Mẫu:** Mẫu tùy chỉnh (text)
- **Logo:** chọn logo Hannah Spa đã dùng cho các template cũ (đã có sẵn trên OA)

## Tham số (mỗi ô bảng 1 tham số)
| Tham số | Ý nghĩa | Ví dụ |
|---|---|---|
| `customer_name` | Tên khách | Chị Loan |
| `service` | Tên dịch vụ/liệu trình | Massage Cổ Vai Gáy |
| `remain_time` | Số buổi còn lại | 6 |

## Nội dung
```
Hannah Beauty & Spa thân gửi chị <customer_name> 🌸

Liệu trình <service> của chị vẫn còn <remain_time> buổi chưa sử dụng.
Đã một thời gian chị chưa ghé Hannah, chúng em rất mong được chăm sóc
chị tiếp để giữ trọn hiệu quả ạ.

Chị sắp xếp quay lại Hannah Spa nhé, để được tư vấn thêm ưu đãi dành
riêng cho khách thân thiết.

☎ 0379080909
📍 39 Nam Kỳ Khởi Nghĩa, Ninh Kiều, Cần Thơ
```

## Sau khi Zalo duyệt (1-2 ngày)
1. Lấy **ID mẫu ZBS** (số 6 chữ số) của template vừa duyệt.
2. Lưu vào cấu hình để cron tự dùng:
   ```sql
   INSERT INTO marketing_ai_config(key, value)
   VALUES ('zns_moi_quay_lai', '<ID_MẪU>')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```
3. Cron `nhac-lieu-trinh` 9h sáng VN sẽ tự gửi cho khách đến hạn — không cần thao tác tay.
