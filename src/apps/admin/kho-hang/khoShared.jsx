/* eslint-disable react-refresh/only-export-components -- file shared: export cả constants lẫn components */
// ═══════════════════════════════════════════════════════════════════════════
// Kho Hàng — constants + helpers + ZoomImg + DateField dùng chung
// Tách từ AdminKhoHangPage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import DatePicker from '../../../components/shared/DatePicker'

// ── Constants ──────────────────────────────────────────────────────────────────
export const DON_VI_LIST = ['cái', 'chai', 'lọ', 'hộp', 'gói', 'thùng', 'túi', 'cuộn',
                     'lít', 'ml', 'kg', 'gram', 'đôi', 'bộ', 'tờ', 'miếng', 'viên', 'ống',
                     'tuýp', 'cặp', 'hũ', 'set', 'can', 'bịch', 'vỉ', 'bọc']

// Danh mục sản phẩm CỐ ĐỊNH (mô hình Hannah Spa) — nhân viên chọn, không gõ tự do
export const DANH_MUC_LIST = [
  'Sữa rửa mặt', 'Toner', 'Serum / Tinh chất', 'Kem dưỡng', 'Kem mắt',
  'Mặt nạ', 'Tẩy trang', 'Tẩy tế bào chết', 'Chống nắng',
  'Dầu gội', 'Dầu xả', 'Ủ / Hấp tóc', 'Dầu massage', 'Muối / Sữa tắm',
  'Thực phẩm chức năng', 'Vật tư y tế', 'Mỹ phẩm khác',
]

export const LOAI_SP = {
  tieu_hao:  { label: 'Mỹ Phẩm Tiêu Hao', icon: '🧴', color: '#2D7A4F',  bg: '#E8F5E9' },
  ban_khach: { label: 'Sản Phẩm Bán Khách', icon: '🛍️', color: '#A0714F',  bg: '#FDF3E9' },
  vat_tu:    { label: 'Vật Tư Tiêu Hao',   icon: '📦', color: '#1A5276',  bg: '#EBF5FB' },
}

export const LOAI_GD = {
  nhap_kho:     { label: 'Nhập kho',         icon: '📥', sign: +1, color: '#2D7A4F' },
  xuat_su_dung: { label: 'Xuất dùng nội bộ', icon: '🔧', sign: -1, color: '#E67E22' },
  xuat_ban:     { label: 'Xuất bán khách',   icon: '💸', sign: -1, color: '#A0714F' },
  chiet_ra:     { label: 'Chiết rót (lấy)',  icon: '🧪', sign: -1, color: '#8E44AD' },
  chiet_vao:    { label: 'Chiết rót (vào)',  icon: '🧪', sign: +1, color: '#8E44AD' },
  dieu_chinh:   { label: 'Điều chỉnh kho',   icon: '⚖️', sign:  0, color: '#1A5276' },
  tra_nha_cc:   { label: 'Trả nhà cung cấp', icon: '↩️', sign: -1, color: '#C0392B' },
}

export const HINH_THUC = [
  { val: 'tien_mat',     label: 'Tiền Mặt' },
  { val: 'chuyen_khoan', label: 'Chuyển Khoản' },
  { val: 'quet_the',     label: 'Quẹt Thẻ' },
]

