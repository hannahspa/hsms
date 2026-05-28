import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN, todayISO } from '../../../lib/utils'
import I from '../../../components/shared/Icons'

const CARD_PAGE_SIZE = 25
const CARD_FETCH_SIZE = 500

function fmtDate(iso) {
  if (!iso) return '-'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  if (!y || !m || !d) return '-'
  return `${d}/${m}/${y}`
}

function fmtCompact(n) {
  if (!n) return '0đ'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} tỷ`
  if (n >= 1e6) return `${Math.round(n / 1e6)} tr`
  return `${Math.round(n / 1e3)}k`
}

function parseMoney(v) {
  return parseInt(String(v || '').replace(/\D/g, ''), 10) || 0
}

function moneyInput(n) {
  return n > 0 ? new Intl.NumberFormat('vi-VN').format(n) : ''
}

function getCardTime(card) {
  return new Date(card.ngay_mua || card.created_at || card.ngay_het_han || 0).getTime()
}

function sortCardsNewestFirst(a, b) {
  const byTime = getCardTime(b) - getCardTime(a)
  if (byTime !== 0) return byTime
  return String(b.ma_the || '').localeCompare(String(a.ma_the || ''), 'vi')
}

function getRemain(card) {
  return card.so_buoi_con_lai ?? Math.max(0, (card.so_buoi_tong || 0) - (card.so_buoi_da_dung || 0))
}

function getStatusKey(card) {
  const today = todayISO()
  if (card.trang_thai === 'hoan_tien' || card.trang_thai === 'dong_the' || card.trang_thai === 'da_huy') return 'closed'
  if (card.trang_thai === 'chuyen_doi') return 'converted'
  if (card.trang_thai === 'het_han') return 'expired'
  if (card.ngay_het_han && card.ngay_het_han < today) return 'expired'
  if (getRemain(card) <= 0) return 'done'
  return 'active'
}

function getAuditStatus(card) {
  const reviewed = card.meta?.review_status
  if (['keep_active', 'closed_expired', 'extended', 'sessions_adjusted'].includes(reviewed)) return 'ok'
  const today = todayISO()
  if (card.trang_thai === 'active' && card.ngay_het_han && card.ngay_het_han < today) return 'active_but_expired'
  if (card.trang_thai === 'active' && !card.is_khong_gioi_han && getRemain(card) <= 0) return 'active_but_no_sessions'
  if (card.trang_thai === 'het_buoi' && getRemain(card) > 0) return 'finished_but_has_sessions'
  if (!card.is_khong_gioi_han && (card.so_buoi_da_dung || 0) > (card.so_buoi_tong || 0)) return 'used_more_than_total'
  return 'ok'
}

const STATUS_CFG = {
  active: { label: 'Đang dùng', bg: '#eef2e7', color: '#4f6a3d' },
  done: { label: 'Hết buổi', bg: '#ede9f8', color: '#5a4a8a' },
  expired: { label: 'Hết hạn', bg: '#f5e0da', color: '#843a23' },
  closed: { label: 'Đóng thẻ', bg: '#f5f0e8', color: '#8B7355' },
  converted: { label: 'Chuyển đổi', bg: '#e8f0f5', color: '#315a72' },
}

function StatusBadge({ card }) {
  const cfg = STATUS_CFG[getStatusKey(card)] || STATUS_CFG.active
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
      {cfg.label}
    </span>
  )
}

function ComboStatus({ combo }) {
  const active = combo.trang_thai === 'active'
  return (
    <span style={{
      background: active ? '#eef2e7' : '#f5f0e8',
      color: active ? '#4f6a3d' : '#8B7355',
      padding: '3px 9px',
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 800,
    }}>
      {active ? 'Active' : 'Block'}
    </span>
  )
}

function ComboEditModal({ combo, onClose, onSaved }) {
  const primary = combo?.dich_vu?.[0] || {}
  const [form, setForm] = useState({
    ten_combo: combo?.ten_combo || '',
    menh_gia: combo?.menh_gia || 0,
    gia_ban: combo?.gia_ban || 0,
    thoi_han_so: combo?.thoi_han_so || 1,
    thoi_han_don_vi: combo?.thoi_han_don_vi || 'year',
    ti_le_commission: combo?.ti_le_commission || 0,
    tien_commission: combo?.tien_commission || 0,
    trang_thai: combo?.trang_thai || 'active',
    ghi_chu: combo?.ghi_chu || '',
    so_lan: primary?.so_lan || 1,
    khong_gioi_han: !!primary?.khong_gioi_han,
    don_gia: primary?.don_gia || combo?.gia_ban || 0,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const autoCommission = Math.round((form.gia_ban || 0) * (Number(form.ti_le_commission) || 0) / 100)
  const commissionValue = form.tien_commission > 0 ? form.tien_commission : autoCommission

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!form.ten_combo.trim()) { setErr('Tên combo không được để trống.'); return }
    if ((form.gia_ban || 0) <= 0) { setErr('Giá bán phải lớn hơn 0.'); return }
    if ((form.thoi_han_so || 0) <= 0) { setErr('Thời hạn phải lớn hơn 0.'); return }
    if (!form.khong_gioi_han && (form.so_lan || 0) <= 0) { setErr('Số lần phải lớn hơn 0.'); return }

    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase
        .from('combo_lieu_trinh')
        .update({
          ten_combo: form.ten_combo.trim(),
          menh_gia: form.menh_gia || 0,
          gia_ban: form.gia_ban || 0,
          thoi_han_so: form.thoi_han_so || 1,
          thoi_han_don_vi: form.thoi_han_don_vi,
          ti_le_commission: Number(form.ti_le_commission) || 0,
          tien_commission: form.tien_commission || 0,
          trang_thai: form.trang_thai,
          ghi_chu: form.ghi_chu || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', combo.id)
      if (error) throw error

      if (primary?.id) {
        const { error: svcErr } = await supabase
          .from('combo_lieu_trinh_dich_vu')
          .update({
            so_lan: form.khong_gioi_han ? null : (form.so_lan || 1),
            khong_gioi_han: !!form.khong_gioi_han,
            don_gia: form.don_gia || form.gia_ban || 0,
          })
          .eq('id', primary.id)
        if (svcErr) throw svcErr
      }

      await onSaved()
      onClose()
    } catch (e) {
      setErr(e.message || 'Không thể lưu cấu hình combo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.36)', zIndex: 900 }} />
      <div style={{
        position: 'fixed',
        zIndex: 901,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(760px, 94vw)',
        maxHeight: '88vh',
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--bord)',
        borderRadius: 12,
        boxShadow: '0 24px 80px rgba(0,0,0,.28)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>Cấu hình combo liệu trình</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{combo.ma_combo}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto' }}>
          {err && (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.2)', color: '#C0392B', fontSize: 13, fontWeight: 700 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Tên combo</span>
              <input value={form.ten_combo} onChange={e => set('ten_combo', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', outline: 'none', fontFamily: 'var(--sans)' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Trạng thái</span>
              <select value={form.trang_thai} onChange={e => set('trang_thai', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff', fontFamily: 'var(--sans)' }}>
                <option value="active">Đang bán</option>
                <option value="paused">Tạm ngưng</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Mệnh giá</span>
              <input value={moneyInput(form.menh_gia)} onChange={e => set('menh_gia', parseMoney(e.target.value))}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'right', outline: 'none', fontWeight: 700 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Giá bán</span>
              <input value={moneyInput(form.gia_ban)} onChange={e => set('gia_ban', parseMoney(e.target.value))}
                style={{ height: 38, border: '1.5px solid var(--champagne)', borderRadius: 8, padding: '0 12px', textAlign: 'right', outline: 'none', fontWeight: 800 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Số lần</span>
              <input type="number" min={1} disabled={form.khong_gioi_han} value={form.so_lan}
                onChange={e => set('so_lan', parseInt(e.target.value, 10) || 1)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', outline: 'none', fontWeight: 700, background: form.khong_gioi_han ? 'var(--bg)' : '#fff' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Đơn giá/buổi</span>
              <input value={moneyInput(form.don_gia)} onChange={e => set('don_gia', parseMoney(e.target.value))}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'right', outline: 'none', fontWeight: 700 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Thời hạn</span>
              <input type="number" min={1} value={form.thoi_han_so}
                onChange={e => set('thoi_han_so', parseInt(e.target.value, 10) || 1)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', outline: 'none', fontWeight: 700 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Đơn vị hạn</span>
              <select value={form.thoi_han_don_vi} onChange={e => set('thoi_han_don_vi', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff', fontFamily: 'var(--sans)' }}>
                <option value="day">Ngày</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Hoa hồng %</span>
              <input type="number" min={0} step="0.5" value={form.ti_le_commission}
                onChange={e => set('ti_le_commission', parseFloat(e.target.value) || 0)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', outline: 'none', fontWeight: 700 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>HH cố định</span>
              <input value={moneyInput(form.tien_commission)} onChange={e => set('tien_commission', parseMoney(e.target.value))}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'right', outline: 'none', fontWeight: 700 }} />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              <input type="checkbox" checked={form.khong_gioi_han} onChange={e => set('khong_gioi_han', e.target.checked)} style={{ accentColor: '#C9A96E' }} />
              Không giới hạn số lần
            </label>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 800, textTransform: 'uppercase' }}>Hoa hồng POS sẽ tự tính</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 900, color: 'var(--champagne)' }}>{formatCurrency(commissionValue)}</div>
            </div>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Ghi chú</span>
            <textarea value={form.ghi_chu || ''} onChange={e => set('ghi_chu', e.target.value)} rows={3}
              style={{ border: '1px solid var(--bord)', borderRadius: 8, padding: 12, outline: 'none', resize: 'vertical', fontFamily: 'var(--sans)' }} />
          </label>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'var(--bg)' }}>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
          <button className="btn gold" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
        </div>
      </div>
    </>
  )
}

function CardReviewModal({ card, action, onClose, onSaved }) {
  const actionMeta = {
    close_expired: { title: 'Đóng thẻ hết hạn', hint: 'Thẻ sẽ chuyển sang trạng thái hết hạn và không còn nằm trong danh sách cần rà.' },
    extend_expiry: { title: 'Gia hạn thẻ', hint: 'Thẻ sẽ giữ active với ngày hết hạn mới.' },
    adjust_sessions: { title: 'Điều chỉnh số buổi', hint: 'Dùng khi MySpa ghi nhận vượt buổi hoặc sai số buổi tổng/đã dùng.' },
    keep_active: { title: 'Giữ active có lý do', hint: 'Dùng cho bảo hành, chăm sóc thêm hoặc trường hợp Hannah Spa vẫn muốn phục vụ khách.' },
  }[action] || {}
  const [reason, setReason] = useState('')
  const [newExpiry, setNewExpiry] = useState(card?.ngay_het_han || todayISO())
  const [totalSessions, setTotalSessions] = useState(card?.so_buoi_tong || 1)
  const [usedSessions, setUsedSessions] = useState(card?.so_buoi_da_dung || 0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!reason.trim()) { setErr('Cần nhập lý do xử lý thẻ.'); return }
    setSaving(true)
    setErr('')
    try {
      const { data, error } = await supabase.rpc('hsms_review_treatment_card', {
        p_card_id: card.id,
        p_action: action,
        p_reason: reason.trim(),
        p_new_expiry: action === 'extend_expiry' ? newExpiry : null,
        p_total_sessions: action === 'adjust_sessions' ? Number(totalSessions) : null,
        p_used_sessions: action === 'adjust_sessions' ? Number(usedSessions) : null,
      })
      if (error) throw error
      if (data && data.success === false) throw new Error(data.error || 'Không xử lý được thẻ')
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e.message || 'Không xử lý được thẻ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.36)', zIndex: 920 }} />
      <div style={{
        position: 'fixed',
        zIndex: 921,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(520px, 94vw)',
        background: 'var(--surface)',
        border: '1px solid var(--bord)',
        borderRadius: 12,
        boxShadow: '0 24px 80px rgba(0,0,0,.28)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 900, color: 'var(--ink)' }}>{actionMeta.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>{card.ma_the} · {card.khach_hang?.ho_ten || 'Khách hàng'}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink2)', marginBottom: 14 }}>
            {actionMeta.hint}
          </div>
          {err && <div style={{ marginBottom: 12, color: 'var(--danger)', fontSize: 13, fontWeight: 800 }}>{err}</div>}

          {action === 'extend_expiry' && (
            <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Ngày hết hạn mới</span>
              <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', fontFamily: 'var(--sans)' }} />
            </label>
          )}

          {action === 'adjust_sessions' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Tổng buổi</span>
                <input type="number" min={1} value={totalSessions} onChange={e => setTotalSessions(e.target.value)}
                  style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', fontWeight: 800 }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Đã dùng</span>
                <input type="number" min={0} value={usedSessions} onChange={e => setUsedSessions(e.target.value)}
                  style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', fontWeight: 800 }} />
              </label>
            </div>
          )}

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Lý do</span>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
              placeholder="Ví dụ: Khách không còn nhu cầu, đã xác nhận với khách / Gia hạn bảo hành triệt lông..."
              style={{ border: '1px solid var(--bord)', borderRadius: 8, padding: 12, outline: 'none', resize: 'vertical', fontFamily: 'var(--sans)' }} />
          </label>
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'var(--bg)' }}>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
          <button className="btn gold" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
        </div>
      </div>
    </>
  )
}

function CardEditModal({ card, onClose, onSaved }) {
  const [form, setForm] = useState({
    ma_the: card?.ma_the || '',
    ten_dich_vu: card?.ten_dich_vu || '',
    loai_the: card?.loai_the || (card?.combo_id ? 'combo_lieu_trinh' : 'lieu_trinh'),
    so_buoi_tong: card?.so_buoi_tong || 1,
    so_buoi_da_dung: card?.so_buoi_da_dung || 0,
    gia_tri_the: card?.gia_tri_the || 0,
    ngay_mua: card?.ngay_mua || '',
    ngay_het_han: card?.ngay_het_han || '',
    trang_thai: card?.trang_thai || 'active',
    is_khong_gioi_han: !!card?.is_khong_gioi_han,
    ghi_chu: card?.ghi_chu || '',
    reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const remain = form.is_khong_gioi_han ? null : Math.max(0, Number(form.so_buoi_tong || 0) - Number(form.so_buoi_da_dung || 0))

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!form.ma_the.trim()) { setErr('Mã thẻ không được để trống.'); return }
    if (!form.ten_dich_vu.trim()) { setErr('Tên dịch vụ/combo không được để trống.'); return }
    if (!form.reason.trim()) { setErr('Cần nhập lý do sửa thẻ.'); return }
    if (!form.is_khong_gioi_han && Number(form.so_buoi_tong) <= 0) { setErr('Tổng buổi phải lớn hơn 0.'); return }
    if (!form.is_khong_gioi_han && Number(form.so_buoi_da_dung) < 0) { setErr('Số buổi đã dùng không hợp lệ.'); return }

    setSaving(true)
    setErr('')
    try {
      const before = {
        ma_the: card.ma_the,
        ten_dich_vu: card.ten_dich_vu,
        loai_the: card.loai_the,
        so_buoi_tong: card.so_buoi_tong,
        so_buoi_da_dung: card.so_buoi_da_dung,
        gia_tri_the: card.gia_tri_the,
        ngay_mua: card.ngay_mua,
        ngay_het_han: card.ngay_het_han,
        trang_thai: card.trang_thai,
        is_khong_gioi_han: card.is_khong_gioi_han,
        ghi_chu: card.ghi_chu,
      }
      const after = {
        ma_the: form.ma_the.trim(),
        ten_dich_vu: form.ten_dich_vu.trim(),
        loai_the: form.loai_the,
        so_buoi_tong: form.is_khong_gioi_han ? 0 : Number(form.so_buoi_tong || 0),
        so_buoi_da_dung: form.is_khong_gioi_han ? 0 : Number(form.so_buoi_da_dung || 0),
        gia_tri_the: Number(form.gia_tri_the || 0),
        ngay_mua: form.ngay_mua || null,
        ngay_het_han: form.ngay_het_han || null,
        trang_thai: form.trang_thai,
        is_khong_gioi_han: !!form.is_khong_gioi_han,
        ghi_chu: form.ghi_chu || null,
      }
      const editEntry = {
        action: 'admin_edit_card',
        reason: form.reason.trim(),
        edited_at: new Date().toISOString(),
        before,
        after,
      }
      const meta = {
        ...(card.meta || {}),
        last_admin_edit_reason: form.reason.trim(),
        last_admin_edit_at: editEntry.edited_at,
        admin_edit_history: [...(Array.isArray(card.meta?.admin_edit_history) ? card.meta.admin_edit_history : []), editEntry].slice(-20),
      }

      const { data, error } = await supabase
        .from('the_lieu_trinh')
        .update({ ...after, meta })
        .eq('id', card.id)
        .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai), combo:combo_id(ten_combo, ma_combo)')
        .single()

      if (error) throw error
      await onSaved(data)
      onClose()
    } catch (e) {
      setErr(e.message || 'Không lưu được thông tin thẻ.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.36)', zIndex: 930 }} />
      <div style={{
        position: 'fixed',
        zIndex: 931,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(760px, 94vw)',
        maxHeight: '88vh',
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--bord)',
        borderRadius: 12,
        boxShadow: '0 24px 80px rgba(0,0,0,.28)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 900, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Sửa thẻ liệu trình</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>{card.khach_hang?.ho_ten || 'Khách hàng'} · {card.khach_hang?.so_dien_thoai || '-'}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto' }}>
          {err && (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.2)', color: '#C0392B', fontSize: 13, fontWeight: 800 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Mã thẻ</span>
              <input value={form.ma_the} onChange={e => set('ma_the', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', outline: 'none', fontWeight: 800 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Tên dịch vụ / combo</span>
              <input value={form.ten_dich_vu} onChange={e => set('ten_dich_vu', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', outline: 'none', fontWeight: 700 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Ngày mua</span>
              <input type="date" value={form.ngay_mua || ''} onChange={e => set('ngay_mua', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Hết hạn</span>
              <input type="date" value={form.ngay_het_han || ''} onChange={e => set('ngay_het_han', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Loại thẻ</span>
              <select value={form.loai_the} onChange={e => set('loai_the', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff' }}>
                <option value="lieu_trinh">Thẻ liệu trình</option>
                <option value="combo_lieu_trinh">Combo liệu trình</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Trạng thái</span>
              <select value={form.trang_thai} onChange={e => set('trang_thai', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff' }}>
                <option value="active">Đang dùng</option>
                <option value="het_buoi">Hết buổi</option>
                <option value="het_han">Hết hạn</option>
                <option value="dong_the">Đóng thẻ</option>
                <option value="chuyen_doi">Chuyển đổi</option>
                <option value="hoan_tien">Hoàn tiền</option>
                <option value="da_huy">Đã huỷ</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Tổng buổi</span>
              <input type="number" min={0} disabled={form.is_khong_gioi_han} value={form.so_buoi_tong}
                onChange={e => set('so_buoi_tong', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', fontWeight: 800, background: form.is_khong_gioi_han ? 'var(--bg)' : '#fff' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Đã dùng</span>
              <input type="number" min={0} disabled={form.is_khong_gioi_han} value={form.so_buoi_da_dung}
                onChange={e => set('so_buoi_da_dung', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', fontWeight: 800, background: form.is_khong_gioi_han ? 'var(--bg)' : '#fff' }} />
            </label>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Còn lại</span>
              <div style={{ height: 38, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--champagne)' }}>
                {form.is_khong_gioi_han ? 'Không giới hạn' : `${remain} buổi`}
              </div>
            </div>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Giá trị thẻ</span>
              <input value={moneyInput(form.gia_tri_the)} onChange={e => set('gia_tri_the', parseMoney(e.target.value))}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'right', fontWeight: 800 }} />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', marginBottom: 14, fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
            <input type="checkbox" checked={form.is_khong_gioi_han} onChange={e => set('is_khong_gioi_han', e.target.checked)} style={{ accentColor: '#C9A96E' }} />
            Không giới hạn số lần
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Ghi chú</span>
              <textarea value={form.ghi_chu || ''} onChange={e => set('ghi_chu', e.target.value)} rows={4}
                style={{ border: '1px solid var(--bord)', borderRadius: 8, padding: 12, outline: 'none', resize: 'vertical', fontFamily: 'var(--sans)' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Lý do sửa</span>
              <textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={4}
                placeholder="Ví dụ: Đối soát lại với MySpa / sửa ngày hết hạn / sửa số buổi theo admin..."
                style={{ border: '1px solid var(--bord)', borderRadius: 8, padding: 12, outline: 'none', resize: 'vertical', fontFamily: 'var(--sans)' }} />
            </label>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'var(--bg)' }}>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
          <button className="btn gold" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
        </div>
      </div>
    </>
  )
}

function Empty({ children }) {
  return (
    <div style={{ padding: 38, border: '1px dashed var(--line)', borderRadius: 'var(--r)', background: 'var(--bg)', textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
      {children}
    </div>
  )
}

export default function AdminTheLieuTrinhPage() {
  const [cards, setCards] = useState([])
  const [combos, setCombos] = useState([])
  const [backfill, setBackfill] = useState([])
  const [loading, setLoading] = useState(true)
  const [comboLoading, setComboLoading] = useState(true)
  const [cardsFullyLoaded, setCardsFullyLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [cardPage, setCardPage] = useState(1)
  const [tab] = useState(window.location.pathname.endsWith('/combo') ? 'combos' : 'cards')
  const [selected, setSelected] = useState(null)
  const [editingCombo, setEditingCombo] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [reviewAction, setReviewAction] = useState(null)
  const [comboError, setComboError] = useState('')

  useEffect(() => {
    loadCards()
    loadCombos()
  }, [])

  useEffect(() => {
    setCardPage(1)
  }, [search, filter])

  const loadCards = async () => {
    setLoading(true)
    setCardsFullyLoaded(false)
    const allCards = []
    let from = 0
    let error = null
    let firstPageShown = false

    while (true) {
      const { data, error: pageError } = await supabase
        .from('the_lieu_trinh')
        .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai), combo:combo_id(ten_combo, ma_combo)')
        .order('ngay_mua', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .range(from, from + CARD_FETCH_SIZE - 1)

      if (pageError) {
        error = pageError
        break
      }

      allCards.push(...(data || []))
      if (!firstPageShown) {
        setCards([...allCards].sort(sortCardsNewestFirst))
        setLoading(false)
        firstPageShown = true
      }
      if (!data || data.length < CARD_FETCH_SIZE) break
      from += CARD_FETCH_SIZE
    }

    if (error) {
      const legacyCards = []
      let legacyFrom = 0
      while (true) {
        const legacy = await supabase
          .from('the_lieu_trinh')
          .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
          .order('ngay_mua', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false })
          .range(legacyFrom, legacyFrom + CARD_FETCH_SIZE - 1)
        if (legacy.error) break
        legacyCards.push(...(legacy.data || []))
        if (legacyFrom === 0) {
          setCards([...legacyCards].sort(sortCardsNewestFirst))
          setLoading(false)
        }
        if (!legacy.data || legacy.data.length < CARD_FETCH_SIZE) break
        legacyFrom += CARD_FETCH_SIZE
      }
      setCards(legacyCards.sort(sortCardsNewestFirst))
      setCardsFullyLoaded(true)
      setLoading(false)
      return
    }

    const sortedCards = allCards.sort(sortCardsNewestFirst)
    setCards(sortedCards)
    if (selected?.id) {
      const fresh = sortedCards.find(card => card.id === selected.id)
      if (fresh) setSelected(fresh)
    }
    setCardsFullyLoaded(true)
    setLoading(false)
  }

  const loadCombos = async () => {
    setComboLoading(true)
    setComboError('')
    const { data, error } = await supabase
      .from('combo_lieu_trinh')
      .select('*, dich_vu:combo_lieu_trinh_dich_vu(*)')
      .order('created_at', { ascending: false })

    if (error) {
      setComboError('Chưa chạy migration 027_combo_lieu_trinh.sql nên HSMS chưa có bảng combo liệu trình.')
      setCombos([])
      setBackfill([])
      setComboLoading(false)
      return
    }

    const { data: summary } = await supabase
      .from('v_combo_lieu_trinh_backfill_summary')
      .select('*')

    setCombos(data || [])
    setBackfill(summary || [])
    setComboLoading(false)
  }

  const mergeUpdatedCard = (updatedCard) => {
    setCards(prev => prev.map(card => card.id === updatedCard.id ? updatedCard : card).sort(sortCardsNewestFirst))
    setSelected(updatedCard)
  }

  const isExpired = c => getStatusKey(c) === 'expired'
  const isDone = c => getStatusKey(c) === 'done'
  const isActive = c => getStatusKey(c) === 'active'
  const isCombo = c => c.loai_the === 'combo_lieu_trinh' || !!c.combo_id
  const isAlmostDone = c => isActive(c) && !c.is_khong_gioi_han && getRemain(c) <= 2
  const needsReview = c => getAuditStatus(c) !== 'ok'

  const total = cards.length
  const activeN = cards.filter(isActive).length
  const expiredN = cards.filter(isExpired).length
  const doneN = cards.filter(isDone).length
  const almostN = cards.filter(isAlmostDone).length
  const comboCardN = cards.filter(isCombo).length
  const reviewN = cards.filter(needsReview).length
  const backfilledCardN = (backfill || []).reduce((sum, row) => sum + Number(row.so_the_da_gan || 0), 0)
  const totalValue = cards.reduce((s, c) => s + (c.gia_tri_the || 0), 0)

  const filtered = cards.filter(c => {
    if (filter === 'active' && !isActive(c)) return false
    if (filter === 'expired' && !isExpired(c)) return false
    if (filter === 'done' && !isDone(c)) return false
    if (filter === 'almost' && !isAlmostDone(c)) return false
    if (filter === 'combo' && !isCombo(c)) return false
    if (filter === 'review' && !needsReview(c)) return false
    if (search) {
      const q = search.toLowerCase()
      const fields = [
        c.khach_hang?.ho_ten,
        c.khach_hang?.so_dien_thoai,
        c.ten_dich_vu,
        c.combo?.ten_combo,
        c.ma_the,
      ].join(' ').toLowerCase()
      if (!fields.includes(q)) return false
    }
    return true
  })
  const cardTotalPages = Math.max(1, Math.ceil(filtered.length / CARD_PAGE_SIZE))
  const safeCardPage = Math.min(cardPage, cardTotalPages)
  const cardPageStart = (safeCardPage - 1) * CARD_PAGE_SIZE
  const pagedCards = filtered.slice(cardPageStart, cardPageStart + CARD_PAGE_SIZE)

  const comboSummary = Object.fromEntries((backfill || []).map(row => [row.ma_combo, row]))

  const CHIPS = [
    { k: 'all', label: 'Tất cả', n: total },
    { k: 'combo', label: 'Combo', n: comboCardN },
    { k: 'review', label: 'Cần rà', n: reviewN },
    { k: 'active', label: 'Đang dùng', n: activeN },
    { k: 'almost', label: 'Sắp hết', n: almostN },
    { k: 'done', label: 'Hết buổi', n: doneN },
    { k: 'expired', label: 'Hết hạn', n: expiredN },
  ]

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mod-head" style={{ marginBottom: 20 }}>
          <div>
            <div className="ttl">{tab === 'combos' ? 'Combo Liệu Trình' : 'Thẻ Liệu Trình'}</div>
            <div className="sub">
              {tab === 'combos'
                ? `${combos.length} combo cấu hình · ${backfilledCardN || comboCardN} thẻ đã gắn từ dữ liệu cũ`
                : `${total.toLocaleString('vi-VN')} thẻ khách hàng · mới nhất theo ngày mua · ${cardsFullyLoaded ? 'đã tải đủ' : 'đang tải nền'}`}
            </div>
          </div>
          <div className="acts">
            <button className="btn ghost">
              <I.Filter style={{ width: 13, height: 13 }} /> Xuất Excel
            </button>
          </div>
        </div>

        {tab === 'cards' && (
          <>
            <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
              <div className="it">
                <div className="l">Tổng thẻ</div>
                <div className="v">{total.toLocaleString('vi-VN')}</div>
                <div className="d">mọi trạng thái</div>
              </div>
              <div className="it">
                <div className="l">Đang hoạt động</div>
                <div className="v" style={{ color: '#426a2c' }}>{activeN}</div>
                <div className="d">{total > 0 ? Math.round(activeN / total * 100) : 0}% tổng thẻ</div>
              </div>
              <div className="it">
                <div className="l">Combo đã gán</div>
                <div className="v" style={{ color: 'var(--champagne)' }}>{comboCardN}</div>
                <div className="d">từ MySpa/import</div>
              </div>
              <div className="it">
                <div className="l">Cần rà trước go-live</div>
                <div className="v" style={{ color: reviewN > 0 ? '#e67e22' : '#426a2c' }}>{reviewN}</div>
                <div className="d">hết hạn / vượt buổi</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              {CHIPS.map(x => (
                <button key={x.k} className={`chip${x.k === filter ? ' active' : ''}`}
                  onClick={() => setFilter(x.k)} style={{ padding: '7px 14px', fontSize: '12.5px' }}>
                  {x.label} <span style={{ opacity: .6, marginLeft: 5 }}>{x.n}</span>
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div className="search" style={{ flex: '1 1 420px', minWidth: 320, maxWidth: 720, margin: 0 }}>
                <I.Search />
                <input placeholder="Tên KH, dịch vụ, SĐT..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink3)' }}>Đang tải danh sách thẻ...</div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ overflowX: 'visible' }}>
                <table className="tbl" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 14, width: 112, minWidth: 112, whiteSpace: 'nowrap' }}>Mã thẻ</th>
                      <th>Khách hàng</th>
                      <th>Dịch vụ / combo</th>
                      <th style={{ width: 82 }}>Ngày mua</th>
                      <th style={{ width: 78 }}>Hết hạn</th>
                      <th style={{ width: 112 }}>Sử dụng</th>
                      <th className="amount">Còn lại</th>
                      <th className="amount">Giá trị</th>
                      <th style={{ minWidth: 96, whiteSpace: 'nowrap' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCards.map(c => {
                      const totalSessions = Math.max(1, c.so_buoi_tong || 1)
                      const pct = c.is_khong_gioi_han ? 0 : Math.min(100, Math.round(((c.so_buoi_da_dung || 0) / totalSessions) * 100))
                      const con = getRemain(c)
                      const almost = isAlmostDone(c)
                      const expired = isExpired(c)
                      return (
                        <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                          style={{ cursor: 'pointer', ...(selected?.id === c.id ? { background: 'rgba(201,169,110,.07)', borderLeft: '3px solid var(--champagne)' } : {}) }}>
                          <td style={{ paddingLeft: 14, width: 112, minWidth: 112, whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 900, fontSize: 12, color: 'var(--champagne)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{c.ma_the || '-'}</div>
                            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>{c.loai_the === 'combo_lieu_trinh' || c.combo_id ? 'Combo' : 'Liệu trình'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{c.khach_hang?.ho_ten || '-'}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{c.khach_hang?.so_dien_thoai || ''}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700 }}>{c.ten_dich_vu}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
                              {c.combo?.ten_combo || (c.is_khong_gioi_han ? 'Không giới hạn' : `${c.so_buoi_tong || 0} buổi`)}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 700 }}>{fmtDate(c.ngay_mua)}</div>
                            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>{c.source || 'HSMS'}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: expired ? 'var(--danger)' : 'var(--ink2)', fontWeight: expired ? 800 : 600 }}>
                              {fmtDate(c.ngay_het_han)}
                            </div>
                          </td>
                          <td style={{ minWidth: 128 }}>
                            <div className="bar-h" style={{ height: 6, borderRadius: 3 }}>
                              <i style={{
                                width: c.is_khong_gioi_han ? '100%' : `${pct}%`,
                                borderRadius: 3,
                                background: expired ? 'var(--ink3)' : almost ? '#e67e22' : 'var(--grad-gold)',
                              }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 3 }}>
                              {c.is_khong_gioi_han ? 'Không giới hạn' : `${c.so_buoi_da_dung || 0}/${c.so_buoi_tong || 0} buổi · ${pct}%`}
                            </div>
                          </td>
                          <td className="amount" style={{ whiteSpace: 'nowrap', minWidth: 82 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 800, color: expired ? 'var(--ink3)' : almost ? '#e67e22' : con > 0 ? 'var(--thu)' : 'var(--ink3)' }}>
                              {c.is_khong_gioi_han ? '∞' : con}
                            </span>
                            {!c.is_khong_gioi_han && <span style={{ fontSize: 10, color: 'var(--ink3)' }}>buổi</span>}
                            </span>
                          </td>
                          <td className="amount">
                            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 700 }}>{c.gia_tri_the ? formatCurrency(c.gia_tri_the) : '-'}</div>
                          </td>
                          <td style={{ minWidth: 96, whiteSpace: 'nowrap' }}><StatusBadge card={c} /></td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9}><Empty>Không có thẻ phù hợp.</Empty></td></tr>
                    )}
                  </tbody>
                </table>
                </div>
                {filtered.length > CARD_PAGE_SIZE && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 16px',
                    borderTop: '1px solid var(--line)',
                    color: 'var(--ink3)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    <span>
                      Hiển thị {cardPageStart + 1}-{Math.min(cardPageStart + CARD_PAGE_SIZE, filtered.length)} / {filtered.length.toLocaleString('vi-VN')} thẻ
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn ghost" disabled={safeCardPage <= 1} onClick={() => setCardPage(p => Math.max(1, p - 1))}>
                        Trước
                      </button>
                      <span>Trang {safeCardPage}/{cardTotalPages}</span>
                      <button className="btn ghost" disabled={safeCardPage >= cardTotalPages} onClick={() => setCardPage(p => Math.min(cardTotalPages, p + 1))}>
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'combos' && (
          <div>
            <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
              <div className="it"><div className="l">Combo mẫu</div><div className="v">{combos.length}</div><div className="d">cấu hình bán sẵn</div></div>
              <div className="it"><div className="l">Active</div><div className="v" style={{ color: '#426a2c' }}>{combos.filter(c => c.trang_thai === 'active').length}</div><div className="d">đang bán</div></div>
              <div className="it"><div className="l">Đã gán khách</div><div className="v" style={{ color: 'var(--champagne)' }}>{backfilledCardN || comboCardN}</div><div className="d">từ dữ liệu cũ/POS</div></div>
              <div className="it"><div className="l">Giá bán TB</div><div className="v">{fmtCompact(combos.reduce((s, c) => s + (c.gia_ban || 0), 0) / Math.max(1, combos.length))}</div><div className="d">theo combo</div></div>
            </div>

            {comboError && (
              <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, border: '1px solid rgba(180,70,55,.2)', background: 'rgba(180,70,55,.06)', color: 'var(--danger)', fontSize: 13, fontWeight: 700 }}>
                {comboError}
              </div>
            )}

            {comboLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink3)' }}>Đang tải combo liệu trình...</div>
            ) : combos.length ? (
              <div className="card" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Tên combo</th>
                      <th>Dịch vụ trong combo</th>
                      <th>Hạn dùng</th>
                      <th className="amount">Mệnh giá</th>
                      <th className="amount">Giá bán</th>
                      <th className="amount">Hoa hồng</th>
                      <th>Đã gán</th>
                      <th>Trạng thái</th>
                      <th style={{ paddingRight: 20, textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map(combo => {
                      const sum = comboSummary[combo.ma_combo] || {}
                      const services = combo.dich_vu || []
                      return (
                        <tr key={combo.id}>
                          <td style={{ paddingLeft: 20 }}>
                            <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{combo.ten_combo}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{combo.ma_combo}</div>
                          </td>
                          <td>
                            {services.length ? services.map(s => (
                              <div key={s.id} style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 3 }}>
                                {s.ten_dich_vu} · {s.khong_gioi_han ? 'Không giới hạn' : `${s.so_lan || 0} lần`}
                              </div>
                            )) : <span style={{ color: 'var(--ink3)' }}>Chưa gắn dịch vụ</span>}
                          </td>
                          <td>{combo.thoi_han_so} {combo.thoi_han_don_vi === 'year' ? 'năm' : combo.thoi_han_don_vi}</td>
                          <td className="amount">{formatCurrency(combo.menh_gia || 0)}</td>
                          <td className="amount" style={{ fontWeight: 800 }}>{formatCurrency(combo.gia_ban || 0)}</td>
                          <td className="amount">
                            <div style={{ fontWeight: 800, color: combo.ti_le_commission > 0 || combo.tien_commission > 0 ? '#426a2c' : 'var(--ink3)' }}>
                              {combo.tien_commission > 0
                                ? formatCurrency(combo.tien_commission)
                                : combo.ti_le_commission > 0
                                  ? `${combo.ti_le_commission}%`
                                  : '—'}
                            </div>
                            {combo.ti_le_commission > 0 && combo.tien_commission <= 0 && (
                              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{formatCurrency(Math.round((combo.gia_ban || 0) * combo.ti_le_commission / 100))}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--champagne)' }}>{sum.so_the_da_gan || 0} thẻ</div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{sum.so_khach_da_gan || 0} khách</div>
                          </td>
                          <td><ComboStatus combo={combo} /></td>
                          <td style={{ paddingRight: 20, textAlign: 'center' }}>
                            <button className="btn ghost" style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                              onClick={() => setEditingCombo(combo)}>
                              <I.Edit style={{ width: 13, height: 13 }} /> Sửa
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : <Empty>Chưa có combo liệu trình. Sau khi chạy migration 027, 20 combo triệt lông từ MySpa sẽ xuất hiện ở đây.</Empty>}
          </div>
        )}

        {tab === 'backfill' && (
          <div>
            {comboError ? (
              <Empty>Chưa có dữ liệu backfill vì migration 027 chưa được chạy.</Empty>
            ) : backfill.length ? (
              <div className="card" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Mã combo</th>
                      <th>Tên combo</th>
                      <th className="amount">Số thẻ đã gán</th>
                      <th className="amount">Số khách đã gán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backfill.map(row => (
                      <tr key={row.ma_combo}>
                        <td style={{ paddingLeft: 20, fontWeight: 800 }}>{row.ma_combo}</td>
                        <td>{row.ten_combo}</td>
                        <td className="amount">{row.so_the_da_gan || 0}</td>
                        <td className="amount">{row.so_khach_da_gan || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty>Chưa có thẻ cũ nào được gán combo. Nếu dữ liệu cũ có tên khác MySpa, mình sẽ bổ sung luật nhận diện theo file import.</Empty>}
          </div>
        )}
      </div>

      {selected && tab === 'cards' && createPortal((
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,.46)', zIndex: 880 }} />
          <section style={{
            position: 'fixed',
            zIndex: 881,
            top: 64,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(980px, 94vw)',
            maxHeight: 'calc(100vh - 96px)',
            background: 'var(--surface)',
            border: '1px solid var(--bord)',
            borderRadius: 12,
            boxShadow: '0 28px 90px rgba(0,0,0,.32)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--line)',
              background: 'linear-gradient(180deg, #fff, var(--bg))',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 18,
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
                <div style={{
                  width: 62,
                  height: 62,
                  borderRadius: 12,
                  background: selected.combo_id ? 'linear-gradient(135deg,#C9A96E,#7D5A3C)' : 'var(--grad-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 20,
                  flexShrink: 0,
                }}>
                  {selected.combo_id ? 'CB' : 'LT'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--champagne)' }}>{selected.ma_the || '-'}</span>
                    <StatusBadge card={selected} />
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 900, color: 'var(--ink)', lineHeight: 1.2 }}>
                    {selected.ten_dich_vu}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 5 }}>
                    {selected.khach_hang?.ho_ten || 'Khách hàng'} · {selected.khach_hang?.so_dien_thoai || '-'}
                  </div>
                </div>
              </div>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setSelected(null)}>×</button>
            </div>

            <div style={{ padding: 22, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 18, marginBottom: 18 }}>
                <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>Tiến độ sử dụng</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--ink)' }}>
                      {selected.is_khong_gioi_han ? 'Không giới hạn' : `${selected.so_buoi_da_dung || 0}/${selected.so_buoi_tong || 0} buổi`}
                    </span>
                  </div>
                  <div className="bar-h" style={{ height: 10, borderRadius: 6 }}>
                    <i style={{
                      width: selected.is_khong_gioi_han ? '100%' : `${Math.min(100, ((selected.so_buoi_da_dung || 0) / Math.max(1, selected.so_buoi_tong || 1)) * 100)}%`,
                      borderRadius: 6,
                      background: 'var(--grad-gold)',
                    }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
                    {[
                      ['Tổng buổi', selected.is_khong_gioi_han ? '∞' : selected.so_buoi_tong || 0],
                      ['Đã dùng', selected.is_khong_gioi_han ? '∞' : selected.so_buoi_da_dung || 0],
                      ['Còn lại', selected.is_khong_gioi_han ? '∞' : getRemain(selected)],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--champagne)', fontWeight: 900 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, background: 'var(--bg)' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>Giá trị thẻ</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 900, color: 'var(--champagne)' }}>
                    {selected.gia_tri_the ? formatCurrency(selected.gia_tri_the) : '-'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>Ngày mua</div>
                      <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 800, marginTop: 3 }}>{fmtDate(selected.ngay_mua)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>Hết hạn</div>
                      <div style={{ fontSize: 14, color: isExpired(selected) ? 'var(--danger)' : 'var(--ink)', fontWeight: 800, marginTop: 3 }}>{fmtDate(selected.ngay_het_han)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
                {[
                  ['SĐT', selected.khach_hang?.so_dien_thoai || '-'],
                  ['Combo', selected.combo?.ten_combo || '-'],
                  ['Loại thẻ', selected.combo_id ? 'Combo liệu trình' : 'Thẻ liệu trình'],
                  ['Nguồn dữ liệu', selected.source || '-'],
                  ['Ghi chú', selected.ghi_chu || '-'],
                  ['Lý do sửa gần nhất', selected.meta?.last_admin_edit_reason || '-'],
                ].map(([label, value]) => (
                  <div key={label} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', background: '#fff' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700, marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
                  </div>
                ))}
              </div>

              {needsReview(selected) && (
                <div style={{ border: '1px solid rgba(230,126,34,.25)', background: 'rgba(230,126,34,.06)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#a85f11', marginBottom: 10 }}>
                    Thẻ này cần quyết định trước go-live
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn ghost" onClick={() => setReviewAction('close_expired')}>Đóng thẻ hết hạn</button>
                    <button className="btn ghost" onClick={() => setReviewAction('extend_expiry')}>Gia hạn thẻ</button>
                    <button className="btn ghost" onClick={() => setReviewAction('adjust_sessions')}>Điều chỉnh số buổi</button>
                    <button className="btn gold" onClick={() => setReviewAction('keep_active')}>Giữ active có lý do</button>
                  </div>
                </div>
              )}

              {selected.meta?.review_status && (
                <div style={{ border: '1px solid rgba(45,122,79,.18)', background: 'rgba(45,122,79,.06)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#426a2c', textTransform: 'uppercase' }}>Đã rà soát</div>
                  <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 5 }}>{selected.meta.review_reason || 'Đã xử lý thẻ cũ'}</div>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn ghost" onClick={() => setSelected(null)}>Đóng</button>
              <button className="btn ghost" onClick={() => window.open(`tel:${selected.khach_hang?.so_dien_thoai || ''}`)}>
                <I.Phone style={{ width: 13, height: 13 }} /> Gọi nhắc lịch
              </button>
              <button className="btn gold" onClick={() => setEditingCard(selected)}>
                <I.Edit style={{ width: 13, height: 13 }} /> Sửa thông tin thẻ
              </button>
            </div>
          </section>
        </>
      ), document.body)}

      {editingCombo && (
        <ComboEditModal
          combo={editingCombo}
          onClose={() => setEditingCombo(null)}
          onSaved={loadCombos}
        />
      )}

      {reviewAction && selected && createPortal((
        <CardReviewModal
          card={selected}
          action={reviewAction}
          onClose={() => setReviewAction(null)}
          onSaved={loadCards}
        />
      ), document.body)}

      {editingCard && createPortal((
        <CardEditModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSaved={mergeUpdatedCard}
        />
      ), document.body)}
    </div>
  )
}
