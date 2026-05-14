import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX_MENU } from '../../../constants/lux'
import { useAuth } from '../../../context/AuthContext'
import { todayISO, getNowVN, formatCurrency } from '../../../lib/utils'
import I from '../../../components/shared/Icons'
import TabTongQuan    from './components/TabTongQuan'
import TabXetDuyet    from './components/TabXetDuyet'
import TabLichDieuDong from './components/TabLichDieuDong'
import TabHoSo        from './components/TabHoSo'
import TabBangLuong   from './components/TabBangLuong'
import AdminTaoOff    from './components/AdminTaoOff'

function getInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return (p[p.length - 1][0] || '').toUpperCase()
}

// ════════════════ STAFF CARD ════════════════
function StaffCard({ nv, onClick }) {
  const avGradients = [
    'linear-gradient(135deg,#c9a96e,#a87f4f)',
    'linear-gradient(135deg,#c4998a,#a87366)',
    'linear-gradient(135deg,#94a085,#6e8a5e)',
    'linear-gradient(135deg,#8a6a6e,#634a4e)',
    'linear-gradient(135deg,#c9a96e,#a87f4f)',
    'linear-gradient(135deg,#5a4030,#2e2018)',
  ]
  const grad = avGradients[Math.abs(nv.ho_ten?.charCodeAt(0) || 0) % avGradients.length]

  return (
    <div className="staff-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="top">
        <div className="av" style={{ background: grad, color: '#fff' }}>{getInitials(nv.ho_ten)}</div>
        <div className="info" style={{ flex: 1 }}>
          <div className="nm">{nv.ho_ten}</div>
          <div className="rl">{nv.vi_tri === 'ktv' ? 'Kỹ Thuật Viên' : nv.vi_tri === 'le_tan' ? 'Lễ Tân' : nv.vi_tri === 'tap_vu' ? 'Tạp Vụ' : nv.vi_tri}</div>
        </div>
        <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={e => { e.stopPropagation(); onClick() }}>
          <I.Cog style={{ width: 14, height: 14, color: 'var(--ink3)' }} />
        </button>
      </div>
      <div className="meta">
        <div><div className="l">Lương Cứng</div><div className="v">{formatCurrency(nv.luong_cung || 0)}</div></div>
        <div><div className="l">Giới Hạn OFF</div><div className="v">{nv.gioi_han_off_thang || 3} ngày</div></div>
        <div><div className="l">Ký Quỹ</div><div className="v" style={{ color: nv.ky_quy_trang_thai === 'dang_dong' ? '#b08a55' : 'var(--success)' }}>
          {nv.ky_quy_trang_thai === 'dang_dong' ? `Đang đóng` : 'Hoàn tất'}
        </div></div>
        <div><div className="l">Trạng Thái</div><div className="v" style={{ color: nv.trang_thai === 'dang_lam' ? 'var(--success)' : 'var(--ink3)', fontSize: '14px' }}>
          {nv.trang_thai === 'dang_lam' ? '● Đang làm' : nv.trang_thai}
        </div></div>
      </div>
    </div>
  )
}

