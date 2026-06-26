import React, { useState } from 'react'
import { Page, Header, useSnackbar, useNavigate } from 'zmp-ui'
import { api } from '../services/api'

export default function DanhGiaPage() {
  const snackbar = useSnackbar()
  const navigate = useNavigate()
  const [sao, setSao] = useState(0)
  const [noi, setNoi] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const gui = async () => {
    if (!sao) return snackbar.openSnackbar({ text: 'Vui lòng chọn số sao', type: 'warning' })
    setSending(true)
    try {
      await api.danhGia({ so_sao: sao, noi_dung: noi || null })
      setDone(true)
    } catch (e) {
      snackbar.openSnackbar({ text: e.message, type: 'error' })
    } finally { setSending(false) }
  }

  if (done) {
    return (
      <Page className="hn-page">
        <Header title="Đánh giá" />
        <div className="hn-empty">
          <div style={{ fontSize: 48 }}>💛</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', margin: '8px 0' }}>Cảm ơn bạn đã đánh giá!</div>
          <div style={{ fontSize: 13.5 }}>Phản hồi của bạn giúp Hannah Spa phục vụ tốt hơn.</div>
          <div style={{ marginTop: 16 }}><button className="hn-btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => navigate('/tai-khoan')}>Về Tài khoản</button></div>
        </div>
      </Page>
    )
  }

  return (
    <Page className="hn-page">
      <Header title="Đánh giá Hannah Spa" />
      <div style={{ padding: 20 }}>
        <div className="hn-card" style={{ textAlign: 'center', padding: '24px 18px' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>Bạn hài lòng với Hannah Spa chứ?</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} onClick={() => setSao(i)} style={{ fontSize: 38, cursor: 'pointer', filter: i <= sao ? 'none' : 'grayscale(1)', opacity: i <= sao ? 1 : .35 }}>⭐</span>
            ))}
          </div>
          <textarea className="hn-input" style={{ height: 90, resize: 'vertical', textAlign: 'left' }} value={noi} onChange={e => setNoi(e.target.value)} placeholder="Chia sẻ cảm nhận của bạn (tuỳ chọn)…" />
          <button className="hn-btn" style={{ marginTop: 16 }} disabled={sending} onClick={gui}>{sending ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
        </div>
      </div>
    </Page>
  )
}
