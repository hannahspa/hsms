import React, { useEffect, useState } from 'react'
import { Page, useNavigate } from 'zmp-ui'
import BottomNav from '../components/BottomNav'
import { api } from '../services/api'
import { fmt } from '../lib/format'

const QUICK = [
  { ic: '🎫', lb: 'Thẻ Của Tôi', path: '/the' },
  { ic: '🎟️', lb: 'Voucher',     path: '/voucher' },
  { ic: '🎰', lb: 'Vòng Quay',   path: '/vong-quay' },
  { ic: '🕘', lb: 'Lịch Sử',     path: '/lich-su' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [dv, setDv] = useState([])

  useEffect(() => {
    api.danhSachDichVu().then(d => setDv((d.dich_vu || []).slice(0, 10))).catch(() => {})
  }, [])

  return (
    <Page className="hn-page hn-has-nav">
      <div className="hn-top">
        <div className="brand">Hannah Beauty &amp; Spa</div>
        <div className="sub">Chăm sóc sắc đẹp cao cấp · Cần Thơ</div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {/* Banner */}
        <div style={{ background: 'var(--grad)', borderRadius: 18, padding: '18px 18px', color: '#fff', boxShadow: '0 6px 20px rgba(125,90,60,.22)' }}>
          <div className="hn-serif" style={{ fontSize: 21, fontWeight: 700 }}>Đặc quyền thành viên</div>
          <div style={{ fontSize: 13, opacity: .93, marginTop: 4 }}>Quay thưởng mỗi ngày · nhận voucher ưu đãi riêng</div>
          <button onClick={() => navigate('/vong-quay')} style={{ marginTop: 12, background: '#fff', color: 'var(--primary)', border: 'none', borderRadius: 999, padding: '8px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>🎰 Quay ngay</button>
        </div>

        {/* Shortcut */}
        <div className="hn-quick" style={{ marginTop: 16 }}>
          {QUICK.map(q => (
            <div key={q.path} className="it" onClick={() => navigate(q.path)}>
              <span className="ic">{q.ic}</span>
              <span className="lb">{q.lb}</span>
            </div>
          ))}
        </div>

        {/* Dịch vụ nổi bật */}
        <div className="hn-sec-head">
          <span className="t">Dịch vụ nổi bật</span>
          <span className="m" onClick={() => navigate('/dat-lich')}>Đặt hẹn →</span>
        </div>
        <div className="hn-hscroll">
          {dv.map(d => (
            <div key={d.id} className="hn-dv" onClick={() => navigate('/dat-lich')}>
              <div className="thumb">💆</div>
              <div className="nm">{d.ten}</div>
              <div className="pr">{fmt(d.gia_co_ban)}</div>
            </div>
          ))}
          {!dv.length && <div style={{ color: 'var(--text-mute)', fontSize: 13, padding: 12 }}>Đang tải…</div>}
        </div>

        {/* Thông tin spa */}
        <div className="hn-card" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>📍 Hannah Beauty &amp; Spa</div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ<br />
            🕘 Mở cửa 9:15 – 20:00 mỗi ngày
          </div>
        </div>
      </div>

      <BottomNav active="home" />
    </Page>
  )
}
