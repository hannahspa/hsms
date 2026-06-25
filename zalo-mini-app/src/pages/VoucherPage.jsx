import React, { useEffect, useState } from 'react'
import { Page, Header } from 'zmp-ui'
import { api } from '../services/api'

const fmtDate = d => d ? d.split('-').reverse().join('/') : ''

export default function VoucherPage() {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    api.voucherCuaToi()
      .then(d => setState({ loading: false, voucher: d.voucher || [] }))
      .catch(e => setState({ loading: false, error: e.message }))
  }, [])

  return (
    <Page className="hn-page">
      <Header title="Voucher Của Tôi" />
      <div style={{ padding: 16 }}>
        {state.loading ? (
          <div className="hn-empty">Đang tải voucher…</div>
        ) : state.error ? (
          <div className="hn-empty">⚠️ {state.error}</div>
        ) : !state.voucher?.length ? (
          <div className="hn-empty">Bạn chưa có voucher nào. Hãy thử <b>Vòng Quay May Mắn</b> nhé! 🎰</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {state.voucher.map(v => (
              <div key={v.code} style={{ position: 'relative', background: 'linear-gradient(135deg,#C9A96E,#A0714F 60%,#7D5A3C)', color: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 6px 22px rgba(125,90,60,.25)' }}>
                <div style={{ fontSize: 13, opacity: .9 }}>{v.ten_nhom}</div>
                <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.1, margin: '4px 0' }}>Giảm {v.phan_tram}%</div>
                <div style={{ background: 'rgba(255,255,255,.18)', borderRadius: 10, padding: '8px 12px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, letterSpacing: 1, fontSize: 16 }}>{v.code}</span>
                  <span style={{ fontSize: 11, opacity: .92 }}>HSD {fmtDate(v.han_dung)}</span>
                </div>
                <div style={{ fontSize: 11.5, opacity: .9, marginTop: 8 }}>Đọc mã này cho lễ tân khi thanh toán tại spa để được giảm giá.</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
