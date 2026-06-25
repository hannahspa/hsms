import React from 'react'
import { Page, useNavigate } from 'zmp-ui'

const TILES = [
  { path: '/the',       ic: '🎫', lb: 'Thẻ Liệu Trình' },
  { path: '/dat-lich',  ic: '📅', lb: 'Đặt Lịch Hẹn' },
  { path: '/voucher',   ic: '🎟️', lb: 'Voucher Của Tôi' },
  { path: '/vong-quay', ic: '🎰', lb: 'Vòng Quay May Mắn' },
]

export default function HomePage() {
  const navigate = useNavigate()
  return (
    <Page className="hn-page">
      <div className="hn-hero">
        <div className="hn-serif" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '.5px' }}>Hannah Beauty &amp; Spa</div>
        <div style={{ opacity: .92, marginTop: 6, fontSize: 13.5 }}>
          Chăm sóc sắc đẹp cao cấp · 39 Nam Kỳ Khởi Nghĩa, Cần Thơ
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {TILES.map(t => (
            <div key={t.path} className="hn-tile" onClick={() => navigate(t.path)}>
              <span className="ic">{t.ic}</span>
              <span className="lb">{t.lb}</span>
            </div>
          ))}
        </div>

        <div className="hn-card" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>💆 Hannah luôn nhớ bạn</div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>
            Theo dõi thẻ liệu trình còn lại, đặt lịch nhanh, nhận voucher ưu đãi và quay thưởng mỗi ngày ngay trong Zalo.
          </div>
        </div>
      </div>
    </Page>
  )
}
