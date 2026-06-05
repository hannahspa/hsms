import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX_MENU } from '../../../constants/lux'
import { useAuth } from '../../../context/AuthContext'
import { todayISO, getNowVN, formatCurrency } from '../../../lib/utils'
import I from '../../../components/shared/Icons'
import StaffAvatar    from '../../../components/shared/StaffAvatar'
import TabTongQuan    from './components/TabTongQuan'
import TabXetDuyet    from './components/TabXetDuyet'
import TabLichDieuDong from './components/TabLichDieuDong'
import TabHoSo        from './components/TabHoSo'
import TabBangLuong   from './components/TabBangLuong'
import TabQuyNgayLe  from './components/TabQuyNgayLe'
import TabBaoCaoThuNhap from './components/TabBaoCaoThuNhap'
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

// ════════════════ PATH → VIEW ════════════════
const PATH_VIEW = {
  '/admin/nhan-su':             'employees',
  '/admin/nhan-su/tong-quan':   'status',
  '/admin/nhan-su/ho-so':       'employees',
  '/admin/nhan-su/lich-ca':     'schedule',
  '/admin/nhan-su/xet-duyet':   'off',
  '/admin/nhan-su/bang-luong':  'salary',
  '/admin/nhan-su/luong-kinh-doanh': 'salary-kd',
  '/admin/nhan-su/bao-cao-thu-nhap': 'income-report',
  '/admin/nhan-su/quy-ngay-le': 'holiday',
}
const VIEW_PATH = Object.fromEntries(
  Object.entries(PATH_VIEW).map(([p, v]) => [v ?? '__root__', p])
)

function navigate(v) {
  window.location.href = VIEW_PATH[v ?? '__root__'] ?? '/admin/nhan-su'
}

