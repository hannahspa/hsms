import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'

// ── Helper ─────────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 14px', border: `1px solid ${COLORS.border}`,
  borderRadius: '10px', fontSize: '14px', background: COLORS.bg, color: COLORS.text,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif',
}
const labelStyle = {
  fontSize: '12px', fontWeight: '700', color: COLORS.textSub,
  marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
}
const cardStyle = {
  background: 'white', borderRadius: '16px', padding: '20px',
  border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow,
}

// ── Section editors ────────────────────────────────────────────────────────────

function HeroEditor({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle}>TIÊU ĐỀ CHÍNH (Headline)</label>
        <input style={inputStyle} value={d.headline || ''} onChange={e => set('headline', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>TAGLINE (Dòng phụ)</label>
        <input style={inputStyle} value={d.tagline || ''} onChange={e => set('tagline', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>NÚT CTA</label>
        <input style={inputStyle} value={d.cta_text || ''} onChange={e => set('cta_text', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>SỐ ĐIỆN THOẠI (hiển thị trên hero)</label>
        <input style={inputStyle} value={d.phone || ''} onChange={e => set('phone', e.target.value)} />
      </div>
    </div>
  )
}

function ContactEditor({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle}>SỐ ĐIỆN THOẠI</label>
        <input style={inputStyle} value={d.phone || ''} onChange={e => set('phone', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>EMAIL</label>
        <input style={inputStyle} value={d.email || ''} onChange={e => set('email', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>ĐỊA CHỈ</label>
        <input style={inputStyle} value={d.address || ''} onChange={e => set('address', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>GIỜ MỞ CỬA</label>
        <input style={inputStyle} value={d.hours || ''} onChange={e => set('hours', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>LINK FACEBOOK</label>
        <input style={inputStyle} value={d.facebook || ''} onChange={e => set('facebook', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>LINK GOOGLE MAPS</label>
        <input style={inputStyle} value={d.maps_url || ''} onChange={e => set('maps_url', e.target.value)} />
      </div>
    </div>
  )
}

function AboutEditor({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle}>TIÊU ĐỀ</label>
        <input style={inputStyle} value={d.heading || ''} onChange={e => set('heading', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>NỘI DUNG</label>
        <textarea style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
          value={d.body || ''} onChange={e => set('body', e.target.value)} />
      </div>
    </div>
  )
}

function MarqueeEditor({ data, onChange }) {
  const items = Array.isArray(data) ? data : []
  const setItem = (i, v) => { const a = [...items]; a[i] = v; onChange(a) }
  const addItem = () => onChange([...items, 'Dịch vụ mới'])
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px' }}>
          <input style={{ ...inputStyle, flex: 1 }} value={item}
            onChange={e => setItem(i, e.target.value)} />
          <button onClick={() => removeItem(i)}
            style={{ padding: '8px 12px', background: '#FDECEA', border: '1px solid #FADBD8',
              borderRadius: '8px', color: '#C0392B', cursor: 'pointer', fontWeight: '700', flexShrink: 0 }}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={addItem}
        style={{ padding: '10px', background: COLORS.bg, border: `1.5px dashed ${COLORS.border}`,
          borderRadius: '10px', color: COLORS.textSub, cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
        + Thêm item
      </button>
    </div>
  )
}

function TestimonialsEditor({ data, onChange }) {
  const items = Array.isArray(data) ? data : []
  const setField = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]: v }; onChange(a) }
  const addItem = () => onChange([...items, { name: '', role: 'Khách hàng thân thiết', text: '', rating: 5 }])
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: COLORS.bg, borderRadius: '12px', padding: '14px',
          border: `1px solid ${COLORS.border}`, position: 'relative' }}>
          <button onClick={() => removeItem(i)}
            style={{ position: 'absolute', top: '10px', right: '10px', background: '#FDECEA',
              border: '1px solid #FADBD8', borderRadius: '6px', color: '#C0392B', cursor: 'pointer',
              fontWeight: '700', fontSize: '11px', padding: '3px 8px' }}>✕</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={labelStyle}>TÊN</label>
                <input style={inputStyle} value={item.name || ''} onChange={e => setField(i, 'name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>VAI TRÒ</label>
                <input style={inputStyle} value={item.role || ''} onChange={e => setField(i, 'role', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>NỘI DUNG ĐÁNH GIÁ</label>
              <textarea style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
                value={item.text || ''} onChange={e => setField(i, 'text', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addItem}
        style={{ padding: '10px', background: COLORS.bg, border: `1.5px dashed ${COLORS.border}`,
          borderRadius: '10px', color: COLORS.textSub, cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
        + Thêm đánh giá
      </button>
    </div>
  )
}

function FaqEditor({ data, onChange }) {
  const items = Array.isArray(data) ? data : []
  const setField = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]: v }; onChange(a) }
  const addItem = () => onChange([...items, { q: '', a: '' }])
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: COLORS.bg, borderRadius: '12px', padding: '14px',
          border: `1px solid ${COLORS.border}`, position: 'relative' }}>
          <button onClick={() => removeItem(i)}
            style={{ position: 'absolute', top: '10px', right: '10px', background: '#FDECEA',
              border: '1px solid #FADBD8', borderRadius: '6px', color: '#C0392B', cursor: 'pointer',
              fontWeight: '700', fontSize: '11px', padding: '3px 8px' }}>✕</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={labelStyle}>CÂU HỎI</label>
              <input style={inputStyle} value={item.q || ''} onChange={e => setField(i, 'q', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>TRẢ LỜI</label>
              <textarea style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
                value={item.a || ''} onChange={e => setField(i, 'a', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addItem}
        style={{ padding: '10px', background: COLORS.bg, border: `1.5px dashed ${COLORS.border}`,
          borderRadius: '10px', color: COLORS.textSub, cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
        + Thêm câu hỏi
      </button>
    </div>
  )
}

// ── Sections config ────────────────────────────────────────────────────────────
const SECTIONS = [
  { key: 'hero',         icon: '🎯', label: 'Hero — Tiêu Đề Trang Chủ',  Editor: HeroEditor },
  { key: 'contact',      icon: '📞', label: 'Liên Hệ & Địa Chỉ',          Editor: ContactEditor },
  { key: 'about',        icon: '💬', label: 'Giới Thiệu Spa',              Editor: AboutEditor },
  { key: 'marquee',      icon: '📜', label: 'Dải Chữ Chạy Ngang',         Editor: MarqueeEditor },
  { key: 'testimonials', icon: '⭐', label: 'Đánh Giá Khách Hàng',        Editor: TestimonialsEditor },
  { key: 'faq',          icon: '❓', label: 'Câu Hỏi Thường Gặp (FAQ)',   Editor: FaqEditor },
]

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminHomepagePage() {
  const [configs, setConfigs]   = useState({})    // key → value (parsed json)
  const [dirty, setDirty]       = useState({})    // key → true nếu đã sửa
  const [saving, setSaving]     = useState({})    // key → true khi đang lưu
  const [open, setOpen]         = useState('hero')
  const [toast, setToast]       = useState('')
  const [loading, setLoading]   = useState(true)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    supabase.from('homepage_config').select('key, value')
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach(row => { map[row.key] = row.value })
        setConfigs(map)
        setLoading(false)
      })
  }, [])

  const handleChange = (key, value) => {
    setConfigs(c => ({ ...c, [key]: value }))
    setDirty(d => ({ ...d, [key]: true }))
  }

  const handleSave = async (key) => {
    setSaving(s => ({ ...s, [key]: true }))
    const { error } = await supabase.from('homepage_config')
      .upsert({ key, value: configs[key] }, { onConflict: 'key' })
    setSaving(s => ({ ...s, [key]: false }))
    if (error) return showToast('❌ Lỗi: ' + error.message)
    setDirty(d => ({ ...d, [key]: false }))
    showToast('✅ Đã lưu!')
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: 'sans-serif', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '40px 20px 24px' }}>
        <button onClick={() => window.location.href = '/admin'}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginBottom: '12px' }}>
          ← Admin
        </button>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '22px' }}>
          🌐 Nội Dung Trang Chủ
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '4px' }}>
          Chỉnh sửa nội dung hannahspa.vn không cần code
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <a href="/" target="_blank" rel="noopener noreferrer"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: '8px',
              padding: '6px 14px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
            🌐 Xem trang chủ ↗
          </a>
          <a href="/menu" target="_blank" rel="noopener noreferrer"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: '8px',
              padding: '6px 14px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
            📋 Xem menu ↗
          </a>
        </div>
      </div>

      {/* Accordion sections */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>Đang tải...</div>
        ) : (
          SECTIONS.map(({ key, icon, label, Editor }) => {
            const isOpen = open === key
            const isDirty = dirty[key]
            const isSaving = saving[key]
            return (
              <div key={key} style={cardStyle}>
                {/* Accordion header */}
                <button
                  onClick={() => setOpen(isOpen ? null : key)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>{label}</div>
                      {isDirty && (
                        <div style={{ fontSize: '11px', color: '#B8860B', marginTop: '2px' }}>
                          ● Có thay đổi chưa lưu
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ color: COLORS.textMute, fontSize: '18px', transition: 'transform .2s',
                    transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div style={{ marginTop: '16px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                    <Editor data={configs[key]} onChange={(v) => handleChange(key, v)} />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button onClick={() => handleSave(key)} disabled={isSaving || !isDirty}
                        style={{ flex: 1, padding: '12px', background: isDirty ? COLORS.grad : '#E8DDD4',
                          color: isDirty ? 'white' : COLORS.textMute, border: 'none', borderRadius: '10px',
                          fontWeight: '800', fontSize: '14px', cursor: isDirty ? 'pointer' : 'default',
                          opacity: isSaving ? 0.7 : 1, transition: 'all .2s' }}>
                        {isSaving ? 'Đang lưu...' : isDirty ? '💾 Lưu thay đổi' : '✅ Đã lưu'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Preview note */}
      <div style={{ margin: '0 20px', padding: '14px 16px', background: '#FFF8E1',
        border: '1px solid #FFE082', borderRadius: '12px', fontSize: '13px', color: '#7B5800' }}>
        💡 <strong>Lưu ý:</strong> Sau khi lưu, trang chủ sẽ tự cập nhật trong vòng 30 giây (cache).
        Nhấn <strong>Ctrl+Shift+R</strong> để xem ngay.
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#1A1209', color: 'white', padding: '12px 24px', borderRadius: '999px',
          fontWeight: '700', fontSize: '14px', zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
