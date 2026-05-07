import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX, LUX_MENU } from '../../../constants/lux'
import { useAuth } from '../../../context/AuthContext'
import { todayISO, getNowVN } from '../../../lib/utils'
import TabTongQuan    from './components/TabTongQuan'
import TabXetDuyet    from './components/TabXetDuyet'
import TabLichDieuDong from './components/TabLichDieuDong'
import TabHoSo        from './components/TabHoSo'
import TabBangLuong   from './components/TabBangLuong'
import AdminTaoOff    from './components/AdminTaoOff'

// ── SVG Icons ──────────────────────────────────────────────
const ICONS = {
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
      <path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-5"/>
      <circle cx="18" cy="9" r="1.5" fill="currentColor"/>
    </svg>
  ),
  'calendar-check': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
      <rect x="4" y="5" width="16" height="15" rx="2"/><path d="M9 3v4M15 3v4M4 10h16"/>
      <path d="M9 15l2 2 4-4"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>
      <circle cx="8" cy="14" r="1" fill="currentColor"/>
      <circle cx="12" cy="14" r="1" fill="currentColor"/>
      <circle cx="16" cy="14" r="1" fill="currentColor"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
      <circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/>
      <circle cx="17" cy="9" r="2.5"/><path d="M21 19c0-2.5-1.7-4.5-4-4.5"/>
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
      <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18"/>
      <circle cx="8" cy="15.5" r="1.5"/><path d="M14 16h4"/>
      <path d="M7 7l3-3h4l3 3"/>
    </svg>
  ),
}

