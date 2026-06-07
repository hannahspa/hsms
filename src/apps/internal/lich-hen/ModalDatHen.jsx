import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { posService } from '../../../services/posService'
import { todayISO, getNowVN } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import { C, fmtDate, dayOfWeek, shortName, GIO_LIST_15, normalizePhone, dedupeHints, removeAccent } from './lichHenShared'

const safeSearchTerm = (value) => String(value || '')
  .replace(/[,%()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

// ══════════════════════════════════════════════════════════
// Modal đặt / sửa lịch hẹn — tách từ LichHenPage.jsx (Phase 2). Không đổi logic.
// ══════════════════════════════════════════════════════════
export default function ModalDatHen({ initial, ktvList, onSave, onClose, user }) {
  const [form, setForm] = useState(initial || {
    ten_khach: '', sdt_khach: '', ten_dich_vu: '', dich_vu_id: null, the_lieu_trinh_id: null, nhan_vien_id: null,
    thoi_luong_phut: 60, ngay_hen: todayISO(), gio_hen: '10:00', ghi_chu: '', dich_vu_list: [],
  })
  // Dịch vụ THÊM (KTV khác phụ trách) — khách đặt nhiều dịch vụ với nhiều KTV
  const dvThem = Array.isArray(form.dich_vu_list) ? form.dich_vu_list : []
  const addDvThem = () => set('dich_vu_list', [...dvThem, { ten_dich_vu: '', dich_vu_id: null, nhan_vien_id: null }])
  const updDvThem = (i, patch) => set('dich_vu_list', dvThem.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const delDvThem = (i) => set('dich_vu_list', dvThem.filter((_, idx) => idx !== i))
  const [dichVuList, setDichVuList] = useState([])
  const [custCards, setCustCards] = useState([])   // thẻ liệu trình active của khách đang chọn
  const [saving, setSaving] = useState(false)
  const [showNgay, setShowNgay] = useState(false)
  const [customerHints, setCustomerHints] = useState([])
  const [hintLoading, setHintLoading] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [showDvList, setShowDvList] = useState(false)
  const [chuaChonDV, setChuaChonDV] = useState(() => initial?.ten_dich_vu === 'Khách chọn sau')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Tải thẻ liệu trình ACTIVE còn buổi của khách đang chọn → cho bấm chọn nhanh
  useEffect(() => {
    if (!form.khach_hang_id) { setCustCards([]); return undefined }
    let alive = true
    const today = todayISO()
    supabase.from('the_lieu_trinh')
      .select('id, ten_dich_vu, so_buoi_con_lai, so_buoi_tong, gia_tri_the, trang_thai, ngay_het_han')
      .eq('khach_hang_id', form.khach_hang_id).eq('trang_thai', 'active')
      .then(({ data }) => {
        if (!alive) return
        // Loại thẻ HẾT BUỔI + HẾT HẠN cho gọn
        setCustCards((data || []).filter(c =>
          (c.so_buoi_con_lai || 0) > 0 && (!c.ngay_het_han || c.ngay_het_han >= today)
        ))
      })
    return () => { alive = false }
  }, [form.khach_hang_id])

  // Chọn thẻ liệu trình → điền dịch vụ + đánh dấu dùng thẻ
  const selectCard = (card) => setForm(f => ({
    ...f, the_lieu_trinh_id: card.id, ten_dich_vu: card.ten_dich_vu, dich_vu_id: null,
  }))

  // Giờ hẹn realtime: nếu đặt cho HÔM NAY thì chỉ hiện các giờ SAU giờ hiện tại
  const henToday = form.ngay_hen === todayISO()
  const nowMinNow = (() => { const d = getNowVN(); return d.getHours() * 60 + d.getMinutes() })()
  const gioOptions = GIO_LIST_15.filter(g => {
    if (!henToday) return true
    const [h, m] = g.split(':').map(Number)
    return h * 60 + m > nowMinNow
  })
  // Tự nhảy về giờ hợp lệ đầu tiên khi giờ đang chọn đã qua (chỉ đơn mới, không sửa đơn cũ)
  useEffect(() => {
    if (initial?.id) return
    const isT = form.ngay_hen === todayISO()
    if (!isT) return
    const d = getNowVN(); const nm = d.getHours() * 60 + d.getMinutes()
    const opts = GIO_LIST_15.filter(g => { const [h, mm] = g.split(':').map(Number); return h * 60 + mm > nm })
    if (opts.length && !opts.includes(form.gio_hen)) setForm(f => ({ ...f, gio_hen: opts[0] }))
  }, [form.ngay_hen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lọc dịch vụ theo từ khoá (bỏ dấu) — gõ "co vai" ra "Cổ Vai..."
  const dvFiltered = (() => {
    const kw = removeAccent(form.ten_dich_vu)
    const base = kw ? dichVuList.filter(d => removeAccent(d.ten).includes(kw)) : dichVuList
    return base.slice(0, 8)
  })()

  useEffect(() => {
    supabase.from('dich_vu').select('id, ten, thoi_gian_phut, danh_muc').eq('is_active', true).order('ten').then(({ data }) => setDichVuList(data || []))
  }, [])

  useEffect(() => {
    const phone = normalizePhone(form.sdt_khach)
    const name = String(form.ten_khach || '').trim()
    const term = safeSearchTerm(phone.length >= 3 ? phone : name)
    if (term.length < 3) {
      setCustomerHints([])
      setHintLoading(false)
      return undefined
    }

    let alive = true
    const timer = setTimeout(async () => {
      setHintLoading(true)
      try {
        const [khRes, henRes] = await Promise.all([
          supabase
            .from('khach_hang')
            .select('id, ho_ten, so_dien_thoai, lan_cuoi_den')
            .or(`ho_ten.ilike.%${term}%,so_dien_thoai.ilike.%${term}%`)
            .order('lan_cuoi_den', { ascending: false, nullsFirst: false })
            .limit(12),
          supabase
            .from('lich_hen')
            .select('id, khach_hang_id, ten_khach, sdt_khach, ten_dich_vu, ngay_hen, gio_hen, trang_thai')
            .or(`ten_khach.ilike.%${term}%,sdt_khach.ilike.%${term}%`)
            .order('ngay_hen', { ascending: false })
            .limit(12),
        ])
        if (!alive) return

        const hints = [
          ...(khRes.data || []).map(kh => ({
            source: 'crm',
            khach_hang_id: kh.id,
            ten_khach: kh.ho_ten || '',
            sdt_khach: kh.so_dien_thoai || '',
            note: kh.lan_cuoi_den ? `CRM · lần cuối ${fmtDate(kh.lan_cuoi_den)}` : 'CRM khách hàng',
          })),
          ...(henRes.data || []).map(h => ({
            source: 'appointment',
            khach_hang_id: h.khach_hang_id || null,
            ten_khach: h.ten_khach || '',
            sdt_khach: h.sdt_khach || '',
            ten_dich_vu: h.ten_dich_vu || '',
            note: `Lịch hẹn ${fmtDate(h.ngay_hen)} ${String(h.gio_hen || '').slice(0, 5)}${h.ten_dich_vu ? ` · ${h.ten_dich_vu}` : ''}`,
          })),
        ].filter(h => h.ten_khach || h.sdt_khach)

        setCustomerHints(dedupeHints(hints).slice(0, 10))
      } catch {
        if (alive) setCustomerHints([])
      } finally {
        if (alive) setHintLoading(false)
      }
    }, 220)

    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [form.sdt_khach, form.ten_khach])

  const handleSelectHint = hint => {
    setForm(f => ({
      ...f,
      khach_hang_id: hint.khach_hang_id || f.khach_hang_id || null,
      ten_khach: hint.ten_khach || f.ten_khach,
      sdt_khach: hint.sdt_khach || f.sdt_khach,
      ten_dich_vu: f.ten_dich_vu || hint.ten_dich_vu || '',
    }))
    setCustomerHints([])
  }

  const handleSave = async () => {
    if (!form.ten_khach.trim()) return alert('Vui lòng nhập tên khách')
    // Bắt buộc ít nhất 1 dịch vụ (tránh để trống)
    const coDichVu = (form.ten_dich_vu || '').trim() || form.dich_vu_id || form.the_lieu_trinh_id
      || dvThem.some(r => r.dich_vu_id || (r.ten_dich_vu || '').trim())
    if (!chuaChonDV && !coDichVu) return alert('⚠️ Vui lòng chọn ít nhất 1 DỊCH VỤ — hoặc tích "Khách chọn dịch vụ sau"')
    setSaving(true)
    try {
      const dvThemSaved = dvThem.filter(r => r.dich_vu_id || (r.ten_dich_vu || '').trim())
      const tongThoiLuong = (+form.thoi_luong_phut || 60) + dvThemSaved.reduce((s, r) => s + (+r.thoi_luong || 0), 0)
      const payload = {
        ten_khach: form.ten_khach.trim(), sdt_khach: form.sdt_khach?.trim() || null,
        khach_hang_id: form.khach_hang_id || null,
        dich_vu_id: chuaChonDV ? null : (form.dich_vu_id || null),
        ten_dich_vu: chuaChonDV ? 'Khách chọn sau' : (form.ten_dich_vu?.trim() || null),
        the_lieu_trinh_id: form.the_lieu_trinh_id || null,
        nhan_vien_id: form.nhan_vien_id || null,
        thoi_luong_phut: tongThoiLuong, ngay_hen: form.ngay_hen, gio_hen: form.gio_hen,
        ghi_chu: form.ghi_chu?.trim() || null, nguoi_nhap: user?.email || user?.ho_ten || 'Lễ Tân',
        dich_vu_list: dvThemSaved,
      }
      if (initial?.id) await supabase.from('lich_hen').update(payload).eq('id', initial.id)
      else { payload.trang_thai = 'cho_xac_nhan'; await supabase.from('lich_hen').insert(payload) }

      // Thông báo đẩy cho KTV được phân lịch (không chặn lưu nếu lỗi)
      if (payload.nhan_vien_id) {
        const dichVuTxt = payload.ten_dich_vu ? ` · ${payload.ten_dich_vu}` : ''
        supabase.functions.invoke('send-push', {
          body: {
            nhan_vien_id: payload.nhan_vien_id,
            title: '🔔 Bạn có lịch hẹn mới',
            body: `${payload.ten_khach} · ${dayOfWeek(payload.ngay_hen)} ${fmtDate(payload.ngay_hen)} ${String(payload.gio_hen).slice(0, 5)}${dichVuTxt}`,
            url: '/checkin',
          },
        }).catch(() => {})
      }
      onSave()
    } catch (e) { alert('Lỗi lưu lịch hẹn: ' + e.message) } finally { setSaving(false) }
  }

  const handleCreatePosOrder = async () => {
    if (!initial?.id) return
    if (!form.ten_khach.trim()) return alert('Vui lòng nhập tên khách trước khi tạo đơn POS')
    setCreatingOrder(true)
    try {
      const result = await posService.createDraftOrderFromAppointment(
        { ...initial, ...form, id: initial.id },
        { nguoiTao: user?.id }
      )
      window.location.href = `/pos?resume=${result.orderId}`
    } catch (e) {
      alert('Lỗi tạo đơn POS từ lịch hẹn: ' + e.message)
    } finally {
      setCreatingOrder(false)
    }
  }

  const INP = { width: '100%', height: 38, borderRadius: 9, border: `1px solid ${C.line2}`, padding: '0 11px', fontFamily: 'var(--sans)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box', background: '#fdfcfb', color: C.ink }
  const LBL = { fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,29,20,0.45)', backdropFilter: 'blur(3px)', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: C.card, overflowY: 'auto', boxShadow: C.shadowLg, animation: 'rpSlideIn .22s ease' }}>
        <DatePicker open={showNgay} selectedDate={form.ngay_hen} onClose={() => setShowNgay(false)} onConfirm={v => { set('ngay_hen', v); setShowNgay(false) }} />
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: C.espresso }}>
            {initial?.id ? '✏️ Sửa Lịch Hẹn' : '📅 Đặt Lịch Hẹn Mới'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.ink3 }}>✕</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><div style={LBL}>Tên Khách *</div><input style={INP} value={form.ten_khach} onChange={e => set('ten_khach', e.target.value)} placeholder="Tên khách hàng" /></div>
            <div><div style={LBL}>Số Điện Thoại</div><input style={INP} value={form.sdt_khach || ''} onChange={e => set('sdt_khach', e.target.value)} placeholder="Nhập SĐT để tìm khách cũ" inputMode="numeric" /></div>
          </div>

          {(hintLoading || customerHints.length > 0) && (
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, background: '#fffdf9', overflow: 'hidden', marginTop: -4, boxShadow: C.shadow }}>
              {hintLoading && <div style={{ padding: '8px 10px', fontSize: 11.5, color: C.ink3 }}>Đang tìm khách...</div>}
              {!hintLoading && customerHints.map(hint => (
                <button key={`${hint.source}-${hint.khach_hang_id || hint.sdt_khach}-${hint.ten_khach}-${hint.note}`}
                  type="button"
                  onClick={() => handleSelectHint(hint)}
                  style={{
                    width: '100%', border: 'none', borderBottom: `1px solid ${C.line}`,
                    background: '#fff', padding: '9px 11px', textAlign: 'left',
                    cursor: 'pointer', fontFamily: 'var(--sans)', display: 'grid',
                    gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center',
                  }}>
                  <span>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: C.ink }}>{hint.ten_khach || 'Khách chưa rõ tên'}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: C.ink3, marginTop: 2 }}>{hint.sdt_khach || 'Chưa có SĐT'} · {hint.note}</span>
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '3px 8px',
                    color: hint.source === 'crm' ? '#2D7A4F' : '#8a6335',
                    background: hint.source === 'crm' ? 'rgba(45,122,79,.09)' : 'rgba(201,169,110,.16)',
                  }}>
                    {hint.source === 'crm' ? 'CRM' : 'Lịch hẹn'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Thẻ liệu trình của khách — bấm để dùng (trừ đúng thẻ đó khi tạo đơn) */}
          {custCards.length > 0 && (
            <div>
              <div style={LBL}>Thẻ liệu trình của khách · bấm để dùng</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {custCards.map(card => {
                  const active = form.the_lieu_trinh_id === card.id
                  return (
                    <button key={card.id} type="button" onClick={() => selectCard(card)}
                      style={{
                        border: `1.5px solid ${active ? '#2D7A4F' : C.line2}`, borderRadius: 10,
                        background: active ? '#eef5ee' : '#fffdf9', padding: '8px 12px', cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'var(--sans)', minWidth: 150,
                      }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? '#2D7A4F' : C.ink, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {active && '✓'} {card.ten_dich_vu}
                      </div>
                      <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Còn {card.so_buoi_con_lai}/{card.so_buoi_tong} buổi</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <div style={{ ...LBL, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{form.the_lieu_trinh_id ? 'Dịch vụ (dùng thẻ)' : 'Dịch Vụ'}{!chuaChonDV && ' *'}</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 11, color: '#8a6a35', cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
                <input type="checkbox" checked={chuaChonDV} onChange={e => { setChuaChonDV(e.target.checked); if (e.target.checked) { set('ten_dich_vu', ''); set('dich_vu_id', null); set('the_lieu_trinh_id', null); setShowDvList(false) } }} />
                ⏳ Khách chọn dịch vụ sau
              </label>
            </div>
            {chuaChonDV ? (
              <div style={{ padding: '11px 13px', borderRadius: 9, border: `1px dashed ${C.line2}`, background: '#FBF7F2', fontSize: 12.5, color: C.ink2 }}>
                Khách chỉ đặt <b>giữ chỗ theo giờ</b> — dịch vụ sẽ chọn khi khách đến. Lịch sẽ hiện <b>"Khách chọn sau"</b>.
              </div>
            ) : (<>
            <input style={{ ...INP, ...(form.the_lieu_trinh_id ? { borderColor: '#2D7A4F', background: '#f3f8f3' } : {}) }} value={form.ten_dich_vu || ''}
              onChange={e => { set('ten_dich_vu', e.target.value); set('dich_vu_id', null); set('the_lieu_trinh_id', null); setShowDvList(true) }}
              onFocus={() => setShowDvList(true)}
              onBlur={() => setTimeout(() => setShowDvList(false), 150)}
              placeholder="Gõ tên dịch vụ, vd: cổ vai, gội đầu..." />
            {form.the_lieu_trinh_id
              ? <div style={{ fontSize: 11, color: '#2D7A4F', fontWeight: 700, marginTop: 4 }}>🟢 Dùng thẻ liệu trình — khi tạo đơn sẽ trừ thẻ này (0đ)</div>
              : form.dich_vu_id && <div style={{ fontSize: 11, color: '#2D7A4F', fontWeight: 700, marginTop: 4 }}>✓ Dịch vụ trong menu · {form.thoi_luong_phut} phút</div>}
            {showDvList && !form.the_lieu_trinh_id && dvFiltered.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 4, border: `1px solid ${C.line2}`, borderRadius: 10, background: '#fff', boxShadow: C.shadowLg, maxHeight: 240, overflowY: 'auto' }}>
                {dvFiltered.map(dv => (
                  <button type="button" key={dv.id} onMouseDown={e => e.preventDefault()}
                    onClick={() => { set('dich_vu_id', dv.id); set('ten_dich_vu', dv.ten); set('the_lieu_trinh_id', null); set('thoi_luong_phut', dv.thoi_gian_phut || 60); setShowDvList(false) }}
                    style={{ width: '100%', border: 'none', borderBottom: `1px solid ${C.line}`, background: '#fff', padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--sans)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: C.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dv.ten}</span>
                      {dv.danh_muc && <span style={{ display: 'block', fontSize: 10.5, color: C.ink3, marginTop: 1 }}>{dv.danh_muc}</span>}
                    </span>
                    {(dv.thoi_gian_phut || 0) > 0 && <span style={{ fontSize: 11, color: C.ink3, flexShrink: 0 }}>{dv.thoi_gian_phut}p</span>}
                  </button>
                ))}
              </div>
            )}
            </>)}
          </div>

          <div><div style={LBL}>Kỹ Thuật Viên Phụ Trách</div>
            <select value={form.nhan_vien_id || ''} onChange={e => set('nhan_vien_id', e.target.value || null)} style={INP}>
              <option value="">Nhân Viên Bất Kỳ (ai cũng được)</option>
              {ktvList.map(k => <option key={k.id} value={k.id}>{shortName(k.ho_ten)}</option>)}
            </select>
            {ktvList.length === 0 && <div style={{ fontSize: 11, color: C.ink3, marginTop: 4, fontStyle: 'italic' }}>Hôm nay chưa có KTV đi làm — chọn "Nhân Viên Bất Kỳ".</div>}
          </div>

          {/* Dịch vụ THÊM — khách đặt nhiều dịch vụ với KTV khác nhau */}
          <div>
            <div style={{ ...LBL, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Dịch Vụ Thêm (KTV khác phụ trách)</span>
              <button onClick={addDvThem} style={{ padding: '4px 12px', borderRadius: 8, border: `1px solid ${C.gold}`, background: '#fdf3e0', color: '#8a6a35', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>+ Thêm dịch vụ</button>
            </div>
            {dvThem.length === 0
              ? <div style={{ fontSize: 11.5, color: C.ink3, fontStyle: 'italic' }}>Khách yêu cầu nhiều dịch vụ / nhiều KTV thì bấm "+ Thêm dịch vụ".</div>
              : dvThem.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: 8, marginBottom: 7, alignItems: 'center' }}>
                  <select value={r.dich_vu_id || ''} onChange={e => { const dv = dichVuList.find(d => d.id === e.target.value); updDvThem(i, { dich_vu_id: e.target.value || null, ten_dich_vu: dv?.ten || '', thoi_luong: dv?.thoi_gian_phut || 60 }) }} style={{ ...INP, height: 36 }}>
                    <option value="">— Chọn dịch vụ —</option>
                    {dichVuList.map(d => <option key={d.id} value={d.id}>{d.ten}</option>)}
                  </select>
                  <select value={r.nhan_vien_id || ''} onChange={e => updDvThem(i, { nhan_vien_id: e.target.value || null })} style={{ ...INP, height: 36 }}>
                    <option value="">KTV bất kỳ</option>
                    {ktvList.map(k => <option key={k.id} value={k.id}>{shortName(k.ho_ten)}</option>)}
                  </select>
                  <button onClick={() => delDvThem(i)} title="Xoá" style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.line2}`, background: '#fff', color: '#d8654f', fontSize: 16, cursor: 'pointer' }}>×</button>
                </div>
              ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 14 }}>
            <div><div style={LBL}>Ngày Hẹn *</div>
              <button onClick={() => setShowNgay(true)} style={{ ...INP, textAlign: 'left', cursor: 'pointer' }}>
                {form.ngay_hen ? `${dayOfWeek(form.ngay_hen)}, ${fmtDate(form.ngay_hen)}` : 'Chọn ngày'}
              </button>
            </div>
            <div><div style={LBL}>Giờ Hẹn *</div>
              <select value={form.gio_hen} onChange={e => set('gio_hen', e.target.value)} style={INP}>
                {gioOptions.length === 0
                  ? <option value="">Hết giờ làm hôm nay</option>
                  : gioOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div><div style={LBL}>Thời Lượng (DV chính)</div>
              <select value={form.thoi_luong_phut} onChange={e => set('thoi_luong_phut', +e.target.value)} style={INP}>{[15, 30, 45, 60, 90, 120, 150, 180].map(m => <option key={m} value={m}>{m} phút</option>)}</select>
            </div>
          </div>
          {(() => {
            const tong = (+form.thoi_luong_phut || 60) + dvThem.reduce((s, r) => s + (+r.thoi_luong || 0), 0)
            const gioRa = (() => { const [h, m] = (form.gio_hen || '10:00').split(':').map(Number); const t = h * 60 + m + tong; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` })()
            return (
              <div style={{ background: '#FBF7F2', border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ fontWeight: 800, color: C.espresso }}>⏱ Tổng thời gian khách ở spa: {tong >= 60 ? `${Math.floor(tong / 60)}h${tong % 60 ? tong % 60 + "'" : ''}` : `${tong}'`}</span>
                <span style={{ color: C.ink3 }}>({form.gio_hen} → ~{gioRa})</span>
                {dvThem.length > 0 && <span style={{ color: C.ink4, fontSize: 11.5 }}>· gồm {dvThem.length + 1} dịch vụ</span>}
              </div>
            )
          })()}

          <div><div style={LBL}>Ghi Chú</div>
            <textarea value={form.ghi_chu || ''} onChange={e => set('ghi_chu', e.target.value)} placeholder="Yêu cầu đặc biệt, da liễu cần lưu ý..." style={{ ...INP, height: 60, paddingTop: 8, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.line}`, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {initial?.id && initial.trang_thai !== 'huy' && (
              <button onClick={handleCreatePosOrder} disabled={creatingOrder} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${C.gold}`, background: '#fdf3e0', color: '#8a6a35', fontSize: 13.5, fontWeight: 800, cursor: creatingOrder ? 'not-allowed' : 'pointer', opacity: creatingOrder ? 0.7 : 1, fontFamily: 'var(--sans)' }}>
                {creatingOrder ? 'Đang tạo đơn...' : 'Tạo đơn POS'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 9, border: `1px solid ${C.line2}`, background: '#fff', fontSize: 13.5, cursor: 'pointer', color: C.ink2, fontFamily: 'var(--sans)' }}>Huỷ</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: C.grad, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'var(--sans)' }}>
            {saving ? 'Đang lưu...' : (initial?.id ? 'Cập Nhật' : 'Đặt Lịch')}
          </button>
          </div>
        </div>
      </div>
    </div>, document.body
  )
}
