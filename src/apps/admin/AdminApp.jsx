import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import AdminNhanSuPage from './nhan-su/AdminNhanSuPage'
import AdminKhuyenMaiPage from './khuyen-mai/AdminKhuyenMaiPage'
import AdminHomepagePage from './trang-chu/AdminHomepagePage'
import AdminKhoHangPage from './kho-hang/AdminKhoHangPage'
import AdminCRMPage from './crm/AdminCRMPage'
import AdminMarketingPage from './marketing/AdminMarketingPage'
import { supabase } from '../../lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}
function fmtFull(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}
function todayISO() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    .toISOString().slice(0, 10)
}
function getNowVN() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
}

// ── Live Stats ─────────────────────────────────────────────────────────────────
function useStats() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    const today = todayISO()
    Promise.all([
      supabase.from('doanh_thu').select('so_tien, hinh_thuc').eq('ngay', today),
      supabase.from('cham_cong').select('id').eq('ngay', today).not('gio_vao', 'is', null),
      supabase.from('nhan_vien').select('id').eq('trang_thai', 'active'),
      supabase.from('khuyen_mai').select('id').eq('trang_thai', 'active')
        .lte('ngay_bat_dau', today).gte('ngay_ket_thuc', today),
      supabase.from('so_du_vi_thuc_te').select('so_du_hien_tai'),
    ]).then(([rDT, rCC, rNV, rKM, rVi]) => {
      const doanhThu = (rDT.data || [])
        .filter(r => r.hinh_thuc !== 'the_tra_truoc')
        .reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongTS = (rVi.data || []).reduce((s, r) => s + (r.so_du_hien_tai || 0), 0)
      setStats({
        doanhThu,
        checkinHom: rCC.data?.length || 0,
        tongNV:     rNV.data?.length || 0,
        kmActive:   rKM.data?.length || 0,
        tongTS,
      })
    })
  }, [])
  return stats
}