// ── Shared sub-header ──────────────────────────────────────
function LuxSubHeader({ title, crumb, onBack, action, onAction }) {
  return (
    <div style={{
      padding: '22px 24px 20px',
      background: `linear-gradient(180deg, ${LUX.surface} 0%, ${LUX.surface2} 100%)`,
      borderBottom: `1px solid ${LUX.line}`,
      position: 'sticky', top: 0, zIndex: 10,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: LUX.surface2, border: `1px solid ${LUX.line}`, color: LUX.ink2, padding: '7px 13px 7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: LUX.fontSans }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Quay lại
        </button>
        {action && (
          <button onClick={onAction}
            style={{ background: LUX.espresso, color: '#f5ede0', border: 'none', padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: LUX.fontSans }}>
            {action}
          </button>
        )}
      </div>
      <div style={{ fontFamily: LUX.fontSerif, fontSize: 32, fontWeight: 600, margin: 0, lineHeight: 1, color: LUX.espresso, letterSpacing: '-0.01em' }}>
        {title}
      </div>
      {crumb && (
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 4, fontFamily: LUX.fontSans }}>
          {crumb}
        </div>
      )}
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────
export default function AdminNhanSuPage() {
  const { user, logout } = useAuth()
  const initialTab = new URLSearchParams(window.location.search).get('tab') || null
  const [view,        setView]        = useState(initialTab)
  const [stats,       setStats]       = useState({ nvCount: 0, diLam: 0, choduyet: 0 })
  const [showTaoOff,  setShowTaoOff]  = useState(false)
  const [refreshKey,  setRefreshKey]  = useState(0)

  useEffect(() => {
    const today = todayISO()
    Promise.all([
      supabase.from('nhan_vien').select('id', { count: 'exact' }).eq('trang_thai', 'dang_lam'),
      supabase.from('cham_cong').select('nhan_vien_id').eq('ngay', today).not('gio_vao', 'is', null),
      supabase.from('dang_ky_off').select('id', { count: 'exact' }).eq('trang_thai', 'cho_duyet'),
      supabase.from('yeu_cau_chinh_sua').select('id', { count: 'exact' }).eq('trang_thai', 'cho_duyet'),
    ]).then(([nv, cc, od, yc]) => {
      setStats({
        nvCount:  nv.count || 0,
        diLam:    (cc.data || []).length,
        choduyet: (od.count || 0) + (yc.count || 0),
      })
    })
  }, [refreshKey])

  const now = getNowVN()
  const MONTHS = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

  // ── Sub-view routing ────────────────────────────────────
  if (view) {
    const cfg = LUX_MENU.find(m => m.key === view)
    return (
      <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: LUX.fontSans }}>
        <LuxSubHeader
          title={cfg?.title || ''}
          crumb={view === 'off' ? `${stats.choduyet} đơn chờ · ${MONTHS[now.getMonth()+1]} ${now.getFullYear()}` : `${MONTHS[now.getMonth()+1]} ${now.getFullYear()}`}
          onBack={() => setView(null)}
          action={view === 'off' ? '＋ Tạo đơn' : null}
          onAction={() => setShowTaoOff(true)}
        />
        <div style={{ padding: '20px 20px 80px' }}>
          {view === 'status'    && <TabTongQuan    key={refreshKey} />}
          {view === 'off'       && <TabXetDuyet    key={refreshKey} onUpdate={() => setRefreshKey(k=>k+1)} />}
          {view === 'schedule'  && <TabLichDieuDong />}
          {view === 'employees' && <TabHoSo />}
          {view === 'salary'    && <TabBangLuong />}
        </div>
        <AdminTaoOff open={showTaoOff} onClose={() => setShowTaoOff(false)} onSuccess={() => setRefreshKey(k=>k+1)} />
      </div>
    )
  }

  // ── Home / Dashboard ────────────────────────────────────
  const initials = (user?.ho_ten || 'CN').split(' ').filter(Boolean).map(w => w[0]).slice(-2).join('').toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: LUX.fontSans }}>

      {/* ── Hero Header ── */}
      <header style={{
        position: 'relative', padding: '22px 24px 36px',
        background: LUX.heroGrad, color: '#f5ede0', overflow: 'hidden',
      }}>
        {/* texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 80% 80%, rgba(200,166,117,0.18), transparent 40%)',
        }} />

        {/* top row */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <button onClick={() => window.location.replace('/admin')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,237,224,0.18)', color: '#f5ede0', padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer', backdropFilter: 'blur(8px)', fontFamily: LUX.fontSans }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Trang chủ
          </button>
          <button onClick={async () => { await logout(); window.location.replace('/') }}
            style={{ background: 'transparent', border: '1px solid rgba(245,237,224,0.18)', color: 'rgba(245,237,224,0.7)', padding: '8px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', fontFamily: LUX.fontSans }}>
            Đăng xuất
          </button>
        </div>

        {/* title row */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.65)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span>Hannah Spa</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: LUX.champagne, display: 'inline-block' }} />
              <span>Quản trị</span>
            </div>
            <h1 style={{ fontFamily: LUX.fontSerif, fontSize: 42, fontWeight: 600, margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>
              Nhân sự
            </h1>
          </div>
          <button onClick={() => setShowTaoOff(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: LUX.goldGrad, color: '#2a1f15', border: 'none', padding: '10px 18px', borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(212,165,116,0.6), inset 0 1px 0 rgba(255,255,255,0.4)', flexShrink: 0, fontFamily: LUX.fontSans }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Tạo OFF
          </button>
        </div>

        {/* user chip */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 20, padding: '10px 14px 10px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(245,237,224,0.1)', borderRadius: 14, backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${LUX.champagne}, ${LUX.rose})`, display: 'grid', placeItems: 'center', fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 14, color: '#2a1f15', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.1 }}>{user?.ho_ten || 'Cao Quốc Nam'}</div>
            <div style={{ fontSize: 11, color: 'rgba(245,237,224,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Quản lý</div>
          </div>
        </div>
      </header>

      {/* ── Stats Strip (overlapping hero) ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, margin: '-18px 20px 28px',
        background: LUX.line, borderRadius: LUX.radius,
        overflow: 'hidden', boxShadow: LUX.shadow,
        border: `1px solid ${LUX.line}`,
      }}>
        {[
          { n: stats.nvCount, l: 'Nhân viên', onClick: null },
          { n: stats.diLam,   l: 'Đang làm',  onClick: null },
          { n: stats.choduyet, l: 'Chờ duyệt', highlight: stats.choduyet > 0, onClick: () => setView('off') },
        ].map((s, i) => (
          <div key={i} onClick={s.onClick || undefined}
            style={{ background: LUX.surface2, padding: '14px 12px', textAlign: 'center', cursor: s.onClick ? 'pointer' : 'default' }}>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 28, fontWeight: 600, lineHeight: 1, color: s.highlight ? LUX.gold : LUX.espresso }}>
              {s.n}
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 4, fontFamily: LUX.fontSans }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* ── Section label ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', marginBottom: 16 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: LUX.ink3, fontWeight: 600 }}>Phân hệ</span>
        <span style={{ flex: 1, height: 1, background: LUX.line }} />
        <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: LUX.taupe, fontWeight: 600 }}>5</span>
      </div>

      {/* ── Menu Items ── */}
      <nav style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LUX_MENU.map(item => (
          <MenuCard
            key={item.key}
            item={item}
            badge={item.key === 'off' ? stats.choduyet : null}
            onClick={() => setView(item.key)}
          />
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', padding: '0 0 32px', fontFamily: LUX.fontSans }}>
        <div style={{ fontFamily: LUX.fontSerif, fontStyle: 'italic', fontSize: 16, color: LUX.taupe, marginBottom: 4 }}>Hannah Spa</div>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: LUX.ink3 }}>
          Hệ thống quản trị · v2.6
        </div>
      </div>

      <AdminTaoOff open={showTaoOff} onClose={() => setShowTaoOff(false)} onSuccess={() => setRefreshKey(k=>k+1)} />
    </div>
  )
}

// ── Menu Card Component ─────────────────────────────────────
function MenuCard({ item, badge, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'grid', gridTemplateColumns: '56px 1fr auto',
        alignItems: 'center', gap: 14,
        padding: '14px 18px 14px 14px',
        background: LUX.surface2,
        border: `1px solid ${hovered ? LUX.line2 : LUX.line}`,
        borderRadius: LUX.radius,
        cursor: 'pointer', textAlign: 'left', width: '100%',
        fontFamily: LUX.fontSans, color: LUX.ink,
        overflow: 'hidden',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? LUX.shadow : LUX.shadowSm,
        transition: 'all 0.25s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {/* accent stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: item.accent,
        transform: hovered ? 'scaleY(1)' : 'scaleY(0)',
        transformOrigin: 'center',
        transition: 'transform 0.25s',
        borderRadius: '3px 0 0 3px',
      }} />

      {/* icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: item.iconBg, color: item.iconFg,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {ICONS[item.icon]}
      </div>

      {/* text */}
      <span style={{ display: 'block', minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, lineHeight: 1.1, color: LUX.espresso, marginBottom: 4, letterSpacing: '-0.005em' }}>
          {item.title}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: LUX.ink3, letterSpacing: '0.02em', lineHeight: 1.3 }}>
          {item.desc}
        </span>
      </span>

      {/* meta */}
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        {badge > 0 && (
          <span style={{ background: LUX.gold, color: '#2a1f15', fontSize: 11, fontWeight: 700, minWidth: 22, height: 22, borderRadius: 999, padding: '0 7px', display: 'inline-grid', placeItems: 'center', boxShadow: '0 2px 6px -2px rgba(212,165,116,0.6)' }}>
            {badge}
          </span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ width: 16, height: 16, color: hovered ? LUX.espresso : LUX.ink3, transform: hovered ? 'translateX(3px)' : 'none', transition: 'all 0.2s' }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </span>
    </button>
  )
}
