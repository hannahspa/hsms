import React, { useState } from 'react'
import { Page, Header, useSnackbar } from 'zmp-ui'
import { api } from '../services/api'

export default function VongQuayPage() {
  const snackbar = useSnackbar()
  const [spinning, setSpinning] = useState(false)
  const [ketqua, setKetqua] = useState(null)   // { code, ten_nhom, phan_tram }
  const [daQuay, setDaQuay] = useState(false)

  const quay = async () => {
    setSpinning(true)
    try {
      const d = await api.vongQuay()
      // hiệu ứng quay ~1.6s
      await new Promise(r => setTimeout(r, 1600))
      if (d.da_quay_hom_nay) {
        setDaQuay(true)
        setKetqua(d.voucher)
        snackbar.openSnackbar({ text: d.message || 'Hôm nay bạn đã quay rồi!', type: 'info' })
      } else {
        setKetqua(d.voucher)
      }
    } catch (e) {
      snackbar.openSnackbar({ text: e.message, type: 'error' })
    } finally { setSpinning(false) }
  }

  return (
    <Page className="hn-page">
      <Header title="Vòng Quay May Mắn" />
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 84, lineHeight: 1.1, margin: '10px 0' }} className={spinning ? 'spin' : ''}>🎡</div>

        {ketqua ? (
          <div className="hn-card" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
              {daQuay ? '🎟️ Voucher hôm nay của bạn' : '🎉 Chúc mừng! Bạn trúng:'}
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, margin: '6px 0', color: 'var(--espresso)' }}>Giảm {ketqua.phan_tram}%</div>
            <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{ketqua.ten_nhom}</div>
            <div style={{ background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#fff', borderRadius: 10, padding: '10px 12px', marginTop: 12, fontWeight: 800, letterSpacing: 1, fontSize: 17 }}>
              {ketqua.code}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 10 }}>Đọc mã cho lễ tân khi thanh toán để được giảm. Xem lại ở mục “Voucher Của Tôi”.</div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--text-sub)', maxWidth: 280, margin: '0 auto 18px' }}>
            Mỗi ngày 1 lượt quay — nhận ngay voucher giảm giá dùng tại Hannah Spa!
          </div>
        )}

        {!ketqua && (
          <button className="hn-btn" style={{ marginTop: 20 }} disabled={spinning} onClick={quay}>
            {spinning ? 'Đang quay…' : '🎰 QUAY NGAY'}
          </button>
        )}
      </div>
    </Page>
  )
}
