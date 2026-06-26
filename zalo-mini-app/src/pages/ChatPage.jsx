import React from 'react'
import { Page } from 'zmp-ui'
import BottomNav from '../components/BottomNav'
import { OA_ID } from '../config'

export default function ChatPage() {
  const moChat = async () => {
    try {
      const { openChat } = await import('zmp-sdk/apis')
      await openChat({ type: 'oa', id: OA_ID })
    } catch {
      window.open(`https://oa.zalo.me/${OA_ID}`, '_blank')
    }
  }

  return (
    <Page className="hn-page hn-has-nav">
      <div className="hn-top"><div className="brand" style={{ fontSize: 21 }}>Chat với Hannah</div><div className="sub">Tư vấn dịch vụ · đặt lịch · hỏi đáp</div></div>
      <div style={{ padding: 20 }}>
        <div className="hn-card" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 52 }}>💬</div>
          <div style={{ fontWeight: 800, fontSize: 17, margin: '10px 0 6px' }}>Cần Hannah hỗ trợ?</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-sub)', lineHeight: 1.55, marginBottom: 18 }}>
            Nhắn tin trực tiếp với Hannah Beauty &amp; Spa để được tư vấn dịch vụ, đặt lịch hẹn hoặc giải đáp mọi thắc mắc.
          </div>
          <button className="hn-btn" onClick={moChat}>Nhắn tin cho Hannah</button>
        </div>

        <div className="hn-card" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>🕘 Giờ làm việc</div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>9:15 – 20:00 mỗi ngày (ngưng nhận khách 19:30)</div>
        </div>
      </div>
      <BottomNav active="chat" />
    </Page>
  )
}
