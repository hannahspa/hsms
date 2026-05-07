// Ảnh Hannah Beauty & Spa — bản đã nén (~50-200KB/ảnh, tổng 3.1MB)
const BASE = '/images/gallery-opt'
const enc = (p) => encodeURI(p)

// ── Hero background — kiến trúc mặt tiền ──
export const HERO_BG = `${BASE}/${enc('Trệt')}/${enc('Mặt Tiền - Bảng Hiệu')}/${enc('kien truc-7.jpg')}`

// ── About image — sảnh đón ──
export const ABOUT_IMG = `${BASE}/${enc('Trệt')}/${enc('Phòng Khách')}/${enc('tret - 01.jpg')}`

// ── Immersion banners — mỗi khu vực 1-2 ảnh đẹp nhất ──
export const IMMERSION_SECTIONS = [
  {
    id: 'sanh-don',
    title: 'Không Gian Sang Trọng',
    subtitle: 'Sảnh đón ấm cúng, thiết kế tinh tế — nơi bạn bắt đầu hành trình làm đẹp',
    images: [
      `${BASE}/${enc('Trệt')}/${enc('Phòng Khách')}/${enc('tret-11.jpg')}`,
      `${BASE}/${enc('Trệt')}/${enc('Phòng Khách')}/${enc('tret-3-1.jpg')}`,
    ],
  },
  {
    id: 'cham-soc-da',
    title: 'Phòng Chăm Sóc Da',
    subtitle: 'Thiết bị hiện đại, không gian riêng tư — làn da bạn xứng đáng được nâng niu',
    images: [
      `${BASE}/${enc('Lầu 2')}/${enc('Phòng 4 Giường CSD - Lầu 2')}/${enc('LAU 3- KHU TRUOC 1-1-1.jpg')}`,
      `${BASE}/${enc('Lầu 2')}/${enc('Phòng CSD 3 Giường - Lầu 2')}/${enc('lau 3- 01.jpg')}`,
    ],
  },
  {
    id: 'goi-dau',
    title: 'Khu Gội Đầu Thư Giãn',
    subtitle: '5 giường gội cao cấp, view thoáng — thả mình vào dòng nước mát lành',
    images: [
      `${BASE}/${enc('Lầu 1')}/${enc('Phòng Gội 5 Giường - Lầu 1')}/${enc('LAU 2- KHU TRUOC 7.jpg')}`,
      `${BASE}/${enc('Lầu 1')}/${enc('Phòng Gội 5 Giường - Lầu 1')}/${enc('lau 2- khu truoc 8.jpg')}`,
    ],
  },
  {
    id: 'trict-long',
    title: 'Phòng Triệt Lông',
    subtitle: 'Công nghệ laser tiên tiến, phòng riêng sạch sẽ — an toàn và hiệu quả',
    images: [
      `${BASE}/${enc('Lầu 2')}/${enc('Phòng Triệt Lông - Lầu 2')}/${enc('lau 03- giua  2.jpg')}`,
    ],
  },
  {
    id: 'say-toc',
    title: 'Khu Sấy Tóc Chuyên Nghiệp',
    subtitle: 'Từng chi tiết nhỏ cũng được chăm chút — để bạn rời spa với vẻ đẹp hoàn hảo',
    images: [
      `${BASE}/${enc('Lầu 1')}/${enc('Phòng Sấy Tóc - Lầu 1')}/${enc('khu say toc-2.jpg')}`,
    ],
  },
]