// ════════════════ MAIN ════════════════
export default function AdminNhanSuPage() {
  const { user } = useAuth()
  const view = PATH_VIEW[window.location.pathname] ?? null
  const [stats, setStats]   = useState({ nvCount: 0, diLam: 0, choduyet: 0 })
  const [nvList, setNvList] = useState([])
  const [showTaoOff, setShowTaoOff] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

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

  const roleLabel = { ktv: 'Kỹ Thuật Viên', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ', quan_ly: 'Quản Lý' }
  const filteredNv = useMemo(() => {
    const q = search.trim().toLowerCase()
    return nvList.filter(nv => {
      const haystack = [nv.ho_ten, nv.so_dien_thoai, nv.vi_tri].filter(Boolean).join(' ').toLowerCase()
      const matchText = !q || haystack.includes(q)
      const matchRole = roleFilter === 'all' || nv.vi_tri === roleFilter
      return matchText && matchRole
    })
  }, [nvList, search, roleFilter])

  // Sub-view routing
  if (view) {
    const cfg = LUX_MENU.find(m => m.key === view)
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--sans)' }}>
        <LuxSubHeader
          title={cfg?.title || ''}
          crumb={view === 'off' ? `${stats.choduyet} đơn chờ · ${MONTHS[now.getMonth()+1]} ${now.getFullYear()}` : `${MONTHS[now.getMonth()+1]} ${now.getFullYear()}`}
          onBack={() => { window.location.href = view === 'employees' ? '/admin' : '/admin/nhan-su' }}
          action={view === 'off' ? '＋ Tạo đơn' : null}
          onAction={() => setShowTaoOff(true)}
        />
        <div style={{ padding: '24px 28px 48px' }}>
          {view === 'status'    && <TabTongQuan    key={refreshKey} />}
          {view === 'off'       && <TabXetDuyet    key={refreshKey} onUpdate={() => setRefreshKey(k=>k+1)} />}
          {view === 'schedule'  && <TabLichDieuDong />}
          {view === 'employees' && <TabHoSo />}
          {view === 'salary'    && <TabBangLuong fixedKy={1} />}
          {view === 'salary-kd' && <TabBangLuong fixedKy={2} />}
          {view === 'income-report' && <TabBaoCaoThuNhap />}
          {view === 'holiday'   && <TabQuyNgayLe />}
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
            <div className="st" onClick={() => navigate('schedule')}>Lịch Ca</div>
            <div className="st" onClick={() => navigate('off')}>Xét Duyệt</div>
            <div className="st" onClick={() => navigate('salary')}>Bảng Lương</div>
            <div className="st" onClick={() => navigate('holiday')}>Quỹ Ngày Lễ</div>
          </div>
          <button className="btn"><I.Filter style={{ width: 13, height: 13 }} /> Lọc</button>
          <button className="btn gold" onClick={() => setShowTaoOff(true)}><I.Plus style={{ width: 13, height: 13 }} /> Tạo OFF</button>
        </div>
      </div>

      <div className="strip" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 16 }}>
        <div className="it"><div className="l">Tổng Nhân Sự</div><div className="v">{stats.nvCount}</div><div className="d">đang làm việc</div></div>
        <div className="it"><div className="l">Đang Trực</div><div className="v">{stats.diLam}</div><div className="d">hôm nay</div></div>
        <div className="it"><div className="l">Chờ Duyệt</div><div className="v" style={{ color: stats.choduyet > 0 ? '#b08a55' : 'var(--ink)' }}>{stats.choduyet}</div><div className="d up" onClick={() => navigate('off')} style={{ cursor: 'pointer' }}>đơn OFF + sửa</div></div>
        <div className="it"><div className="l">Tháng</div><div className="v">{MONTHS[now.getMonth()+1]}</div><div className="d">{now.getFullYear()}</div></div>
        <div className="it"><div className="l">Bảng Lương</div><div className="v">Kỳ {now.getDate() >= 15 ? '2' : '1'}</div><div className="d">{now.getDate() >= 15 ? 'Lương KD' : 'Lương Cứng'}</div></div>
      </div>

      {/* Staff Grid — 100% mẫu Demo */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-h" style={{ alignItems: 'center' }}>
          <div className="card-t">
            <div className="arch-i"><I.Users style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
            <h3>Danh Sách Nhân Sự</h3>
            <span className="sub">{filteredNv.length}/{nvList.length} nhân viên</span>
          </div>
          <div className="card-actions" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <I.Search style={{ width: 14, height: 14, position: 'absolute', left: 11, top: 9, color: 'var(--ink3)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhân viên..." style={{ width: 220, height: 32, padding: '0 12px 0 32px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface2)', color: 'var(--ink)', outline: 'none', fontSize: 13 }} />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface2)', padding: '0 10px', color: 'var(--ink)', fontSize: 13 }}>
              <option value="all">Tất cả vị trí</option>
              <option value="ktv">Kỹ thuật viên</option>
              <option value="le_tan">Lễ tân</option>
              <option value="tap_vu">Tạp vụ</option>
              <option value="quan_ly">Quản lý</option>
            </select>
            <button className="btn" onClick={() => navigate('employees')}><I.Edit style={{ width: 13, height: 13 }} /> Hồ sơ</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ledger" style={{ minWidth: 920 }}>
            <thead>
              <tr>
                <th>Nhân Viên</th>
                <th>Vị Trí</th>
                <th className="r">Lương Cứng</th>
                <th className="r">OFF/Tháng</th>
                <th>Ký Quỹ</th>
                <th>Trạng Thái</th>
                <th className="r">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredNv.map(nv => (
                <tr key={nv.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <StaffAvatar nv={nv} size={36} radius={11} />
                      <div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 16.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '.005em' }}>{nv.ho_ten}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{nv.so_dien_thoai || 'Chưa có SĐT'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="tag sv">{roleLabel[nv.vi_tri] || nv.vi_tri || 'Khác'}</span></td>
                  <td className="r" style={{ fontWeight: 700 }}>{formatCurrency(nv.luong_cung || 0)}</td>
                  <td className="r">{nv.gioi_han_off_thang || 3} ngày</td>
                  <td>{nv.ky_quy_trang_thai === 'dang_dong' ? 'Đang đóng' : 'Hoàn tất'}</td>
                  <td><span className="method cash">Đang làm</span></td>
                  <td className="r"><button className="btn" onClick={() => navigate('employees')}>Chi tiết</button></td>
                </tr>
              ))}
              {!filteredNv.length && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink3)' }}>Chưa có nhân viên phù hợp bộ lọc</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminTaoOff open={showTaoOff} onClose={() => setShowTaoOff(false)} onSuccess={() => setRefreshKey(k=>k+1)} />
    </>
  )
}
