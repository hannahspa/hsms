import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import AdminNhanSuPage from './nhan-su/AdminNhanSuPage'
import AdminKhuyenMaiPage from './khuyen-mai/AdminKhuyenMaiPage'
import AdminHomepagePage from './trang-chu/AdminHomepagePage'
import AdminKhoHangPage from './kho-hang/AdminKhoHangPage'
import AdminCRMPage from './crm/AdminCRMPage'
import AdminMarketingPage from './marketing/AdminMarketingPage'
import AdminDashboardPage from './dashboard/AdminDashboardPage'
import AdminLichSuNopTienMat from './bao-cao/AdminLichSuNopTienMat'
import { supabase } from '../../lib/supabase'
import { todayISO, getNowVN, fmtCompact } from '../../lib/utils'

// ── Live Stats ─────────────────────────────────────────────────────────────────
function useStats() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    const today = todayISO()
    Promise.all([
      supabase.from('doanh_thu').select('so_tien, hinh_thuc').eq('ngay', today),
      supabase.from('cham_cong').select('id').eq('ngay', today).not('gio_vao', 'is', null),
      supabase.from('nhan_vien').select('id').eq('trang_thai', 'active'),
      supabase.from('so_du_vi_thuc_te').select('so_du_hien_tai'),
      supabase.from('dang_ky_off').select('id', { count: 'exact' }).eq('trang_thai', 'cho_duyet'),
    ]).then(([rDT, rCC, rNV, rVi, rOff]) => {
      const doanhThu = (rDT.data || [])
        .filter(r => r.hinh_thuc !== 'the_tra_truoc')
        .reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongTS = (rVi.data || []).reduce((s, r) => s + (r.so_du_hien_tai || 0), 0)
      setStats({
        doanhThu,
        checkinHom: rCC.data?.length || 0,
        tongNV:     rNV.data?.length || 0,
        tongTS,
        offPending: rOff.count || 0,
      })
    })
  }, [])
  return stats
}

