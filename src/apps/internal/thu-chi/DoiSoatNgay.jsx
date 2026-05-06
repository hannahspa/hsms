import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX } from '../../../constants/lux'
import { todayISO, formatDateInput, getNowVN } from '../../../lib/utils'

const CHECKLIST_ITEMS = [
  { id: 'da_nhap_doanh_thu', label: 'Đã nhập hết doanh thu hôm nay?', icon: '💰' },
  { id: 'da_nhap_chi_phi',   label: 'Đã nhập hết chi phí hôm nay?',   icon: '💸' },
  { id: 'da_chup_chung_tu',  label: 'Đã chụp ảnh hoá đơn chi?',       icon: '📷' },
  { id: 'da_kiem_tien_mat',  label: 'Tiền mặt trong két khớp với số dư?', icon: '💵' },
]

export default function DoiSoatNgay({ user, onClose }) {
  const today = todayISO()
  const [checks, setChecks] = useState({})
  const [ghiChu, setGhiChu] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('doi_soat_ngay')
          .select('*')
          .eq('ngay', today)
          .eq('nguoi_doi_soat', user?.ho_ten || user?.email)
          .order('created_at', { ascending: false })

        if (data && data.length > 0) {
          const map = {}
          data.forEach(d => { map[d.muc_kiem_tra] = d.ket_qua })
          setChecks(map)
          setGhiChu(data[0]?.ghi_chu || '')
          // Check if all items are done
          const allDone = CHECKLIST_ITEMS.every(item => map[item.id] === true)
          setSubmitted(allDone)
        }
      } catch (err) {
        console.error('DoiSoatNgay load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today, user])

  const handleCheck = async (itemId) => {
    const newVal = !checks[itemId]
    setChecks(prev => ({ ...prev, [itemId]: newVal }))
    setSaving(true)
    try {
      const { error } = await supabase.from('doi_soat_ngay').upsert({
        ngay: today,
        nguoi_doi_soat: user?.ho_ten || user?.email,
        muc_kiem_tra: itemId,
        ket_qua: newVal,
        ghi_chu: ghiChu,
      }, { onConflict: 'ngay, nguoi_doi_soat, muc_kiem_tra' })
      if (error) throw error
    } catch (err) {
      console.error('Save check error:', err)
      setMsg({ type: 'error', text: 'Lỗi lưu: ' + err.message })
      setChecks(prev => ({ ...prev, [itemId]: !newVal }))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitAll = async () => {
    const allDone = CHECKLIST_ITEMS.every(item => checks[item.id] === true)
    if (!allDone) {
      setMsg({ type: 'error', text: 'Vui lòng hoàn tất tất cả mục kiểm tra!' })
      return
    }
    setSaving(true)
    try {
      for (const item of CHECKLIST_ITEMS) {
        await supabase.from('doi_soat_ngay').upsert({
          ngay: today,
          nguoi_doi_soat: user?.ho_ten || user?.email,
          muc_kiem_tra: item.id,
          ket_qua: true,
          ghi_chu: ghiChu,
        }, { onConflict: 'ngay, nguoi_doi_soat, muc_kiem_tra' })
      }
      setSubmitted(true)
      setMsg({ type: 'success', text: 'Đã hoàn tất đối soát hôm nay!' })
      setTimeout(() => onClose?.(), 1500)
    } catch (err) {
      setMsg({ type: 'error', text: 'Lỗi: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  const doneCount = CHECKLIST_ITEMS.filter(item => checks[item.id]).length
  const totalCount = CHECKLIST_ITEMS.length
  const progressPct = Math.round((doneCount / totalCount) * 100)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 600 }}
      onClick={e => { if (e.target === e.currentTarget && onClose) onClose() }}>
      <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', background: msg.type === 'error' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${msg.type === 'error' ? '#FECACA' : '#BBF7D0'}`, color: msg.type === 'error' ? '#C0392B' : '#2D7A4F', fontSize: '13px', fontWeight: '600', fontFamily: LUX.fontSans }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Đối Soát Cuối Ngày</h3>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>}
        </div>
        <p style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '16px', fontFamily: LUX.fontSans }}>
          {formatDateInput(today)} • {getNowVN().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
        ) : submitted ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#2D7A4F', marginBottom: '4px', fontFamily: LUX.fontSerif }}>Đã Hoàn Tất Đối Soát</div>
            <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Tất cả mục đã được kiểm tra hôm nay</div>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Tiến độ</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: LUX.taupe, fontFamily: LUX.fontSans }}>{doneCount}/{totalCount}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: LUX.line, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '3px', background: progressPct === 100 ? '#2D7A4F' : LUX.heroGrad, width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Checklist */}
            <div style={{ background: LUX.surface, borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, marginBottom: '16px', overflow: 'hidden' }}>
              {CHECKLIST_ITEMS.map((item, i) => (
                <div key={item.id}>
                  <button
                    onClick={() => handleCheck(item.id)}
                    disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', border: checks[item.id] ? 'none' : `2px solid ${LUX.line}`, background: checks[item.id] ? '#2D7A4F' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'white', flexShrink: 0, transition: 'all 0.15s' }}>
                      {checks[item.id] ? '✓' : ''}
                    </div>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: checks[item.id] ? LUX.ink2 : LUX.ink, fontFamily: LUX.fontSans }}>
                      <span style={{ marginRight: '6px' }}>{item.icon}</span>
                      {item.label}
                    </span>
                    {!checks[item.id] && (
                      <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '600', fontFamily: LUX.fontSans }}>!</span>
                    )}
                  </button>
                  {i < CHECKLIST_ITEMS.length - 1 && <div style={{ height: '1px', background: LUX.line, margin: '0 16px' }} />}
                </div>
              ))}
            </div>

            {/* Ghi chú */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '4px', fontFamily: LUX.fontSans }}>Ghi chú (nếu có)</div>
              <textarea
                value={ghiChu}
                onChange={e => setGhiChu(e.target.value)}
                placeholder="Ví dụ: thiếu hoá đơn điện, chưa nhập CK TP Bank..."
                rows={2}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${LUX.line}`, fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmitAll}
              disabled={saving}
              style={{ width: '100%', padding: '16px', borderRadius: LUX.radius, border: 'none', color: 'white', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', background: progressPct === 100 ? 'linear-gradient(135deg,#2D7A4F,#1A5A3A)' : LUX.ink3, boxShadow: progressPct === 100 ? '0 6px 20px rgba(45,122,79,0.35)' : 'none', transition: 'all 0.2s', fontFamily: LUX.fontSans, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '⏳ Đang lưu...' : progressPct === 100 ? '✅ Hoàn Tất Đối Soát' : `Còn ${totalCount - doneCount} mục chưa kiểm tra`}
            </button>

            {/* Warning */}
            {progressPct < 100 && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: '12px', color: '#C0392B', fontFamily: LUX.fontSans }}>
                  ⚠️ Còn {totalCount - doneCount} mục chưa hoàn tất. Vui lòng kiểm tra đầy đủ trước khi kết thúc ngày.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
