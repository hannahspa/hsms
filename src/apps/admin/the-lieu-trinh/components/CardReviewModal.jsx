import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { todayISO } from '../../../../lib/utils'

const ACTION_META = {
  close_expired: { title: 'Đóng thẻ hết hạn', hint: 'Thẻ sẽ chuyển sang trạng thái hết hạn và không còn nằm trong danh sách cần rà.' },
  extend_expiry: { title: 'Gia hạn thẻ', hint: 'Thẻ sẽ giữ active với ngày hết hạn mới.' },
  adjust_sessions: { title: 'Điều chỉnh số buổi', hint: 'Dùng khi MySpa ghi nhận vượt buổi hoặc sai số buổi tổng/đã dùng.' },
  keep_active: { title: 'Giữ active có lý do', hint: 'Dùng cho bảo hành, chăm sóc thêm hoặc trường hợp Hannah Spa vẫn muốn phục vụ khách.' },
}

export default function CardReviewModal({ card, action, onClose, onSaved }) {
  const actionMeta = ACTION_META[action] || {}
  const [reason, setReason] = useState('')
  const [newExpiry, setNewExpiry] = useState(card?.ngay_het_han || todayISO())
  const [totalSessions, setTotalSessions] = useState(card?.so_buoi_tong || 1)
  const [usedSessions, setUsedSessions] = useState(card?.so_buoi_da_dung || 0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!reason.trim()) {
      setErr('Cần nhập lý do xử lý thẻ.')
      return
    }

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
