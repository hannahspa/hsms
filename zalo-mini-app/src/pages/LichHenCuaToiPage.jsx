import React, { useEffect, useState } from 'react'
import { Page, Header, useNavigate } from 'zmp-ui'
import { api } from '../services/api'
import { fmtDate, TT_LICH } from '../lib/format'

export default function LichHenCuaToiPage() {
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    api.lichHenCuaToi().then(d => setState({ loading: false, list: d.lich_hen || [] })).catch(e => setState({ loading: false, error: e.message }))
  }, [])

  return (
    <Page className="hn-page">
      <Header title="Lịch hẹn của tôi" />
      <div style={{ padding: 16 }}>
        {state.loading ? <div className="hn-empty">Đang tải…</div>
          : state.error ? <div className="hn-empty">⚠️ {state.error}</div>
          : !state.list?.length ? (
            <div className="hn-empty">
              Bạn chưa có lịch hẹn nào.
              <div style={{ marginTop: 14 }}><button className="hn-btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => navigate('/dat-lich')}>📅 Đặt lịch ngay</button></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {state.list.map(l => {
                const tt = TT_LICH[l.trang_thai] || TT_LICH.cho_xac_nhan
                return (
                  <div key={l.id} className="hn-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5 }}>{l.ten_dich_vu || 'Tư vấn khi đến'}</div>
                      <span style={{ background: tt.bg, color: tt.c, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap' }}>{tt.lb}</span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 700, marginTop: 8 }}>🗓 {fmtDate(l.ngay_hen)} · {l.gio_hen}</div>
                    {l.ghi_chu && <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 6 }}>Ghi chú: {l.ghi_chu}</div>}
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </Page>
  )
}
