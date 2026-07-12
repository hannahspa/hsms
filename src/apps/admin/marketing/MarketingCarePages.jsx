// ═══════════════════════════════════════════════════════════════════════════
// Marketing — Chăm Sóc Sau DV, Huấn Luyện AI, 4 chiến dịch tự động
// Tách từ MarketingModulePage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { C, FONT } from '../../../constants/colors'
import { supabase } from '../../../lib/supabase'
import { todayISO, addDays } from '../../../lib/utils'
import { notify } from '../../../components/ui/notify'
import { AiActionsPanel } from './MarketingOps'
import { EmptyBox, Header, MARKETING_ROUTES, Panel, Shell, fmtDate, go } from './marketingShared'

// ── VIỆC B: CHĂM SÓC SAU DỊCH VỤ (giai đoạn 1) ── khách đến hôm qua → AI soạn tin → lễ tân gửi tay.
const LIEU_TRINH_DM = ['Triệt Lông', 'Chăm Sóc Da Mặt', 'PEEL DA SINH HỌC', 'Tắm Trắng Toàn Thân', 'Công Nghệ Cao - Laser', 'Phun Xăm']

function ymdVN(offsetDays = 0) {
  // addDays dùng Date.UTC — bản cũ toISOString() lệch -1 ngày khi máy VN chạy trước 7h sáng
  return addDays(todayISO(), offsetDays)
}

function AfterCarePage() {
  const [ngay, setNgay] = useState(ymdVN(-1))   // mặc định hôm qua
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiById, setAiById] = useState({})       // don_hang_id -> { loading, reply, note }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const { data: dons } = await supabase.from('don_hang')
          .select('id, ma_don, ngay, khach_hang_id, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
          .eq('ngay', ngay).eq('is_test', false).neq('trang_thai', 'huy')
          .not('khach_hang_id', 'is', null).order('created_at', { ascending: false }).limit(120)
        const ids = (dons || []).map(d => d.id)
        let ctMap = {}, logSet = new Set()
        if (ids.length) {
          const { data: cts } = await supabase.from('don_hang_chi_tiet')
            .select('don_hang_id, the_lieu_trinh_id, dich_vu:dich_vu_id(ten, danh_muc)').in('don_hang_id', ids)
          for (const c of (cts || [])) {
            if (!ctMap[c.don_hang_id]) ctMap[c.don_hang_id] = []
            ctMap[c.don_hang_id].push(c)
          }
          const { data: logs } = await supabase.from('marketing_aftercare_log').select('don_hang_id').in('don_hang_id', ids)
          for (const l of (logs || [])) logSet.add(l.don_hang_id)
        }
        const list = (dons || []).map(d => {
          const cts = ctMap[d.id] || []
          const dvNames = [...new Set(cts.map(c => c.dich_vu?.ten).filter(Boolean))]
          const laLieuTrinh = cts.some(c => c.the_lieu_trinh_id || LIEU_TRINH_DM.includes(c.dich_vu?.danh_muc))
          return {
            id: d.id, ma_don: d.ma_don, khach_hang_id: d.khach_hang_id,
            ten: d.khach_hang?.ho_ten || 'Khách lẻ', sdt: d.khach_hang?.so_dien_thoai || '',
            dichVu: dvNames.join(', ') || '(không rõ dịch vụ)', laLieuTrinh, daCham: logSet.has(d.id),
          }
        }).filter(r => r.sdt) // chỉ khách có SĐT để nhắn được
        if (alive) { setRows(list); setLoading(false) }
      } catch (e) { if (alive) { setLoading(false); notify(`Lỗi tải: ${e.message || e}`, 'error') } }
    })()
    return () => { alive = false }
  }, [ngay])

  async function soanTin(r) {
    setAiById(s => ({ ...s, [r.id]: { loading: true } }))
    try {
      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { mode: 'care_message', khach_hang_id: r.khach_hang_id, ten_khach: r.ten, dich_vu_da_lam: r.dichVu, la_lieu_trinh: r.laLieuTrinh },
      })
      if (error) throw error
      setAiById(s => ({ ...s, [r.id]: { loading: false, reply: data?.reply || '', note: data?.note || '' } }))
    } catch (e) {
      setAiById(s => ({ ...s, [r.id]: { loading: false, error: e.message || String(e) } }))
    }
  }

  async function danhDauCham(r) {
    const ai = aiById[r.id]
    try {
      await supabase.from('marketing_aftercare_log').upsert({
        don_hang_id: r.id, khach_hang_id: r.khach_hang_id, ngay_den: ngay, da_cham: true,
        kenh: 'zalo', noi_dung: ai?.reply || null,
      }, { onConflict: 'don_hang_id' })
      setRows(rs => rs.map(x => x.id === r.id ? { ...x, daCham: true } : x))
      notify('Đã đánh dấu chăm sóc', 'success')
    } catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') }
  }

  const chuaCham = rows.filter(r => !r.daCham)
  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'aftercare')} />
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        💚 Khách đến làm dịch vụ ngày đã chọn. Bấm <b>AI soạn tin</b> → kiểm tra → <b>Chép</b> gửi qua Zalo/SĐT của khách → <b>Đánh dấu đã chăm</b>. Hệ thống ghi nhớ để không chăm trùng/bỏ sót.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['Hôm qua', ymdVN(-1)], ['Hôm nay', ymdVN(0)], ['Hôm kia', ymdVN(-2)]].map(([label, v]) => (
          <button key={v} onClick={() => setNgay(v)} style={{
            border: `1px solid ${ngay === v ? C.primary : C.border}`, background: ngay === v ? C.primary : '#fff',
            color: ngay === v ? '#fff' : C.text, borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}>{label}</button>
        ))}
        <span style={{ fontSize: 12.5, color: C.textSub, marginLeft: 4 }}>{fmtDate(ngay)} · {chuaCham.length} khách chưa chăm / {rows.length} tổng</span>
      </div>

      {loading ? <EmptyBox text="Đang tải danh sách khách…" />
        : rows.length === 0 ? <EmptyBox text="Không có khách (có SĐT) đến trong ngày này." />
          : <div style={{ display: 'grid', gap: 12 }}>
              {rows.map(r => {
                const ai = aiById[r.id]
                return (
                  <div key={r.id} style={{ border: `1px solid ${r.daCham ? C.thu + '40' : C.border}`, borderRadius: 12, background: r.daCham ? `${C.thu}08` : '#fff', padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: C.text, fontFamily: FONT.serif }}>
                          {r.ten} <span style={{ fontWeight: 600, fontSize: 12.5, color: C.textSub }}>· {r.sdt}</span>
                          {r.laLieuTrinh && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, color: C.primary, background: `${C.primary}14`, borderRadius: 99, padding: '2px 9px' }}>Liệu trình</span>}
                          {r.daCham && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: '#fff', background: C.thu, borderRadius: 99, padding: '2px 9px' }}>Đã chăm</span>}
                        </div>
                        <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 3 }}>Đã làm: {r.dichVu}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => soanTin(r)} disabled={ai?.loading} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12.5, cursor: ai?.loading ? 'wait' : 'pointer' }}>
                          {ai?.loading ? 'AI đang soạn…' : ai?.reply ? '↻ Soạn lại' : '✨ AI soạn tin'}
                        </button>
                      </div>
                    </div>
                    {ai?.reply && (
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55, background: '#FFFDF8', border: `1px solid ${C.border}`, borderRadius: 8, padding: 11 }}>{ai.reply}</div>
                        {ai.note && <div style={{ fontSize: 11.5, color: C.textMute, fontStyle: 'italic' }}>Vì sao: {ai.note}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { navigator.clipboard?.writeText(ai.reply); notify('Đã chép — dán vào Zalo/SMS gửi khách', 'success') }} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>📋 Chép tin</button>
                          {!r.daCham && <button onClick={() => danhDauCham(r)} style={{ border: 'none', background: C.thu, color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>✓ Đánh dấu đã chăm</button>}
                        </div>
                      </div>
                    )}
                    {ai?.error && <div style={{ marginTop: 8, fontSize: 12.5, color: C.chi }}>Lỗi soạn tin: {ai.error}</div>}
                  </div>
                )
              })}
            </div>}
    </Shell>
  )
}

