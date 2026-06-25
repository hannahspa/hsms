import React, { useEffect, useState } from 'react'
import { Page, Header, useSnackbar } from 'zmp-ui'
import { api } from '../services/api'

const GIO = []
for (let h = 9; h <= 19; h++) { GIO.push(`${String(h).padStart(2, '0')}:00`); if (h < 19) GIO.push(`${String(h).padStart(2, '0')}:30`) }

function todayISO() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toISOString().slice(0, 10)
}

export default function DatLichPage() {
  const snackbar = useSnackbar()
  const [dvList, setDvList] = useState([])
  const [form, setForm] = useState({ dich_vu_id: '', ngay_hen: todayISO(), gio_hen: '', ghi_chu: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { api.danhSachDichVu().then(d => setDvList(d.dich_vu || [])).catch(() => {}) }, [])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.gio_hen) return snackbar.openSnackbar({ text: 'Vui lòng chọn giờ hẹn', type: 'warning' })
    setSending(true)
    try {
      const dv = dvList.find(d => d.id === form.dich_vu_id)
      await api.datLich({
        dich_vu_id: form.dich_vu_id || null,
        ten_dich_vu: dv?.ten || null,
        thoi_luong_phut: dv?.thoi_luong_phut || 60,
        ngay_hen: form.ngay_hen, gio_hen: form.gio_hen, ghi_chu: form.ghi_chu || null,
      })
      setDone(true)
    } catch (e) {
      snackbar.openSnackbar({ text: e.message, type: 'error' })
    } finally { setSending(false) }
  }

  if (done) {
    return (
      <Page className="hn-page">
        <Header title="Đặt Lịch Hẹn" />
        <div className="hn-empty">
          <div style={{ fontSize: 48 }}>✅</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', margin: '8px 0' }}>Đã gửi yêu cầu đặt lịch!</div>
          <div style={{ fontSize: 13.5 }}>Hannah Spa sẽ liên hệ xác nhận với bạn sớm nhất. Cảm ơn bạn 💛</div>
        </div>
      </Page>
    )
  }

  return (
    <Page className="hn-page">
      <Header title="Đặt Lịch Hẹn" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-sub)' }}>DỊCH VỤ</label>
          <select className="hn-select" style={{ marginTop: 6 }} value={form.dich_vu_id} onChange={e => set('dich_vu_id', e.target.value)}>
            <option value="">— Tư vấn khi đến (chọn sau) —</option>
            {dvList.map(d => <option key={d.id} value={d.id}>{d.ten}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-sub)' }}>NGÀY HẸN</label>
          <input type="date" className="hn-input" style={{ marginTop: 6 }} min={todayISO()} value={form.ngay_hen} onChange={e => set('ngay_hen', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-sub)' }}>GIỜ HẸN</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {GIO.map(g => (
              <button key={g} onClick={() => set('gio_hen', g)}
                style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  border: form.gio_hen === g ? 'none' : '1px solid rgba(160,113,79,.25)',
                  background: form.gio_hen === g ? 'linear-gradient(135deg,#C9A96E,#A0714F)' : '#fff',
                  color: form.gio_hen === g ? '#fff' : 'var(--text-sub)' }}>{g}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-sub)' }}>GHI CHÚ (tuỳ chọn)</label>
          <textarea className="hn-input" style={{ marginTop: 6, height: 64, resize: 'vertical' }} value={form.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} placeholder="VD: đi cùng bạn, yêu cầu KTV…" />
        </div>
        <button className="hn-btn" disabled={sending} onClick={submit}>{sending ? 'Đang gửi…' : '📅 Gửi yêu cầu đặt lịch'}</button>
        <div style={{ fontSize: 11.5, color: 'var(--text-mute)', textAlign: 'center' }}>Spa mở cửa 9:15 – 20:00 mỗi ngày · 39 Nam Kỳ Khởi Nghĩa, Cần Thơ</div>
      </div>
    </Page>
  )
}
