import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, formatCurrencyHide, todayISO, getNowVN, formatDateInput } from '../../../lib/utils'
import ChiTietGiaoDich from './ChiTietGiaoDich'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'

const S = {
  page: { padding: '22px 24px', background: 'var(--bg)', minHeight: '100vh', paddingBottom: 100 },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--line)', color: 'var(--ink2)', padding: '7px 13px 7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)' },
  sectionTitle: { fontSize: 10, letterSpacing: '1.5px', color: 'var(--ink3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12, paddingLeft: 4, fontFamily: 'var(--sans)' },
  statBox: { flex: 1, background: 'var(--surface2)', padding: '16px', borderRadius: 'var(--r)', textAlign: 'center', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' },
  statLabel: { fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 600, fontFamily: 'var(--sans)' },
  statValue: (c) => ({ color: c, fontWeight: 700, fontSize: 16, fontFamily: 'var(--serif)' }),
  txItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--line)', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  txIcon: (loai) => ({ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: loai === 'thu' ? '#F0FDF4' : loai === 'chi' ? '#FEF2F2' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  txName: { fontWeight: 600, fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)' },
  txSub: { fontSize: 11, color: 'var(--ink3)', marginTop: 2, fontFamily: 'var(--sans)' },
  txAmount: (loai) => ({ fontWeight: 700, fontSize: 14, color: loai === 'thu' ? '#2D7A4F' : loai === 'chi' ? '#C0392B' : '#6C3483', textAlign: 'right', fontFamily: 'var(--serif)' }),
  // Date picker modal
  pickOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(42,32,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 999 },
  pickSheet: { background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 520, margin: '0 auto', padding: '24px 20px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(42,32,26,0.35)' },
  pickHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickTitle: { fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)' },
  closeBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)', padding: 4, lineHeight: 1 },
  quickGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  quickBtn: { padding: '14px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--surface2)', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 14 },
  dateBtn: (active) => ({ background: 'var(--surface2)', borderRadius: 'var(--r-sm)', padding: 14, border: `1.5px solid ${active ? 'var(--espresso)' : 'var(--line)'}`, textAlign: 'left', cursor: 'pointer', transition: 'border-color .15s' }),
  dateBtnLabel: { fontSize: 10, color: 'var(--ink3)', marginBottom: 6, fontFamily: 'var(--sans)' },
  dateBtnValue: { fontWeight: 700, color: 'var(--ink)', fontSize: 15, fontFamily: 'var(--sans)' },
  applyBtn: { width: '100%', padding: 16, borderRadius: 'var(--r)', background: 'var(--grad-gold)', color: '#fff', fontWeight: 700, border: 'none', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--sans)' },
}

function getGDLabel(item) {
  if (item.loai === 'chuyen_khoan') return `${item.ten_vi_tu || '?'} → ${item.ten_vi_den || '?'}`
  const map = {
    tien_mat: 'Tiền Mặt',
    chuyen_khoan: 'Chuyển Khoản',
    quet_the: 'Quẹt Thẻ',
    the_tra_truoc: 'Thẻ Trả Trước',
  }
  return map[item.hinh_thuc] || item.mo_ta || 'Giao dịch'
}