// ── Module link button ─────────────────────────────────────────────────────────
const MODULES = [
  // Nhóm Khách Hàng
  { icon: '🌐', label: 'Trang Chủ',      href: '/',                     badge: 'Live',  group: 'kh',  color: '#b5631a', desc: 'Landing page hannahspa.vn' },
  { icon: '📋', label: 'Menu iPad',       href: '/menu',                 badge: 'Live',  group: 'kh',  color: '#1a6b8a', desc: '181 dịch vụ · Khuyến mãi live' },
  { icon: '🛍️', label: 'Shop Mỹ Phẩm',   href: null,                    soon: true,     group: 'kh',  color: '#7f8c8d', desc: 'Mua sản phẩm online' },
  // Nhóm Nội Bộ
  { icon: '📊', label: 'Dashboard',       href: '/admin/dashboard',       badge: null,    group: 'nb',  color: '#2d7a4f', desc: 'KPI · Biểu đồ · Cảnh báo' },
  { icon: '💰', label: 'Thu Chi',         href: '/SoThuChi',              badge: null,    group: 'nb',  color: '#2d7a4f', desc: 'Doanh thu · Chi phí · Báo cáo' },
  { icon: '🛒', label: 'POS Bán Hàng',   href: '/pos',                   badge: 'Mới',   group: 'nb',  color: '#e74c3c', desc: 'Tạo đơn · Thanh toán · Hoa hồng' },
  { icon: '👥', label: 'Nhân Sự',         href: '/admin/nhan-su',         badge: null,    group: 'nb',  color: '#a0714f', desc: 'Chấm công · Duyệt OFF · Bảng lương' },
  { icon: '👤', label: 'CRM Khách Hàng', href: '/admin/crm',             badge: null,    group: 'nb',  color: '#8e44ad', desc: 'Hồ sơ · Thẻ liệu trình · Công nợ' },
  { icon: '📦', label: 'Kho Hàng',        href: '/admin/kho-hang',        badge: null,    group: 'nb',  color: '#16a085', desc: 'Nhập xuất · Tồn kho · Cảnh báo' },
  { icon: '🏷️', label: 'Khuyến Mãi',     href: '/admin/khuyen-mai',      badge: null,    group: 'nb',  color: '#c0392b', desc: 'CRUD KM · Badge giảm giá · ROI' },
  { icon: '📣', label: 'Marketing',       href: '/admin/marketing',       badge: null,    group: 'nb',  color: '#e67e22', desc: 'Chiến dịch · Phân tích kênh' },
  { icon: '🌐', label: 'Nội Dung Web',    href: '/admin/trang-chu',       badge: null,    group: 'nb',  color: '#1a5276', desc: 'Hero · FAQ · Đánh giá · Liên hệ' },
  { icon: '📱', label: 'Checkin NV',      href: '/checkin',               badge: null,    group: 'nb',  color: '#6c3483', desc: 'Xem màn hình checkin NV' },
  { icon: '🏦', label: 'Lịch Sử Nộp TM', href: '/admin/lich-su-nop-tien-mat', badge: null, group: 'nb', color: '#1a5276', desc: 'Theo dõi nộp tiền mặt MB Bank' },
]

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
  if (path.startsWith('/admin/dashboard'))  return <AdminDashboardPage />
  if (path.startsWith('/admin/lich-su-nop-tien-mat')) return <AdminLichSuNopTienMat />

  const now = getNowVN()
  const DAYS = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy']
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`

  const khModules = MODULES.filter(m => m.group === 'kh')
  const nbModules = MODULES.filter(m => m.group === 'nb')

  return (
    <>
      {/* ── Header ── */}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Hannah Spa · Admin</div>
          <div className="sub">{dateStr} · Chào, {user?.ho_ten?.split(' ').pop() || 'Admin'}</div>
        </div>
        <div className="acts">
          <button onClick={handleLogout} className="btn">Đăng xuất</button>
        </div>
      </div>

      {/* ── Strip stats ── */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="it">
          <div className="l">Thực Thu Hôm Nay</div>
          <div className="v" style={{ color: '#426a2c' }}>{stats ? fmtCompact(stats.doanhThu) : '...'}</div>
          <div className="d">Không tính Thẻ TT</div>
        </div>
        <div className="it">
          <div className="l">Tổng Tài Sản</div>
          <div className="v" style={{ color: 'var(--champagne)' }}>{stats ? fmtCompact(stats.tongTS) : '...'}</div>
          <div className="d">3 ví cộng lại</div>
        </div>
        <div className="it">
          <div className="l">Đã Check-in</div>
          <div className="v">{stats ? `${stats.checkinHom}/${stats.tongNV}` : '...'}</div>
          <div className="d">người hôm nay</div>
        </div>
        <div className="it">
          <div className="l">Đơn OFF Chờ Duyệt</div>
          <div className="v" style={{ color: stats?.offPending > 0 ? 'var(--champagne)' : 'var(--ink3)' }}>
            {stats ? stats.offPending : '...'}
          </div>
          <div className="d up" onClick={() => window.location.href='/admin/nhan-su?tab=off'} style={{ cursor: 'pointer' }}>
            {stats?.offPending > 0 ? 'Duyệt ngay →' : 'Không có đơn'}
          </div>
        </div>
      </div>

      {/* ── Modules: Khách hàng ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>
          Dành Cho Khách Hàng
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {khModules.map((m, i) => (
            <button key={i} onClick={() => m.href && !m.soon && (window.location.href = m.href)}
              disabled={m.soon}
              style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                padding: '18px 20px', background: 'var(--surface2)',
                border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
                cursor: m.soon ? 'default' : 'pointer', textAlign: 'left',
                fontFamily: 'var(--sans)', opacity: m.soon ? 0.55 : 1,
                transition: 'box-shadow .15s, transform .15s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!m.soon) { e.currentTarget.style.boxShadow='var(--sh-3)'; e.currentTarget.style.transform='translateY(-2px)' }}}
              onMouseLeave={e => { e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform='' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: m.color+'18', border: `1.5px solid ${m.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 20 }}>{m.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{m.desc}</div>
                </div>
              </div>
              {m.badge && <span style={{ position:'absolute', top:12, right:12, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background: m.color+'18', color: m.color, border:`1px solid ${m.color}30` }}>{m.badge}</span>}
              {m.soon && <span style={{ position:'absolute', top:12, right:12, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'var(--bg2)', color:'var(--ink3)' }}>Sắp ra mắt</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Modules: Nội bộ ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>
          Quản Lý Nội Bộ
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {nbModules.map((m, i) => (
            <button key={i} onClick={() => m.href && !m.soon && (window.location.href = m.href)}
              disabled={m.soon}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--surface2)',
                border: '1px solid var(--line)', borderRadius: 'var(--r)',
                cursor: m.soon ? 'default' : 'pointer', textAlign: 'left',
                fontFamily: 'var(--sans)', opacity: m.soon ? 0.55 : 1,
                transition: 'box-shadow .15s, transform .15s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!m.soon) { e.currentTarget.style.boxShadow='var(--sh-2)'; e.currentTarget.style.transform='translateY(-2px)' }}}
              onMouseLeave={e => { e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform='' }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: m.color+'18', border:`1.5px solid ${m.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{m.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.desc}</div>
              </div>
              {m.badge && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:999, background: m.color+'18', color: m.color, border:`1px solid ${m.color}30`, flexShrink:0 }}>{m.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick links ── */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          Truy cập nhanh
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: '+ Nhập doanh thu', href: '/SoThuChi/nhap-lieu' },
            { label: '+ Nhập chi phí',   href: '/SoThuChi/nhap-lieu' },
            { label: 'Báo cáo hôm nay',  href: '/SoThuChi/doi-soat' },
            { label: 'Duyệt OFF NV',      href: '/admin/nhan-su?tab=off' },
            { label: '+ Tạo khuyến mãi', href: '/admin/khuyen-mai' },
          ].map(q => (
            <a key={q.label} href={q.href} style={{
              padding: '6px 14px', borderRadius: 999, background: 'var(--bg2)',
              border: '1px solid var(--line2)', fontSize: 12, fontWeight: 600,
              color: 'var(--ink2)', textDecoration: 'none',
            }}>{q.label}</a>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink4)', paddingBottom: 20 }}>
        Hannah Beauty &amp; Spa · 39 Nam Kỳ Khởi Nghĩa · Ninh Kiều · Cần Thơ · hsms v2.0
      </div>
    </>
  )
}