// ── B/Chặng 3: TRANG HUẤN LUYỆN AI ── sửa hiến pháp tư vấn + duyệt mẫu vàng học từ lễ tân.
const TOPIC_LABEL = {
  triet_long: 'Triệt lông', da_mat: 'Da mặt / mụn / nám', massage: 'Massage', goi: 'Gội dưỡng sinh',
  tam_trang: 'Tắm trắng', phun_xam: 'Phun xăm', gia: 'Hỏi giá', dat_lich: 'Đặt lịch', khac: 'Khác',
}

export function TrainingPage() {
  const [tab, setTab] = useState('playbook')
  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'training')} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['playbook', '📜 Hiến pháp tư vấn'], ['examples', '🏅 Mẫu vàng (AI học)'], ['promo', '🏷️ Khuyến mãi']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            border: `1px solid ${tab === k ? C.primary : C.border}`, background: tab === k ? C.primary : '#fff',
            color: tab === k ? '#fff' : C.text, borderRadius: 9, padding: '9px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>
      {/* Duyệt hành động AI (marketing_ai_actions) — port từ bản cũ (03/07) */}
      <AiActionsPanel />
      {tab === 'playbook' && <PlaybookEditor />}
      {tab === 'examples' && <GoldExamples />}
      {tab === 'promo' && <PromoLink />}
    </Shell>
  )
}

