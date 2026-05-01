import os

# Root src directory
SRC = os.path.join(os.path.dirname(__file__), "src")

files = {

# ── constants/colors.js ──────────────────────────────────
"constants/colors.js": """
export const COLORS = {
  grad:        'linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)',
  bg:          '#FAF7F4',
  card:        '#FFFFFF',
  border:      'rgba(160,113,79,0.12)',
  shadow:      '0 4px 24px rgba(139,94,60,0.10)',
  text:        '#1A1209',
  textSub:     '#8B7355',
  textMute:    '#B8A898',
  thu:         '#2D7A4F',
  chi:         '#C0392B',
  taiSan:      '#1A5276',
  chuyenKhoan: '#6C3483',
  gold:        '#C9A96E',
  primary:     '#A0714F',
}
""",

# ── constants/enums.js ───────────────────────────────────
"constants/enums.js": """
export const VAI_TRO = {
  ADMIN:   'admin',
  LE_TAN:  'le_tan',
  KTV:     'ktv',
  TAP_VU:  'tap_vu',
}

export const LOAI_GIAO_DICH = {
  THU:           'thu',
  CHI:           'chi',
  CHUYEN_KHOAN:  'chuyen_khoan',
}

export const LOAI_VI = {
  TIEN_MAT:  'tien_mat',
  NGAN_HANG: 'ngan_hang',
}

export const HINH_THUC_THU = [
  { id: 'tien_mat',      label: 'Tiền Mặt',        icon: '💵', vi: 'Tiền Mặt'   },
  { id: 'chuyen_khoan',  label: 'Chuyển Khoản',     icon: '🏦', vi: 'MB Bank'    },
  { id: 'quet_the',      label: 'Quẹt Thẻ',         icon: '💳', vi: 'TP Bank'    },
  { id: 'the_tra_truoc', label: 'Thẻ Trả Trước',    icon: '🎫', vi: 'Tiền Mặt'  },
]

export const MOCK_USERS = {
  admin:  { ten: 'Cao Quốc Nam', vai_tro: 'admin'  },
  le_tan: { ten: 'Khánh Duy',    vai_tro: 'le_tan' },
  ktv:    { ten: 'Cẩm My',       vai_tro: 'ktv'    },
}
""",

# ── constants/routes.js ──────────────────────────────────
"constants/routes.js": """
export const ROUTES = {
  // Internal App
  APP:        '/app',
  TONG_QUAN:  '/app',
  TAI_KHOAN:  '/app/tai-khoan',
  NHAP_LIEU:  '/app/nhap-lieu',
  BAO_CAO:    '/app/bao-cao',
  CAI_DAT:    '/app/cai-dat',

  // Admin
  ADMIN:      '/admin',

  // Public
  HOME:       '/',
  MENU:       '/menu',
  SHOP:       '/shop',

  // Auth
  LOGIN:      '/login',
}
""",

# ── lib/utils.js ─────────────────────────────────────────
"lib/utils.js": """
export const formatCurrency = (n) =>
  new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'

export const formatCurrencyHide = () => '••••••••'

export const formatDate = (date) => {
  const d = new Date(date)
  const days = ['CN','T2','T3','T4','T5','T6','T7']
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export const todayISO = () => new Date().toISOString().split('T')[0]
""",

# ── hooks/useClock.js ────────────────────────────────────
"hooks/useClock.js": """
import { useEffect, useState } from 'react'

export function useClock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const days = ['CN','T2','T3','T4','T5','T6','T7']
      setTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`)
      setDate(`${days[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return { time, date }
}
""",

# ── hooks/useVi.js ───────────────────────────────────────
"hooks/useVi.js": """
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useVi() {
  const [viList,  setViList]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('vi').select('*').order('thu_tu')
        if (error) throw error
        setViList(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { viList, loading, error }
}
""",

# ── services/viService.js ────────────────────────────────
"services/viService.js": """
import { supabase } from '../lib/supabase'

export const viService = {
  async getAll() {
    const { data, error } = await supabase
      .from('vi').select('*').order('thu_tu')
    if (error) throw error
    return data
  },

  async updateSoDu(id, soDu) {
    const { data, error } = await supabase
      .from('vi').update({ so_du_dau: soDu }).eq('id', id)
    if (error) throw error
    return data
  }
}
""",

# ── services/giaoDichService.js ──────────────────────────
"services/giaoDichService.js": """
import { supabase } from '../lib/supabase'

export const giaoDichService = {
  async create(payload) {
    const { data, error } = await supabase
      .from('giao_dich').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async getByNgay(ngay) {
    const { data, error } = await supabase
      .from('giao_dich')
      .select('*, danh_muc(*), vi:vi_id(*)')
      .eq('ngay', ngay)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getByThang(thang, nam) {
    const start = `${nam}-${String(thang).padStart(2,'0')}-01`
    const end   = `${nam}-${String(thang).padStart(2,'0')}-31`
    const { data, error } = await supabase
      .from('giao_dich')
      .select('*, danh_muc(*), vi:vi_id(*)')
      .gte('ngay', start).lte('ngay', end)
      .order('ngay', { ascending: false })
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('giao_dich').delete().eq('id', id)
    if (error) throw error
  }
}
""",

# ── services/danhMucService.js ───────────────────────────
"services/danhMucService.js": """
import { supabase } from '../lib/supabase'

export const danhMucService = {
  async getAll() {
    const { data, error } = await supabase
      .from('danh_muc').select('*')
      .eq('is_active', true).order('thu_tu')
    if (error) throw error
    return data
  },

  async getByLoai(loai) {
    const { data, error } = await supabase
      .from('danh_muc').select('*')
      .eq('loai', loai).eq('is_active', true).order('thu_tu')
    if (error) throw error
    return data
  }
}
""",

# ── context/AppContext.jsx ───────────────────────────────
"context/AppContext.jsx": """
import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [form,  setForm]  = useState(null)

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const openForm  = (type) => setForm(type)
  const closeForm = ()     => setForm(null)

  return (
    <AppContext.Provider value={{ toast, showToast, form, openForm, closeForm }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
""",

# ── context/AuthContext.jsx ──────────────────────────────
"context/AuthContext.jsx": """
import { createContext, useContext, useState } from 'react'
import { MOCK_USERS } from '../constants/enums'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Tạm dùng mock — sau này thay bằng Supabase Auth
  const [user] = useState(MOCK_USERS.admin)

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
""",

# ── components/layout/SplashScreen.jsx ──────────────────
"components/layout/SplashScreen.jsx": """
import { useEffect, useState } from 'react'
import { COLORS } from '../../constants/colors'

export default function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1800)
    const t2 = setTimeout(() => onDone(), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: COLORS.grad,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 999,
      opacity: fade ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>
      <div style={{
        width: '220px', height: '220px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 0 60px rgba(201,169,110,0.3), 0 0 120px rgba(201,169,110,0.15)'
      }}>
        <img src="/logo.png" alt="Hannah" style={{
          width: '180px',
          filter: 'brightness(0) saturate(100%) invert(90%) sepia(20%) saturate(400%) hue-rotate(5deg) brightness(110%)'
        }} />
      </div>
      <div style={{
        color: 'rgba(255,255,255,0.85)', fontSize: '13px',
        fontStyle: 'italic', letterSpacing: '2px', textAlign: 'center'
      }}>
        Giữ Mãi Nét Thanh Xuân Của Bạn
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '40px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.5)',
            animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )
}
""",

# ── components/ui/Toast.jsx ──────────────────────────────
"components/ui/Toast.jsx": """
import { useEffect } from 'react'

export default function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', top: '20px',
      left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#2D7A4F' : '#C0392B',
      color: 'white', padding: '12px 24px',
      borderRadius: '24px', fontSize: '13px',
      fontWeight: '600', zIndex: 9999,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      animation: 'slideDown 0.3s ease'
    }}>
      {type === 'success' ? '✅ ' : '❌ '}{msg}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  )
}
""",

# ── components/shared/FABMenu.jsx ────────────────────────
"components/shared/FABMenu.jsx": """
import { useState } from 'react'
import { COLORS } from '../../constants/colors'

export default function FABMenu({ onSelect }) {
  const [open, setOpen] = useState(false)

  const options = [
    { id: 'thu', icon: '💰', label: 'Doanh Thu',         bg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', color: '#2D7A4F' },
    { id: 'chi', icon: '💸', label: 'Chi Phí',           bg: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', color: '#C0392B' },
    { id: 'ck',  icon: '🔄', label: 'Chuyển Khoản Nội Bộ', bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1A5276' },
  ]

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 97 }}
        />
      )}

      {/* Popup menu */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '8px',
          boxShadow: '0 8px 32px rgba(139,94,60,0.25)',
          border: 'rgba(160,113,79,0.12)',
          zIndex: 98,
          width: '240px',
          animation: 'popUp 0.2s ease'
        }}>
          {options.map((opt, i) => (
            <button
              key={opt.id}
              onClick={() => { onSelect(opt.id); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                width: '100%', padding: '12px 14px',
                background: 'none', border: 'none',
                borderRadius: '14px', cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAF7F4'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: opt.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>{opt.icon}</div>
              <span style={{ fontWeight: '600', fontSize: '14px', color: opt.color }}>
                {opt.label}
              </span>
            </button>
          ))}
          {/* Arrow down */}
          <div style={{
            position: 'absolute', bottom: '-8px',
            left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid white'
          }} />
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'absolute', top: '-28px',
          width: '52px', height: '52px', borderRadius: '50%',
          background: open ? COLORS.grad : 'white',
          color: open ? 'white' : '#A0714F',
          fontSize: '28px', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(139,94,60,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, transition: 'all 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(139,94,60,0.5)' }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,94,60,0.35)' }}}
      >+</button>
      <style>{`@keyframes popUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </>
  )
}
""",

# ── components/layout/BottomNav.jsx ─────────────────────
"components/layout/BottomNav.jsx": """
import { COLORS } from '../../constants/colors'
import FABMenu from '../shared/FABMenu'

const TABS = [
  { id: 'tong-quan', icon: '🏠', label: 'Tổng Quan' },
  { id: 'tai-khoan', icon: '💳', label: 'Tài Khoản' },
  { id: '__fab__',   icon: null,  label: ''          },
  { id: 'bao-cao',   icon: '📊', label: 'Báo Cáo'  },
  { id: 'cai-dat',   icon: '⚙️', label: 'Cài Đặt'  },
]

export default function BottomNav({ active, onChange, onOpenForm }) {
  return (
    <div style={{
      position: 'fixed', bottom: '12px',
      left: '50%', transform: 'translateX(-50%)',
      width: '388px', maxWidth: '94%',
      background: COLORS.grad, borderRadius: '32px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '10px 8px 12px',
      boxShadow: '0 8px 32px rgba(139,94,60,0.4)', zIndex: 100
    }}>
      {TABS.map((item, i) => (
        item.id === '__fab__' ? (
          <div key={i} style={{ position: 'relative', width: '60px', display: 'flex', justifyContent: 'center' }}>
            <FABMenu onSelect={onOpenForm} />
          </div>
        ) : (
          <button key={item.id} onClick={() => onChange(item.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '3px', background: 'none', border: 'none', cursor: 'pointer',
            minWidth: '60px', padding: '2px 0',
            transition: 'transform 0.15s',
            opacity: active === item.id ? 1 : 0.6
          }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.88)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '21px' }}>{item.icon}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: active === item.id ? '700' : '500',
              color: active === item.id ? 'white' : 'rgba(255,255,255,0.7)'
            }}>{item.label}</span>
            {active === item.id && (
              <div style={{ width: '16px', height: '2px', backgroundColor: COLORS.gold, borderRadius: '2px' }} />
            )}
          </button>
        )
      ))}
    </div>
  )
}
""",

# ── apps/internal/tong-quan/TongQuanPage.jsx ────────────
"apps/internal/tong-quan/TongQuanPage.jsx": """
import { COLORS } from '../../../constants/colors'
import { formatCurrency, formatCurrencyHide } from '../../../lib/utils'

function HeaderTongQuan({ user, viList }) {
  const isAdmin = user.vai_tro === 'admin'
  const isLeTan = user.vai_tro === 'le_tan'
  const tongTS  = viList.reduce((s, v) => s + (v.so_du_dau || 0), 0)

  return (
    <div style={{ background: COLORS.grad, padding: '44px 22px 52px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px' }}>Xin chào!</div>
          <div style={{ color: '#FFF8F0', fontWeight: '700', fontSize: '16px' }}>{user.ten}</div>
        </div>
        <button style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>🔔</button>
      </div>

      {isAdmin && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Tổng Tài Sản</div>
            <div style={{ color: '#FFFBF5', fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>{formatCurrency(tongTS)}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[{ label: 'Doanh Thu', value: formatCurrency(0), color: '#86EFAC' }, { label: 'Chi Phí', value: formatCurrency(0), color: '#FCA5A5' }].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: '13px', padding: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ color: s.color, fontWeight: '700', fontSize: '15px' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLeTan && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Tổng Tài Sản</div>
            <div style={{ color: '#FFFBF5', fontSize: '32px', fontWeight: '800' }}>{formatCurrencyHide()}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[{ label: 'Doanh Thu Hôm Nay', value: formatCurrency(0), color: '#86EFAC' }, { label: 'Chi Phí Hôm Nay', value: formatCurrency(0), color: '#FCA5A5' }].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: '13px', padding: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ color: s.color, fontWeight: '700', fontSize: '15px' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && !isLeTan && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontStyle: 'italic' }}>Chào mừng đến Hannah Beauty & Spa 🌸</div>
        </div>
      )}
    </div>
  )
}

export default function TongQuanPage({ viList, user, onOpenForm }) {
  return (
    <div>
      <HeaderTongQuan user={user} viList={viList} />
      <div style={{ padding: '0 16px', marginTop: '-20px' }}>

        {/* Card Tài khoản */}
        <div style={{ background: COLORS.card, borderRadius: '22px', padding: '18px 20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text }}>Tài khoản</span>
            <span style={{ fontSize: '11px', padding: '3px 10px', background: 'linear-gradient(135deg,#F5EDE6,#EDD9C8)', color: COLORS.primary, borderRadius: '20px', fontWeight: '600' }}>3 ví</span>
          </div>
          {viList.map((vi, i) => (
            <div key={vi.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{vi.icon}</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{vi.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '1px' }}>{vi.loai === 'tien_mat' ? 'Tiền mặt' : 'Ngân hàng'}</div>
                  </div>
                </div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: user.vai_tro === 'admin' ? COLORS.thu : COLORS.textMute }}>
                  {user.vai_tro === 'admin' ? formatCurrency(vi.so_du_dau) : formatCurrencyHide()}
                </div>
              </div>
              {i < viList.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
            </div>
          ))}
        </div>

        {/* Thao tác nhanh */}
        <div style={{ background: COLORS.card, borderRadius: '22px', padding: '18px 20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text, marginBottom: '16px' }}>Thao tác nhanh</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
            {[
              { icon: '💰', label: 'Doanh Thu',  bg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', action: 'thu' },
              { icon: '💸', label: 'Chi Phí',    bg: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', action: 'chi' },
              { icon: '🔄', label: 'Chuyển Khoản', bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', action: 'ck' },
              { icon: '📊', label: 'Báo cáo',    bg: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', action: 'bc'  },
            ].map(item => (
              <button key={item.label} onClick={() => onOpenForm(item.action)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1.08)'}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: item.bg, fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{item.icon}</div>
                <span style={{ fontSize: '10px', color: COLORS.textSub, textAlign: 'center', lineHeight: '1.3', fontWeight: '500' }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Giao dịch gần đây */}
        <div style={{ background: COLORS.card, borderRadius: '22px', padding: '18px 20px', marginBottom: '100px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text, marginBottom: '16px' }}>Giao Dịch Gần Đây</div>
          <div style={{ textAlign: 'center', padding: '28px 0', color: COLORS.textMute }}>
            <div style={{ fontSize: '38px', marginBottom: '10px' }}>📋</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.textSub }}>Chưa có giao dịch nào</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>Nhấn + để thêm giao dịch đầu tiên</div>
          </div>
        </div>
      </div>
    </div>
  )
}
""",

# ── apps/internal/tai-khoan/TaiKhoanPage.jsx ────────────
"apps/internal/tai-khoan/TaiKhoanPage.jsx": """
import { COLORS } from '../../../constants/colors'
import { formatCurrency, formatCurrencyHide } from '../../../lib/utils'

export default function TaiKhoanPage({ viList, user }) {
  const isAdmin = user.vai_tro === 'admin'
  return (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text, marginBottom: '16px' }}>Tài Khoản</h2>

      <div style={{ background: COLORS.grad, borderRadius: '20px', padding: '20px 22px', marginBottom: '14px', boxShadow: '0 4px 24px rgba(139,94,60,0.25)' }}>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Tổng Tài Sản</div>
        <div style={{ color: '#FFFBF5', fontSize: '30px', fontWeight: '800' }}>
          {isAdmin ? formatCurrency(viList.reduce((s,v)=>s+(v.so_du_dau||0),0)) : formatCurrencyHide()}
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: '22px', padding: '18px 20px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, marginBottom: '14px' }}>
        {viList.map((vi, i) => (
          <div key={vi.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{vi.icon}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: COLORS.text }}>{vi.ten}</div>
                  <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '2px' }}>
                    {vi.loai === 'tien_mat' ? 'Tiền mặt tại quầy' : vi.ten === 'MB Bank' ? 'Tài khoản chính' : 'Quẹt thẻ • về 3-7 ngày'}
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: isAdmin ? COLORS.thu : COLORS.textMute }}>
                {isAdmin ? formatCurrency(vi.so_du_dau) : formatCurrencyHide()}
              </div>
            </div>
            {i < viList.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {['Tất cả','💵 Tiền Mặt','🏦 MB Bank','💳 TP Bank'].map((f,i) => (
          <button key={f} style={{
            padding: '7px 14px', borderRadius: '20px', fontSize: '12px',
            border: i===0 ? 'none' : `1px solid rgba(160,113,79,0.2)`,
            background: i===0 ? 'linear-gradient(135deg,#C9A96E,#A0714F)' : 'white',
            color: i===0 ? 'white' : COLORS.textSub,
            fontWeight: i===0 ? '700' : '400', cursor: 'pointer'
          }}>{f}</button>
        ))}
      </div>

      <div style={{ background: COLORS.card, borderRadius: '22px', padding: '28px', textAlign: 'center', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, marginBottom: '100px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>💳</div>
        <div style={{ fontSize: '13px', color: COLORS.textMute }}>Chưa có giao dịch</div>
      </div>
    </div>
  )
}
""",

# ── apps/internal/thu-chi/NhapLieuPage.jsx ──────────────
"apps/internal/thu-chi/NhapLieuPage.jsx": """
import { COLORS } from '../../../constants/colors'

export default function NhapLieuPage({ onOpenForm }) {
  return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text, marginBottom: '4px' }}>Nhập Liệu</h2>
        <p style={{ fontSize: '13px', color: COLORS.textMute }}>Chọn loại giao dịch để nhập</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '100px' }}>
        {[
          { icon: '💰', label: 'Nhập Doanh Thu',        sub: 'Tiền mặt • Chuyển khoản • Quẹt thẻ • Thẻ trả trước', bg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', action: 'thu' },
          { icon: '📋', label: 'Nhập Chi Phí',           sub: '37 danh mục • 6 nhóm chi phí',                        bg: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', action: 'chi' },
          { icon: '🔄', label: 'Chuyển Khoản Nội Bộ',   sub: 'Tiền Mặt → MB • TP → MB • MB → Tiền Mặt',             bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', action: 'ck'  },
        ].map(item => (
          <button key={item.label} onClick={() => onOpenForm(item.action)}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '18px', padding: '18px 20px', width: '100%', cursor: 'pointer', textAlign: 'left', boxShadow: COLORS.shadow, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(160,113,79,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = COLORS.shadow }}
          >
            <div style={{ width: '54px', height: '54px', borderRadius: '15px', background: item.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text, marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: COLORS.textMute }}>{item.sub}</div>
            </div>
            <div style={{ color: COLORS.gold, fontSize: '20px' }}>›</div>
          </button>
        ))}
      </div>
    </div>
  )
}
""",

# ── apps/internal/thu-chi/forms/FormDoanhThu.jsx ────────
"apps/internal/thu-chi/forms/FormDoanhThu.jsx": """
import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { formatCurrency, todayISO } from '../../../../lib/utils'
import { HINH_THUC_THU } from '../../../../constants/enums'

export default function FormDoanhThu({ viList, onClose, onSaved }) {
  const [soTien,   setSoTien]   = useState('')
  const [hinhThuc, setHinhThuc] = useState(null)
  const [viId,     setViId]     = useState(null)
  const [ngay,     setNgay]     = useState(todayISO())
  const [dienGiai, setDienGiai] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [step,     setStep]     = useState('main')

  const chonHinhThuc = (ht) => {
    setHinhThuc(ht)
    const viMacDinh = viList.find(v => v.ten === ht.vi)
    if (viMacDinh) setViId(viMacDinh.id)
  }

  const viSelected = viList.find(v => v.id === viId)

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0) return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!hinhThuc) return onSaved('error', 'Vui lòng chọn hình thức thu!')
    if (!viId)     return onSaved('error', 'Vui lòng chọn ví nhận!')

    setSaving(true)
    try {
      const { data: dmData } = await supabase
        .from('danh_muc').select('id').eq('ten', hinhThuc.label).eq('loai', 'thu').single()

      const { error } = await supabase.from('giao_dich').insert({
        ngay, loai: 'thu',
        so_tien:     parseInt(soTien),
        danh_muc_id: dmData?.id || null,
        vi_id:       viId,
        dien_giai:   dienGiai || null,
      })
      if (error) throw error
      onSaved('success', `Đã thu ${formatCurrency(parseInt(soTien))} thành công!`)
      onClose()
    } catch (err) {
      onSaved('error', 'Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'chon_vi') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: COLORS.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '24px 20px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.text }}>Chọn Tài Khoản</h3>
            <button onClick={() => setStep('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>✕</button>
          </div>
          {viList.map((vi, i) => (
            <div key={vi.id}>
              <button onClick={() => { setViId(vi.id); setStep('main') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{vi.icon}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: COLORS.text }}>{vi.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>{formatCurrency(vi.so_du_dau)}</div>
                  </div>
                </div>
                {viId === vi.id && <span style={{ color: COLORS.primary, fontSize: '20px' }}>✓</span>}
              </button>
              {i < viList.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: COLORS.bg, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E0D4CA' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💰</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: COLORS.text }}>Doanh Thu</div>
              <div style={{ fontSize: '11px', color: COLORS.textMute }}>Nhập doanh thu</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>✕</button>
        </div>

        <div style={{ padding: '0 16px 32px' }}>

          {/* Số tiền */}
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Số Tiền</div>
            <input
              type="number" placeholder="0" value={soTien}
              onChange={e => setSoTien(e.target.value.replace(/\\D/g,''))}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '36px', fontWeight: '800', textAlign: 'center', background: 'transparent', color: soTien ? COLORS.thu : '#D0C0B0' }}
            />
            {soTien && <div style={{ fontSize: '14px', color: COLORS.thu, fontWeight: '600', marginTop: '4px' }}>{new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ</div>}
          </div>

          {/* Hình thức thu */}
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '18px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>Hình Thức Thu</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {HINH_THUC_THU.map(ht => (
                <button key={ht.id} onClick={() => chonHinhThuc(ht)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px',
                  border: hinhThuc?.id === ht.id ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                  background: hinhThuc?.id === ht.id ? 'linear-gradient(135deg,#FFF8F0,#F5EDE6)' : 'white',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                  <span style={{ fontSize: '22px' }}>{ht.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: hinhThuc?.id === ht.id ? '700' : '500', color: hinhThuc?.id === ht.id ? COLORS.primary : COLORS.text }}>{ht.label}</span>
                  {hinhThuc?.id === ht.id && <span style={{ marginLeft: 'auto', color: COLORS.primary, fontSize: '14px' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Ví nhận */}
          <button onClick={() => setStep('chon_vi')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{viSelected ? viSelected.icon : '💳'}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Ví Nhận Tiền</div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{viSelected ? viSelected.ten : 'Chọn tài khoản'}</div>
              </div>
            </div>
            <span style={{ color: COLORS.gold, fontSize: '18px' }}>›</span>
          </button>

          {/* Ngày */}
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Ngày</div>
                <input type="date" value={ngay} onChange={e => setNgay(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '14px', fontWeight: '600', color: COLORS.text, background: 'transparent', width: '100%', cursor: 'pointer' }} />
              </div>
            </div>
          </div>

          {/* Diễn giải */}
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '24px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '4px' }}>Diễn Giải</div>
                <textarea placeholder="Ghi chú thêm (không bắt buộc)..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', color: COLORS.text, background: 'transparent', resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* Lưu */}
          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', background: saving ? '#C4A882' : COLORS.grad, border: 'none', borderRadius: '18px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(160,113,79,0.4)', transition: 'all 0.2s' }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Doanh Thu'}
          </button>
        </div>
      </div>
    </div>
  )
}
""",

# ── apps/internal/thu-chi/forms/FormChiPhi.jsx ──────────
"apps/internal/thu-chi/forms/FormChiPhi.jsx": """
// TODO: Code Form Chi Phí (bước tiếp theo)
export default function FormChiPhi({ viList, onClose, onSaved }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1A1209' }}>Form Chi Phí</div>
        <div style={{ fontSize: '13px', color: '#B8A898', marginTop: '4px' }}>Đang phát triển...</div>
        <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '12px', border: 'none', background: '#A0714F', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Đóng</button>
      </div>
    </div>
  )
}
""",

# ── apps/internal/thu-chi/forms/FormChuyenKhoan.jsx ─────
"apps/internal/thu-chi/forms/FormChuyenKhoan.jsx": """
// TODO: Code Form Chuyển Khoản Nội Bộ (bước tiếp theo)
export default function FormChuyenKhoan({ viList, onClose, onSaved }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1A1209' }}>Chuyển Khoản Nội Bộ</div>
        <div style={{ fontSize: '13px', color: '#B8A898', marginTop: '4px' }}>Đang phát triển...</div>
        <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '12px', border: 'none', background: '#A0714F', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Đóng</button>
      </div>
    </div>
  )
}
""",

# ── apps/internal/bao-cao/BaoCaoPage.jsx ────────────────
"apps/internal/bao-cao/BaoCaoPage.jsx": """
import { COLORS } from '../../../constants/colors'
import { useClock } from '../../../hooks/useClock'

export default function BaoCaoPage() {
  const { date } = useClock()
  return (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text, marginBottom: '16px' }}>Báo Cáo</h2>

      <div style={{ display: 'flex', background: 'rgba(160,113,79,0.08)', borderRadius: '14px', padding: '4px', marginBottom: '16px', gap: '4px' }}>
        {['Theo Ngày','Khoảng Ngày','Theo Tháng'].map((t,i) => (
          <button key={t} style={{ flex: 1, padding: '9px 4px', borderRadius: '10px', border: 'none', background: i===0 ? COLORS.grad : 'transparent', color: i===0 ? 'white' : COLORS.textSub, fontWeight: i===0 ? '700' : '400', fontSize: '12px', cursor: 'pointer' }}>{t}</button>
        ))}
      </div>

      <div style={{ background: COLORS.card, borderRadius: '18px', padding: '14px 20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', color: COLORS.textSub, fontSize: '16px' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '700', color: COLORS.text, fontSize: '15px' }}>Hôm nay</div>
            <div style={{ fontSize: '11px', color: COLORS.textMute }}>{date}</div>
          </div>
          <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', color: COLORS.textSub, fontSize: '16px' }}>›</button>
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: '18px', padding: '18px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: '11px', letterSpacing: '1px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>💰 Doanh Thu</div>
        {[{ icon: '💵', label: 'Tiền Mặt' },{ icon: '🏦', label: 'Chuyển Khoản MB' },{ icon: '💳', label: 'Quẹt Thẻ TP' },{ icon: '🎫', label: 'Thẻ Trả Trước' }].map((dm,i,arr) => (
          <div key={dm.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{dm.icon}</span>
                <span style={{ fontSize: '14px', color: COLORS.text }}>{dm.label}</span>
              </div>
              <span style={{ fontWeight: '600', color: COLORS.thu, fontSize: '14px' }}>0đ</span>
            </div>
            {i < arr.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: `2px solid rgba(160,113,79,0.1)`, marginTop: '4px' }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>Tổng Doanh Thu</span>
          <span style={{ fontWeight: '800', fontSize: '16px', color: COLORS.thu }}>0đ</span>
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: '18px', padding: '18px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: '11px', letterSpacing: '1px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>📋 Chi Phí Chi Tiết</div>
        <div style={{ textAlign: 'center', padding: '16px 0', color: COLORS.textMute, fontSize: '13px' }}>Chưa có chi phí trong ngày này</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: `2px solid rgba(160,113,79,0.1)`, marginTop: '4px' }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>Tổng Chi Phí</span>
          <span style={{ fontWeight: '800', fontSize: '16px', color: COLORS.chi }}>0đ</span>
        </div>
      </div>

      <div style={{ background: COLORS.grad, borderRadius: '18px', padding: '20px', marginBottom: '100px', boxShadow: '0 4px 24px rgba(139,94,60,0.25)' }}>
        {[{ label: 'Tổng Doanh Thu', value: '0đ', color: '#86EFAC' },{ label: 'Tổng Chi Phí', value: '0đ', color: '#FCA5A5' },{ label: 'Lợi Nhuận', value: '0đ', color: '#FDE68A' }].map((row,i) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i<2 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>{row.label}</span>
            <span style={{ color: row.color, fontWeight: '700', fontSize: '15px' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
""",

# ── apps/internal/cai-dat/CaiDatPage.jsx ────────────────
"apps/internal/cai-dat/CaiDatPage.jsx": """
import { COLORS } from '../../../constants/colors'

export default function CaiDatPage({ user }) {
  const isAdmin = user.vai_tro === 'admin'
  const sections = [
    { title: 'Quản Lý Tài Chính', items: [
      { icon: '💰', label: 'Danh Mục Doanh Thu', sub: '1 nhóm • 4 hạng mục',    admin: false },
      { icon: '📋', label: 'Danh Mục Chi Phí',   sub: '6 nhóm • 37 hạng mục',   admin: false },
      { icon: '💳', label: 'Quản Lý Ví',          sub: 'Tiền Mặt • MB • TP Bank', admin: true  },
    ]},
    { title: 'Hệ Thống', items: [
      { icon: '🏠', label: 'Thông Tin Spa',       sub: 'Hannah Beauty & Spa',    admin: true  },
      { icon: '👥', label: 'Quản Lý Nhân Viên',   sub: '10 nhân viên',           admin: true  },
      { icon: '🔐', label: 'Đổi Mật Khẩu',        sub: 'Bảo mật tài khoản',     admin: false },
    ]},
  ]
  return (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text, marginBottom: '20px' }}>Cài Đặt</h2>
      <div style={{ background: COLORS.grad, borderRadius: '20px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(139,94,60,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            {user.vai_tro === 'admin' ? '👑' : user.vai_tro === 'le_tan' ? '💁' : '💆'}
          </div>
          <div>
            <div style={{ color: '#FFF8F0', fontWeight: '700', fontSize: '16px' }}>{user.ten}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', marginTop: '2px' }}>
              {user.vai_tro === 'admin' ? '👑 Quản Trị Viên' : user.vai_tro === 'le_tan' ? '💁 Lễ Tân' : '💆 Kỹ Thuật Viên'}
            </div>
          </div>
        </div>
      </div>
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px', paddingLeft: '4px' }}>{section.title}</div>
          <div style={{ background: COLORS.card, borderRadius: '18px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            {section.items.map((item, i) => {
              const locked = item.admin && !isAdmin
              return (
                <div key={item.label}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '15px 18px', background: 'none', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1, transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.background = COLORS.bg }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{item.icon}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '1px' }}>{item.sub}</div>
                    </div>
                    <div style={{ color: locked ? '#D0C0B0' : COLORS.gold, fontSize: '18px' }}>{locked ? '🔒' : '›'}</div>
                  </button>
                  {i < section.items.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)', margin: '0 18px' }} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'center', padding: '16px 0 100px', color: COLORS.textMute, fontSize: '11px' }}>
        <div style={{ marginBottom: '4px' }}>🌸 Hannah Spa Management System</div>
        <div>v1.0.0 — Phase 2</div>
      </div>
    </div>
  )
}
""",

# ── apps/internal/InternalApp.jsx ───────────────────────
"apps/internal/InternalApp.jsx": """
import { useState } from 'react'
import { useVi } from '../../hooks/useVi'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import SplashScreen from '../../components/layout/SplashScreen'
import BottomNav from '../../components/layout/BottomNav'
import Toast from '../../components/ui/Toast'
import TongQuanPage from './tong-quan/TongQuanPage'
import TaiKhoanPage from './tai-khoan/TaiKhoanPage'
import NhapLieuPage from './thu-chi/NhapLieuPage'
import BaoCaoPage from './bao-cao/BaoCaoPage'
import CaiDatPage from './cai-dat/CaiDatPage'
import FormDoanhThu from './thu-chi/forms/FormDoanhThu'
import FormChiPhi from './thu-chi/forms/FormChiPhi'
import FormChuyenKhoan from './thu-chi/forms/FormChuyenKhoan'

export default function InternalApp() {
  const [splash, setSplash] = useState(true)
  const [tab,    setTab]    = useState('tong-quan')
  const { user }            = useAuth()
  const { viList, loading } = useVi()
  const { toast, showToast, form, openForm, closeForm } = useApp()

  const handleOpenForm = (type) => {
    if (type === 'bc') { setTab('bao-cao'); return }
    openForm(type)
  }

  return (
    <div style={{ backgroundColor: '#FAF7F4', minHeight: '100vh', maxWidth: '420px', margin: '0 auto', fontFamily: "'Segoe UI', sans-serif", position: 'relative', overflow: 'hidden' }}>

      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      {toast  && <Toast msg={toast.msg} type={toast.type} onClose={() => showToast(null)} />}

      {form === 'thu' && <FormDoanhThu  viList={viList} onClose={closeForm} onSaved={showToast} />}
      {form === 'chi' && <FormChiPhi    viList={viList} onClose={closeForm} onSaved={showToast} />}
      {form === 'ck'  && <FormChuyenKhoan viList={viList} onClose={closeForm} onSaved={showToast} />}

      <div style={{ paddingBottom: '80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#B8A898' }}>
            <div style={{ fontSize: '13px' }}>Đang tải...</div>
          </div>
        ) : (
          <>
            {tab === 'tong-quan' && <TongQuanPage viList={viList} user={user} onOpenForm={handleOpenForm} />}
            {tab === 'tai-khoan' && <TaiKhoanPage viList={viList} user={user} />}
            {tab === 'nhap-lieu' && <NhapLieuPage onOpenForm={handleOpenForm} />}
            {tab === 'bao-cao'   && <BaoCaoPage />}
            {tab === 'cai-dat'   && <CaiDatPage user={user} />}
          </>
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} onOpenForm={handleOpenForm} />
    </div>
  )
}
""",

# ── App.jsx (clean — chỉ routing) ───────────────────────
"App.jsx": """
import { AuthProvider } from './context/AuthContext'
import { AppProvider }  from './context/AppContext'
import InternalApp from './apps/internal/InternalApp'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <InternalApp />
      </AppProvider>
    </AuthProvider>
  )
}
""",

}

# ── Ghi tất cả files ─────────────────────────────────────
written = 0
for rel_path, content in files.items():
    full_path = os.path.join(SRC, rel_path.replace("/", os.sep))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.lstrip("\n"))
    print(f"✅ {rel_path}")
    written += 1

print(f"\n🎉 Hoàn tất! Đã ghi {written} files.")