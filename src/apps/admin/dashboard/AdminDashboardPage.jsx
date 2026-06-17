import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { todayISO, getNowVN, fmtCompact, formatCurrency, addDays, pctChange } from '../../../lib/utils'

const fmtNum = n => new Intl.NumberFormat('vi-VN').format(n || 0)
import I from '../../../components/shared/Icons'
import '../../../styles/hannah-admin.css'

// ════════════════ HERO STRIP ════════════════
function HeroStrip({ stats, userName }) {
  const now = getNowVN()
  const hour = now.getHours()
  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`
  const thuNhapHomNay = (stats?.doanhThuHomNay || 0) - (stats?.chiPhiHomNay || 0)
  const tyLeDiLam = stats?.tongNV > 0 ? Math.round((stats?.checkinHomNay || 0) / stats.tongNV * 100) : 0
  const hourMsg = hour < 10 ? 'Buổi sáng tốt lành' : hour < 14 ? 'Buổi trưa vui vẻ' : hour < 18 ? 'Buổi chiều năng lượng' : 'Buổi tối thư giãn'
  const hoTen = (userName || 'Quản Trị Viên').split(' ').slice(-1)[0]

  return (
    <div className="hero">
      <div className="hero-text">
        <div className="hero-eyebrow">{dateStr} — {hourMsg}</div>
        <h2>Chào anh <em>{hoTen},</em> {thuNhapHomNay > 0 ? `lợi nhuận hôm nay ${fmtCompact(thuNhapHomNay)}` : 'chúc một ngày hiệu quả!'}</h2>
        <p>
          {stats?.checkinHomNay || 0}/{stats?.tongNV || 0} nhân viên đang làm việc · {stats?.donHangHomNay || 0} đơn POS · Doanh thu {fmtCompact(stats?.doanhThuHomNay || 0)}
        </p>
      </div>
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="v">{tyLeDiLam}%</div>
          <div className="l">Tỷ Lệ Đi Làm</div>
        </div>
        <div className="hero-stat">
          <div className="v">{stats?.donHangHomNay || 0}</div>
          <div className="l">Đơn POS</div>
        </div>
        <div className="hero-stat">
          <div className="v">{fmtCompact(stats?.doanhThuHomNay || 0)}</div>
          <div className="l">Doanh Thu</div>
        </div>
      </div>
    </div>
  )
}

// ════════════════ SPARKLINE ════════════════
function Sparkline({ data, color = '#A0714F', fill = 'rgba(201,169,110,.18)' }) {
  if (!data || data.length === 0) return null
  const w = 100, h = 28
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((d, i) => [i / (data.length - 1) * w, h - ((d - min) / range) * h])
  const path = 'M ' + pts.map(p => p.join(',')).join(' L ')
  const area = path + ` L ${w},${h} L 0,${h} Z`
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// ════════════════ KPI CARDS ════════════════
function KPIs({ kpiData, chartData }) {
  const cards = [
    {
      k: 'revenue', icon: I.Coin, label: 'Doanh Thu Hôm Nay', color: '#3e5a32',
      value: fmtNum(kpiData?.doanhThu?.value || 0),
      change: kpiData?.doanhThu?.yesterday ? pctChange(kpiData.doanhThu.value, kpiData.doanhThu.yesterday) : null,
      sub: kpiData?.donHangHomNay ? <>{kpiData.donHangHomNay} đơn hàng · <b>POS</b></> : 'Đang cập nhật',
      data: (chartData || []).map(d => d.value),
    },
    {
      k: 'expense', icon: I.Receipt, label: 'Chi Phí Hôm Nay', color: '#6b3a28',
      value: fmtNum(kpiData?.chiPhi?.value || 0),
      change: kpiData?.chiPhi?.yesterday ? pctChange(kpiData.chiPhi.value, kpiData.chiPhi.yesterday) : null,
      sub: <>Theo dõi <b>37 hạng mục</b> chi phí</>,
      data: (chartData || []).map(d => Math.max(0, d.value * 0.35)),
    },
    {
      k: 'orders', icon: I.Cart, label: 'Lợi Nhuận Hôm Nay', color: '#5a3e22',
      value: fmtNum((kpiData?.doanhThu?.value || 0) - (kpiData?.chiPhi?.value || 0)),
      change: null,
      sub: <>Thực thu = <b>Doanh thu − Chi phí</b></>,
      data: (chartData || []).map(d => d.value * 0.6),
    },
    {
      k: 'assets', icon: I.Bank, label: 'Tổng Tài Sản', color: '#2e2018',
      value: fmtNum(kpiData?.tongTS?.value || 0),
      change: null,
      sub: <><b>3 ví</b> · Tiền Mặt + MB Bank + TP Bank</>,
      data: (chartData || []).map((_, i) => 90 + i),
    },
  ]
  return (
    <div className="kpi-grid">
      {cards.map((c, i) => {
        const Icon = c.icon
        const trend = c.change !== null && c.change !== undefined
          ? (c.change > 0 ? 'up' : c.change < 0 ? 'down' : 'flat') : null
        return (
          <div className={`kpi ${c.k}`} key={i}>
            <div className="kpi-top">
              <div className="kpi-icon"><Icon style={{ width: 16, height: 16 }} /></div>
              {trend && (
                <span className={`kpi-trend ${trend}`}>
                  {trend === 'up' && <I.TrendUp style={{ width: 11, height: 11 }} />}
                  {trend === 'down' && <I.TrendDown style={{ width: 11, height: 11 }} />}
                  {Math.abs(c.change)}%
                </span>
              )}
            </div>
            <div>
              <div className="kpi-label">{c.label}</div>
              <div className="kpi-value" style={{ marginTop: 4 }}>{c.value}<span className="cur">đ</span></div>
            </div>
            <div className="kpi-sub">{c.sub}</div>
            <Sparkline data={c.data} color={c.k === 'expense' ? '#b85a4a' : c.k === 'revenue' ? '#6e8a5e' : '#b08a55'} />
          </div>
        )
      })}
    </div>
  )
}

// ════════════════ REVENUE SVG CHART ════════════════
function RevenueChart({ chartData }) {
  if (!chartData || chartData.length === 0) return null

  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const days = chartData.map((d, i) => {
    const dt = new Date(d.label)
    return DAYS[dt.getDay()]
  })
  const values = chartData.map(d => d.value / 1_000_000) // triệu VND
  const max = Math.max(...values, 1)

  const W = 540, H = 190, padL = 40, padR = 14, padT = 12, padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const x = i => padL + (i / (days.length - 1)) * innerW
  const y = v => padT + innerH - (v / max) * innerH
  const pts = values.map((v, i) => [x(i), y(v)])
  const linePath = 'M ' + pts.map(p => p.join(',')).join(' L ')
  const areaPath = linePath + ` L ${x(days.length - 1)},${y(0)} L ${x(0)},${y(0)} Z`

  const totalRevenue = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i" aria-hidden>
            <svg width="10" height="12" viewBox="0 0 10 12"><path d="M5 1a4 4 0 0 1 4 4v6H1V5a4 4 0 0 1 4-4z" fill="none" stroke="#8a6a52" strokeWidth="1.2"/></svg>
          </div>
          <h3>Doanh Thu 7 Ngày</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em', lineHeight: 1 }}>
              {fmtNum(totalRevenue)}<span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 2 }}>đ</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>7 ngày gần nhất</div>
          </div>
        </div>
      </div>
      <div className="card-b" style={{ padding: '14px 16px 8px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} preserveAspectRatio="none">
          {/* Grid */}
          {[0, max * 0.25, max * 0.5, max * 0.75, max].map((g, gi) => (
            <g key={gi}>
              <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)}
                stroke="#e8dcc8" strokeWidth="1"
                strokeDasharray={gi === 0 ? '' : '3 5'} />
              <text x={padL - 6} y={y(g) + 3} textAnchor="end"
                fontSize="9.5" fill="#8e7a68" fontFamily="Inter">
                {g === 0 ? '0' : `${g.toFixed(1)}M`}
              </text>
            </g>
          ))}
          {/* X labels */}
          {days.map((d, i) => (
            <text key={d} x={x(i)} y={H - 6} textAnchor="middle"
              fontSize="11" fill={chartData[i]?.isToday ? '#a87f4f' : '#8e7a68'}
              fontFamily="Inter" fontWeight={chartData[i]?.isToday ? 700 : 500}>{d}</text>
          ))}
          {/* Area fill */}
          <path d={areaPath} fill="rgba(201,169,110,.18)" />
          {/* Line */}
          <path d={linePath} fill="none" stroke="#a87f4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Data points */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={chartData[i]?.isToday ? 5 : 3.5}
                fill={chartData[i]?.isToday ? '#a87f4f' : '#fff'}
                stroke="#a87f4f" strokeWidth={chartData[i]?.isToday ? 0 : 1.8} />
            </g>
          ))}
          {/* Today tooltip */}
          {chartData.findIndex(d => d.isToday) >= 0 && (() => {
            const ti = chartData.findIndex(d => d.isToday)
            const tv = values[ti]
            if (tv === 0) return null
            return (
              <g transform={`translate(${x(ti)},${y(tv) - 10})`}>
                <rect x="-40" y="-22" width="80" height="20" rx="10" fill="#2a201a" />
                <text x="0" y="-9" textAnchor="middle" fontSize="11" fontWeight="700"
                  fill="#f3e6d2" fontFamily="Inter">{fmtCompact(chartData[ti].value)}</text>
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}

// ════════════════ RECENT TRANSACTIONS ════════════════
function RecentTxTable({ data }) {
  if (!data || data.length === 0) return null
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
          <h3>Giao Dịch Gần Đây</h3>
          <span className="sub">Hôm nay</span>
        </div>
        <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 11.5 }}>Xem tất cả →</button>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ paddingLeft: 18 }}>Giờ</th>
              <th>Loại</th>
              <th>Mô tả</th>
              <th style={{ paddingRight: 18 }}>Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((tx, i) => (
              <tr key={i}>
                <td className="time" style={{ paddingLeft: 18 }}>
                  {tx.created_at ? new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </td>
                <td>
                  <span className={`method ${tx.loai === 'doanh_thu' ? 'cash' : tx.loai === 'chi_phi' ? 'transfer' : 'card'}`}>
                    {tx.loai === 'doanh_thu' ? 'Thu' : tx.loai === 'chi_phi' ? 'Chi' : 'CK'}
                  </span>
                </td>
                <td className="desc">
                  {tx.mo_ta || tx.dien_giai || '—'}
                  {tx.loai === 'doanh_thu' && (
                    <small>{tx.hinh_thuc === 'tien_mat' ? 'Tiền mặt' : tx.hinh_thuc === 'chuyen_khoan' ? 'Chuyển khoản' : tx.hinh_thuc === 'quet_the' ? 'Quẹt thẻ' : 'Thẻ TT'}</small>
                  )}
                </td>
                <td className="amount" style={{ paddingRight: 18, color: tx.loai === 'chi_phi' ? 'var(--danger)' : tx.loai === 'doanh_thu' ? 'var(--success)' : 'var(--ink)' }}>
                  {tx.loai === 'chi_phi' ? '−' : tx.loai === 'doanh_thu' ? '+' : ''}{formatCurrency(tx.so_tien)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ════════════════ STAFF TODAY ════════════════
function StaffToday({ staffCheckins }) {
  if (!staffCheckins || staffCheckins.length === 0) return null
  const AV_GRADS = [
    'linear-gradient(135deg,#c9a96e,#a87f4f)',
    'linear-gradient(135deg,#c4998a,#a87366)',
    'linear-gradient(135deg,#94a085,#6e8a5e)',
    'linear-gradient(135deg,#8a6a6e,#634a4e)',
    'linear-gradient(135deg,#5a4030,#2e2018)',
  ]
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I.Users style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
          <h3>Nhân Sự Hôm Nay</h3>
          <span className="sub">{staffCheckins.length} đang trực</span>
        </div>
        <button className="chip" onClick={() => window.location.href = '/admin/nhan-su'}>Chi tiết →</button>
      </div>
      <div className="card-b" style={{ paddingTop: 6 }}>
        <div className="staff-list">
          {staffCheckins.slice(0, 5).map((s, i) => {
            const grad = AV_GRADS[i % AV_GRADS.length]
            const initials = (s.ho_ten || '').split(' ').map(w => w[0]).slice(-2).join('')
            const vitri = s.vi_tri === 'ktv' ? 'KTV' : s.vi_tri === 'le_tan' ? 'Lễ Tân' : s.vi_tri === 'tap_vu' ? 'Tạp Vụ' : s.vi_tri
            const inTime = s.gio_vao ? s.gio_vao.slice(0, 5) : '--:--'
            return (
              <div className="staff" key={s.id || i}>
                <div className="avatar" style={{ background: grad, color: '#2a1d14' }}>{initials}</div>
                <div className="info">
                  <div className="n">{s.ho_ten}</div>
                  <div className="r">{vitri} · vào {inTime}</div>
                  <div className="bar">
                    <i style={{ width: s.gio_vao ? '70%' : '0%' }} />
                  </div>
                </div>
                <div className="stat">
                  <div className="v" style={{ color: s.gio_vao ? 'var(--success)' : 'var(--ink3)', fontSize: 13 }}>
                    {s.gio_vao ? '● Trực' : '○ Nghỉ'}
                  </div>
                  <div className="l">{s.gio_vao && s.gio_ra ? `ra ${s.gio_ra.slice(0, 5)}` : 'đang làm'}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════ WALLET CARDS ════════════════
function WalletCards({ viList }) {
  if (!viList || viList.length === 0) return null
  const total = viList.reduce((s, v) => s + (v.so_du_hien_tai || 0), 0)
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I.Bank style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
          <h3>Số Dư 3 Ví</h3>
          <span className="sub">Realtime</span>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
          {fmtCompact(total)}<span style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 2 }}>đ</span>
        </div>
      </div>
      <div className="card-b">
        <div className="wallets" style={{ gridTemplateColumns: `repeat(${viList.length}, 1fr)` }}>
          {viList.map((vi) => {
            const cls = vi.loai === 'tien_mat' ? 'cash' : vi.loai === 'chuyen_khoan' ? 'bank' : 'epay'
            return (
              <div className={`wallet ${cls}`} key={vi.id}>
                <div>
                  <div className="nm">{vi.ten}</div>
                  <div className="vl">{fmtNum(vi.so_du_hien_tai)}<span className="cur">đ</span></div>
                </div>
                <div className="sb">{vi.loai === 'tien_mat' ? 'Két quầy lễ tân' : vi.loai === 'chuyen_khoan' ? 'MB Bank · Chuyển khoản' : 'TP Bank · Quẹt thẻ'}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════ ALERTS ════════════════
function AlertsCard({ kpiData, khoAlerts, pending, chartData }) {
  const alerts = []

  // ── CẦN ANH DUYỆT (việc tồn đọng — điều hành từ xa) ──
  const choDuyet = (pending?.yccs || 0) + (pending?.off || 0) + (pending?.tangCa || 0)
  if (choDuyet > 0) {
    const parts = []
    if (pending.yccs) parts.push(`${pending.yccs} yêu cầu sửa/xoá`)
    if (pending.off) parts.push(`${pending.off} đơn OFF`)
    if (pending.tangCa) parts.push(`${pending.tangCa} tăng ca`)
    alerts.push({ type: 'warn', icon: I.Bell, msg: <><b>{choDuyet} việc chờ anh duyệt</b> — {parts.join(' · ')}</>, time: 'Duyệt', href: '/admin/nhan-su/xet-duyet' })
  }

  // ── Chi vượt thu ──
  if (kpiData?.chiPhi?.value > kpiData?.doanhThu?.value && kpiData?.doanhThu?.value > 0) {
    alerts.push({ type: 'danger', icon: I.TrendDown, msg: <><b>Chi phí vượt doanh thu</b> — Chi ({formatCurrency(kpiData.chiPhi.value)}) &gt; Thu ({formatCurrency(kpiData.doanhThu.value)})</>, time: 'Hôm nay' })
  }

  // ── Hôm qua chưa chốt sổ ──
  if (pending?.chuaChotHomQua) {
    alerts.push({ type: 'danger', icon: I.Receipt, msg: <><b>Hôm qua chưa chốt sổ</b> — Lễ tân chưa đối soát &amp; chốt ngày hôm qua</>, time: 'Sổ', href: '/SoThuChi/chot-ngay' })
  }

  // ── Doanh thu hôm nay thấp bất thường (đã qua trưa, < 40% TB 6 ngày trước) ──
  if (chartData && chartData.length >= 4) {
    const prev = chartData.slice(0, -1).map(d => d.value).filter(v => v > 0)
    const tb = prev.length ? prev.reduce((s, v) => s + v, 0) / prev.length : 0
    const today = kpiData?.doanhThu?.value || 0
    const hour = getNowVN().getHours()
    if (tb > 0 && hour >= 14 && today < tb * 0.4) {
      alerts.push({ type: 'warn', icon: I.TrendDown, msg: <><b>Doanh thu hôm nay thấp</b> — {fmtCompact(today)} (TB 6 ngày {fmtCompact(Math.round(tb))})</>, time: 'DT' })
    }
  }

  // ── Chi phí chưa phân loại nguồn tiền ──
  if (pending?.chiChuaPhanLoai > 0) {
    alerts.push({ type: 'warn', icon: I.Receipt, msg: <><b>Chi phí chưa rõ nguồn tiền</b> — {formatCurrency(pending.chiChuaPhanLoai)} cần phân loại</>, time: 'Chi', href: '/SoThuChi/danh-sach' })
  }

  // ── Kho sắp hết ──
  if (khoAlerts?.length > 0) {
    khoAlerts.slice(0, 2).forEach(k => {
      alerts.push({ type: 'warn', icon: I.Box, msg: <><b>{k.ten}</b> — tồn {k.ton_kho} (định mức {k.canh_bao_ton})</>, time: 'Kho', href: '/admin/kho-hang' })
    })
    if (khoAlerts.length > 2) {
      alerts.push({ type: 'warn', icon: I.Box, msg: <>+{khoAlerts.length - 2} sản phẩm khác sắp hết hàng</>, time: 'Kho', href: '/admin/kho-hang' })
    }
  }

  if (alerts.length === 0) {
    alerts.push({ type: 'info', icon: I.TrendUp, msg: <><b>Hoạt động ổn định</b> — Mọi chỉ số trong tầm kiểm soát hôm nay</>, time: 'OK' })
  }

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I.Bell style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
          <h3>Cảnh Báo</h3>
          <span className="sub">{alerts.length} mục</span>
        </div>
      </div>
      <div className="card-b">
        <div className="alerts">
          {alerts.map((a, i) => {
            const Icon = a.icon
            return (
              <div className={`alert ${a.type}`} key={i}
                onClick={a.href ? () => { window.location.href = a.href } : undefined}
                style={a.href ? { cursor: 'pointer' } : undefined}
                title={a.href ? 'Bấm để xử lý' : undefined}>
                <div className="ai"><Icon style={{ width: 15, height: 15 }} /></div>
                <div style={{ flex: 1 }}>{a.msg}</div>
                <span className="alert-time">{a.href ? '→' : a.time}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════
export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [kpiData, setKpiData] = useState(null)
  const [chartData, setChartData] = useState([])
  const [recentTx, setRecentTx] = useState([])
  const [viList, setViList] = useState([])
  const [staffCheckins, setStaffCheckins] = useState([])
  const [khoAlerts, setKhoAlerts] = useState([])
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setLoading(true)
    const today = todayISO()
    const yesterday = addDays(today, -1)

    try {
      const [rDT, rDTYest, rCP, rCPYest, rDH, rCC, rNV, rVi, rRecent, rKho, rChot, rYCCS, rOff] = await Promise.all([
        supabase.from('doanh_thu').select('so_tien, hinh_thuc').eq('ngay', today),
        supabase.from('doanh_thu').select('so_tien').eq('ngay', yesterday),
        supabase.from('chi_phi').select('so_tien, hinh_thuc_thanh_toan').eq('ngay', today),
        supabase.from('chi_phi').select('so_tien').eq('ngay', yesterday),
        supabase.from('don_hang').select('id').eq('ngay', today),
        supabase.from('cham_cong').select('nhan_vien_id, gio_vao, gio_ra, trang_thai_tang_ca').eq('ngay', today),
        supabase.from('nhan_vien').select('id, ho_ten, vi_tri').eq('trang_thai', 'dang_lam').order('ho_ten'),
        supabase.from('so_du_vi_thuc_te').select('*').order('thu_tu'),
        supabase.from('lich_su_giao_dich_tong_hop').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('kho_san_pham').select('id, ten, ton_kho, canh_bao_ton').eq('is_active', true).order('ton_kho', { ascending: true }).limit(20),
        supabase.from('so_thu_chi_chot_ngay').select('trang_thai').eq('ngay', yesterday).maybeSingle(),
        supabase.from('yeu_cau_chinh_sua').select('id', { count: 'exact', head: true }).eq('trang_thai', 'cho_duyet'),
        supabase.from('dang_ky_off').select('id', { count: 'exact', head: true }).eq('trang_thai', 'cho_duyet'),
      ])

      const doanhThuHomNay = (rDT.data || [])
        .filter(r => r.hinh_thuc !== 'the_tra_truoc')
        .reduce((s, r) => s + (r.so_tien || 0), 0)
      const doanhThuHomQua = (rDTYest.data || []).reduce((s, r) => s + (r.so_tien || 0), 0)
      const chiPhiHomNay = (rCP.data || []).reduce((s, r) => s + (r.so_tien || 0), 0)
      const chiPhiHomQua = (rCPYest.data || []).reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongTS = (rVi.data || []).reduce((s, r) => s + (r.so_du_hien_tai || 0), 0)

      // Merge staff với checkin
      const ccMap = {}
      ;(rCC.data || []).forEach(c => { ccMap[c.nhan_vien_id] = c })
      const staffWithCC = (rNV.data || []).map(nv => ({
        ...nv,
        gio_vao: ccMap[nv.id]?.gio_vao || null,
        gio_ra: ccMap[nv.id]?.gio_ra || null,
      })).filter(nv => nv.gio_vao)

      setStats({
        doanhThuHomNay,
        chiPhiHomNay,
        donHangHomNay: rDH.data?.length || 0,
        checkinHomNay: staffWithCC.length,
        tongNV: rNV.data?.length || 0,
      })
      setKpiData({
        doanhThu: { value: doanhThuHomNay, yesterday: doanhThuHomQua },
        chiPhi: { value: chiPhiHomNay, yesterday: chiPhiHomQua },
        tongTS: { value: tongTS },
        donHangHomNay: rDH.data?.length || 0,
      })

      // Chart 7 ngày
      const chartDays = []
      for (let i = 6; i >= 0; i--) chartDays.push(addDays(today, -i))
      const chartResults = await Promise.all(
        chartDays.map(d => supabase.from('doanh_thu').select('so_tien, hinh_thuc').eq('ngay', d))
      )
      setChartData(chartDays.map((d, i) => {
        const items = chartResults[i]?.data || []
        const val = items.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
        return { label: d, value: val, isToday: d === today }
      }))

      setRecentTx(rRecent.data || [])
      setViList(rVi.data || [])
      setStaffCheckins(staffWithCC)
      setKhoAlerts((rKho.data || []).filter(k => k.ton_kho <= (k.canh_bao_ton || 0)))

      // ── Dữ liệu cảnh báo điều hành từ xa ──
      const chiChuaPhanLoai = (rCP.data || []).filter(r => !r.hinh_thuc_thanh_toan).reduce((s, r) => s + (r.so_tien || 0), 0)
      const tangCaChoDuyet = (rCC.data || []).filter(c => c.trang_thai_tang_ca === 'cho_duyet').length
      const chuaChotHomQua = !rChot?.data || !['submitted', 'approved'].includes(rChot.data.trang_thai)
      setPending({
        yccs: rYCCS.count || 0,
        off: rOff.count || 0,
        tangCa: tangCaChoDuyet,
        chiChuaPhanLoai,
        chuaChotHomQua,
        khoCanCount: (rKho.data || []).filter(k => k.ton_kho <= (k.canh_bao_ton || 0)).length,
      })
    } catch (err) {
      console.error('Lỗi tải dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>
        <div style={{
          width: 44, height: 54, borderRadius: '999px 999px 8px 8px',
          background: 'var(--grad-gold)', margin: '0 auto 18px',
          animation: 'floatGlow 2s ease-in-out infinite alternate',
        }} />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, color: 'var(--ink2)' }}>Đang tải dữ liệu...</div>
      </div>
    )
  }

  return (
    <>
      <HeroStrip stats={stats} userName={user?.ho_ten} />
      <KPIs kpiData={kpiData} chartData={chartData} />

      <div className="grid-2">
        <RevenueChart chartData={chartData} />
        <RecentTxTable data={recentTx} />
      </div>

      <WalletCards viList={viList} />

      <div className="grid-2">
        <StaffToday staffCheckins={staffCheckins} />
        <AlertsCard kpiData={kpiData} khoAlerts={khoAlerts} pending={pending} chartData={chartData} />
      </div>
    </>
  )
}