function PlaybookEditor() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exists, setExists] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase.from('marketing_ai_config').select('value').eq('key', 'sales_playbook').maybeSingle()
        if (!alive) return
        if (data?.value) { setText(data.value); setExists(true) }
      } catch { /* ignore */ }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  async function save() {
    if (text.trim().length < 50) { notify('Hiến pháp quá ngắn — cần ít nhất vài dòng', 'error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('marketing_ai_config')
        .upsert({ key: 'sales_playbook', value: text, mo_ta: 'Hiến pháp tư vấn AI Marketing', updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
      setExists(true)
      notify('Đã lưu — AI áp dụng trong vòng 5 phút', 'success')
    } catch (e) { notify(`Lưu lỗi: ${e.message || e}`, 'error') } finally { setSaving(false) }
  }

  return (
    <Panel title="Hiến pháp tư vấn" eyebrow="AI đọc mỗi lần gợi ý"
      action={<button onClick={save} disabled={saving || loading} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '9px 18px', fontWeight: 800, fontSize: 13, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Đang lưu…' : 'Lưu'}</button>}>
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        Đây là "bộ não" tư vấn: thương hiệu, giọng nói, nguyên tắc bán, giá, kịch bản. Sửa ở đây xong bấm Lưu — AI tự áp dụng (không cần lập trình viên). {!exists && 'Hiện chưa có bản tùy chỉnh — AI đang dùng bản mặc định cài sẵn; lưu lần đầu để ghi đè.'}
        <br /><b style={{ color: C.primary }}>Gợi ý cần điền:</b> hotline/Zalo chính thức để AI đưa khách; ưu đãi đang chạy; cập nhật giá khi đổi.
      </div>
      {loading ? <EmptyBox text="Đang tải hiến pháp…" />
        : <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Nhập hiến pháp tư vấn (để trống = AI dùng bản mặc định)…"
            style={{ width: '100%', minHeight: 460, borderRadius: 8, border: `1px solid ${C.border}`, padding: 14, fontSize: 13, lineHeight: 1.6, resize: 'vertical', fontFamily: FONT.sans }} />}
    </Panel>
  )
}

function GoldExamples() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState('all')
  const [mining, setMining] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        let q = supabase.from('marketing_ai_examples')
          .select('id, chu_de, khach_hoi, le_tan_tra_loi, diem, da_duyet')
          .order('da_duyet', { ascending: false }).order('diem', { ascending: false }).limit(150)
        if (topic !== 'all') q = q.eq('chu_de', topic)
        const { data } = await q
        if (alive) { setRows(data || []); setLoading(false) }
      } catch { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [topic, nonce])

  async function mine() {
    setMining(true)
    try {
      const { data, error } = await supabase.functions.invoke('marketing-ai', { body: { mode: 'mine_examples', days: 180 } })
      if (error) throw error
      notify(`Đã quét: ${data?.saved_new || 0} mẫu mới (xét ${data?.candidates || 0} ứng viên)`, 'success')
      setNonce(n => n + 1)
    } catch (e) { notify(`Quét lỗi: ${e.message || e}`, 'error') } finally { setMining(false) }
  }

  async function setDuyet(id, val) {
    try {
      await supabase.from('marketing_ai_examples').update({ da_duyet: val }).eq('id', id)
      setRows(rs => rs.map(r => r.id === id ? { ...r, da_duyet: val } : r))
    } catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') }
  }
  async function del(id) {
    try { await supabase.from('marketing_ai_examples').delete().eq('id', id); setRows(rs => rs.filter(r => r.id !== id)) }
    catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') }
  }

  const duyetCount = rows.filter(r => r.da_duyet).length
  return (
    <Panel title="Mẫu vàng — AI học từ lễ tân giỏi" eyebrow={`${rows.length} mẫu · ${duyetCount} đã duyệt`}
      action={<button onClick={mine} disabled={mining} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '9px 16px', fontWeight: 800, fontSize: 13, cursor: mining ? 'wait' : 'pointer' }}>{mining ? 'Đang quét…' : '↻ Quét mẫu mới'}</button>}>
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        Đây là các đoạn lễ tân thật trả lời tốt (tự quét mỗi 6 giờ). AI dùng làm ví dụ để bắt chước cách bán của Hannah. <b style={{ color: C.thu }}>Duyệt</b> mẫu hay để ưu tiên cho AI học; <b style={{ color: C.chi }}>Xóa</b> mẫu dở.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['all', ...Object.keys(TOPIC_LABEL)].map(t => (
          <button key={t} onClick={() => setTopic(t)} style={{
            border: `1px solid ${topic === t ? C.primary : C.border}`, background: topic === t ? `${C.primary}12` : '#fff',
            color: topic === t ? C.primary : C.textSub, borderRadius: 99, padding: '5px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>{t === 'all' ? 'Tất cả' : TOPIC_LABEL[t]}</button>
        ))}
      </div>
      {loading ? <EmptyBox text="Đang tải mẫu…" />
        : rows.length === 0 ? <EmptyBox text="Chưa có mẫu. Bấm “Quét mẫu mới” để AI học từ hội thoại thật." />
          : <div style={{ display: 'grid', gap: 10 }}>
              {rows.map(r => (
                <div key={r.id} style={{ border: `1px solid ${r.da_duyet ? C.thu + '40' : C.border}`, borderRadius: 10, background: r.da_duyet ? `${C.thu}08` : '#fff', padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: C.primary, background: `${C.primary}12`, borderRadius: 99, padding: '2px 9px' }}>{TOPIC_LABEL[r.chu_de] || r.chu_de}</span>
                      <span style={{ fontSize: 11, color: C.textMute }}>điểm {r.diem}</span>
                      {r.da_duyet && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: C.thu, borderRadius: 99, padding: '2px 9px' }}>Đã duyệt</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setDuyet(r.id, !r.da_duyet)} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 7, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{r.da_duyet ? 'Bỏ duyệt' : 'Duyệt'}</button>
                      <button onClick={() => del(r.id)} style={{ border: `1px solid ${C.chi}40`, background: '#fff', color: C.chi, borderRadius: 7, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Xóa</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}><b style={{ color: C.text }}>Khách:</b> {r.khach_hoi}</div>
                  <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginTop: 4 }}><b style={{ color: C.thu }}>Lễ tân:</b> {r.le_tan_tra_loi}</div>
                </div>
              ))}
            </div>}
    </Panel>
  )
}

