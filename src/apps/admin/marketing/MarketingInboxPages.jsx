// ═══════════════════════════════════════════════════════════════════════════
// Marketing — Hộp Thư đa kênh + Khách & Remarketing
// Tách từ MarketingModulePage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import ModalDatHen from '../../internal/lich-hen/ModalDatHen'
import { C, FONT } from '../../../constants/colors'
import { supabase } from '../../../lib/supabase'
import { todayISO } from '../../../lib/utils'
import { notify } from '../../../components/ui/notify'
import { EmptyBox, Header, MARKETING_ROUTES, Panel, Shell, fmtDate, fmtDateTime, fmtMoney } from './marketingShared'

// ── B2: HỘP THƯ — hội thoại đang hoạt động (30 ngày), đa kênh, AI nhận diện + gợi ý ──
function extractPhoneLite(t) {
  const m = String(t || '').match(/(?:\+?84|0)(?:[\s.-]?\d){8,10}/)
  if (!m) return null
  const d = m[0].replace(/\D/g, '')
  const p = d.startsWith('84') && d.length === 11 ? '0' + d.slice(2) : d
  return /^0\d{9}$/.test(p) ? p : null
}

const INBOX_DAYS = 30

// Tin rác do quá trình đồng bộ tạo ra (lỗi Meta Sync, thông báo hệ thống) — KHÔNG hiện trong Hộp Thư.
function isJunkMsg(m) {
  if (!m) return true
  if (m.sender_type === 'system') return true
  const t = String(m.noi_dung || '').toLowerCase()
  if (!t.trim()) return false // tin đính kèm/ảnh vẫn giữ
  return /unexpected error|meta sync|an error occurred|\(#\d+\)|graph api error|invalid oauth|token.*expired/.test(t)
       || /^meta\b/.test(String(m.sender_name || '').toLowerCase())
}

export function InboxPage() {
  const [convos, setConvos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [ai, setAi] = useState({ loading: false, reply: '', note: '', error: null })
  const [datHen, setDatHen] = useState(null)   // initial cho ModalDatHen (null = đóng)
  const [ktvList, setKtvList] = useState([])

  // Mở đặt hẹn ngay trong Hộp Thư — điền sẵn tên/SĐT/mã KH từ hồ sơ đã nhận diện.
  async function openDatHen() {
    if (!ktvList.length) {
      const { data } = await supabase.from('nhan_vien')
        .select('id, ho_ten, vi_tri, avatar_url').eq('trang_thai', 'dang_lam').eq('vi_tri', 'ktv').order('ho_ten')
      setKtvList(data || [])
    }
    const k = profile?.intel
    setDatHen({
      ten_khach: k?.ho_ten || selected?.name || '',
      sdt_khach: profile?.phone || '',
      khach_hang_id: k?.khach_hang_id || null,
      ten_dich_vu: '', dich_vu_id: null, the_lieu_trinh_id: null, nhan_vien_id: null,
      thoi_luong_phut: 60, ngay_hen: todayISO(), gio_hen: '10:00', ghi_chu: 'Khách đặt qua Hộp Thư', dich_vu_list: [],
    })
  }

  // Tải hội thoại có tin trong INBOX_DAYS ngày gần đây, gom theo conversation, ưu tiên chưa trả lời.
  useEffect(() => {
    let alive = true
    ;(async () => {
      // Chỉ hiện "Đang tải" LẦN ĐẦU — các lần refresh nền (realtime/polling) cập nhật êm,
      // không nháy màn hình (anh Nam 12/07: cảm giác phải F5 do màn nháy loading mỗi 40s).
      if (nonce === 0) setLoading(true)
      try {
        const since = new Date(Date.now() - INBOX_DAYS * 864e5).toISOString()
        const { data } = await supabase.from('marketing_messages')
          .select('id, kenh, conversation_id, from_platform_user_id, recipient_id, sender_name, sender_type, direction, noi_dung, created_at, metadata')
          .in('kenh', ['facebook', 'zalo'])
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(600)
        if (!alive) return
        const map = new Map()
        for (const m of (data || [])) {
          if (isJunkMsg(m)) continue // lọc rác trước khi gom
          const cid = m.conversation_id || m.from_platform_user_id || m.id
          if (!map.has(cid)) map.set(cid, [])
          map.get(cid).push(m)
        }
        const list = [...map.entries()].map(([cid, msgs]) => {
          const sorted = msgs.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          const last = sorted[sorted.length - 1]
          const firstInbound = sorted.find(x => x.direction === 'inbound')
          const psid = firstInbound?.from_platform_user_id || msgs[0].from_platform_user_id || msgs[0].metadata?.customer_id || null
          return {
            cid, kenh: last.kenh, msgs: sorted, last,
            unreplied: last.direction === 'inbound',
            name: firstInbound?.sender_name || last.sender_name || 'Khách',
            psid, lastAt: last.created_at,
          }
        })
          .filter(c => c.msgs.length > 0)
          .sort((a, b) => (b.unreplied ? 1 : 0) - (a.unreplied ? 1 : 0) || new Date(b.lastAt) - new Date(a.lastAt))
        setConvos(list); setLoading(false)
        setSelId(prev => prev || (list[0] && list[0].cid) || null)
      } catch { if (alive) setLoading(false) }
    })()
    const ch = supabase.channel('inbox-page-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketing_messages' }, () => { if (alive) setNonce(n => n + 1) })
      .subscribe()
    // Dự phòng: realtime self-host có thể chập chờn → cứ 15s tải lại êm (không nháy màn)
    const poll = setInterval(() => { if (alive && !document.hidden) setNonce(n => n + 1) }, 15000)
    return () => { alive = false; clearInterval(poll); supabase.removeChannel(ch) }
  }, [nonce])

  // ── THÔNG BÁO khách nhắn: chuông + tiêu đề tab khi có hội thoại CHỜ trả lời mới ──
  const prevUnrepRef = useRef(null)
  useEffect(() => {
    if (loading) return
    const unrep = convos.filter(c => c.unreplied).length
    if (prevUnrepRef.current !== null && unrep > prevUnrepRef.current) {
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
    prevUnrepRef.current = unrep
    document.title = unrep > 0 ? `(${unrep}) 💬 Khách nhắn — Hannah Spa` : 'Hannah Spa'
    return () => { document.title = 'Hannah Spa' }
  }, [convos, loading])

  const selected = convos.find(c => c.cid === selId) || null

  // ── NHẬN DIỆN KHÁCH (nền identity map) ──
  // 1) bản đồ nhận diện đã chốt (marketing_customer_identities theo PSID) → bắt khách cũ inbox lại (vd Minh Khải)
  // 2) SĐT lấy từ tin · 3) SĐT suy ra từ segment. Có khach_hang_id → đọc hồ sơ giàu từ v_customer_pos_intelligence.
  useEffect(() => {
    let alive = true
    setProfile(null)
    if (!selected) return
    ;(async () => {
      let khId = null, phone = null
      if (selected.psid) {
        const { data: ident } = await supabase.from('marketing_customer_identities')
          .select('khach_hang_id, phone_norm, confidence')
          .eq('platform_user_id', selected.psid).not('khach_hang_id', 'is', null)
          .order('confidence', { ascending: false }).limit(1).maybeSingle()
        if (ident?.khach_hang_id) khId = ident.khach_hang_id
        if (ident?.phone_norm) phone = ident.phone_norm
      }
      if (!phone) { for (const m of selected.msgs) { const p = extractPhoneLite(m.noi_dung); if (p) { phone = p; break } } }
      if (!phone && !khId && selected.psid) {
        const { data: seg } = await supabase.from('marketing_fanpage_customer_segments')
          .select('phone_norm').eq('platform_user_id', selected.psid).not('phone_norm', 'is', null).limit(1).maybeSingle()
        if (seg?.phone_norm) phone = seg.phone_norm
      }
      // Đọc hồ sơ giàu: thẻ đang có, dịch vụ đã dùng, lần cuối ghé, gợi ý upsell
      let intel = null
      if (khId) {
        const { data } = await supabase.from('v_customer_pos_intelligence').select('*').eq('khach_hang_id', khId).limit(1).maybeSingle()
        intel = data
      }
      if (!intel && phone) {
        const { data } = await supabase.from('v_customer_pos_intelligence').select('*').eq('phone_norm', phone).limit(1).maybeSingle()
        intel = data
      }
      if (!alive) return
      if (intel) setProfile({ is_new: false, phone: intel.so_dien_thoai || phone, intel })
      else setProfile({ is_new: true, phone })
    })()
    return () => { alive = false }
  }, [selId, convos])

  // ── GỢI Ý AI BÁM CẢ HỘI THOẠI ── gọi edge function suggest_reply mỗi khi mở khách mới.
  const loadAI = useCallback(async (conv) => {
    if (!conv) { setAi({ loading: false, reply: '', note: '', error: null }); return }
    setAi({ loading: true, reply: '', note: '', error: null })
    try {
      const msgs = conv.msgs.map(m => ({ direction: m.direction, sender_type: m.sender_type, noi_dung: m.noi_dung }))
      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { mode: 'suggest_reply', messages: msgs, platform_user_id: conv.psid || null },
      })
      if (error) throw error
      setAi({ loading: false, reply: data?.reply || '', note: data?.note || '', error: data?.error || null })
      setDraft(prev => prev && prev.trim() ? prev : (data?.reply || ''))
    } catch (e) {
      setAi({ loading: false, reply: '', note: '', error: e.message || String(e) })
    }
  }, [])

  useEffect(() => { setDraft(''); loadAI(selected) }, [selId, selected, loadAI])

  async function sendReply() {
    if (!draft.trim()) { notify('Chưa có nội dung tin nhắn', 'error'); return }
    if (!selected?.psid) { notify('Chưa xác định được người nhận — hãy Chép tin để gửi tay', 'error'); return }
    setSending(true)
    try {
      const fnName = selected.kenh === 'zalo' ? 'zalo-webhook' : 'marketing-meta-page-sync'
      const body = selected.kenh === 'zalo'
        ? { mode: 'send_message', user_id: selected.psid, text: draft.trim() }
        : { mode: 'send_message', recipient_id: selected.psid, message: draft.trim(), kenh: selected.kenh }
      const { error } = await supabase.functions.invoke(fnName, { body })
      if (error) throw error
      notify('Đã gửi tin cho khách', 'success')
      setNonce(n => n + 1)
    } catch (e) {
      notify(`Chưa gửi được qua HSMS (${e.message || e}). Hãy bấm Chép để gửi tay.`, 'error')
    } finally { setSending(false) }
  }

  const copy = (t) => { navigator.clipboard?.writeText(t || ''); notify('Đã chép', 'success') }

  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'inbox')} />
      <div className="mkt-soft" style={{
        border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10,
        padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: C.textSub, lineHeight: 1.5,
      }}>
        💬 Hội thoại có tin trong {INBOX_DAYS} ngày gần đây (khách cũ hơn nằm ở mục Khách & Remarketing). Khách đang chờ trả lời được đẩy lên đầu.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,.8fr) minmax(0,1.4fr) minmax(260px,.9fr)', gap: 14, minHeight: 560 }}>
        {/* Cột trái: danh sách hội thoại */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 900, color: C.text }}>
            Cần trả lời {convos.filter(c => c.unreplied).length > 0 && <span style={{ color: C.chi }}>· {convos.filter(c => c.unreplied).length}</span>}
          </div>
          <div style={{ overflow: 'auto', maxHeight: 560 }}>
            {loading ? <EmptyBox text="Đang tải hội thoại…" />
              : convos.length === 0 ? <EmptyBox text={`Chưa có hội thoại trong ${INBOX_DAYS} ngày. Khi khách nhắn Fanpage/Zalo, hội thoại sẽ hiện ở đây.`} />
                : convos.map(c => {
                  const active = c.cid === selId
                  return (
                    <button key={c.cid} onClick={() => setSelId(c.cid)} style={{
                      width: '100%', textAlign: 'left', cursor: 'pointer', padding: '11px 13px',
                      border: 'none', borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${active ? C.primary : 'transparent'}`,
                      background: active ? `${C.primary}0C` : '#fff',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <strong style={{ color: C.text, fontSize: 13 }}>{c.name}</strong>
                        {c.unreplied && <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: C.chi, borderRadius: 99, padding: '2px 7px' }}>Chờ</span>}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 12, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.last.direction === 'outbound' ? 'Bạn: ' : ''}{(c.last.noi_dung || '(đính kèm)').slice(0, 50)}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 10.5, color: C.textMute }}>{c.kenh === 'zalo' ? 'Zalo' : 'Facebook'} · {fmtDateTime(c.lastAt)}</div>
                    </button>
                  )
                })}
          </div>
        </div>

        {/* Cột giữa: hội thoại + soạn tin */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? <EmptyBox text="Chọn một khách bên trái để xem hội thoại." />
            : (
              <>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 900, color: C.text }}>
                  {selected.name} <span style={{ fontWeight: 600, fontSize: 12, color: C.textSub }}>· {selected.kenh === 'zalo' ? 'Zalo' : 'Facebook'}</span>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380 }}>
                  {selected.msgs.map(m => (
                    <div key={m.id} style={{ alignSelf: m.direction === 'outbound' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                      <div style={{
                        background: m.direction === 'outbound' ? C.primary : '#F1ECE4', color: m.direction === 'outbound' ? '#fff' : C.text,
                        borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.45,
                      }}>{m.noi_dung || '(đính kèm/hình ảnh)'}</div>
                      <div style={{ fontSize: 10, color: C.textMute, marginTop: 2, textAlign: m.direction === 'outbound' ? 'right' : 'left' }}>{fmtDateTime(m.created_at)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, padding: 12 }}>
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Soạn tin trả lời khách… (gợi ý AI đã điền sẵn nếu có)"
                    style={{ width: '100%', minHeight: 70, borderRadius: 8, border: `1px solid ${C.border}`, padding: 10, fontSize: 13, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => copy(draft)} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Chép</button>
                    <button onClick={sendReply} disabled={sending} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '8px 16px', fontWeight: 800, fontSize: 13, cursor: sending ? 'wait' : 'pointer' }}>
                      {sending ? 'Đang gửi…' : 'Gửi từ HSMS'}
                    </button>
                  </div>
                </div>
              </>
            )}
        </div>

        {/* Cột phải: hồ sơ khách + gợi ý AI */}
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <Panel title="Khách này là ai" eyebrow="Nhận diện HSMS">
            {!selected ? <span style={{ color: C.textSub, fontSize: 13 }}>—</span>
              : !profile ? <span style={{ color: C.textSub, fontSize: 13 }}>Đang tra hồ sơ…</span>
                : profile.is_new
                  ? <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                      <b style={{ color: C.text }}>{profile.phone ? 'Có SĐT, chưa có hồ sơ HSMS' : 'Khách mới — chưa rõ SĐT'}</b><br />
                      {profile.phone ? `SĐT: ${profile.phone}. Nên tạo hồ sơ trước khi tư vấn sâu.` : 'Mục tiêu đầu tiên: xin SĐT / mời Quan Tâm Zalo.'}
                    </div>
                  : (() => {
                      const k = profile.intel
                      const Row = ({ label, value }) => value ? (
                        <div style={{ marginTop: 7 }}>
                          <div style={{ fontWeight: 800, fontSize: 11, color: C.textMute, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
                          <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{value}</div>
                        </div>
                      ) : null
                      return (
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                          <b style={{ fontSize: 14 }}>{k.ho_ten || 'Khách'}</b> · <span style={{ color: C.thu, fontWeight: 800 }}>Khách cũ</span><br />
                          <span style={{ color: C.textSub }}>SĐT {k.so_dien_thoai || profile.phone || '—'} · {Number(k.so_don || 0)} đơn · {fmtMoney(k.tong_chi_tieu)}</span><br />
                          <span style={{ color: C.textSub }}>Lần cuối ghé: {k.lan_cuoi_den ? fmtDate(k.lan_cuoi_den) : '—'}</span>
                          {Number(k.so_the_active || 0) > 0 && (
                            <div style={{ marginTop: 7, background: `${C.thu}10`, border: `1px solid ${C.thu}30`, borderRadius: 8, padding: '7px 10px' }}>
                              <div style={{ fontWeight: 800, fontSize: 11, color: C.thu, textTransform: 'uppercase', letterSpacing: '.06em' }}>🎫 Thẻ đang có ({k.so_the_active}) · còn {Number(k.tong_buoi_con || 0)} buổi</div>
                              {k.the_dang_co && <div style={{ fontSize: 12.5, color: C.text, marginTop: 3, lineHeight: 1.5 }}>{k.the_dang_co}</div>}
                            </div>
                          )}
                          <Row label="Thói quen — dịch vụ hay dùng" value={k.dich_vu_da_dung} />
                          <Row label="Dịch vụ gần nhất" value={k.dich_vu_gan_nhat} />
                          <Row label="Nên tư vấn / upsell" value={k.goi_y_upsell || k.muc_tieu_tu_van} />
                          <Row label="Ghi chú da liễu" value={k.ghi_chu_da_lieu} />
                        </div>
                      )
                    })()}
          </Panel>
          <Panel title="Gợi ý trả lời (AI)" eyebrow="DeepSeek · bám hội thoại">
            {ai.loading
              ? <span style={{ color: C.textSub, fontSize: 13 }}>🤖 AI đang đọc cả hội thoại để gợi ý…</span>
              : ai.reply
                ? <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, background: '#FFFDF8', border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>{ai.reply}</div>
                    {ai.note && <div style={{ fontSize: 11.5, color: C.textMute, fontStyle: 'italic', lineHeight: 1.4 }}>Vì sao: {ai.note}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDraft(ai.reply)} style={{ flex: 1, border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>Dùng gợi ý</button>
                      <button onClick={() => loadAI(selected)} title="Tạo lại gợi ý" style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>↻</button>
                    </div>
                  </div>
                : <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                    {ai.error ? `Chưa tạo được gợi ý (${ai.error}).` : 'Chưa có gợi ý.'}
                    <button onClick={() => loadAI(selected)} style={{ display: 'block', marginTop: 8, border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>Thử tạo gợi ý</button>
                  </div>}
          </Panel>
          {selected && (
            <button onClick={openDatHen} style={{
              border: 'none', background: C.grad, color: '#fff', borderRadius: 10, padding: '12px 16px',
              fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: C.shadowSm,
            }}>📅 Đặt lịch cho khách này</button>
          )}
        </div>
      </div>
      {datHen && (
        <ModalDatHen
          initial={datHen}
          ktvList={ktvList}
          onSave={() => { setDatHen(null); notify('Đã đặt lịch hẹn cho khách', 'success') }}
          onClose={() => setDatHen(null)}
          user={null}
        />
      )}
    </Shell>
  )
}

// ── KHÁCH & REMARKETING ── danh sách khách tiềm năng (AI đọc tin thật), ưu tiên 2026, lọc rác, mời quay lại.
export function RemarketingPage() {
  const [nam, setNam] = useState('2026')
  const [nhom, setNhom] = useState('tat_ca')   // tat_ca | tiem_nang | da_den
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ analyzed: 0, total: 0 })
  const [mining, setMining] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const applyNam = (q) => nam === 'tat_ca' ? q : (nam === 'older' ? q.lt('nam_tin_cuoi', 2025) : q.eq('nam_tin_cuoi', Number(nam)))
        let q = supabase.from('marketing_fanpage_customer_segments')
          .select('id, display_name, phone_norm, priority_score, services_interest, suggested_action, suggested_script, ai_tom_tat, da_den_spa, care_status, last_message_at')
          .not('ai_reanalyzed_at', 'is', null).neq('care_status', 'tam_ngung')
          .order('priority_score', { ascending: false }).order('last_message_at', { ascending: false }).limit(150)
        q = applyNam(q)
        if (nhom === 'da_den') q = q.eq('da_den_spa', true)
        else if (nhom === 'tiem_nang') q = q.gte('priority_score', 60)
        const { data } = await q
        // tiến độ: đã phân tích vs tổng có SĐT theo năm đang lọc
        let ct = supabase.from('marketing_fanpage_customer_segments').select('id', { count: 'exact', head: true }).eq('has_phone', true)
        ct = applyNam(ct)
        const { count: total } = await ct
        let ca = supabase.from('marketing_fanpage_customer_segments').select('id', { count: 'exact', head: true }).eq('has_phone', true).not('ai_reanalyzed_at', 'is', null)
        ca = applyNam(ca)
        const { count: analyzed } = await ca
        if (alive) { setRows(data || []); setProgress({ analyzed: analyzed || 0, total: total || 0 }); setLoading(false) }
      } catch (e) { if (alive) { setLoading(false); notify(`Lỗi tải: ${e.message || e}`, 'error') } }
    })()
    return () => { alive = false }
  }, [nam, nhom, nonce])

  async function phanTichThem() {
    setMining(true)
    try {
      const { data, error } = await supabase.functions.invoke('marketing-ai', { body: { mode: 'reclassify_leads', limit: 3, since: nam === 'tat_ca' ? '2019-01-01' : (nam === 'older' ? '2019-01-01' : `${nam}-01-01`) } })
      if (error) throw error
      notify(`Đã phân tích thêm ${data?.analyzed || 0} khách`, 'success')
      setNonce(n => n + 1)
    } catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') } finally { setMining(false) }
  }

  async function loaiBo(r) {
    try {
      await supabase.from('marketing_fanpage_customer_segments').update({ care_status: 'tam_ngung' }).eq('id', r.id)
      setRows(rs => rs.filter(x => x.id !== r.id))
      notify('Đã loại khỏi danh sách', 'success')
    } catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') }
  }

  const namTabs = [['2026', '2026'], ['2025', '2025'], ['Cũ hơn', 'older'], ['Tất cả', 'tat_ca']]
  const nhomTabs = [['Tất cả', 'tat_ca'], ['Tiềm năng cao', 'tiem_nang'], ['Đã đến Hannah', 'da_den']]
  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'remarketing')} />
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        💎 AI đọc tin thật của từng khách để chấm điểm tiềm năng + soạn sẵn tin mời quay lại. Ưu tiên 2026 (khách gần đây = nóng nhất). Khách rác/không nhu cầu đã tự lọc bỏ. Bấm <b>Chép</b> để gửi qua Zalo/SĐT.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.textMute }}>Thời gian:</span>
        {namTabs.map(([label, v]) => (
          <button key={v} onClick={() => setNam(v)} style={{ border: `1px solid ${nam === v ? C.primary : C.border}`, background: nam === v ? C.primary : '#fff', color: nam === v ? '#fff' : C.text, borderRadius: 8, padding: '6px 13px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.textMute }}>Nhóm:</span>
        {nhomTabs.map(([label, v]) => (
          <button key={v} onClick={() => setNhom(v)} style={{ border: `1px solid ${nhom === v ? '#8A6A6E' : C.border}`, background: nhom === v ? '#8A6A6E' : '#fff', color: nhom === v ? '#fff' : C.text, borderRadius: 99, padding: '6px 13px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>{label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.textSub }}>Đã phân tích {progress.analyzed}/{progress.total} khách (tự chạy nền)</span>
          <button onClick={phanTichThem} disabled={mining} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 12.5, cursor: mining ? 'wait' : 'pointer' }}>{mining ? 'Đang phân tích…' : '⚡ Phân tích thêm'}</button>
        </div>
      </div>

      {loading ? <EmptyBox text="Đang tải danh sách…" />
        : rows.length === 0 ? <EmptyBox text={progress.analyzed === 0 ? 'Chưa có khách nào được phân tích cho bộ lọc này. Bấm "Phân tích thêm" hoặc chờ hệ thống tự chạy.' : 'Không có khách tiềm năng trong bộ lọc này (rác đã bị loại).'} />
          : <div style={{ display: 'grid', gap: 12 }}>
              {rows.map(r => {
                const dv = Array.isArray(r.services_interest) ? r.services_interest.join(', ') : ''
                const diem = Number(r.priority_score || 0)
                const mau = diem >= 60 ? C.thu : diem >= 40 ? C.gold : C.textMute
                return (
                  <div key={r.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: '#fff', padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: C.text, fontFamily: FONT.serif }}>
                          {r.display_name || 'Khách'}
                          {r.phone_norm && <span style={{ fontWeight: 600, fontSize: 12.5, color: C.textSub }}> · {r.phone_norm}</span>}
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: '#fff', background: mau, borderRadius: 99, padding: '2px 9px' }}>điểm {diem}</span>
                          {r.da_den_spa && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: '#fff', background: '#1A5276', borderRadius: 99, padding: '2px 9px' }}>Đã đến Hannah</span>}
                        </div>
                        {dv && <div style={{ fontSize: 12.5, color: C.primary, marginTop: 3, fontWeight: 700 }}>Quan tâm: {dv}</div>}
                        {r.ai_tom_tat && <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 3, lineHeight: 1.5 }}>{r.ai_tom_tat}</div>}
                      </div>
                      <button onClick={() => loaiBo(r)} title="Loại khỏi danh sách (rác/không nhu cầu)" style={{ border: `1px solid ${C.chi}40`, background: '#fff', color: C.chi, borderRadius: 7, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Loại bỏ</button>
                    </div>
                    {r.suggested_action && <div style={{ marginTop: 8, fontSize: 12.5, color: C.text }}><b style={{ color: C.textMute }}>Việc cần làm:</b> {r.suggested_action}</div>}
                    {r.suggested_script && (
                      <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55, background: '#FFFDF8', border: `1px solid ${C.border}`, borderRadius: 8, padding: 11 }}>{r.suggested_script}</div>
                        <button onClick={() => { navigator.clipboard?.writeText(r.suggested_script); notify('Đã chép tin mời — dán vào Zalo/SMS gửi khách', 'success') }} style={{ justifySelf: 'start', border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '7px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>📋 Chép tin mời quay lại</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>}
    </Shell>
  )
}
