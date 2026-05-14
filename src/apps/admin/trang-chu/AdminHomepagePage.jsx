import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

// ── Input helpers ───────────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 13px',
  border: '1px solid var(--line)', borderRadius: 10,
  fontSize: 13, background: 'var(--surface)', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--sans)',
  transition: 'border-color .15s',
}
const lbl = {
  fontSize: 11, fontWeight: 600, color: 'var(--ink3)',
  marginBottom: 5, display: 'block',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

// ── Section Editors ─────────────────────────────────────────────────────────────

function HeroEditor({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div><label style={lbl}>Tiêu đề chính (Headline)</label>
        <input style={inp} value={d.headline || ''} onChange={e => set('headline', e.target.value)} /></div>
      <div><label style={lbl}>Tagline (dòng phụ)</label>
        <input style={inp} value={d.tagline || ''} onChange={e => set('tagline', e.target.value)} /></div>
      <div><label style={lbl}>Nút CTA</label>
        <input style={inp} value={d.cta_text || ''} onChange={e => set('cta_text', e.target.value)} /></div>
      <div><label style={lbl}>Số điện thoại (trên hero)</label>
        <input style={inp} value={d.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
    </div>
  )
}

function ContactEditor({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={lbl}>Số điện thoại</label>
          <input style={inp} value={d.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
        <div><label style={lbl}>Email</label>
          <input style={inp} value={d.email || ''} onChange={e => set('email', e.target.value)} /></div>
      </div>
      <div><label style={lbl}>Địa chỉ</label>
        <input style={inp} value={d.address || ''} onChange={e => set('address', e.target.value)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={lbl}>Giờ mở cửa</label>
          <input style={inp} value={d.hours || ''} onChange={e => set('hours', e.target.value)} /></div>
        <div><label style={lbl}>Link Facebook</label>
          <input style={inp} value={d.facebook || ''} onChange={e => set('facebook', e.target.value)} /></div>
      </div>
      <div><label style={lbl}>Link Google Maps</label>
        <input style={inp} value={d.maps_url || ''} onChange={e => set('maps_url', e.target.value)} /></div>
    </div>
  )
}

function AboutEditor({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div><label style={lbl}>Tiêu đề</label>
        <input style={inp} value={d.heading || ''} onChange={e => set('heading', e.target.value)} /></div>
      <div><label style={lbl}>Nội dung</label>
        <textarea style={{ ...inp, height: 100, resize: 'vertical' }}
          value={d.body || ''} onChange={e => set('body', e.target.value)} /></div>
    </div>
  )
}

function MarqueeEditor({ data, onChange }) {
  const items = Array.isArray(data) ? data : []
  const setItem = (i, v) => { const a = [...items]; a[i] = v; onChange(a) }
  const addItem = () => onChange([...items, 'Dịch vụ mới'])
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} value={item} onChange={e => setItem(i, e.target.value)} />
          <button onClick={() => removeItem(i)} className="icon-btn"
            style={{ background: '#fdecea', border: '1px solid #fadbd8', color: '#c0392b', borderRadius: 8, width: 34, height: 34, flexShrink: 0 }}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={addItem}
        style={{ padding: 10, background: 'var(--surface)', border: '1.5px dashed var(--line2)',
          borderRadius: 10, color: 'var(--ink3)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--sans)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'var(--surface)', borderRadius: 10, padding: 14,
          border: '1px solid var(--line)', position: 'relative' }}>
          <button onClick={() => removeItem(i)}
            style={{ position: 'absolute', top: 10, right: 10, background: '#fdecea',
              border: '1px solid #fadbd8', borderRadius: 6, color: '#c0392b', cursor: 'pointer',
              fontWeight: 700, fontSize: 11, padding: '3px 8px', fontFamily: 'var(--sans)' }}>✕</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={lbl}>Tên</label>
                <input style={inp} value={item.name || ''} onChange={e => setField(i, 'name', e.target.value)} /></div>
              <div><label style={lbl}>Vai trò</label>
                <input style={inp} value={item.role || ''} onChange={e => setField(i, 'role', e.target.value)} /></div>
            </div>
            <div><label style={lbl}>Nội dung đánh giá</label>
              <textarea style={{ ...inp, height: 72, resize: 'vertical' }}
                value={item.text || ''} onChange={e => setField(i, 'text', e.target.value)} /></div>
          </div>
        </div>
      ))}
      <button onClick={addItem}
        style={{ padding: 10, background: 'var(--surface)', border: '1.5px dashed var(--line2)',
          borderRadius: 10, color: 'var(--ink3)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--sans)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'var(--surface)', borderRadius: 10, padding: 14,
          border: '1px solid var(--line)', position: 'relative' }}>
          <button onClick={() => removeItem(i)}
            style={{ position: 'absolute', top: 10, right: 10, background: '#fdecea',
              border: '1px solid #fadbd8', borderRadius: 6, color: '#c0392b', cursor: 'pointer',
              fontWeight: 700, fontSize: 11, padding: '3px 8px', fontFamily: 'var(--sans)' }}>✕</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><label style={lbl}>Câu hỏi</label>
              <input style={inp} value={item.q || ''} onChange={e => setField(i, 'q', e.target.value)} /></div>
            <div><label style={lbl}>Trả lời</label>
              <textarea style={{ ...inp, height: 72, resize: 'vertical' }}
                value={item.a || ''} onChange={e => setField(i, 'a', e.target.value)} /></div>
          </div>
        </div>
      ))}
      <button onClick={addItem}
        style={{ padding: 10, background: 'var(--surface)', border: '1.5px dashed var(--line2)',
          borderRadius: 10, color: 'var(--ink3)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--sans)' }}>
        + Thêm câu hỏi
      </button>
    </div>
  )
}

