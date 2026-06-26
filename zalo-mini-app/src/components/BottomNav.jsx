import React from 'react'
import { useNavigate } from 'zmp-ui'

// Thanh điều hướng 5 mục giống MySpa, tone Hannah Luxury. Nút giữa (Đặt hẹn) nổi.
export default function BottomNav({ active }) {
  const navigate = useNavigate()
  const go = (p) => navigate(p, { animate: false })
  const Item = ({ id, icon, label, path }) => (
    <div className={`nv${active === id ? ' on' : ''}`} onClick={() => go(path)}>
      <span className="i">{icon}</span>
      <span className="l">{label}</span>
    </div>
  )
  return (
    <div className="hn-nav">
      <Item id="home"     icon="🏠" label="Trang chủ" path="/" />
      <Item id="uudai"    icon="🎁" label="Ưu đãi"    path="/uu-dai" />
      <div className="nv center" onClick={() => go('/dat-lich')}>
        <span className="fab">📅</span>
        <span className="l">Đặt hẹn</span>
      </div>
      <Item id="chat"     icon="💬" label="Chat"      path="/chat" />
      <Item id="taikhoan" icon="👤" label="Tài khoản" path="/tai-khoan" />
    </div>
  )
}
