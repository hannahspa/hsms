import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, todayISO } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const moneyText = {
  fontFamily: 'var(--sans)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-.01em',
  lineHeight: 1.05,
}
const sectionTitle = {
  fontFamily: 'var(--sans)',
  fontSize: 15,
  fontWeight: 750,
  letterSpacing: 0,
  color: 'var(--ink)',
}

const methodMeta = {
  tien_mat: { label: 'Tiền Mặt', short: 'TM', icon: '💵', color: '#3e5a32', bg: '#eef5e8' },
  chuyen_khoan: { label: 'MB Bank', short: 'MB', icon: '🏦', color: '#1a4f70', bg: '#e8f1f6' },
  quet_the: { label: 'TP Bank', short: 'TP', icon: '💳', color: '#5e2f74', bg: '#f1eaf4' },
  the_tra_truoc: { label: 'Thẻ Trả Trước', short: 'TTT', icon: '🎫', color: '#8a6a52', bg: '#f6efe4' },
}

function daysInMonth(year, month) {
  if (month === 2) {
    return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function addDaysISO(iso, delta) {
  let [year, month, day] = String(iso).split('-').map(Number)
  day += delta
  while (day < 1) {
    month -= 1
    if (month < 1) {
      year -= 1
      month = 12
    }
    day += daysInMonth(year, month)
  }
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month)
    month += 1
    if (month > 12) {
      year += 1
      month = 1
    }
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getWeekday(iso) {
  let [year, month, day] = String(iso).split('-').map(Number)
  if (month < 3) {
    month += 12
    year -= 1
  }
  const k = year % 100
  const j = Math.floor(year / 100)
  const h = (day + Math.floor((13 * (month + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7
  return (h + 6) % 7
}

function formatDateFull(iso) {
  const [year, month, day] = String(iso).split('-').map(Number)
  return `${DAYS[getWeekday(iso)]}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'
}

function StatCard({ label, value, note, tone = 'dark' }) {
  const colors = {
    dark: 'var(--ink)',
    gold: 'var(--espresso)',
    good: '#3e5a32',
    bad: '#843a23',
  }
  return (
    <div className="it" style={{ minHeight: 104, padding: '20px 22px' }}>
      <div className="l" style={{ fontSize: 10, letterSpacing: '.13em', fontWeight: 750 }}>{label}</div>
      <div className="v" style={{ ...moneyText, color: colors[tone] || colors.dark, fontSize: 24, fontWeight: 750, marginTop: 8 }}>{formatCurrency(value)}</div>
      <div className="d" style={{ fontSize: 11.5, lineHeight: 1.35, marginTop: 8 }}>{note}</div>
    </div>
  )
}

export default function DoiSoatPage({ user, refreshKey }) {
  const [ngay, setNgay] = useState(todayISO())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLich, setShowLich] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)

    Promise.all([
      supabase.from('doanh_thu').select('so_tien, hinh_thuc, dien_giai, created_at, nguon').eq('ngay', ngay).order('created_at', { ascending: false }),
      supabase.from('chi_phi').select('so_tien, hinh_thuc_thanh_toan, dien_giai, created_at').eq('ngay', ngay).order('created_at', { ascending: false }),
      supabase.from('so_du_vi_thuc_te').select('*').order('ten'),
    ]).then(([rDT, rCP, rVi]) => {
      if (!alive) return
      const dtList = rDT.data || []
      const cpList = rCP.data || []

      const sumThu = key => dtList.filter(r => r.hinh_thuc === key).reduce((s, r) => s + (r.so_tien || 0), 0)
      const sumChi = key => cpList.filter(r => (r.hinh_thuc_thanh_toan || 'tien_mat') === key).reduce((s, r) => s + (r.so_tien || 0), 0)

      const tienMat = sumThu('tien_mat')
      const chuyenKhoan = sumThu('chuyen_khoan')
      const quetThe = sumThu('quet_the')
      const theTraTruoc = sumThu('the_tra_truoc')
      const chiTienMat = sumChi('tien_mat')
      const chiMb = sumChi('chuyen_khoan')
      const chiTp = sumChi('quet_the')
      const tongChi = cpList.reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongDoanhThu = tienMat + chuyenKhoan + quetThe + theTraTruoc
      const thucThu = tienMat + chuyenKhoan + quetThe
      const posThu = dtList.filter(r => r.nguon === 'pos').reduce((s, r) => s + (r.so_tien || 0), 0)
      const manualThu = dtList.filter(r => r.nguon !== 'pos').reduce((s, r) => s + (r.so_tien || 0), 0)

      setData({
        dtList,
        cpList,
        tienMat,
        chuyenKhoan,
        quetThe,
        theTraTruoc,
        chiTienMat,
        chiMb,
        chiTp,
        tongDoanhThu,
        thucThu,
        posThu,
        manualThu,
        tongChi,
        loiNhuan: thucThu - tongChi,
        tienMatCanKiem: tienMat - chiTienMat,
        viList: rVi.data || [],
      })
      setLoading(false)
    }).catch(() => {
      if (alive) setLoading(false)
    })

    return () => { alive = false }
  }, [ngay, refreshKey])

  const ngayFormatted = formatDateFull(ngay)
  const isToday = ngay === todayISO()

  const changeDay = delta => {
    setNgay(addDaysISO(ngay, delta))
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>
        Đang tải đối soát ngày...
      </div>
    )
  }

  const revenueCards = [
    { key: 'tien_mat', value: data.tienMat, note: `Trừ chi tiền mặt: ${formatCurrency(data.chiTienMat)}` },
    { key: 'chuyen_khoan', value: data.chuyenKhoan, note: 'Tiền vào MB Bank' },
    { key: 'quet_the', value: data.quetThe, note: 'Tiền vào TP Bank' },
    { key: 'the_tra_truoc', value: data.theTraTruoc, note: 'Không tính vào thực thu' },
  ]

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={d => { setNgay(d); setShowLich(false) }} />

      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl" style={{ letterSpacing: '-.01em' }}>Đối Soát Ngày</div>
          <div className="sub">{ngayFormatted}{isToday ? ' · Hôm nay' : ''}</div>
        </div>
        <div className="acts">
          <button onClick={() => changeDay(-1)} className="icon-btn" style={{ width: 34, height: 34 }}>‹</button>
          <button onClick={() => setShowLich(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.Calendar style={{ width: 13, height: 13 }} />
            {ngayFormatted}
          </button>
          <button onClick={() => changeDay(1)} className="icon-btn" style={{ width: 34, height: 34 }}>›</button>
          <button onClick={() => window.history.pushState(null, '', '/SoThuChi/chot-ngay') || window.dispatchEvent(new PopStateEvent('popstate'))} className="btn gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.Wallet style={{ width: 13, height: 13 }} />
            Chốt Ngày
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div className="card-b" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr repeat(3, minmax(0, 1fr))', gap: 0 }}>
            <div style={{ padding: 22, background: 'linear-gradient(135deg,#3d2c20,#8a6a52)', color: '#f8efe1' }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.14em', opacity: .72, fontWeight: 700 }}>Ngày đối soát</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.08, marginTop: 10 }}>{ngayFormatted}</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, opacity: .76, marginTop: 10, maxWidth: 260 }}>Kiểm tra doanh thu, chi phí và dòng tiền trước khi chốt sổ.</div>
            </div>
            <StatCard label="Thực Thu" value={data.thucThu} note="Không gồm thẻ trả trước" tone="gold" />
            <StatCard label="Tổng Chi" value={data.tongChi} note={`${data.cpList.length} khoản chi`} tone="bad" />
            <StatCard label="Lợi Nhuận" value={data.loiNhuan} note={data.loiNhuan >= 0 ? 'Ngày đang có lãi' : 'Ngày đang lỗ'} tone={data.loiNhuan >= 0 ? 'good' : 'bad'} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, .75fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <div className="card-h">
              <div className="card-t">
                <div className="arch-i"><I.TrendUp style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
                <h3 style={sectionTitle}>Doanh Thu Theo Hình Thức</h3>
                <span className="sub">{data.dtList.length} giao dịch</span>
              </div>
            </div>
            <div className="card-b">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                {revenueCards.map(item => {
                  const meta = methodMeta[item.key]
                  return (
                    <div key={item.key} style={{ border: '1px solid var(--line)', background: meta.bg, borderRadius: 10, padding: 14, minHeight: 126 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.58)', display: 'grid', placeItems: 'center', fontSize: 18 }}>{meta.icon}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)', fontWeight: 750 }}>{meta.label}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2, fontWeight: 600 }}>{meta.short}</div>
                        </div>
                      </div>
                      <div style={{ ...moneyText, fontSize: 22, fontWeight: 750, color: meta.color, marginTop: 12 }}>{formatCurrency(item.value)}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.35, marginTop: 6 }}>{item.note}</div>
                    </div>
                  )
                })}
              </div>
              <div className="rec-row tot" style={{ marginTop: 14 }}>
                <span>Tổng Doanh Thu</span>
                <span style={{ ...moneyText, fontWeight: 800 }}>{formatCurrency(data.tongDoanhThu)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <div className="card-t">
                <div className="arch-i"><I.TrendDown style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
                <h3 style={sectionTitle}>Chi Phí Chi Tiết</h3>
                <span className="sub">{data.cpList.length} khoản</span>
              </div>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              {data.cpList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 34, color: 'var(--ink3)', fontSize: 13 }}>Không có khoản chi trong ngày này</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Giờ</th>
                      <th>Diễn Giải</th>
                      <th>Nguồn Tiền</th>
                      <th className="amount" style={{ paddingRight: 20 }}>Số Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cpList.map((cp, i) => {
                      const key = cp.hinh_thuc_thanh_toan || 'tien_mat'
                      const meta = methodMeta[key] || methodMeta.tien_mat
                      return (
                        <tr key={`${cp.created_at || i}-${cp.so_tien}`}>
                          <td className="time" style={{ paddingLeft: 20 }}>{formatTime(cp.created_at)}</td>
                          <td className="desc">{cp.dien_giai || 'Chi phí'}</td>
                          <td><span className="method cash" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span></td>
                          <td className="amount" style={{ ...moneyText, paddingRight: 20, color: '#843a23', fontWeight: 750 }}>−{formatCurrency(cp.so_tien)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <div className="card-h">
              <div className="card-t">
                <div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
                <h3 style={sectionTitle}>Cần Kiểm Cuối Ngày</h3>
              </div>
            </div>
            <div className="card-b" style={{ display: 'grid', gap: 10 }}>
              {[
                ['Doanh thu bán hàng', data.posThu, 'Nguồn chuẩn tự sinh từ đơn hàng đã chốt'],
                ['Doanh thu nhập tay', data.manualThu, data.manualThu > 0 ? 'Cần kiểm tra vì có thể gây lệch số' : 'Không phát sinh nhập tay'],
                ['Tiền mặt cần kiểm', data.tienMatCanKiem, 'Thu tiền mặt trừ chi tiền mặt'],
                ['MB Bank', data.chuyenKhoan - data.chiMb, 'Chuyển khoản trừ chi từ MB'],
                ['TP Bank', data.quetThe - data.chiTp, 'Quẹt thẻ trừ chi từ TP'],
                ['Thẻ trả trước', data.theTraTruoc, 'Theo dõi riêng, không tính thực thu'],
              ].map(([label, value, note]) => (
                <div key={label} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
                    <div style={{ ...moneyText, fontSize: 18, fontWeight: 750, color: 'var(--espresso)' }}>{formatCurrency(value)}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>{note}</div>
                </div>
              ))}
            </div>
          </div>

          {user?.vai_tro === 'admin' && (
            <div className="card">
              <div className="card-h">
                <div className="card-t">
                  <div className="arch-i"><I.Wallet style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
                  <h3 style={sectionTitle}>Số Dư Tài Khoản</h3>
                </div>
              </div>
              <div className="card-b" style={{ display: 'grid', gap: 10 }}>
                {(data.viList || []).map(vi => {
                  const meta = methodMeta[vi.loai] || methodMeta.tien_mat
                  return (
                    <div key={vi.id} style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1px solid var(--line)', borderRadius: 10, padding: 12, background: 'var(--surface)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: meta.bg }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{vi.ten}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{meta.label}</div>
                      </div>
                      <div style={{ ...moneyText, fontSize: 17, fontWeight: 750, color: 'var(--ink)' }}>{formatCurrency(vi.so_du_hien_tai || 0)}</div>
                    </div>
                  )
                })}
                <div className="rec-row tot">
                  <span>Tổng Tài Sản</span>
                  <span style={{ ...moneyText, fontWeight: 800 }}>{formatCurrency((data.viList || []).reduce((s, v) => s + (v.so_du_hien_tai || 0), 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