function PromoLink() {
  return (
    <Panel title="Khuyến mãi đang chạy" eyebrow="AI báo đúng giá KM">
      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.7 }}>
        AI tự đọc các chương trình khuyến mãi <b>đang chạy</b> để báo đúng giá cho khách (vd Massage cổ vai gáy 99k thay vì 159k).
        <br /><br />
        Anh quản lý khuyến mãi ở trang <b>Khuyến Mãi</b> — thêm chương trình, đặt giá gốc / giá KM, thời gian và trạng thái “Đang chạy”. AI cập nhật trong vòng 5 phút.
        <div style={{ marginTop: 14 }}>
          <button onClick={() => go('/admin/khuyen-mai')} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '10px 20px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>Mở trang Khuyến Mãi →</button>
        </div>
      </div>
    </Panel>
  )
}

// ── Chăm Sóc Lại theo NHỊP: 9h tự gửi nhóm "đúng nhịp 10 ngày" + 40 khách "tồn đọng" ──
function ChamSocLaiPage() {
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('ngay_mai')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [nonce, setNonce] = useState(0)

  const ngayMaiISO = () => addDays(todayISO(), 1)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const s = await supabase.functions.invoke('cham-soc-lai', { body: { mode: 'stats' } })
        if (alive) setStats(s.data || null)
        if (tab === 'ngay_mai') {
          const mai = ngayMaiISO()
          const { data: chot } = await supabase.from('cham_soc_hang_doi').select('*').eq('trang_thai', 'da_chot').eq('ngay_du_kien', mai).order('uu_tien', { ascending: true })
          if (chot && chot.length) { if (alive) setRows(chot) }
          else {
            const p = await supabase.functions.invoke('cham-soc-lai', { body: { mode: 'preview' } })
            const d = p.data || {}
            if (alive) setRows([...(d.dung_nhip || []), ...(d.ton_dong || [])])
          }
        } else {
          const { data } = await supabase.from('cham_soc_hang_doi').select('*').eq('ngay_du_kien', todayISO()).order('nhom', { ascending: true }).order('so_ngay_vang', { ascending: true })
          if (alive) setRows(data || [])
        }
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [tab, nonce])

  // Chốt danh sách ngày mai ngay (thường cron 21:00 tự chạy; nút cho admin chủ động)
  async function chotNgayMai() {
    setBusy(true)
    try {
      const r = await supabase.functions.invoke('cham-soc-lai', { body: { mode: 'chot' } })
      if (r.data?.ok) notify(`Đã chốt ${r.data.da_chot} khách cho ngày mai (đúng nhịp ${r.data.dung_nhip} + tồn đọng ${r.data.ton_dong})`, 'success')
      else notify('Chốt lỗi', 'error')
      setTab('ngay_mai'); setNonce(n => n + 1)
    } catch (e) { notify(String(e.message || e), 'error') } finally { setBusy(false) }
  }

  // Gửi đợt hôm nay ngay (thường để cron 9h tự chạy; nút này cho admin chủ động/test)
  async function guiNgay() {
    if (!window.confirm('Gửi ZNS cho các khách ĐÃ CHỐT của hôm nay ngay bây giờ?\n(Bình thường hệ thống tự gửi 9h sáng.)')) return
    setBusy(true)
    try {
      const r = await supabase.functions.invoke('cham-soc-lai', { body: { mode: 'gui' } })
      if (r.data?.ok && r.data.da_gui != null) notify(`Đã gửi ${r.data.da_gui}/${r.data.tong_chot} khách${r.data.loi ? `, ${r.data.loi} lỗi` : ''}`, 'success')
      else notify(r.data?.skipped || 'Chưa có khách đã chốt để gửi', 'error')
      setTab('hom_nay'); setNonce(n => n + 1)
    } catch (e) { notify(String(e.message || e), 'error') } finally { setBusy(false) }
  }

  // Loại khách đã hết buổi thực tế khỏi đợt gửi
  async function boQua(r) {
    if (!window.confirm(`Loại "${r.ho_ten || 'khách'}"${r.ma_the ? ` (${r.ma_the})` : ''} khỏi đợt gửi?\n(Dùng khi khách đã hết buổi thực tế.)`)) return
    try {
      if (tab === 'ngay_mai') {
        await supabase.from('cham_soc_hang_doi').upsert({
          the_dai_dien_id: r.the_id, khach_hang_id: r.khach_hang_id, ma_the: r.ma_the, ho_ten: r.ho_ten,
          so_dien_thoai: r.so_dien_thoai, ten_dich_vu: r.ten_dich_vu, so_buoi_con_lai: r.so_buoi_con_lai,
          so_ngay_vang: r.so_ngay_vang, nhom: r.nhom, ngay_du_kien: ngayMaiISO(), trang_thai: 'bo_qua',
        }, { onConflict: 'the_dai_dien_id,ngay_du_kien' })
      } else {
        await supabase.from('cham_soc_hang_doi').update({ trang_thai: 'bo_qua' }).eq('id', r.id)
      }
      notify('Đã loại khỏi đợt gửi', 'success'); setNonce(n => n + 1)
    } catch (e) { notify(String(e.message || e), 'error') }
  }

  const TT = {
    da_gui:      { text: 'Đã gửi', color: '#1A5276' },
    da_xem:      { text: '👁 Đã xem', color: '#6C3483' },
    da_quan_tam: { text: '💜 Quan tâm OA', color: '#6C3483' },
    da_quay_lai: { text: '✓ Đã quay lại', color: C.thu },
    gui_loi:     { text: '⚠ Gửi lỗi', color: C.chi },
    bo_qua:      { text: 'Đã bỏ', color: C.textMute },
    da_chot:     { text: 'Chờ gửi', color: C.gold },
  }
  const card = (label, val, sub, color) => (
    <div style={{ flex: 1, minWidth: 180, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || C.text, fontFamily: FONT.serif, marginTop: 2 }}>{val}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.textMute, marginTop: 2 }}>{sub}</div>}
    </div>
  )
  const hn = stats?.hom_nay, nm = stats?.ngay_mai

  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'cham-soc-lai')} />

      {/* Thống kê */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        {card('Hôm nay đã gửi', hn?.da_gui ?? '—', `đúng nhịp ${hn?.dung_nhip ?? 0} · tồn đọng ${hn?.ton_dong ?? 0}`, '#1A5276')}
        {card('Đã xem / Quan tâm OA', `${hn?.da_xem ?? 0} / ${hn?.quan_tam_oa ?? 0}`, 'trong số đã gửi hôm nay', '#6C3483')}
        {card('Ngày mai sẽ gửi', nm?.tong ?? '—', `đúng nhịp ${nm?.dung_nhip ?? 0} · tồn đọng ${nm?.ton_dong ?? 0}`, C.gold)}
        {card('Lỗi gửi hôm nay', hn?.loi ?? 0, hn?.loi ? 'cần kiểm tra ZNS' : 'không có lỗi', hn?.loi ? C.chi : C.thu)}
      </div>

      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '10px 14px', margin: '8px 0 14px', fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        🤖 Khép kín tự động: <b>21:00 mỗi tối</b> hệ thống quét + chốt danh sách cho ngày mai (xem tab "Ngày mai"), <b>9h sáng</b> tự gửi ZNS. Gồm <b>Đúng Nhịp</b> (khách dùng thẻ đúng 10 ngày trước) + <b>40 Tồn Đọng</b> (khách cũ vắng ≤90 ngày, ưu tiên ấm, lùi dần). Khách dùng buổi mới → tự ngừng nhắc.
      </div>

      {/* Tabs + nút gửi ngay */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['ngay_mai', `Ngày mai sẽ gửi (${nm?.tong ?? 0})`], ['hom_nay', `Hôm nay đã gửi (${hn?.tong ?? 0})`]].map(([k, lb]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT.sans,
              border: `1px solid ${tab === k ? C.primary : C.border}`, background: tab === k ? C.primary : '#fff', color: tab === k ? '#fff' : C.textSub,
            }}>{lb}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={chotNgayMai} disabled={busy} style={{
            padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', fontFamily: FONT.sans,
            border: `1px solid ${C.gold}`, background: '#fff', color: '#9a7a2e',
          }}>{busy ? '…' : '📋 Chốt ngày mai'}</button>
          <button onClick={guiNgay} disabled={busy} style={{
            padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', fontFamily: FONT.sans,
            border: 'none', background: C.gold, color: '#fff',
          }}>{busy ? 'Đang gửi…' : '📨 Gửi hôm nay ngay'}</button>
        </div>
      </div>

      {/* Danh sách */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Khách hàng', 'Mã thẻ', 'Tình trạng thẻ', 'Vắng', 'Nhóm', 'Trạng thái', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: i >= 3 && i <= 5 ? 'center' : 'left', padding: '11px 14px', fontSize: 12, color: C.textSub, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: C.textSub }}>Đang tải…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: C.textSub }}>
                  {tab === 'ngay_mai' ? 'Ngày mai chưa có khách nào đến nhịp nhắc 🌿' : 'Hôm nay chưa gửi khách nào.'}
                </td></tr>
              ) : rows.map((r) => {
                const tt = TT[r.trang_thai] || { text: tab === 'ngay_mai' ? 'Dự kiến gửi' : (r.trang_thai || '—'), color: tab === 'ngay_mai' ? C.gold : C.textMute }
                const dungNhip = r.nhom === 'dung_nhip'
                return (
                  <tr key={r.id || r.the_id} style={{ borderTop: `1px solid ${C.borderLight || C.border}` }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontFamily: FONT.serif, fontWeight: 600, fontSize: 14, color: C.text }}>{r.ho_ten || 'Khách'}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{r.so_dien_thoai || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: C.taiSan, whiteSpace: 'nowrap' }}>{r.ma_the || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, color: C.text }}>{r.ten_dich_vu}</div>
                      <div style={{ fontSize: 11.5, color: C.primary, fontWeight: 700 }}>Còn {r.so_buoi_con_lai} buổi</div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: r.so_ngay_vang >= 30 ? C.chi : C.textSub }}>{r.so_ngay_vang}n</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: dungNhip ? `${C.thu}1A` : `${C.gold}22`, color: dungNhip ? C.thu : '#9a7a2e' }}>{dungNhip ? '⏰ Đúng nhịp' : 'Tồn đọng'}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: tt.color }}>{tt.text}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {r.trang_thai !== 'bo_qua' && (
                        <button onClick={() => boQua(r)} title="Khách đã hết buổi — loại khỏi đợt gửi" style={{
                          padding: '6px 12px', borderRadius: 99, border: `1px solid ${C.border}`, background: '#fff',
                          color: C.chi, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT.sans, whiteSpace: 'nowrap',
                        }}>Đã hết · Bỏ</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}

// ── Win-back Khách Lạnh: gửi voucher mã riêng 50 khách/ngày ──
function WinbackPage() {
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('du_kien')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const s = await supabase.functions.invoke('winback-lanh', { body: { mode: 'stats' } })
        if (alive) setStats(s.data || null)
        if (tab === 'du_kien') {
          const { data: chot } = await supabase.from('winback_hang_doi').select('*').eq('trang_thai', 'da_chot').order('nam_lan_cuoi', { ascending: false })
          if (chot && chot.length) { if (alive) setRows(chot) }
          else {
            const p = await supabase.functions.invoke('winback-lanh', { body: { mode: 'preview' } })
            if (alive) setRows((p.data?.danh_sach || []).map(r => ({ ...r, _preview: true })))
          }
        } else {
          const { data } = await supabase.from('winback_hang_doi').select('*').neq('trang_thai', 'da_chot').order('gui_luc', { ascending: false }).limit(500)
          if (alive) setRows(data || [])
        }
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [tab, nonce])

  async function chot() {
    setBusy(true)
    try {
      const r = await supabase.functions.invoke('winback-lanh', { body: { mode: 'chot' } })
      if (r.data?.ok) notify(`Đã chốt ${r.data.da_chot} khách + sinh voucher mã riêng`, 'success')
      else notify('Chốt lỗi', 'error')
      setNonce(n => n + 1)
    } catch (e) { notify(String(e.message || e), 'error') } finally { setBusy(false) }
  }
  async function gui() {
    if (!window.confirm('Gửi voucher ZNS cho các khách đã chốt ngay bây giờ?')) return
    setBusy(true)
    try {
      const r = await supabase.functions.invoke('winback-lanh', { body: { mode: 'gui' } })
      if (r.data?.ok && r.data.da_gui != null) notify(`Đã gửi ${r.data.da_gui}/${r.data.tong_chot}${r.data.loi ? `, ${r.data.loi} lỗi` : ''}`, 'success')
      else notify(r.data?.skipped || 'Chưa gửi được', 'error')
      setTab('da_gui'); setNonce(n => n + 1)
    } catch (e) { notify(String(e.message || e), 'error') } finally { setBusy(false) }
  }

  const NHOM = { cham_soc_da: { t: 'Chăm Sóc Da', c: '#8E44AD' }, thu_gian: { t: 'Thư Giãn', c: '#2D7A4F' }, triet_long: { t: 'Triệt Lông', c: '#C0392B' } }
  const TT = { da_gui: { t: 'Đã gửi', c: '#1A5276' }, gui_loi: { t: '⚠ Lỗi', c: C.chi }, da_den: { t: '✓ Đã đến', c: C.thu }, da_chot: { t: 'Chờ gửi', c: C.gold } }
  const card = (label, val, sub, color) => (
    <div style={{ flex: 1, minWidth: 170, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || C.text, fontFamily: FONT.serif, marginTop: 2 }}>{val}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.textMute, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'winback')} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        {card('Còn lại chưa khai thác', stats?.con_lai_chua_xu_ly ?? '—', '462 khách lạnh tổng', '#8E44AD')}
        {card('Đã gửi voucher', stats?.tong_da_xu_ly ?? '—', `hôm nay ${stats?.hom_nay_gui ?? 0}`, '#1A5276')}
        {card('Khách đã quay lại (dùng mã)', stats?.da_den ?? 0, 'đo hiệu quả', C.thu)}
        {card('Lỗi gửi', stats?.loi ?? 0, '', stats?.loi ? C.chi : C.thu)}
      </div>
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '10px 14px', margin: '8px 0 14px', fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        🎁 Mỗi tối <b>21:00</b> chốt 50 khách lạnh (ưu tiên 2026→2023) + sinh <b>voucher mã riêng</b> theo sở thích; <b>9h sáng</b> gửi ZNS. Khách đến đọc mã → Lễ tân nhập POS → tự giảm %. Mã chỉ áp đúng nhóm dịch vụ.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['du_kien', 'Dự kiến / Đã chốt'], ['da_gui', 'Đã gửi']].map(([k, lb]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT.sans, border: `1px solid ${tab === k ? C.primary : C.border}`, background: tab === k ? C.primary : '#fff', color: tab === k ? '#fff' : C.textSub }}>{lb}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={chot} disabled={busy} style={{ padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: FONT.sans, border: `1px solid ${C.gold}`, background: '#fff', color: '#9a7a2e' }}>{busy ? '…' : '📋 Chốt 50 ngày mai'}</button>
          <button onClick={gui} disabled={busy} style={{ padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: FONT.sans, border: 'none', background: '#8E44AD', color: '#fff' }}>{busy ? 'Đang gửi…' : '🎁 Gửi voucher ngay'}</button>
        </div>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead><tr style={{ background: C.bg }}>
              {['Khách hàng', 'Nhóm sở thích', 'Voucher', 'Lần cuối đến', 'Trạng thái'].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 1 && i <= 3 ? 'center' : 'left', padding: '11px 14px', fontSize: 12, color: C.textSub, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ padding: 36, textAlign: 'center', color: C.textSub }}>Đang tải…</td></tr>
                : rows.length === 0 ? <tr><td colSpan={5} style={{ padding: 36, textAlign: 'center', color: C.textSub }}>{tab === 'du_kien' ? 'Chưa có khách chốt — bấm "Chốt 50 ngày mai".' : 'Chưa gửi voucher nào.'}</td></tr>
                : rows.map((r) => {
                  const ng = NHOM[r.nhom_so_thich] || { t: r.nhom_so_thich, c: C.textMute }
                  const tt = TT[r.trang_thai] || { t: r._preview ? 'Dự kiến' : (r.trang_thai || '—'), c: r._preview ? C.gold : C.textMute }
                  return (
                    <tr key={r.id || r.khach_hang_id} style={{ borderTop: `1px solid ${C.borderLight || C.border}` }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontFamily: FONT.serif, fontWeight: 600, fontSize: 14, color: C.text }}>{r.ho_ten || 'Khách'}</div>
                        <div style={{ fontSize: 12, color: C.textSub }}>{r.so_dien_thoai || '—'}</div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: `${ng.c}1A`, color: ng.c }}>{ng.t} −{r.phan_tram || NHOM[r.nhom_so_thich] && ''}{r.phan_tram ? '%' : ''}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: C.taiSan }}>{r.voucher_code || '(chốt mới sinh)'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12.5, color: C.textSub }}>{r.nam_lan_cuoi} · {r.so_ngay_vang}n</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 12, fontWeight: 700, color: tt.c }}>{tt.t}</span></td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}