// ── Module Card ────────────────────────────────────────────────────────────────
function ModuleCard({ icon, label, desc, color, href, soon, badge }) {
  const [hovered, setHovered] = useState(false)

  const handleClick = () => {
    if (soon) return
    window.location.href = href
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={soon}
      style={{
        background: soon ? '#F5F2EF' : 'white',
        border: soon ? '1px dashed #D4C5B5' : `1px solid rgba(160,113,79,0.14)`,
        borderRadius: '18px',
        padding: '20px',
        textAlign: 'left',
        cursor: soon ? 'default' : 'pointer',
        transition: 'all .22s',
        transform: (!soon && hovered) ? 'translateY(-4px)' : 'none',
        boxShadow: (!soon && hovered)
          ? `0 12px 32px rgba(139,94,60,0.18)`
          : '0 2px 12px rgba(139,94,60,0.07)',
        position: 'relative',
        opacity: soon ? 0.65 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minHeight: '120px',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: soon ? '#E8E0D8' : `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', flexShrink: 0,
        border: soon ? 'none' : `1.5px solid ${color}30`,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: '800', fontSize: '14px',
          color: soon ? '#B8A898' : '#1A1209',
          marginBottom: '3px',
        }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: '#B8A898', lineHeight: 1.4 }}>
          {desc}
        </div>
      </div>

      {/* Badge hoặc Soon */}
      {soon ? (
        <div style={{
          position: 'absolute', top: '14px', right: '14px',
          background: '#EDE8E3', color: '#B8A898',
          fontSize: '10px', fontWeight: '700', padding: '3px 8px',
          borderRadius: '999px', letterSpacing: '0.05em',
        }}>
          Sắp ra mắt
        </div>
      ) : badge ? (
        <div style={{
          position: 'absolute', top: '14px', right: '14px',
          background: color + '18', color, border: `1px solid ${color}30`,
          fontSize: '10px', fontWeight: '800', padding: '3px 8px',
          borderRadius: '999px',
        }}>
          {badge}
        </div>
      ) : (
        <div style={{
          position: 'absolute', bottom: '16px', right: '16px',
          color: '#D4C5B5', fontSize: '16px',
          transition: 'transform .2s',
          transform: hovered ? 'translateX(3px)' : 'none',
        }}>
          →
        </div>
      )}
    </button>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, sub }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontWeight: '800', fontSize: '15px', color: '#1A1209', letterSpacing: '-0.01em' }}>
          {label}
        </span>
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: '#B8A898', marginTop: '3px', marginLeft: '24px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Main AdminApp ──────────────────────────────────────────────────────────────
export default function AdminApp() {
  const path = window.location.pathname
  const { user, logout } = useAuth()
  const stats = useStats()

  const handleLogout = async () => {
    await logout()
    window.location.replace('/')
  }

  // Sub-page routing
  if (path.startsWith('/admin/nhan-su'))    return <AdminNhanSuPage />
  if (path.startsWith('/admin/khuyen-mai')) return <AdminKhuyenMaiPage />
  if (path.startsWith('/admin/trang-chu'))  return <AdminHomepagePage />
  if (path.startsWith('/admin/kho-hang'))   return <AdminKhoHangPage />
  if (path.startsWith('/admin/crm'))        return <AdminCRMPage />
  if (path.startsWith('/admin/marketing'))  return <AdminMarketingPage />

  const now = getNowVN()
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  const dateStr = `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F4', fontFamily: "'Inter', 'Segoe UI', sans-serif", paddingBottom: '48px' }}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #2C1810 0%, #A0714F 60%, #C9A96E 100%)',
        padding: '48px 24px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'rgba(201,169,110,0.12)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-20px',
          width: '160px', height: '160px', borderRadius: '50%',
          background: 'rgba(201,169,110,0.07)', pointerEvents: 'none',
        }} />

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(201,169,110,0.25)', border: '1.5px solid rgba(201,169,110,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '18px', color: '#C9A96E',
              }}>H</div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600',
                letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Hannah Spa · Admin
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginBottom: '4px' }}>
              {dateStr}
            </div>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '22px', lineHeight: 1.2 }}>
              Chào, {user?.ho_ten?.split(' ').pop() || 'Admin'} 👋
            </div>
          </div>
          <button onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px', padding: '8px 14px', color: 'rgba(255,255,255,0.85)',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            }}>
            Đăng xuất
          </button>
        </div>

        {/* ── QUICK STATS ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '24px',
        }}>
          {[
            {
              label: 'Thực thu hôm nay',
              val: stats ? fmtFull(stats.doanhThu) : '...',
              icon: '💰',
              color: '#6FCF8E',
            },
            {
              label: 'Tổng tài sản',
              val: stats ? fmtFull(stats.tongTS) : '...',
              icon: '🏦',
              color: '#C9A96E',
            },
            {
              label: 'Đã check-in hôm nay',
              val: stats ? `${stats.checkinHom} / ${stats.tongNV} người` : '...',
              icon: '👥',
              color: '#7EB8D4',
            },
            {
              label: 'Khuyến mãi đang chạy',
              val: stats ? `${stats.kmActive} đợt` : '...',
              icon: '🏷️',
              color: '#F4A460',
            },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: '14px',
              padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{ fontSize: '16px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ color: s.color, fontWeight: '800', fontSize: '16px', lineHeight: 1 }}>
                {s.val}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '4px' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── NHÓM 1: KHÁCH HÀNG ─────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0' }}>
        <SectionHeader
          icon="🌐"
          label="Dành Cho Khách Hàng"
          sub="Trang web công khai · Menu dịch vụ · Shop"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <ModuleCard
            icon="🌐" label="Trang Chủ" color="#B5631A"
            desc="Landing page hannahspa.vn"
            href="/" badge="Live"
          />
          <ModuleCard
            icon="📋" label="Menu iPad" color="#1A6B8A"
            desc="181 dịch vụ · Khuyến mãi live"
            href="/menu" badge="Live"
          />
          <ModuleCard
            icon="🛍️" label="Shop Mỹ Phẩm" color="#7F8C8D"
            desc="Mua sản phẩm online"
            soon
          />
        </div>
      </div>

      {/* ── NHÓM 2: NỘI BỘ ────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0' }}>
        <SectionHeader
          icon="🔒"
          label="Quản Lý Nội Bộ"
          sub="Thu chi · Nhân sự · Vận hành · Website"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <ModuleCard
            icon="💰" label="Thu Chi & Báo Cáo" color="#2D7A4F"
            desc="Doanh thu · Chi phí · 7 loại báo cáo · Email 21h"
            href="/app"
          />
          <ModuleCard
            icon="👥" label="Nhân Sự" color="#A0714F"
            desc="Chấm công · Duyệt OFF · Bảng lương"
            href="/admin/nhan-su"
          />
          <ModuleCard
            icon="🏷️" label="Khuyến Mãi & ROI" color="#C0392B"
            desc="Tạo đợt KM · Badge giảm giá · Phân tích ROI"
            href="/admin/khuyen-mai"
          />
          <ModuleCard
            icon="🌐" label="Nội Dung Web" color="#1A5276"
            desc="Hero · FAQ · Đánh giá · Liên hệ"
            href="/admin/trang-chu"
          />
          <ModuleCard
            icon="📱" label="Checkin Nhân Viên" color="#6C3483"
            desc="Xem màn hình checkin của nhân viên"
            href="/checkin"
          />
          <ModuleCard
            icon="📦" label="Kho Hàng" color="#16A085"
            desc="Nhập xuất · Tồn kho · Chiết rót · Cảnh báo"
            href="/admin/kho-hang"
          />
          <ModuleCard
            icon="👤" label="CRM Khách Hàng" color="#8E44AD"
            desc="Hồ sơ · Thẻ liệu trình · Nhắc tái khám"
            href="/admin/crm"
          />
          <ModuleCard
            icon="📣" label="Marketing" color="#E67E22"
            desc="Chiến dịch · ROI · Phân tích kênh"
            href="/admin/marketing"
          />
          <ModuleCard
            icon="📊" label="Dashboard Tổng Hợp" color="#7F8C8D"
            desc="KPI · Biểu đồ · So sánh cùng kỳ"
            soon
          />
        </div>
      </div>

      {/* ── QUICK LINKS ────────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          background: 'white', borderRadius: '16px',
          border: '1px solid rgba(160,113,79,0.12)',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B8A898',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Truy cập nhanh
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: '+ Nhập doanh thu', href: '/app' },
              { label: '+ Nhập chi phí', href: '/app' },
              { label: 'Báo cáo hôm nay', href: '/app' },
              { label: 'Duyệt OFF nhân viên', href: '/admin/nhan-su' },
              { label: '+ Tạo khuyến mãi', href: '/admin/khuyen-mai' },
            ].map(q => (
              <a key={q.label} href={q.href}
                style={{
                  padding: '7px 14px', borderRadius: '999px',
                  background: '#FAF7F4', border: '1px solid rgba(160,113,79,0.18)',
                  fontSize: '12px', fontWeight: '600', color: '#8B7355',
                  textDecoration: 'none', transition: 'all .15s',
                }}
                onMouseEnter={e => { e.target.style.background = '#A0714F'; e.target.style.color = 'white' }}
                onMouseLeave={e => { e.target.style.background = '#FAF7F4'; e.target.style.color = '#8B7355' }}
              >
                {q.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: '#D4C5B5' }}>
          Hannah Beauty & Spa · 39 Nam Kỳ Khởi Nghĩa · Ninh Kiều · Cần Thơ
        </div>
        <div style={{ fontSize: '11px', color: '#D4C5B5', marginTop: '4px' }}>
          hsms v2.0 · {new Date().getFullYear()}
        </div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          /* Quick stats: 2 cột vẫn OK */
          /* Modules khách hàng: stack thành 1 cột */
        }
        @media (min-width: 768px) {
          /* Nội bộ: 4 cột trên desktop */
        }
      `}</style>
    </div>
  )
}
