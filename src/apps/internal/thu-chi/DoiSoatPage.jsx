import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, todayISO, getNowVN } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export default function DoiSoatPage({ user, refreshKey }) {
  const [ngay, setNgay] = useState(todayISO())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLich, setShowLich] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('doanh_thu').select('so_tien, hinh_thuc, dien_giai, created_at').eq('ngay', ngay).order('created_at'),
      supabase.from('chi_phi').select('so_tien, hinh_thuc_thanh_toan, dien_giai, created_at').eq('ngay', ngay).order('created_at'),
      supabase.from('so_du_vi_thuc_te').select('*'),
    ]).then(([rDT, rCP, rVi]) => {
      const dtList = rDT.data || []
      const cpList = rCP.data || []

      // Doanh thu theo hình thức
      const tienMat = dtList.filter(r => r.hinh_thuc === 'tien_mat').reduce((s, r) => s + (r.so_tien || 0), 0)
      const chuyenKhoan = dtList.filter(r => r.hinh_thuc === 'chuyen_khoan').reduce((s, r) => s + (r.so_tien || 0), 0)
      const quetThe = dtList.filter(r => r.hinh_thuc === 'quet_the').reduce((s, r) => s + (r.so_tien || 0), 0)
      const theTraTruoc = dtList.filter(r => r.hinh_thuc === 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongDoanhThu = tienMat + chuyenKhoan + quetThe + theTraTruoc
      const thucThu = tienMat + chuyenKhoan + quetThe // không tính thẻ trả trước

      // Chi phí
      const tongChi = cpList.reduce((s, r) => s + (r.so_tien || 0), 0)

      // Lợi nhuận
      const loiNhuan = thucThu - tongChi

      setData({
        dtList, cpList,
        tienMat, chuyenKhoan, quetThe, theTraTruoc,
        tongDoanhThu, thucThu, tongChi, loiNhuan,
        viList: rVi.data || [],
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [ngay, refreshKey])

  const d = new Date(ngay + 'T00:00:00')
  const thuMay = DAYS[d.getDay()]
  const ngayFormatted = `${thuMay}, ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`

  const changeDay = (delta) => {
    const nd = new Date(d)
    nd.setDate(nd.getDate() + delta)
    setNgay(nd.toISOString().slice(0, 10))
  }

  const isToday = ngay === todayISO()

  const viIcons = { tien_mat: '💵', chuyen_khoan: '🏦', quet_the: '💳' }
  const viSubLabels = { tien_mat: 'Tiền mặt tại quầy', chuyen_khoan: 'Tài khoản ngân hàng', quet_the: 'Quẹt thẻ' }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>
      Đang tải báo cáo ngày...
    </div>
  )

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <DatePicker
        open={showLich}
        selectedDate={ngay}
        onClose={() => setShowLich(false)}
        onConfirm={d => { setNgay(d); setShowLich(false) }}
      />

      {/* ── HEADER ── */}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Đối Soát Ngày</div>
          <div className="sub">{ngayFormatted}{isToday ? ' · Hôm nay' : ''}</div>
        </div>
        <div className="acts">
          <button onClick={() => changeDay(-1)} className="icon-btn" style={{ width: 34, height: 34 }}>‹</button>
          <button onClick={() => setShowLich(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.Calendar style={{ width: 13, height: 13 }} />
            {ngayFormatted}
          </button>
          <button onClick={() => changeDay(1)} className="icon-btn" style={{ width: 34, height: 34 }}>›</button>
        </div>
      </div>

      {/* ── 3 Ô THỰC THU / TỔNG CHI / LỢI NHUẬN ── */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="it">
          <div className="l">THỰC THU</div>
          <div className="v" style={{ color: '#426a2c' }}>{formatCurrency(data.thucThu)}</div>
          <div className="d">Doanh thu − Thẻ trả trước</div>
        </div>
        <div className="it">
          <div className="l">TỔNG CHI</div>
          <div className="v" style={{ color: '#843a23' }}>{formatCurrency(data.tongChi)}</div>
          <div className="d">{data.cpList.length} khoản chi</div>
        </div>
        <div className="it">
          <div className="l">LỢI NHUẬN</div>
          <div className="v" style={{ color: data.loiNhuan >= 0 ? '#426a2c' : '#843a23' }}>{formatCurrency(data.loiNhuan)}</div>
          <div className="d" style={{ color: data.loiNhuan >= 0 ? '#426a2c' : '#843a23' }}>
            {data.loiNhuan >= 0 ? '✅ Có lãi' : '⚠️ Lỗ trong ngày'}
          </div>
        </div>
      </div>

      {/* ── DOANH THU THEO HÌNH THỨC ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div className="card-t">
            <div className="arch-i"><I.TrendUp style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
            <h3>DOANH THU</h3>
          </div>
        </div>
        <div className="card-b">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
            {[
              { icon: '💵', label: 'Tiền Mặt', value: data.tienMat, color: '#3e5a32', bg: '#e8f1de' },
              { icon: '🏦', label: 'Chuyển Khoản', value: data.chuyenKhoan, color: '#1a4f70', bg: '#ddeaf3' },
              { icon: '💳', label: 'Quẹt Thẻ', value: data.quetThe, color: '#5e2f74', bg: '#ecdcef' },
              { icon: '🎫', label: 'Thẻ Trả Trước', value: data.theTraTruoc, color: '#6e4a1f', bg: '#f0e2cd', note: 'Không tính Thực Thu' },
            ].map((item, i) => (
              <div key={i} style={{
                background: item.bg, borderRadius: 14, padding: '16px 18px',
                textAlign: 'center', border: `1px solid ${item.color}20`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: item.color }}>
                  {formatCurrency(item.value)}
                </div>
                {item.note && (
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 4, fontStyle: 'italic' }}>
                    {item.note}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="rec-row tot">
            <span>Tổng Doanh Thu</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(data.tongDoanhThu)}</span>
          </div>
        </div>
      </div>

      {/* ── CHI PHÍ CHI TIẾT ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div className="card-t">
            <div className="arch-i"><I.TrendDown style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
            <h3>CHI PHÍ CHI TIẾT</h3>
            <span className="sub">{data.cpList.length} khoản</span>
          </div>
        </div>
        <div className="card-b" style={{ padding: 0 }}>
          {data.cpList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink3)', fontSize: 13 }}>
              Không có khoản chi nào trong ngày này
            </div>
          ) : (
            <table className="tbl">
              <thead><tr>
                <th style={{ paddingLeft: 20 }}>Giờ</th>
                <th>Diễn Giải</th>
                <th>Nguồn Tiền</th>
                <th className="amount" style={{ paddingRight: 20 }}>Số Tiền</th>
              </tr></thead>
              <tbody>
                {data.cpList.map((cp, i) => {
                  const ptKey = cp.hinh_thuc_thanh_toan || 'tien_mat'
                  const methodLabel = ptKey === 'tien_mat' ? 'Tiền Mặt' : ptKey === 'chuyen_khoan' ? 'CK' : ptKey === 'quet_the' ? 'Quẹt Thẻ' : '—'
                  const methodClass = ptKey === 'tien_mat' ? 'cash' : ptKey === 'chuyen_khoan' ? 'transfer' : 'card'
                  return (
                    <tr key={i}>
                      <td className="time" style={{ paddingLeft: 20 }}>
                        {cp.created_at ? new Date(cp.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </td>
                      <td className="desc">{cp.dien_giai || 'Chi phí'}</td>
                      <td><span className={`method ${methodClass}`}>{methodLabel}</span></td>
                      <td className="amount" style={{ paddingRight: 20, color: 'var(--danger)' }}>−{formatCurrency(cp.so_tien)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div className="rec-row tot" style={{ margin: '0 20px' }}>
            <span>Tổng Chi Phí</span>
            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatCurrency(data.tongChi)}</span>
          </div>
        </div>
      </div>

      {/* ── LỢI NHUẬN NGÀY ── */}
      <div style={{
        background: data.loiNhuan >= 0
          ? 'linear-gradient(135deg, #e8f1de, #d4e8c8)'
          : 'linear-gradient(135deg, #fae0d8, #f5c8b8)',
        borderRadius: 'var(--r)',
        padding: '18px 22px',
        marginBottom: 16,
        border: `1px solid ${data.loiNhuan >= 0 ? '#6e8a5e30' : '#b85a4a30'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, color: 'var(--ink3)' }}>
            LỢI NHUẬN NGÀY
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>Thực Thu − Tổng Chi</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: data.loiNhuan >= 0 ? '#426a2c' : '#843a23' }}>
            {formatCurrency(data.loiNhuan)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: data.loiNhuan >= 0 ? '#426a2c' : '#843a23' }}>
            {data.loiNhuan >= 0 ? '✅ Có lãi' : '⚠️ Lỗ trong ngày'}
          </div>
        </div>
      </div>

      {/* ── SỐ DƯ TÀI KHOẢN ── */}
      <div className="card">
        <div className="card-h">
          <div className="card-t">
            <div className="arch-i"><I.Wallet style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
            <h3>SỐ DƯ TÀI KHOẢN ĐẾN NGÀY</h3>
          </div>
        </div>
        <div className="card-b">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data.viList || []).map(vi => (
              <div key={vi.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                background: 'var(--bg2)', border: '1px solid var(--line)',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: vi.loai === 'tien_mat'
                    ? 'linear-gradient(180deg,#e0eedd,#bfd5b8)'
                    : vi.loai === 'chuyen_khoan'
                    ? 'linear-gradient(180deg,#dde9f3,#a8c5dc)'
                    : 'linear-gradient(180deg,#f0dcc0,#d4a574)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {viIcons[vi.loai] || '💰'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
                    {vi.ten}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                    {viSubLabels[vi.loai] || ''}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  {formatCurrency(vi.so_du_hien_tai || 0)}
                </div>
              </div>
            ))}
          </div>
          <div className="rec-row tot" style={{ marginTop: 12 }}>
            <span>Tổng Tài Sản</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontSize: 18 }}>
              {formatCurrency((data.viList || []).reduce((s, v) => s + (v.so_du_hien_tai || 0), 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