// ── Mời Khách Lẻ Quay Lại (GĐ3) ──
function KhachLePage() {
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('du_kien')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const s = await supabase.functions.invoke('moi-khach-le', { body: { mode: 'stats' } })
        if (alive) setStats(s.data || null)
        if (tab === 'du_kien') {
          const { data: chot } = await supabase.from('le_hang_doi').select('*').eq('trang_thai', 'da_chot').order('so_don', { ascending: false })
          if (chot && chot.length) { if (alive) setRows(chot) }
          else {
            const p = await supabase.functions.invoke('moi-khach-le', { body: { mode: 'preview' } })
            if (alive) setRows((p.data?.danh_sach || []).map(r => ({ ...r, _preview: true })))
          }
        } else {
          const { data } = await supabase.from('le_hang_doi').select('*').neq('trang_thai', 'da_chot').order('gui_luc', { ascending: false }).limit(500)
          if (alive) setRows(data || [])
        }
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [tab, nonce])

  async function chot() {
    setBusy(true)
    try {
      const r = await supabase.functions.invoke('moi-khach-le', { body: { mode: 'chot' } })
      if (r.data?.ok) notify(`Đã chốt ${r.data.da_chot} khách lẻ cho ngày mai`, 'success'); else notify('Chốt lỗi', 'error')
      setNonce(n => n + 1)
    } catch (e) { notify(String(e.message || e), 'error') } finally { setBusy(false) }
  }
  async function gui() {
    if (!window.confirm('Gửi tin mời quay lại cho các khách đã chốt ngay bây giờ?')) return
    setBusy(true)
    try {
      const r = await supabase.functions.invoke('moi-khach-le', { body: { mode: 'gui' } })
      if (r.data?.ok && r.data.da_gui != null) notify(`Đã gửi ${r.data.da_gui}/${r.data.tong_chot}${r.data.loi ? `, ${r.data.loi} lỗi` : ''}`, 'success')
      else notify(r.data?.skipped || 'Chưa gửi được', 'error')
      setTab('da_gui'); setNonce(n => n + 1)
    } catch (e) { notify(String(e.message || e), 'error') } finally { setBusy(false) }
  }

  const NHOM = { cham_soc_da: { t: 'Chăm Sóc Da', c: '#8E44AD' }, thu_gian: { t: 'Thư Giãn', c: '#2D7A4F' }, triet_long: { t: 'Triệt Lông', c: '#C0392B' } }
  const TT = { da_gui: { t: 'Đã gửi', c: '#1A5276' }, gui_loi: { t: '⚠ Lỗi', c: C.chi }, da_den: { t: '✓ Đã đến', c: C.thu } }
  const card = (label, val, sub, color) => (
    <div style={{ flex: 1, minWidth: 170, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || C.text, fontFamily: FONT.serif, marginTop: 2 }}>{val}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.textMute, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'khach-le')} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        {card('Còn lại chưa mời', stats?.con_lai_chua_xu_ly ?? '—', '3.079 khách lẻ tổng', '#16A085')}
        {card('Đã gửi mời', stats?.tong_da_xu_ly ?? '—', `hôm nay ${stats?.hom_nay_gui ?? 0}`, '#1A5276')}
        {card('Khách đã quay lại', stats?.da_den ?? 0, 'đo hiệu quả', C.thu)}
        {card('Lỗi gửi', stats?.loi ?? 0, '', stats?.loi ? C.chi : C.thu)}
      </div>
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '10px 14px', margin: '8px 0 14px', fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        💚 Mỗi tối <b>21:00</b> chốt 50 khách lẻ (ưu tiên khách đến <b>nhiều lần</b> — đã tin tưởng), <b>9h sáng</b> gửi ZNS mời quay lại dùng dịch vụ họ yêu thích. Khách quay lại → tự đánh dấu đã đến.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['du_kien', 'Dự kiến / Đã chốt'], ['da_gui', 'Đã gửi']].map(([k, lb]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT.sans, border: `1px solid ${tab === k ? C.primary : C.border}`, background: tab === k ? C.primary : '#fff', color: tab === k ? '#fff' : C.textSub }}>{lb}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={chot} disabled={busy} style={{ padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: FONT.sans, border: `1px solid ${C.gold}`, background: '#fff', color: '#9a7a2e' }}>{busy ? '…' : '📋 Chốt 50 ngày mai'}</button>
          <button onClick={gui} disabled={busy} style={{ padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: FONT.sans, border: 'none', background: '#16A085', color: '#fff' }}>{busy ? 'Đang gửi…' : '💌 Gửi mời ngay'}</button>
        </div>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead><tr style={{ background: C.bg }}>
              {['Khách hàng', 'Sở thích', 'Số lần đến', 'Lần cuối', 'Trạng thái'].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 1 && i <= 3 ? 'center' : 'left', padding: '11px 14px', fontSize: 12, color: C.textSub, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ padding: 36, textAlign: 'center', color: C.textSub }}>Đang tải…</td></tr>
                : rows.length === 0 ? <tr><td colSpan={5} style={{ padding: 36, textAlign: 'center', color: C.textSub }}>{tab === 'du_kien' ? 'Chưa chốt — bấm "Chốt 50 ngày mai".' : 'Chưa gửi mời nào.'}</td></tr>
                : rows.map((r) => {
                  const ng = NHOM[r.nhom_so_thich] || { t: r.nhom_so_thich, c: C.textMute }
                  const tt = TT[r.trang_thai] || { t: r._preview ? 'Dự kiến' : (r.trang_thai || '—'), c: r._preview ? C.gold : C.textMute }
                  return (
                    <tr key={r.id || r.khach_hang_id} style={{ borderTop: `1px solid ${C.borderLight || C.border}` }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontFamily: FONT.serif, fontWeight: 600, fontSize: 14, color: C.text }}>{r.ho_ten || 'Khách'}</div>
                        <div style={{ fontSize: 12, color: C.textSub }}>{r.so_dien_thoai || '—'}</div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: `${ng.c}1A`, color: ng.c }}>{ng.t}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: r.so_don >= 5 ? C.thu : C.textSub }}>{r.so_don} lần</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12.5, color: C.textSub }}>{r.nam_lan_cuoi} · {r.so_ngay_vang}n</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 12, fontWeight: 700, color: tt.c }}>{tt.t}</span></td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}

