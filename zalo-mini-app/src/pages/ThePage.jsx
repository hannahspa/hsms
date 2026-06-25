import React, { useEffect, useState } from 'react'
import { Page, Header } from 'zmp-ui'
import { api } from '../services/api'

const fmt = n => n ? new Intl.NumberFormat('vi-VN').format(n) + 'đ' : '—'
const fmtDate = d => d ? d.split('-').reverse().join('/') : ''
const TT = {
  active:   { lb: 'Đang dùng', bg: '#E8F5E9', c: '#2D7A4F' },
  het_buoi: { lb: 'Hết buổi',  bg: '#F0F0F0', c: '#777' },
  het_han:  { lb: 'Hết hạn',   bg: '#FDECEA', c: '#C0392B' },
}

export default function ThePage() {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    api.theCuaToi()
      .then(d => setState({ loading: false, khach: d.khach, the: d.the || [], message: d.message }))
      .catch(e => setState({ loading: false, error: e.message }))
  }, [])

  return (
    <Page className="hn-page">
      <Header title="Thẻ Liệu Trình" />
      <div style={{ padding: 16 }}>
        {state.loading ? (
          <div className="hn-empty">Đang tải thẻ của bạn…</div>
        ) : state.error ? (
          <div className="hn-empty">⚠️ {state.error}</div>
        ) : !state.the?.length ? (
          <div className="hn-empty">{state.message || 'Bạn chưa có thẻ liệu trình nào.'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {state.khach && <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>Xin chào, {state.khach.ho_ten} 👋</div>}
            {state.the.map(t => {
              const tt = TT[t.trang_thai] || TT.active
              const pct = t.so_buoi_tong ? Math.round((t.so_buoi_da_dung / t.so_buoi_tong) * 100) : 0
              return (
                <div key={t.id} className="hn-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.35 }}>{t.ten_dich_vu}</div>
                    <span style={{ background: tt.bg, color: tt.c, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{tt.lb}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{t.so_buoi_con_lai}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>/ {t.so_buoi_tong} buổi còn lại</span>
                  </div>
                  <div style={{ height: 6, background: '#EFE7DE', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#C9A96E,#A0714F)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-sub)', marginTop: 8 }}>
                    {t.ma_the && <span>Mã: {t.ma_the}</span>}
                    {t.ngay_het_han && <span>HSD: {fmtDate(t.ngay_het_han)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Page>
  )
}