// ════════════════ SUB HEADER ════════════════
function LuxSubHeader({ title, crumb, onBack, action, onAction }) {
  return (
    <div style={{ padding: '22px 24px 20px', background: `linear-gradient(180deg, var(--surface) 0%, var(--surface2) 100%)`, borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--line)', color: 'var(--ink2)', padding: '7px 13px 7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Quay lại
        </button>
        {action && <button onClick={onAction} style={{ background: 'var(--espresso)', color: '#f5ede0', border: 'none', padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)' }}>{action}</button>}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 600, margin: 0, lineHeight: 1, color: 'var(--espresso)', letterSpacing: '-0.01em' }}>{title}</div>
      {crumb && <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4, fontFamily: 'var(--sans)' }}>{crumb}</div>}
    </div>
  )
}

// ════════════════ MAIN ════════════════
export default function AdminNhanSuPage() {
  const { user } = useAuth()
  const initialTab = new URLSearchParams(window.location.search).get('tab') || null
  const [view, setView] = useState(initialTab)
  const [stats, setStats] = useState({ nvCount: 0, diLam: 0, choduyet: 0 })
  const [nvList, setNvList] = useState([])
  const [showTaoOff, setShowTaoOff] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const today = todayISO()
    Promise.all([
      supabase.from('nhan_vien').select('*').eq('trang_thai', 'dang_lam').order('vi_tri').order('ho_ten'),
      supabase.from('cham_cong').select('nhan_vien_id').eq('ngay', today).not('gio_vao', 'is', null),
      supabase.from('dang_ky_off').select('id', { count: 'exact' }).eq('trang_thai', 'cho_duyet'),
      supabase.from('yeu_cau_chinh_sua').select('id', { count: 'exact' }).eq('trang_thai', 'cho_duyet').in('loai_yeu_cau', ['sua', 'xoa', 'dung_ngay_le']),
    ]).then(([nv, cc, od, yc]) => {
      setNvList(nv.data || [])
      setStats({
        nvCount: nv.data?.length || 0,
        diLam: (cc.data || []).length,
        choduyet: (od.count || 0) + (yc.count || 0),
      })
    })
  }, [refreshKey])

  const now = getNowVN()
  const MONTHS = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

  // Sub-view routing
  if (view) {
    const cfg = LUX_MENU.find(m => m.key === view)
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--sans)' }}>
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

  // Home Dashboard
  return (
    <>
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Nhân Sự</div>
          <div className="sub">{stats.nvCount} nhân viên · {stats.diLam} đang trực hôm nay · {stats.choduyet} chờ duyệt · {MONTHS[now.getMonth()+1]} {now.getFullYear()}</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className="st active">Danh Sách</div>
            <div className="st" onClick={() => setView('schedule')}>Lịch Ca</div>
            <div className="st" onClick={() => setView('off')}>Xét Duyệt</div>
            <div className="st" onClick={() => setView('salary')}>Bảng Lương</div>
          </div>
          <button className="btn"><I.Filter style={{ width: 13, height: 13 }} /> Lọc</button>
          <button className="btn gold" onClick={() => setShowTaoOff(true)}><I.Plus style={{ width: 13, height: 13 }} /> Tạo OFF</button>
        </div>
      </div>

      <div className="strip" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 16 }}>
        <div className="it"><div className="l">Tổng Nhân Sự</div><div className="v">{stats.nvCount}</div><div className="d">đang làm việc</div></div>
        <div className="it"><div className="l">Đang Trực</div><div className="v">{stats.diLam}</div><div className="d">hôm nay</div></div>
        <div className="it"><div className="l">Chờ Duyệt</div><div className="v" style={{ color: stats.choduyet > 0 ? '#b08a55' : 'var(--ink)' }}>{stats.choduyet}</div><div className="d up" onClick={() => setView('off')} style={{ cursor: 'pointer' }}>đơn OFF + sửa</div></div>
        <div className="it"><div className="l">Tháng</div><div className="v">{MONTHS[now.getMonth()+1]}</div><div className="d">{now.getFullYear()}</div></div>
        <div className="it"><div className="l">Bảng Lương</div><div className="v">Kỳ {now.getDate() >= 15 ? '2' : '1'}</div><div className="d">{now.getDate() >= 15 ? 'Lương KD' : 'Lương Cứng'}</div></div>
      </div>

      {/* Staff Grid — 100% mẫu Demo */}
      <div className="staff-grid">
        {nvList.map(nv => (
          <StaffCard key={nv.id} nv={nv} onClick={() => setView('employees')} />
        ))}
      </div>

      <AdminTaoOff open={showTaoOff} onClose={() => setShowTaoOff(false)} onSuccess={() => setRefreshKey(k=>k+1)} />
    </>
  )
}