// ── Chiến Dịch Tự Động: GỘP 4 trang chiến dịch chủ động về 1 trang 4 tab ──────
// (gộp module 11/07 — anh Nam: 2 nhóm menu Chăm Sóc/Marketing trùng, khó khai thác)
// URL cũ /cham-soc-sau-dich-vu, /cham-soc-lai, /win-back, /khach-le VẪN SỐNG:
// router bên dưới trỏ chúng vào đây với tab tương ứng — link cũ/bookmark không vỡ.
const AUTO_TABS = [
  { key: 'aftercare',    label: '💆 Sau Dịch Vụ',       path: '/admin/marketing/cham-soc-sau-dich-vu', hint: 'Khách vừa đến hôm qua — AI soạn tin hỏi thăm' },
  { key: 'cham-soc-lai', label: '🎫 Chăm Sóc Lại (Thẻ)', path: '/admin/marketing/cham-soc-lai',         hint: 'Còn buổi thẻ, lâu chưa quay lại — ZNS 9h sáng' },
  { key: 'winback',      label: '🧊 Win-back Voucher',   path: '/admin/marketing/win-back',             hint: 'Khách lạnh >90 ngày — voucher mã riêng 9h15' },
  { key: 'khach-le',     label: '🚶 Mời Khách Lẻ',       path: '/admin/marketing/khach-le',             hint: 'Khách lẻ >30 ngày chưa lại — mời 9h30' },
]

