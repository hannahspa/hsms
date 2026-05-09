# Hệ Thống Thiết Kế — Styling

> Xác minh lần cuối: 08/05/2026 | Nguồn: `src/constants/colors.js`, `src/constants/lux.js`

## Bảng Màu COLORS (từ `colors.js`)

| Token | Giá Trị | Cách Dùng |
|---|---|---|
| grad | `linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)` | Tiêu đề, CTA |
| bg | `#FAF7F4` | Nền trang |
| card | `#FFFFFF` | Bề mặt thẻ |
| border | `rgba(160,113,79,0.12)` | Viền thẻ |
| shadow | `0 4px 24px rgba(139,94,60,0.10)` | Bóng thẻ |
| text | `#1A1209` | Chữ chính |
| textSub | `#8B7355` | Chữ phụ |
| textMute | `#B8A898` | Chữ mờ/placeholder |
| thu | `#2D7A4F` | Doanh thu, lợi nhuận dương |
| chi | `#C0392B` | Chi phí, âm |
| taiSan | `#1A5276` | Tổng tài sản |
| chuyenKhoan | `#6C3483` | Chuyển khoản nội bộ |
| gold | `#C9A96E` | Vàng nhấn |
| primary | `#A0714F` | Nâu chủ đạo |

## Hệ Thống Thiết Kế LUX (từ `lux.js`)

### Bề Mặt
| Token | Giá Trị |
|---|---|
| bg | `#f5f0e8` |
| surface | `#fbf8f3` |
| surface2 | `#ffffff` |

### Chữ (Ink)
| Token | Giá Trị |
|---|---|
| ink | `#2a201a` |
| ink2 | `#5a4a3e` |
| ink3 | `#8a7868` |

### Đường Kẻ (Viền)
| Token | Giá Trị |
|---|---|
| line | `#e8dfd2` |
| line2 | `#d9cdb9` |

### Màu Thương Hiệu
| Token | Giá Trị |
|---|---|
| espresso | `#3d2c20` |
| espresso2 | `#5a4030` |
| taupe | `#8a6a52` |
| champagne | `#c8a675` |
| champagne2 | `#b08a55` |
| gold | `#d4a574` |
| rose | `#b87a6a` |
| sage | `#7a8a6a` |
| danger | `#b85a4a` |

### Gradient
| Token | Giá Trị |
|---|---|
| heroGrad | `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.35), transparent 60%), linear-gradient(155deg, #4a3528 0%, #3d2c20 50%, #2e2018 100%)` |
| goldGrad | `linear-gradient(180deg, #d4a574 0%, #b88a55 100%)` |

### Bo Góc
| Token | Giá Trị |
|---|---|
| radius | `18px` |
| radiusSm | `12px` |
| radiusLg | `28px` |

### Bóng Đổ
| Token | Giá Trị |
|---|---|
| shadowSm | `0 2px 8px -2px rgba(60,40,25,0.08)` |
| shadow | `0 8px 32px -8px rgba(60,40,25,0.12), 0 2px 6px -2px rgba(60,40,25,0.06)` |
| shadowLg | `0 24px 60px -16px rgba(60,40,25,0.22), 0 4px 12px -4px rgba(60,40,25,0.08)` |

### Kiểu Chữ
| Token | Giá Trị |
|---|---|
| fontSerif | `'Cormorant Garamond', serif` |
| fontSans | `'Inter', -apple-system, sans-serif` |
| fontMono | `'JetBrains Mono', monospace` |

## Cách Dùng

```javascript
import { COLORS } from '../constants/colors'
// hoặc
import { LUX } from '../constants/lux'

// Inline styles:
<div style={{
  backgroundColor: LUX.surface,
  color: LUX.ink,
  borderRadius: LUX.radius,
  boxShadow: LUX.shadow,
  fontFamily: LUX.fontSerif,
}}>
```