export default function TaiKhoanPage({ user }) {
  const [viList, setViList] = useState([])
  const [history, setHistory] = useState([])
  const [selectedVi, setSelectedVi] = useState(null)
  const [selectedGD, setSelectedGD] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)

  const today = todayISO()
  const firstDayOfMonth = today.slice(0, 8) + '01'
  const [startDate, setStartDate] = useState(firstDayOfMonth)
  const [endDate, setEndDate] = useState(today)

  const isAdmin = user?.vai_tro === 'admin'

  useEffect(() => {
    async function loadData() {
      try {
        const [viRes, histRes] = await Promise.all([
          supabase.from('so_du_vi_thuc_te').select('*').order('thu_tu'),
          supabase.from('lich_su_giao_dich_tong_hop').select('*').order('ngay', { ascending: false }),
        ])
        setViList(viRes.data || [])
        setHistory(histRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredHistory = useMemo(() => {
    let base = selectedVi
      ? history.filter(h => h.vi_id === selectedVi.id || h.vi_den_id === selectedVi.id)
      : history
    return base.filter(item => item.ngay >= startDate && item.ngay <= endDate)
  }, [history, selectedVi, startDate, endDate])

  const stats = useMemo(() => ({
    thu: filteredHistory.filter(h => h.loai === 'thu').reduce((s, h) => s + h.so_tien, 0),
    chi: filteredHistory.filter(h => h.loai === 'chi').reduce((s, h) => s + h.so_tien, 0),
  }), [filteredHistory])

  const applyQuickDate = (type) => {
    const d = getNowVN()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const iso = d.toISOString().split('T')[0]
    if (type === 'hom_nay') { setStartDate(iso); setEndDate(iso) }
    else if (type === 'hom_qua') {
      const y = new Date(d); y.setDate(y.getDate() - 1)
      setStartDate(y.toISOString().split('T')[0]); setEndDate(y.toISOString().split('T')[0])
    } else if (type === 'thang_nay') {
      setStartDate(iso.slice(0, 8) + '01'); setEndDate(iso)
    } else if (type === 'thang_truoc') {
      const lm = new Date(d.getFullYear(), d.getMonth() - 1, 1)
      const ld = new Date(d.getFullYear(), d.getMonth(), 0)
      lm.setMinutes(lm.getMinutes() - lm.getTimezoneOffset())
      ld.setMinutes(ld.getMinutes() - ld.getTimezoneOffset())
      setStartDate(lm.toISOString().split('T')[0])
      setEndDate(ld.toISOString().split('T')[0])
    }
    setShowDatePicker(false)
  }

  // ── Chi tiết giao dịch ──
  if (selectedGD) return (
    <ChiTietGiaoDich
      giaoDich={selectedGD}
      user={user}
      viList={viList}
      onBack={() => setSelectedGD(null)}
      onUpdated={() => {
        setSelectedGD(null)
        supabase.from('lich_su_giao_dich_tong_hop').select('*').order('ngay', { ascending: false })
          .then(r => setHistory(r.data || []))
      }}
    />
  )

  // ── DatePicker modal ──
  if (showDatePicker) return (
    <div style={S.pickOverlay} onClick={() => { setShowDatePicker(false); setShowStartPicker(false); setShowEndPicker(false) }}>
      <DatePicker open={showStartPicker} selectedDate={startDate} onClose={() => setShowStartPicker(false)} onConfirm={(d) => { setStartDate(d); setShowStartPicker(false) }} />
      <DatePicker open={showEndPicker} selectedDate={endDate} onClose={() => setShowEndPicker(false)} onConfirm={(d) => { setEndDate(d); setShowEndPicker(false) }} />

      <div style={S.pickSheet} onClick={e => e.stopPropagation()}>
        <div style={S.pickHeader}>
          <h3 style={S.pickTitle}>Chọn thời gian</h3>
          <button style={S.closeBtn} onClick={() => setShowDatePicker(false)}>&times;</button>
        </div>

        <div style={S.quickGrid}>
          {[
            { label: 'Hôm nay', type: 'hom_nay' },
            { label: 'Hôm qua', type: 'hom_qua' },
            { label: 'Tháng này', type: 'thang_nay' },
            { label: 'Tháng trước', type: 'thang_truoc' },
          ].map(item => (
            <button key={item.type} onClick={() => applyQuickDate(item.type)} style={S.quickBtn}>{item.label}</button>
          ))}
        </div>

        <div style={S.sectionTitle}>Khoảng tùy chọn</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <button onClick={() => { setShowEndPicker(false); setShowStartPicker(true) }} style={S.dateBtn(showStartPicker)}>
            <div style={S.dateBtnLabel}>Từ ngày</div>
            <div style={S.dateBtnValue}>{formatDateInput(startDate)}</div>
          </button>
          <button onClick={() => { setShowStartPicker(false); setShowEndPicker(true) }} style={S.dateBtn(showEndPicker)}>
            <div style={S.dateBtnLabel}>Đến ngày</div>
            <div style={S.dateBtnValue}>{formatDateInput(endDate)}</div>
          </button>
        </div>

        <button onClick={() => setShowDatePicker(false)} style={S.applyBtn}>Áp dụng</button>
      </div>
    </div>
  )

  const viIcons = { tien_mat: '💵', chuyen_khoan: '🏦', quet_the: '💳' }
  const viGradients = {
    tien_mat: 'linear-gradient(180deg,#e0eedd,#bfd5b8)',
    chuyen_khoan: 'linear-gradient(180deg,#dde9f3,#a8c5dc)',
    quet_the: 'linear-gradient(180deg,#f0dcc0,#d4a574)',
  }

  // ── Chi tiết ví ──
  if (selectedVi) return (
    <div style={S.page}>
      <button onClick={() => setSelectedVi(null)} style={S.backBtn}>
        <I.ArrowLeft style={{ width: 12, height: 12 }} /> Quay lại
      </button>

      {/* Wallet hero card */}
      <div style={{ background: 'var(--grad-gold)', borderRadius: 'var(--r-lg)', padding: 24, color: '#fff', margin: '16px 0 20px', boxShadow: 'var(--sh-2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 120, opacity: 0.08 }}>{viIcons[selectedVi.loai] || '💰'}</div>
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, fontFamily: 'var(--serif)' }}>{selectedVi.ten}</h2>
          <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: 'var(--sans)' }}>Số dư hiện tại</div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-1px', fontFamily: 'var(--serif)' }}>
            {isAdmin ? formatCurrency(selectedVi.so_du_hien_tai) : formatCurrencyHide()}
          </div>
        </div>
      </div>

      {/* Date filter */}
      <button onClick={() => setShowDatePicker(true)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--surface2)', borderRadius: 'var(--r)', border: '1px solid var(--line)', marginBottom: 16, boxShadow: 'var(--sh-1)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <I.Calendar style={{ width: 18, height: 18, color: 'var(--espresso)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600, fontFamily: 'var(--sans)' }}>Thời gian hiển thị</div>
            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)' }}>{formatDateInput(startDate)} — {formatDateInput(endDate)}</div>
          </div>
        </div>
        <span style={{ color: 'var(--espresso)', fontSize: 20 }}>&rsaquo;</span>
      </button>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'TỔNG THU', value: stats.thu, color: '#2D7A4F' },
          { label: 'TỔNG CHI', value: stats.chi, color: '#C0392B' },
        ].map(item => (
          <div key={item.label} style={S.statBox}>
            <div style={S.statLabel}>{item.label}</div>
            <div style={S.statValue(item.color)}>{isAdmin ? formatCurrency(item.value) : formatCurrencyHide()}</div>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      <div className="card">
        <div className="card-h">
          <div className="card-t">
            <div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
            <h3>Chi tiết giao dịch</h3>
            <span className="sub">{filteredHistory.length} giao dịch</span>
          </div>
        </div>
        <div className="card-b" style={{ padding: 0 }}>
          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink3)', fontSize: 13, fontFamily: 'var(--sans)' }}>
              Không có giao dịch trong khoảng thời gian này
            </div>
          ) : (
            filteredHistory.map((item, i) => (
              <button
                key={item.id || i}
                onClick={() => setSelectedGD(item)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < filteredHistory.length - 1 ? '1px solid var(--line)' : 'none', width: '100%', background: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={S.txIcon(item.loai)}>
                    {item.loai === 'thu' ? <I.TrendUp style={{ width: 16, height: 16, color: '#2D7A4F' }} /> :
                     item.loai === 'chi' ? <I.TrendDown style={{ width: 16, height: 16, color: '#C0392B' }} /> :
                     <I.Bank style={{ width: 16, height: 16, color: '#6C3483' }} />}
                  </div>
                  <div>
                    <div style={S.txName}>{getGDLabel(item)}</div>
                    <div style={S.txSub}>
                      {formatDateInput(item.ngay)}{item.dien_giai ? ` · ${item.dien_giai}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={S.txAmount(item.loai)}>
                    {item.loai === 'chi' ? '-' : item.loai === 'thu' ? '+' : ''}{formatCurrency(item.so_tien)}
                  </div>
                  <span style={{ color: 'var(--ink3)', fontSize: 14 }}>&rsaquo;</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)', fontSize: 14, fontFamily: 'var(--sans)' }}>
      Đang tải dữ liệu tài khoản...
    </div>
  )

  // ── Main list ──
  return (
    <div style={S.page}>
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Tài Khoản</div>
          <div className="sub">{viList.length} ví · Số dư cập nhật realtime</div>
        </div>
        <div className="acts">
          <button className="btn gold" onClick={() => window.location.reload()}>
            <I.Spark style={{ width: 13, height: 13 }} /> Làm mới
          </button>
        </div>
      </div>

      <div className="wallets" style={{ marginBottom: 16 }}>
        {viList.map(vi => (
          <button
            key={vi.id}
            onClick={() => setSelectedVi(vi)}
            className={`wallet ${vi.loai === 'tien_mat' ? 'cash' : vi.loai === 'chuyen_khoan' ? 'bank' : 'epay'}`}
            style={{ cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit', border: 'none' }}
          >
            <div>
              <div className="nm">{vi.ten}</div>
              <div className="vl">
                {isAdmin ? formatCurrency(vi.so_du_hien_tai) : formatCurrencyHide()}
                <span className="cur">đ</span>
              </div>
            </div>
            <div className="sb">Chạm để xem chi tiết</div>
          </button>
        ))}
      </div>
    </div>
  )
}
