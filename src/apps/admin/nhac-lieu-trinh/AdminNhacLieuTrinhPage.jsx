import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, FONT, RADIUS } from '../../../constants/colors'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'

// Nhắc thẻ liệu trình tự động — khách còn buổi nhưng lâu chưa quay lại.
// Nguồn: view v_nhac_lieu_trinh. Soạn lời nhắc + gửi qua edge function `nhac-lieu-trinh`.

const fmtDate = (v) => {
  if (!v) return '—'
  const [y, m, d] = String(v).slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : String(v)
}
const fmtMoney = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫'

const TT_LABEL = {
  theo_doi: { text: 'Đang theo dõi', tone: 'info' },
  da_quay_lai: { text: 'Đã quay lại', tone: 'success' },
  tam_dung: { text: 'Tạm dừng', tone: 'neutral' },
  hoan_thanh: { text: 'Hoàn thành', tone: 'success' },
}

const FILTERS = [
  { key: 'den_han', label: 'Đến hạn nhắc' },
  { key: 'theo_doi', label: 'Đang theo dõi' },
  { key: 'da_quay_lai', label: 'Đã quay lại' },
  { key: 'tam_dung', label: 'Đã bỏ chăm' },
  { key: 'all', label: 'Tất cả' },
]

// Phân nhóm dịch vụ theo từ khóa trong tên thẻ
const SERVICE_GROUPS = [
  { key: 'all', label: 'Tất cả dịch vụ' },
  { key: 'triet', label: 'Triệt lông', kw: ['triệt'] },
  { key: 'massage', label: 'Massage / Trị liệu', kw: ['massage', 'cổ vai gáy', 'body', 'thải độc', 'ngâm chân', 'trị liệu', 'thư giãn'] },
  { key: 'giam_beo', label: 'Giảm béo', kw: ['giảm béo', 'giảm mỡ', 'tan mỡ', 'giảm cân'] },
  { key: 'da', label: 'Chăm sóc da / Trẻ hóa', kw: ['trẻ hóa', 'chăm sóc da', 'rf', 'hifu', 'aqua', 'ánh sáng', 'mụn', 'nám', 'collagen', 'meso', 'bắn', 'căng bóng', 'phục hồi', 'thải chì', 'cấy'] },
  { key: 'tam_trang', label: 'Tắm trắng', kw: ['tắm trắng', 'trắng da', 'tắm'] },
  { key: 'khac', label: 'Khác' },
]
function matchGroup(ten, key) {
  if (key === 'all') return true
  const t = (ten || '').toLowerCase()
  if (key === 'khac') return !SERVICE_GROUPS.filter(g => g.kw).some(g => g.kw.some(k => t.includes(k)))
  const g = SERVICE_GROUPS.find(x => x.key === key)
  return !!g?.kw?.some(k => t.includes(k))
}

export default function AdminNhacLieuTrinhPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('den_han')
  const [serviceGroup, setServiceGroup] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  const [openCard, setOpenCard] = useState(null)   // thẻ đang soạn nhắc
  const [aiLoading, setAiLoading] = useState(false)
  const [draft, setDraft] = useState('')           // nội dung tin nhắn (sửa được)
  const [staffHint, setStaffHint] = useState('')   // gợi ý cho nhân viên
  const [sending, setSending] = useState(false)

  const [selectedIds, setSelectedIds] = useState(() => new Set())   // thẻ được tick để gửi hàng loạt
  const [batch, setBatch] = useState(null)         // tiến độ gửi hàng loạt {running,done,total,ok,fail}

  useEffect(() => { load() }, [])

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2600) }

  async function load() {
    setLoading(true); setErr('')
    try {
      const { data, error } = await supabase
        .from('v_nhac_lieu_trinh')
        .select('*')
        .order('den_han_nhac', { ascending: false })
        .order('so_ngay_vang', { ascending: false })
        .limit(2000)
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setErr(e.message || 'Không tải được danh sách thẻ liệu trình.')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => ({
    tong: rows.length,
    den_han: rows.filter(r => r.den_han_nhac).length,
    quay_lai: rows.filter(r => r.trang_thai_cham_soc === 'da_quay_lai' || r.da_quay_lai_sau_nhac).length,
    tam_dung: rows.filter(r => r.trang_thai_cham_soc === 'tam_dung').length,
  }), [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (filter === 'den_han') list = list.filter(r => r.den_han_nhac)
    else if (filter === 'theo_doi') list = list.filter(r => r.trang_thai_cham_soc === 'theo_doi')
    else if (filter === 'da_quay_lai') list = list.filter(r => r.trang_thai_cham_soc === 'da_quay_lai' || r.da_quay_lai_sau_nhac)
    else if (filter === 'tam_dung') list = list.filter(r => r.trang_thai_cham_soc === 'tam_dung')
    if (serviceGroup !== 'all') list = list.filter(r => matchGroup(r.ten_dich_vu, serviceGroup))
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(r =>
      (r.ho_ten || '').toLowerCase().includes(q) ||
      (r.so_dien_thoai || '').includes(q) ||
      (r.ten_dich_vu || '').toLowerCase().includes(q))
    // Ưu tiên khách 2026 lên đầu (theo năm mua thẻ giảm dần), rồi khách vắng lâu hơn
    return [...list].sort((a, b) => {
      const ya = String(a.ngay_mua || '').slice(0, 4), yb = String(b.ngay_mua || '').slice(0, 4)
      if (ya !== yb) return yb.localeCompare(ya)
      return (b.so_ngay_vang || 0) - (a.so_ngay_vang || 0)
    })
  }, [rows, filter, serviceGroup, search])

  async function openSoanNhac(card) {
    setOpenCard(card); setDraft(''); setStaffHint(''); setAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('nhac-lieu-trinh', { body: { mode: 'suggest', the_id: card.the_id } })
      if (error) throw error
      if (data?.ok) {
        setDraft(data.tin_nhan || '')
        setStaffHint(data.goi_y_nhan_vien || '')
      } else {
        setDraft(fallbackText(card))
      }
    } catch {
      setDraft(fallbackText(card))
    } finally {
      setAiLoading(false)
    }
  }

  function fallbackText(card) {
    return `Hannah Spa thân gửi chị ${card.ho_ten || ''}! Thẻ ${card.ten_dich_vu} của mình vẫn còn ${card.so_buoi_con_lai} buổi. Mình sắp xếp ghé lại để Hannah chăm sóc tiếp nhé, chị muốn hẹn ngày nào ạ? 🌸`
  }

  // ── Chọn / gửi hàng loạt ──
  function toggleSelect(id) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function chonNhomAm() {   // tick nhanh nhóm còn ấm: đến hạn + vắng < 30 ngày
    const ids = filtered.filter(r => r.den_han_nhac && (r.so_ngay_vang || 0) < 30 && r.so_dien_thoai).map(r => r.the_id)
    setSelectedIds(new Set(ids))
    showToast(`Đã chọn ${ids.length} khách còn ấm (vắng < 30 ngày)`)
  }
  function boChon() { setSelectedIds(new Set()) }

  async function guiHangLoat() {
    const cards = filtered.filter(r => selectedIds.has(r.the_id) && r.so_dien_thoai)
    if (!cards.length) { showToast('Chưa chọn khách nào có SĐT'); return }
    if (!window.confirm(`Gửi ZNS mời quay lại cho ${cards.length} khách?\nMỗi tin tốn phí ZNS — chỉ bấm OK khi đã duyệt danh sách.`)) return
    setBatch({ running: true, done: 0, total: cards.length, ok: 0, fail: 0 })
    let ok = 0, fail = 0
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]
      try {
        const { data, error } = await supabase.functions.invoke('nhac-lieu-trinh', {
          body: { mode: 'send', the_id: c.the_id, kenh: 'zns', noi_dung: fallbackText(c) },
        })
        if (error) throw error
        if (data?.ket_qua === 'da_gui') ok++; else fail++
      } catch { fail++ }
      setBatch({ running: true, done: i + 1, total: cards.length, ok, fail })
    }
    setBatch({ running: false, done: cards.length, total: cards.length, ok, fail })
    showToast(`Đã gửi ${ok}/${cards.length} khách${fail ? ` · ${fail} chưa gửi được` : ''}`)
    setSelectedIds(new Set())
    await load()
    setTimeout(() => setBatch(null), 6000)
  }

  async function ghiNhan(card, kenh) {
    if (!draft.trim()) { showToast('Chưa có nội dung nhắc'); return }
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('nhac-lieu-trinh', {
        body: { mode: 'send', the_id: card.the_id, kenh, noi_dung: draft },
      })
      if (error) throw error
      if (kenh === 'zns' && data?.ket_qua !== 'da_gui') {
        showToast('ZNS chưa gửi được (chờ nạp tiền ZBS) — đã ghi nhận để gửi thủ công')
      } else {
        showToast(kenh === 'zns' ? 'Đã gửi ZNS + ghi nhận' : 'Đã ghi nhận nhắc khách')
      }
      setOpenCard(null)
      await load()
    } catch (e) {
      showToast(e.message || 'Lỗi ghi nhận')
    } finally {
      setSending(false)
    }
  }

  async function doiTrangThai(card, trang_thai) {
    try {
      const { error } = await supabase.functions.invoke('nhac-lieu-trinh', {
        body: { mode: 'mark', the_id: card.the_id, trang_thai },
      })
      if (error) throw error
      showToast(trang_thai === 'da_quay_lai' ? 'Đã đánh dấu khách quay lại' : trang_thai === 'tam_dung' ? 'Đã tạm dừng nhắc' : 'Đã cập nhật')
      setOpenCard(null)
      await load()
    } catch (e) {
      showToast(e.message || 'Lỗi cập nhật')
    }
  }

  async function copyText(t) {
    try { await navigator.clipboard?.writeText(t || '') ; showToast('Đã chép nội dung') } catch { showToast('Không chép được') }
  }

  return (
    <div>
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">🎫 Nhắc Thẻ Liệu Trình</div>
          <div className="sub">Khách còn buổi nhưng lâu chưa quay lại — nhắc đúng nhịp, kịch bản AI sale chéo</div>
        </div>
        <div className="acts">
          <button className="btn ghost" onClick={load} disabled={loading}>{loading ? 'Đang tải...' : 'Làm mới'}</button>
        </div>
      </div>

      {err && (
        <div style={{ background: '#FDEDEC', color: C.chi, padding: 14, borderRadius: RADIUS.md, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
          {err}
          <div style={{ fontWeight: 400, color: C.textSub, marginTop: 4 }}>Nếu thiếu bảng/view: cần chạy migration <b>115_nhac_lieu_trinh.sql</b> trên database VPS.</div>
        </div>
      )}

      {/* Thống kê */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard label="Thẻ đang theo dõi" value={stats.tong} color={C.taiSan} />
        <StatCard label="Đến hạn nhắc" value={stats.den_han} color={C.warn} highlight />
        <StatCard label="Đã quay lại" value={stats.quay_lai} color={C.thu} />
        <StatCard label="Đã bỏ chăm" value={stats.tam_dung} color={C.textSub} />
      </div>

      {/* Filter + search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const n = f.key === 'den_han' ? stats.den_han
              : f.key === 'theo_doi' ? rows.filter(r => r.trang_thai_cham_soc === 'theo_doi').length
              : f.key === 'da_quay_lai' ? stats.quay_lai
              : f.key === 'tam_dung' ? stats.tam_dung
              : rows.length
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={tabBtn(filter === f.key)}>
                {f.label} <span style={{ opacity: .6 }}>· {n}</span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={serviceGroup} onChange={e => setServiceGroup(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: RADIUS.full, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: FONT.sans, background: C.card, color: C.text, cursor: 'pointer' }}
          >
            {SERVICE_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tên, SĐT, dịch vụ..."
            style={{ padding: '9px 14px', borderRadius: RADIUS.full, border: `1px solid ${C.border}`, fontSize: 13, width: 240, maxWidth: '100%', outline: 'none', fontFamily: FONT.sans }}
          />
        </div>
      </div>

      {/* Thanh gửi hàng loạt — duyệt rồi gửi cho nhóm còn ấm trước */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: RADIUS.md }}>
        <button onClick={chonNhomAm} style={tabBtn(false)}>☀️ Chọn nhóm còn ấm (vắng &lt; 30 ngày)</button>
        {selectedIds.size > 0 && (
          <button onClick={boChon} style={{ padding: '8px 14px', borderRadius: RADIUS.full, border: `1px solid ${C.border}`, background: C.card, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT.sans }}>Bỏ chọn ({selectedIds.size})</button>
        )}
        <div style={{ flex: 1 }} />
        {batch && (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: batch.running ? C.warn : C.thu }}>
            {batch.running ? `Đang gửi… ${batch.done}/${batch.total}` : `Đã gửi ${batch.ok}/${batch.total}${batch.fail ? ` · ${batch.fail} lỗi` : ''}`}
          </span>
        )}
        <Button disabled={selectedIds.size === 0 || batch?.running} onClick={guiHangLoat}>
          {batch?.running ? `Đang gửi ${batch.done}/${batch.total}…` : `📨 Gửi ZNS hàng loạt (${selectedIds.size})`}
        </Button>
      </div>

      {/* Bảng */}
      <div style={{ background: C.card, borderRadius: RADIUS.lg, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr>
                {['', 'Khách hàng', 'Thẻ liệu trình', 'Buổi còn', 'Lần dùng thẻ gần nhất', 'Nhịp nhắc', 'Trạng thái', ''].map((h, i) => (
                  <th key={i} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.textSub }}>Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.textSub }}>Không có thẻ nào trong nhóm này 🌿</td></tr>
              ) : filtered.map(r => {
                const tt = TT_LABEL[r.trang_thai_cham_soc] || TT_LABEL.theo_doi
                return (
                  <tr key={r.the_id} style={{ borderTop: `1px solid ${C.borderLight}`, background: selectedIds.has(r.the_id) ? `${C.primary}0A` : 'transparent' }}>
                    <td style={{ ...td, textAlign: 'center', width: 40 }}>
                      <input type="checkbox" checked={selectedIds.has(r.the_id)} disabled={!r.so_dien_thoai}
                        onChange={() => toggleSelect(r.the_id)} title={r.so_dien_thoai ? 'Chọn gửi ZNS' : 'Khách chưa có SĐT'}
                        style={{ width: 17, height: 17, cursor: r.so_dien_thoai ? 'pointer' : 'not-allowed', accentColor: C.primary }} />
                    </td>
                    <td style={td}>
                      <div style={{ fontFamily: FONT.serif, fontWeight: 600, fontSize: 14, color: C.text }}>{r.ho_ten || 'Khách lẻ'}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{r.so_dien_thoai || '—'}</div>
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: 13, color: C.text }}>{r.ten_dich_vu}</div>
                      <div style={{ fontSize: 11.5, color: C.textMute }}>Mua {fmtDate(r.ngay_mua)}{r.ngay_het_han ? ` · HH ${fmtDate(r.ngay_het_han)}` : ''}</div>
                    </td>
                    <td style={td}>
                      <span style={{ fontWeight: 700, color: C.primary }}>{r.so_buoi_con_lai}</span>
                      <span style={{ color: C.textMute }}>/{r.so_buoi_tong}</span>
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{fmtDate(r.lan_dung_gan_nhat)}</div>
                      {r.so_ngay_vang != null && (
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: r.so_ngay_vang >= 30 ? C.chi : r.so_ngay_vang >= 10 ? C.warn : C.textSub }}>
                          {r.so_ngay_vang} ngày trước
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 13 }}>{r.so_lan_nhac || 0} lần</span>
                      {r.ngay_nhac_cuoi && <div style={{ fontSize: 11, color: C.textMute }}>gần nhất {fmtDate(r.ngay_nhac_cuoi)}</div>}
                    </td>
                    <td style={td}>
                      <Badge tone={tt.tone}>{tt.text}</Badge>
                      {r.den_han_nhac && <div style={{ marginTop: 4 }}><Badge tone="warning">⏰ Đến hạn</Badge></div>}
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button size="sm" onClick={() => openSoanNhac(r)}>Soạn nhắc</Button>
                      {r.trang_thai_cham_soc !== 'tam_dung' && (
                        <button
                          onClick={() => doiTrangThai(r, 'tam_dung')}
                          title="Bỏ khỏi danh sách chăm sóc"
                          style={{ marginLeft: 6, padding: '7px 12px', borderRadius: RADIUS.full, border: `1px solid ${C.border}`, background: C.card, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT.sans }}
                        >Bỏ</button>
                      )}
                      {r.trang_thai_cham_soc === 'tam_dung' && (
                        <button
                          onClick={() => doiTrangThai(r, 'theo_doi')}
                          title="Đưa lại vào danh sách chăm sóc"
                          style={{ marginLeft: 6, padding: '7px 12px', borderRadius: RADIUS.full, border: `1px solid ${C.border}`, background: C.card, color: C.thu, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT.sans }}
                        >Khôi phục</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 11.5, color: C.textMute, lineHeight: 1.6 }}>