export function AutoCampaignsPage({ initialTab }) {
  const [tab, setTab] = useState(initialTab || 'aftercare')
  const active = AUTO_TABS.find(t => t.key === tab) || AUTO_TABS[0]
  const chooseTab = (t) => {
    setTab(t.key)
    // Giữ URL đồng bộ tab để F5/chia sẻ link mở lại đúng tab (không reload trang)
    window.history.replaceState(null, '', t.path)
  }
  return (
    <div>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,247,244,.96)', backdropFilter: 'blur(6px)',
        borderBottom: `1px solid ${C.border}`, padding: '10px clamp(16px, 2vw, 28px) 0',
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 850, letterSpacing: '.14em', textTransform: 'uppercase', color: C.textMute, marginBottom: 6 }}>
          🤖 Chiến Dịch Tự Động — 4 luồng chăm khách chạy mỗi sáng
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {AUTO_TABS.map(t => (
            <button key={t.key} onClick={() => chooseTab(t)} title={t.hint}
              style={{
                padding: '9px 16px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                borderRadius: '10px 10px 0 0', fontFamily: FONT.sans, fontSize: 13, fontWeight: 750,
                background: t.key === active.key ? '#fff' : 'transparent',
                color: t.key === active.key ? C.text : C.textSub,
                borderBottom: t.key === active.key ? '2.5px solid #C9A96E' : '2.5px solid transparent',
                boxShadow: t.key === active.key ? '0 -4px 14px rgba(139,94,60,.08)' : 'none',
              }}>{t.label}</button>
          ))}
        </div>
      </div>
      {active.key === 'aftercare' && <AfterCarePage />}
      {active.key === 'cham-soc-lai' && <ChamSocLaiPage />}
      {active.key === 'winback' && <WinbackPage />}
      {active.key === 'khach-le' && <KhachLePage />}
    </div>
  )
}
