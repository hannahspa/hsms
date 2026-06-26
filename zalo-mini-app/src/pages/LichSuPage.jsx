import React, { useEffect, useState } from 'react'
import { Page, Header } from 'zmp-ui'
import { api } from '../services/api'
import { fmt, fmtDate } from '../lib/format'

export default function LichSuPage() {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    api.lichSuDichVu().then(d => setState({ loading: false, list: d.lich_su || [] })).catch(e => setState({ loading: false, error: e.message }))
  }, [])

  return (
    <Page className="hn-page">
      <Header title="Lịch sử dịch vụ" />
      <div style={{ padding: 16 }}>
        {state.loading ? <div className="hn-empty">Đang tải…</div>
          : state.error ? <div className="hn-empty">⚠️ {state.error}</div>
          : !state.list?.length ? <div className="hn-empty">Chưa có lịch sử dịch vụ.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {state.list.map(d => (
                <div key={d.id} className="hn-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>🗓 {fmtDate(d.ngay)}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>{d.ma_don}</div>
                  </div>
                  {d.dich_vu?.length > 0 && (
                    <div style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 7, lineHeight: 1.5 }}>
                      {d.dich_vu.map((t, i) => <div key={i}>• {t}</div>)}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text-sub)' }}>{d.thuc_thu > 0 ? fmt(d.thuc_thu) : 'Dùng thẻ'}</span>
                    {d.con_no > 0 && <span style={{ color: '#C0392B', fontWeight: 700 }}>Còn nợ {fmt(d.con_no)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </Page>
  )
}