// ── Sections config ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { key: 'hero',         emoji: '🎯', label: 'Hero', sub: 'Tiêu đề & CTA trang chủ',       Editor: HeroEditor },
  { key: 'contact',      emoji: '📞', label: 'Liên Hệ', sub: 'Địa chỉ, SĐT, giờ mở cửa',  Editor: ContactEditor },
  { key: 'about',        emoji: '💬', label: 'Giới Thiệu', sub: 'Nội dung về spa',          Editor: AboutEditor },
  { key: 'marquee',      emoji: '📜', label: 'Marquee', sub: 'Dải chữ chạy ngang',          Editor: MarqueeEditor },
  { key: 'testimonials', emoji: '⭐', label: 'Đánh Giá', sub: 'Review từ khách hàng',       Editor: TestimonialsEditor },
  { key: 'faq',          emoji: '❓', label: 'FAQ', sub: 'Câu hỏi thường gặp',              Editor: FaqEditor },
]

// ── Main Page ───────────────────────────────────────────────────────────────────
export default function AdminHomepagePage() {
  const [configs, setConfigs] = useState({})
  const [dirty,   setDirty]   = useState({})
  const [saving,  setSaving]  = useState({})
  const [open,    setOpen]    = useState('hero')
  const [toast,   setToast]   = useState('')
  const [loading, setLoading] = useState(true)

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

  const dirtyCount = Object.values(dirty).filter(Boolean).length

  return (
    <>
      {/* ── Header ── */}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Nội Dung Web</div>
          <div className="sub">
            Chỉnh sửa hannahspa.vn không cần code
            {dirtyCount > 0 && <span style={{ color: 'var(--champagne)', marginLeft: 8 }}>· {dirtyCount} section chưa lưu</span>}
          </div>
        </div>
        <div className="acts">
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn">
            🌐 Trang chủ ↗
          </a>
          <a href="/menu" target="_blank" rel="noopener noreferrer" className="btn">
            📋 Menu ↗
          </a>
          {dirtyCount > 0 && (
            <button className="btn gold" onClick={async () => {
              const keys = Object.keys(dirty).filter(k => dirty[k])
              for (const key of keys) await handleSave(key)
            }}>
              💾 Lưu tất cả ({dirtyCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Strip KPIs ── */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 16 }}>
        {SECTIONS.map(s => (
          <div key={s.key} className="it" onClick={() => setOpen(s.key)}
            style={{ cursor: 'pointer', borderBottom: open === s.key ? '2px solid var(--champagne)' : '2px solid transparent', transition: 'border-color .2s' }}>
            <div className="l">{s.emoji} {s.label}</div>
            <div className="v" style={{ fontSize: 13 }}>{dirty[s.key] ? '●' : '✓'}</div>
            <div className="d" style={{ color: dirty[s.key] ? 'var(--champagne)' : 'var(--success)' }}>
              {dirty[s.key] ? 'chưa lưu' : 'đã lưu'}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main layout: 2 cột ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Cột trái: nav sections */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {SECTIONS.map(({ key, emoji, label, sub }) => {
            const isAct = open === key
            const isDirty = dirty[key]
            return (
              <button key={key} onClick={() => setOpen(key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', border: 'none', cursor: 'pointer',
                  background: isAct ? 'rgba(201,169,110,0.10)' : 'transparent',
                  borderLeft: isAct ? '3px solid var(--champagne)' : '3px solid transparent',
                  transition: 'all .15s', textAlign: 'left', fontFamily: 'var(--sans)',
                  borderBottom: '1px solid var(--line)',
                }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isAct ? 'var(--champagne)' : 'var(--ink)', marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
                </div>
                {isDirty && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--champagne)', flexShrink: 0 }} />
                )}
              </button>
            )
          })}

          {/* Info panel */}
          <div style={{ padding: '16px', background: '#fffbf0', borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#7b5800', marginBottom: 6 }}>💡 Lưu ý</div>
            <div style={{ fontSize: 12, color: '#7b5800', lineHeight: 1.5 }}>
              Sau khi lưu, trang chủ cập nhật trong ~30 giây.
              Nhấn <strong>Ctrl+Shift+R</strong> để xem ngay.
            </div>
          </div>
        </div>

        {/* Cột phải: editor */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🌸</div>
              <div style={{ fontSize: 13 }}>Đang tải cấu hình...</div>
            </div>
          ) : SECTIONS.map(({ key, emoji, label, Editor }) => {
            if (open !== key) return null
            const isDirty = dirty[key]
            const isSaving = saving[key]
            return (
              <div key={key}>
                {/* Editor header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
                      {emoji} {label}
                    </div>
                    {isDirty && (
                      <div style={{ fontSize: 11, color: 'var(--champagne)', marginTop: 2 }}>● Có thay đổi chưa lưu</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleSave(key)}
                    disabled={isSaving || !isDirty}
                    className={isDirty ? 'btn gold' : 'btn'}
                    style={{ opacity: isSaving ? 0.7 : 1 }}>
                    {isSaving ? 'Đang lưu...' : isDirty ? '💾 Lưu' : '✅ Đã lưu'}
                  </button>
                </div>

                {/* Editor body */}
                <div style={{ padding: '20px' }}>
                  <Editor data={configs[key]} onChange={(v) => handleChange(key, v)} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--espresso)', color: '#f5ede0', padding: '12px 24px', borderRadius: 999,
          fontWeight: 700, fontSize: 13, zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          fontFamily: 'var(--sans)' }}>
          {toast}
        </div>
      )}
    </>
  )
}
