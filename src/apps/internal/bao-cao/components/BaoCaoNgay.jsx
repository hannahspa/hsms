import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { formatCurrency, todayISO } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

const DAYS = ['CN','T2','T3','T4','T5','T6','T7']

function formatDateVN(isoStr) {
  const d = new Date(isoStr + 'T00:00:00')
  return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export default function BaoCaoNgay({ onBack }) {
  const [ngay, setNgay] = useState(todayISO())
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const [doanhThu, setDoanhThu] = useState([])
  const [chiPhi,   setChiPhi]   = useState([])
  const [ckNB,     setCkNB]     = useState([])
  const [danhMuc,  setDanhMuc]  = useState([])
  const [viList,   setViList]   = useState([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [dt, cp, ck, dm, vi] = await Promise.all([
          supabase.from('doanh_thu').select('*').eq('ngay', ngay),
          supabase.from('chi_phi').select('*').eq('ngay', ngay),
          supabase.from('chuyen_khoan_noi_bo').select('*').eq('ngay', ngay),
          supabase.from('danh_muc_chi_phi').select('*'),
          supabase.from('vi').select('*').order('thu_tu'),
        ])
        setDoanhThu(dt.data || [])
        setChiPhi(cp.data || [])
        setCkNB(ck.data || [])
        setDanhMuc(dm.data || [])
        setViList(vi.data || [])
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ngay])

  const HINH_THUC = [
    { id: 'tien_mat',      label: 'Tiền Mặt',      icon: '💵' },
    { id: 'chuyen_khoan',  label: 'Chuyển Khoản',  icon: '🏦' },
    { id: 'quet_the',      label: 'Quẹt Thẻ',      icon: '💳' },
    { id: 'the_tra_truoc', label: 'Thẻ Trả Trước', icon: '🎫' },
  ]

  const dtTheoHinhThuc = HINH_THUC.map(ht => ({
    ...ht,
    soTien: doanhThu.filter(r => r.hinh_thuc === ht.id).reduce((s, r) => s + r.so_tien, 0)
  }))

  const tongDoanhThu = doanhThu.reduce((s, r) => s + r.so_tien, 0)
  const thucThu      = doanhThu.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + r.so_tien, 0)
  const tongChiPhi   = chiPhi.reduce((s, r) => s + r.so_tien, 0)
  const loiNhuan     = thucThu - tongChiPhi

  const chiPhiCoTen = chiPhi.map(cp => {
    const child  = danhMuc.find(d => d.id === cp.danh_muc_id)
    const parent = child ? danhMuc.find(d => d.id === child.parent_id) : null
    return {
      ...cp,
      tenHangMuc: child?.ten  || 'Khác',
      tenNhom:    parent?.ten || 'Khác',
      iconNhom:   parent?.icon || '🏷️',
    }
  })

  const isToday = ngay === todayISO()

  const prevDay = () => {
    const d = new Date(ngay + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    setNgay(d.toISOString().split('T')[0])
  }
  const nextDay = () => {
    if (isToday) return
    const d = new Date(ngay + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    setNgay(d.toISOString().split('T')[0])
  }

  return (
    <div style={{ background: '#FAF7F4', minHeight: '100vh', paddingBottom: '100px' }}>

      {/* DatePicker overlay */}
      <DatePicker
        open={showPicker}
        selectedDate={ngay}
        onClose={() => setShowPicker(false)}
        onConfirm={(iso) => { setNgay(iso); setShowPicker(false) }}
      />

      {/* Header gradient */}
      <div style={{ background: COLORS.grad, padding: '44px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button onClick={onBack} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)',
            color: 'white', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>←</button>
          <div style={{ color: 'white', fontWeight: '700', fontSize: '18px' }}>Báo Cáo Ngày</div>
        </div>

        {/* Date Navigator */}
        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: '16px',
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <button onClick={prevDay} style={{ background: 'none', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer', padding: '4px 8px' }}>‹</button>

          <button onClick={() => setShowPicker(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center'
          }}>
            <div style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>
              {isToday ? 'Hôm nay' : formatDateVN(ngay)}
            </div>
            {isToday && (
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>
                {formatDateVN(ngay)}
              </div>
            )}
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              📅 Chọn ngày khác
            </div>
          </button>

          <button onClick={nextDay} disabled={isToday} style={{
            background: 'none', border: 'none',
            color: isToday ? 'rgba(255,255,255,0.3)' : 'white',
            fontSize: '22px', cursor: isToday ? 'default' : 'pointer', padding: '4px 8px'
          }}>›</button>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: '-12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '13px' }}>Đang tổng hợp số liệu...</div>
          </div>
        ) : (
          <>
            {/* Tổng kết ngày */}
            <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'THỰC THU',   value: thucThu,    color: COLORS.thu },
                  { label: 'TỔNG CHI',   value: tongChiPhi, color: COLORS.chi },
                  { label: 'LỢI NHUẬN', value: loiNhuan,   color: loiNhuan >= 0 ? COLORS.thu : COLORS.chi },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '1px', color: COLORS.textMute, marginBottom: '4px', fontWeight: '600' }}>{item.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: item.color }}>{formatCurrency(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Doanh Thu */}
            <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '4px', height: '18px', borderRadius: '2px', background: COLORS.thu }} />
                <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', color: COLORS.text }}>DOANH THU</span>
              </div>
              {dtTheoHinhThuc.map((ht, i) => (
                <div key={ht.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{ht.icon}</span>
                      <span style={{ fontSize: '14px', color: COLORS.text }}>{ht.label}</span>
                      {ht.id === 'the_tra_truoc' && (
                        <span style={{ fontSize: '9px', background: '#FFF3CD', color: '#856404', padding: '2px 6px', borderRadius: '8px', fontWeight: '600' }}>Không tính TT</span>
                      )}
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: ht.soTien > 0 ? COLORS.thu : COLORS.textMute }}>
                      {formatCurrency(ht.soTien)}
                    </span>
                  </div>
                  {i < dtTheoHinhThuc.length - 1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px', borderTop: `2px solid ${COLORS.border}`, marginTop: '4px' }}>
                <span style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>Tổng Doanh Thu</span>
                <span style={{ fontWeight: '800', fontSize: '16px', color: COLORS.thu }}>{formatCurrency(tongDoanhThu)}</span>
              </div>
              {tongDoanhThu !== thucThu && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: COLORS.textMute }}>Thực Thu (trừ Thẻ Trả Trước)</span>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.thu }}>{formatCurrency(thucThu)}</span>
                </div>
              )}
            </div>

            {/* Chi Phí */}
            <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '4px', height: '18px', borderRadius: '2px', background: COLORS.chi }} />
                <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', color: COLORS.text }}>CHI PHÍ CHI TIẾT</span>
              </div>
              {chiPhiCoTen.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMute, fontSize: '13px' }}>Không có khoản chi nào trong ngày này</div>
              ) : (
                chiPhiCoTen.map((cp, i) => (
                  <div key={cp.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '14px' }}>{cp.iconNhom}</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text }}>{cp.tenHangMuc}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: COLORS.textMute, paddingLeft: '22px' }}>
                          {cp.tenNhom}{cp.dien_giai ? ` • ${cp.dien_giai}` : ''}
                        </div>
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.chi }}>{formatCurrency(cp.so_tien)}</span>
                    </div>
                    {i < chiPhiCoTen.length - 1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px', borderTop: `2px solid ${COLORS.border}`, marginTop: '4px' }}>
                <span style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>Tổng Chi Phí</span>
                <span style={{ fontWeight: '800', fontSize: '16px', color: COLORS.chi }}>{formatCurrency(tongChiPhi)}</span>
              </div>
            </div>

            {/* Chuyển Khoản Nội Bộ */}
            {ckNB.length > 0 && (
              <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '4px', height: '18px', borderRadius: '2px', background: COLORS.chuyenKhoan }} />
                  <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', color: COLORS.text }}>CHUYỂN KHOẢN NỘI BỘ</span>
                </div>
                {ckNB.map((ck, i) => {
                  const tuVi  = viList.find(v => v.id === ck.tu_vi_id)
                  const denVi = viList.find(v => v.id === ck.den_vi_id)
                  return (
                    <div key={ck.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text }}>
                            {tuVi?.ten || '?'} → {denVi?.ten || '?'}
                          </div>
                          {ck.dien_giai && <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>{ck.dien_giai}</div>}
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.chuyenKhoan }}>{formatCurrency(ck.so_tien)}</span>
                      </div>
                      {i < ckNB.length - 1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Lợi Nhuận Ngày */}
            <div style={{
              background: loiNhuan >= 0 ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(135deg,#FFF5F5,#FFE4E4)',
              borderRadius: '24px', padding: '20px', marginBottom: '14px',
              border: `1px solid ${loiNhuan >= 0 ? 'rgba(45,122,79,0.2)' : 'rgba(192,57,43,0.2)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', letterSpacing: '1px', color: COLORS.textMute, fontWeight: '600', marginBottom: '4px' }}>LỢI NHUẬN NGÀY</div>
                  <div style={{ fontSize: '11px', color: COLORS.textMute }}>Thực Thu − Tổng Chi</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: loiNhuan >= 0 ? COLORS.thu : COLORS.chi }}>
                    {formatCurrency(loiNhuan)}
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>
                    {loiNhuan >= 0 ? '✅ Có lãi' : '⚠️ Lỗ'}
                  </div>
                </div>
              </div>
            </div>

            {/* Số Dư Tài Khoản */}
            <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '4px', height: '18px', borderRadius: '2px', background: COLORS.taiSan }} />
                <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', color: COLORS.text }}>SỐ DƯ TÀI KHOẢN ĐẾN NGÀY</span>
              </div>
              {viList.map((vi, i) => (
                <div key={vi.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{vi.icon}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: COLORS.text }}>{vi.ten}</div>
                        <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                          {vi.loai === 'tien_mat' ? 'Tiền mặt tại quầy' : vi.ten === 'MB Bank' ? 'Tài khoản chính' : 'Quẹt thẻ • về 3-7 ngày'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.taiSan }}>
                      {formatCurrency(vi.so_du_dau || 0)}
                    </span>
                  </div>
                  {i < viList.length - 1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px', borderTop: `2px solid ${COLORS.border}`, marginTop: '4px' }}>
                <span style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>Tổng Tài Sản</span>
                <span style={{ fontWeight: '800', fontSize: '16px', color: COLORS.taiSan }}>
                  {formatCurrency(viList.reduce((s, v) => s + (v.so_du_dau || 0), 0))}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}