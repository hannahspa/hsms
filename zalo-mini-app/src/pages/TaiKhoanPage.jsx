import React, { useEffect, useState } from 'react'
import { Page, useNavigate, useSnackbar } from 'zmp-ui'
import BottomNav from '../components/BottomNav'
import { api } from '../services/api'
import { OA_ID } from '../config'

const MENU = [
  { ic: '🎫', tx: 'Thẻ liệu trình',  path: '/the' },
  { ic: '📅', tx: 'Lịch hẹn của tôi', path: '/lich-hen' },
  { ic: '🕘', tx: 'Lịch sử dịch vụ',  path: '/lich-su' },
  { ic: '🎟️', tx: 'Voucher của tôi',  path: '/voucher' },
  { ic: '🎰', tx: 'Vòng quay may mắn', path: '/vong-quay' },
  { ic: '⭐', tx: 'Đánh giá ứng dụng', path: '/danh-gia' },
]

export default function TaiKhoanPage() {
  const navigate = useNavigate()
  const snackbar = useSnackbar()
  const [kh, setKh] = useState(null)
  const [soThe, setSoThe] = useState(0)

  useEffect(() => {
    api.theCuaToi().then(d => { setKh(d.khach); setSoThe((d.the || []).length) }).catch(() => {})
  }, [])

  const quanTamOA = async () => {
    try {
      const { followOA } = await import('zmp-sdk/apis')
      await followOA({ id: OA_ID })
      snackbar.openSnackbar({ text: 'Cảm ơn bạn đã quan tâm Hannah Spa! 💛', type: 'success' })
    } catch {
      window.open(`https://oa.zalo.me/${OA_ID}`, '_blank')
    }
  }

  return (
    <Page className="hn-page hn-has-nav">
      <div className="hn-top" style={{ paddingBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.22)', display: 'grid', placeItems: 'center', fontSize: 26 }}>👤</div>
          <div>
            <div className="hn-serif" style={{ fontSize: 21, fontWeight: 700 }}>{kh?.ho_ten || 'Khách quý'}</div>
            <div className="sub">{soThe > 0 ? `${soThe} thẻ liệu trình đang dùng` : 'Thành viên Hannah Spa'}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div className="hn-card" style={{ display: 'flex', gap: 10 }}>
          <button className="hn-btn" style={{ flex: 1, fontSize: 13.5, padding: 11 }} onClick={quanTamOA}>💗 Quan tâm OA</button>
          <button className="hn-btn ghost" style={{ flex: 1, fontSize: 13.5, padding: 11 }} onClick={() => navigate('/danh-gia')}>⭐ Đánh giá</button>
        </div>

        <div className="hn-card" style={{ marginTop: 14, padding: '4px 14px' }}>
          {MENU.map(m => (
            <div key={m.path} className="hn-row" onClick={() => navigate(m.path)}>
              <span className="ic">{m.ic}</span>
              <span className="tx">{m.tx}</span>
              <span className="ar">›</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-mute)', fontSize: 11.5, marginTop: 18 }}>
          Hannah Beauty &amp; Spa · 39 Nam Kỳ Khởi Nghĩa, Cần Thơ
        </div>
      </div>
      <BottomNav active="taikhoan" />
    </Page>
  )
}
