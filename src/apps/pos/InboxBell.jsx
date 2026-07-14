import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'

// ── Chuông khách nhắn trong POS (T3 — Marketing 2.0) ──
// Lễ tân ngồi POS cả ngày còn Hộp Thư nằm ở menu Marketing → không ai biết có khách nhắn.
// Nút nổi CHỈ hiện khi có hội thoại đang chờ trả lời; bấm là mở thẳng Hộp Thư.

// Tin rác từ đồng bộ Meta — cùng tiêu chí với isJunkMsg của Hộp Thư
const junk = (m) => {
  if (m.sender_type === 'system') return true
  const t = String(m.noi_dung || '').toLowerCase()
  return /unexpected error|meta sync|an error occurred|\(#\d+\)|graph api error|invalid oauth|token.*expired/.test(t)
}

let _kf = false
function ensureKf() {
  if (_kf || typeof document === 'undefined') return
  _kf = true
  const s = document.createElement('style')
  s.textContent = '@keyframes posBellPulse{0%,100%{box-shadow:0 4px 18px rgba(192,57,43,.45)}50%{box-shadow:0 4px 26px rgba(192,57,43,.75)}}'
  document.head.appendChild(s)
}

export default function InboxBell() {
  const [count, setCount] = useState(0)
  const prev = useRef(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (document.hidden) return
      try {
        const since = new Date(Date.now() - 7 * 864e5).toISOString()
        const { data } = await supabase.from('marketing_messages')
          .select('conversation_id, from_platform_user_id, direction, sender_type, noi_dung, created_at')
          .in('kenh', ['facebook', 'zalo'])
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(400)
        if (!alive) return
        // data sort mới→cũ: tin ĐẦU TIÊN gặp của mỗi hội thoại = tin cuối cùng của hội thoại đó
        const last = new Map()
        for (const m of (data || [])) {
          if (junk(m)) continue
          const cid = m.conversation_id || m.from_platform_user_id
          if (!cid || last.has(cid)) continue
          last.set(cid, m.direction)
        }
        const n = [...last.values()].filter(d => d === 'inbound').length
        if (prev.current !== null && n > prev.current) {
          try {
            const AC = window.AudioContext || window.webkitAudioContext
            if (AC) {
              const ac = new AC(), o = ac.createOscillator(), g = ac.createGain()
              o.connect(g); g.connect(ac.destination); g.gain.value = 0.07
              o.frequency.setValueAtTime(880, ac.currentTime)
              o.frequency.setValueAtTime(660, ac.currentTime + 0.13)
              o.start(); o.stop(ac.currentTime + 0.26)
            }
          } catch { /* trình duyệt chặn audio khi chưa tương tác — bỏ qua */ }
        }
        prev.current = n
        setCount(n)
      } catch { /* mạng lỗi thì giữ số cũ, lần poll sau thử lại */ }
    }
    load()
    const ch = supabase.channel('pos-inbox-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketing_messages' }, load)
      .subscribe()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t); supabase.removeChannel(ch) }
  }, [])

  if (!count) return null
  ensureKf()
  return createPortal(
    <button
      onClick={() => { window.location.href = '/admin/marketing/hop-thu' }}
      title="Khách đang chờ trả lời — bấm mở Hộp Thư"
      style={{
        position: 'fixed', right: 18, bottom: 88, zIndex: 9000,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        border: 'none', borderRadius: 999, padding: '11px 18px', cursor: 'pointer',
        background: 'linear-gradient(135deg,#C0392B,#922b21)', color: '#fff',
        fontSize: 13.5, fontWeight: 800, fontFamily: 'var(--sans, sans-serif)',
        animation: 'posBellPulse 1.6s ease-in-out infinite',
      }}>
      💬 {count} khách chờ trả lời
    </button>
  , document.body)
}