export function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + '₫'
}
// Hiển thị số tiền trong ô nhập: "712000" → "712.000đ" (lưu raw digits)
export const moneyFmt = (v) => {
  const d = String(v ?? '').replace(/\D/g, '')
  return d ? new Intl.NumberFormat('vi-VN').format(+d) + '₫' : ''
}
export const moneyRaw = (s) => String(s ?? '').replace(/\D/g, '')
export function fmtMoneyShort(n) {
  const v = Number(n || 0)
  if (!v) return '—'
  if (v >= 1000000) return `${(v / 1000000).toFixed(v % 1000000 ? 1 : 0)}tr`
  return new Intl.NumberFormat('vi-VN').format(v)
}
export function fmtSL(n, dv) {
  if (n == null) return '—'
  const num = Number(n)
  return (Number.isInteger(num) ? num : +num.toFixed(2)) + ' ' + (dv || '')
}
// Tồn theo đơn vị cơ sở + quy đổi ≈ đơn vị nhập (vd "650 gram ≈ 0,93 túi")
// Hàng BÁN KHÁCH bán nguyên đơn vị → KHÔNG quy đổi lẻ.
export function fmtTonQD(p) {
  const base = fmtSL(p.ton_kho, p.don_vi)
  if (p.loai === 'ban_khach') return base
  const qd = Number(p.quy_doi) || 1
  if (qd > 1 && p.don_vi_nhap) {
    const lon = Number(p.ton_kho) / qd
    const lonStr = Number.isInteger(lon) ? lon : +lon.toFixed(2)
    return `${lonStr} ${p.don_vi_nhap} ≈ ${base}`   // vd: 1 hũ ≈ 230 gram
  }
  return base
}
// Đơn giá theo đơn vị cơ sở (gia_nhap đã lưu = giá / đơn vị cơ sở)
export function donGiaCoSo(p) { return Number(p?.gia_nhap) || 0 }
// todayISO: dùng bản chuẩn từ lib/utils (đã import ở đầu file)
// Ảnh thu nhỏ — bấm vào để phóng to (lightbox)
export function ZoomImg({ src, size = 42, radius = 9, alt = '' }) {
  const [open, setOpen] = useState(false)
  if (!src) return null
  return (
    <>
      <img src={src} alt={alt} loading="lazy"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover',
          flexShrink: 0, border: `1px solid ${COLORS.border}`, cursor: 'zoom-in' }} />
      {open && createPortal((
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <img src={src} alt={alt}
            style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 12, boxShadow: '0 12px 60px rgba(0,0,0,0.55)' }} />
          <button onClick={() => setOpen(false)}
            style={{ position: 'absolute', top: 20, right: 24, width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
      ), document.body)}
    </>
  )
}
// Gợi ý DANH MỤC từ tên sản phẩm (suy đoán theo từ khóa phổ biến ngành spa)
export const _DM_RULES = [
  ['Sữa rửa mặt', ['rửa mặt', 'cleansing foam', 'wash powder', 'enzyme wash', 'srm', 'facial wash']],
  ['Dầu gội', ['gội', 'shampoo']],
  ['Dầu xả', ['dầu xả', 'conditioner']],
  ['Ủ / Hấp tóc', ['ủ tóc', 'hấp tóc', 'hair mask', 'scalp', 'keratin', 'l.p.p', 'lpp']],
  ['Tẩy trang', ['tẩy trang', 'remover', 'cleansing milk', 'lip & eye']],
  ['Toner', ['toner', 'soothing toner']],
  ['Serum / Tinh chất', ['serum', 'ampoule', 'tinh chất', 'treatment', 'essence']],
  ['Tẩy tế bào chết', ['tẩy tế bào', 'tbc', 'peeling', 'pelling', 'scrub', 'polish', 'exfoli']],
  ['Mặt nạ', ['nạ', 'mask', 'modeling', 'gypsum', 'thạch cao']],
  ['Chống nắng', ['chống nắng', 'sunblock', 'spf']],
  ['Kem mắt', ['eye cream', 'kem mắt', 'eye']],
  ['Kem dưỡng', ['kem dưỡng', 'collagen cream', 'whitening cream', 'moisture', 'cream', 'kem ']],
  ['Dầu massage', ['massage oil', 'dầu massage', 'massage cream', 'kem massage', 'body massage', 'dầu nướng']],
  ['Muối / Sữa tắm', ['muối tắm', 'sữa tắm', 'spa milk', 'milk salt', 'shower', 'body scrub']],
  ['Thực phẩm chức năng', ['collagen uống', 'liquid collagen', 'biotin', 'viên uống', 'viên thải']],
  ['Vật tư y tế', ['kim', 'lưỡi lam', 'dao số', 'bông', 'gạc', 'ống hút', 'găng tay', 'bao tay', 'cồn', 'povidon', 'bovidon', 'nước muối', 'khăn giấy', 'đầu nano', 'needle', 'lancet', 'que nặn', 'vĩ nặn', 'tăm']],
]
export function suyDanhMuc(ten) {
  const s = (ten || '').toLowerCase()
  if (!s) return ''
  for (const [dm, kws] of _DM_RULES) if (kws.some(k => s.includes(k))) return dm
  return ''
}
// Nén ảnh phía client (canvas): resize max 1000px + JPEG ~0.82 → giảm ~70-85% dung lượng
export function compressImage(file, maxW = 1000, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) return resolve(file)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxW / (img.width || maxW))
      const w = Math.round((img.width || maxW) * scale)
      const h = Math.round((img.height || maxW) * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(b => resolve(b || file), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
// Upload ảnh (đã nén) lên Storage → trả publicUrl
export async function uploadAnhSP(file) {
  const blob = await compressImage(file)
  const path = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`
  const { error } = await supabase.storage.from('san-pham').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
  return supabase.storage.from('san-pham').getPublicUrl(path).data.publicUrl
}
export function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const last  = new Date(year, month, 0).getDate()
  const to    = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

export const inp = {
  width: '100%', padding: '10px 14px', border: `1px solid ${COLORS.border}`,
  borderRadius: '10px', fontSize: '14px', background: COLORS.bg, color: COLORS.text,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
export const lbl = {
  fontSize: '11px', fontWeight: '700', color: COLORS.textSub, marginBottom: '5px',
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
}

// Ô chọn ngày chuẩn (GĐ0-B): nút hiển thị dd/mm/yyyy + DatePicker dùng chung
export function fmtNgayVN(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}
export function DateField({ value, onChange, placeholder = 'Chọn ngày' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" style={{ ...inp, cursor: 'pointer', textAlign: 'left' }}
        onClick={() => setOpen(true)}>
        {value ? `📅 ${fmtNgayVN(value)}` : placeholder}
      </button>
      <DatePicker open={open} selectedDate={value}
        onClose={() => setOpen(false)}
        onConfirm={d => { onChange(d); setOpen(false) }} />
    </>
  )
}
