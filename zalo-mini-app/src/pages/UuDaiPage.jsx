import React, { useEffect, useState } from 'react'
import { Page } from 'zmp-ui'
import BottomNav from '../components/BottomNav'
import { api } from '../services/api'
import { fmt, fmtDate, kmBadge } from '../lib/format'

export default function UuDaiPage() {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    api.uuDai().then(d => setState({ loading: false, list: d.uu_dai || [] })).catch(e => setState({ loading: false, error: e.message }))
  }, [])

  return (
    <Page className="hn-page hn-has-nav">
      <div className="hn-top"><div className="brand" style={{ fontSize: 21 }}>Ưu Đãi</div><div className="sub">Khuyến mãi đang áp dụng tại Hannah Spa</div></div>
      <div style={{ padding: 16 }}>
        {state.loading ? (
          <div className="hn-empty">Đang tải ưu đãi…</div>
        ) : state.error ? (
          <div className="hn-empty">⚠️ {state.error}</div>
        ) : !state.list?.length ? (
          <div className="hn-empty">Hiện chưa có ưu đãi nào.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {state.list.map(km => (
              <div key={km.id} className="hn-card" style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                <div style={{ flex: '0 0 70px', borderRadius: 12, background: 'var(--grad)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26 }}>🏷️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.3 }}>{km.ten}</div>
                  {km.mo_ta && <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 3 }}>{km.mo_ta}</div>}
                  <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 4 }}>
                    Áp dụng đến {fmtDate(km.ngay_ket_thuc)}
                  </div>
                  <div style={{ display: 'inline-block', marginTop: 7, background: '#FDECEA', color: '#C0392B', fontWeight: 800, fontSize: 13, padding: '4px 12px', borderRadius: 8 }}>
                    {kmBadge(km)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="uudai" />
    </Page>
  )
}