🤖 <b>Tự động:</b> cứ ~10 ngày kể từ lần khách <b>dùng buổi thẻ</b>, nếu chưa quay lại hệ thống tự nhắc qua Zalo (ZNS) lúc 9h sáng — nhân viên KHÔNG cần thao tác. Khi khách dùng buổi mới, bộ đếm tự reset. Nút Gọi/Zalo/Soạn nhắc bên dưới chỉ dùng khi muốn chăm sóc thủ công thêm hoặc cá nhân hóa lời mời (AI gợi ý kịch bản sale chéo theo nhịp).
      </div>

      {/* Modal soạn nhắc */}
      <Modal
        open={!!openCard}
        onClose={() => setOpenCard(null)}
        title={openCard ? `Nhắc ${openCard.ho_ten || 'khách'}` : ''}
        subtitle={openCard ? `${openCard.ten_dich_vu} · còn ${openCard.so_buoi_con_lai} buổi · dùng gần nhất ${fmtDate(openCard.lan_dung_gan_nhat)} (${openCard.so_ngay_vang ?? '—'} ngày trước) · nhịp ${(openCard.so_lan_nhac || 0) + 1}` : ''}
        icon="💌"
        size="lg"
        footer={openCard && (
          <>
            <Button variant="ghost" onClick={() => doiTrangThai(openCard, 'da_quay_lai')}>✓ Đã quay lại</Button>
            <Button variant="ghost" onClick={() => doiTrangThai(openCard, 'tam_dung')}>Tạm dừng</Button>
            <Button variant="secondary" onClick={() => copyText(draft)}>Chép</Button>
            <Button variant="success" disabled={sending} onClick={() => ghiNhan(openCard, 'thu_cong')}>Đã nhắn/gọi</Button>
            <Button disabled={sending} onClick={() => ghiNhan(openCard, 'zns')}>Gửi ZNS</Button>
          </>
        )}
      >
        {openCard && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <a href={`tel:${openCard.so_dien_thoai || ''}`} style={miniBtn}>📞 Gọi {openCard.so_dien_thoai}</a>
              <a href={`https://zalo.me/${(openCard.phone_norm || openCard.so_dien_thoai || '').replace(/^84/, '0')}`} target="_blank" rel="noreferrer" style={miniBtn}>💬 Mở Zalo</a>
            </div>

            <label style={lbl}>Nội dung tin nhắn {aiLoading && <span style={{ color: C.gold }}>· AI đang soạn...</span>}</label>
            <textarea
              value={draft} onChange={e => setDraft(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: 12, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, fontSize: 13.5, fontFamily: FONT.sans, color: C.text, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
            />

            {staffHint && (
              <div style={{ marginTop: 12, background: 'rgba(201,169,110,0.10)', border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Gợi ý cho nhân viên</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{staffHint}</div>
              </div>
            )}

            {openCard.kich_ban_cuoi && (
              <div style={{ marginTop: 12, fontSize: 12, color: C.textMute }}>
                Lần nhắc trước ({fmtDate(openCard.ngay_nhac_cuoi)}): {openCard.kich_ban_cuoi}
              </div>
            )}
          </div>
        )}
      </Modal>

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', background: C.espresso, color: '#f5ede0', borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 13, zIndex: 200000, boxShadow: C.shadowLg }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, highlight }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${highlight ? color + '55' : C.border}`, borderRadius: RADIUS.lg, padding: '16px 18px', boxShadow: C.shadowSm }}>
      <div style={{ fontSize: 11.5, color: C.textSub, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: FONT.serif }}>{value}</div>
    </div>
  )
}

const th = { padding: '11px 14px', fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '.04em', background: '#FAF8F5', borderBottom: `1px solid ${C.border}`, textAlign: 'left', whiteSpace: 'nowrap' }
const td = { padding: '12px 14px', fontSize: 13, color: C.text, verticalAlign: 'top' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }
const miniBtn = { padding: '7px 14px', borderRadius: RADIUS.full, background: C.bg, border: `1px solid ${C.border}`, fontSize: 12.5, fontWeight: 600, color: C.primary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }

function tabBtn(active) {
  return {
    padding: '7px 14px', borderRadius: RADIUS.full, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? 'transparent' : C.border}`,
    background: active ? C.grad : C.card, color: active ? '#fff' : C.textSub,
    fontFamily: FONT.sans, whiteSpace: 'nowrap',
  }
}
