import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../../lib/utils'
import { LUX } from '../../../../constants/lux'
import StaffAvatar from '../../../../components/shared/StaffAvatar'

const MONTHS = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const ROLE_LABEL = { ktv: 'KTV', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ', quan_ly: 'Quản Lý' }

function fmtDate(s) {
  if (!s) return ''
  const [_y, m, d] = String(s).slice(0, 10).split('-')
  return `${d}/${m}`
}

export default function TabBaoCaoThuNhap() {
  const now = getNowVN()
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam, setNam] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [nvList, setNvList] = useState([])
  const [aggByNv, setAggByNv] = useState({})
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState(null)      // NV đang mở chi tiết
  const [detail, setDetail] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  const prevMonth = () => { if (thang === 1) { setThang(12); setNam(n => n - 1) } else setThang(t => t - 1) }
  const nextMonth = () => { if (thang === 12) { setThang(1); setNam(n => n + 1) } else setThang(t => t + 1) }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const soNgay = new Date(nam, thang, 0).getDate()
      const startDate = `${nam}-${String(thang).padStart(2, '0')}-01`
      const endDate = `${nam}-${String(thang).padStart(2, '0')}-${String(soNgay).padStart(2, '0')}`

      const [resNv, resThuNhap] = await Promise.all([
        supabase.from('nhan_vien')
          .select('id, ho_ten, vi_tri, avatar_url, trang_thai')
          .order('vi_tri').order('ho_ten'),
        supabase.from('v_nhan_vien_thu_nhap')
          .select('nhan_vien_id, loai, so_tien, don_hang_id, don_hang_chi_tiet_id')
          .gte('ngay', startDate).lte('ngay', endDate).eq('is_test', false),
      ])

      const agg = {}
      ;(resThuNhap.data || []).forEach(r => {
        if (!r.nhan_vien_id) return
        const a = agg[r.nhan_vien_id] || (agg[r.nhan_vien_id] = { tour: 0, hoaHong: 0, luotTour: new Set(), luotHH: new Set(), don: new Set() })
        if (r.loai === 'tour') { a.tour += r.so_tien || 0; a.luotTour.add(r.don_hang_chi_tiet_id) }
        else { a.hoaHong += r.so_tien || 0; a.luotHH.add(r.don_hang_chi_tiet_id) }
        if (r.don_hang_id) a.don.add(r.don_hang_id)
      })
      setNvList(resNv.data || [])
      setAggByNv(agg)
    } catch (e) { console.error('TabBaoCaoThuNhap:', e) }
    finally { setLoading(false) }
  }, [thang, nam])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Chi tiết từng đơn của NV đang mở
  useEffect(() => {
    if (!selected) { setDetail([]); return undefined }
    let alive = true
    setDetailLoading(true)
    const soNgay = new Date(nam, thang, 0).getDate()
    const sd = `${nam}-${String(thang).padStart(2, '0')}-01`
    const ed = `${nam}-${String(thang).padStart(2, '0')}-${String(soNgay).padStart(2, '0')}`
    supabase.from('don_hang_chi_tiet')
      .select(`id, thanh_tien, tien_tour, tien_hoa_hong, ti_le_hoa_hong, loai_item,
        dich_vu:dich_vu_id(ten), san_pham:san_pham_id(ten), the_lieu_trinh:the_lieu_trinh_id(ten_dich_vu),
        don_hang:don_hang_id!inner(ngay, ma_don, trang_thai, is_test, khach_hang:khach_hang_id(ho_ten))`)
      .eq('nhan_vien_id', selected.id)
      .gte('don_hang.ngay', sd).lte('don_hang.ngay', ed)
      .eq('don_hang.is_test', false).neq('don_hang.trang_thai', 'huy')
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { console.error('detail:', error); setDetail([]) }
        else {
          const rows = (data || [])
            .filter(r => (r.tien_tour || 0) > 0 || (r.tien_hoa_hong || 0) > 0)
            .sort((a, b) => String(a.don_hang?.ngay).localeCompare(String(b.don_hang?.ngay)))
          setDetail(rows)
        }
        setDetailLoading(false)
      })
    return () => { alive = false }
  }, [selected, thang, nam])

  // Gộp + sắp xếp
  const rows = useMemo(() => {
    return nvList
      .map(nv => {
        const a = aggByNv[nv.id]
        if (!a) return null
        const tong = a.tour + a.hoaHong
        if (tong <= 0) return null
        return { nv, tour: a.tour, hoaHong: a.hoaHong, tong, luotTour: a.luotTour.size, luotHH: a.luotHH.size, soDon: a.don.size }
      })
      .filter(Boolean)
      .filter(r => roleFilter === 'all' || r.nv.vi_tri === roleFilter)
      .sort((a, b) => b.tong - a.tong)
  }, [nvList, aggByNv, roleFilter])

  const totals = useMemo(() => rows.reduce((acc, r) => {
    acc.tour += r.tour; acc.hoaHong += r.hoaHong; acc.tong += r.tong
    return acc
  }, { tour: 0, hoaHong: 0, tong: 0 }), [rows])

  const detailName = (r) => r.dich_vu?.ten || r.the_lieu_trinh?.ten_dich_vu || r.san_pham?.ten || (r.loai_item === 'the_moi' ? 'Bán thẻ liệu trình' : 'Khác')

  return (
    <div style={{ fontFamily: LUX.fontSans }}>
      {/* Thanh chọn tháng */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: 999, padding: '4px 6px' }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <div style={{ minWidth: 150, textAlign: 'center', fontWeight: 700, color: LUX.ink, fontSize: 14 }}>{MONTHS[thang]} {nam}</div>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ height: 34, borderRadius: 8, border: `1px solid ${LUX.line}`, background: LUX.surface2, padding: '0 12px', color: LUX.ink, fontSize: 13 }}>
          <option value="all">Tất cả vị trí</option>
          <option value="ktv">Kỹ thuật viên</option>
          <option value="le_tan">Lễ tân</option>
        </select>
        {loading && <span style={{ fontSize: 12, color: LUX.ink3 }}>Đang tải…</span>}
      </div>

      {/* KPI */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <div className="it"><div className="l">Tổng Tiền Tour</div><div className="v" style={{ color: LUX.taupe }}>{formatCurrency(totals.tour)}</div><div className="d">thực hiện dịch vụ</div></div>
        <div className="it"><div className="l">Tổng Hoa Hồng</div><div className="v" style={{ color: '#8a6a35' }}>{formatCurrency(totals.hoaHong)}</div><div className="d">bán thẻ / sản phẩm</div></div>
        <div className="it"><div className="l">Tổng Thu Nhập KD</div><div className="v" style={{ color: LUX.champagne }}>{formatCurrency(totals.tong)}</div><div className="d">tour + hoa hồng</div></div>
        <div className="it"><div className="l">Nhân Viên Có TN</div><div className="v">{rows.length}</div><div className="d">trong tháng</div></div>
      </div>

      {/* Bảng */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-h">
          <div className="card-t">
            <h3>Thu Nhập Nhân Viên · {MONTHS[thang]} {nam}</h3>
            <span className="sub">{rows.length} nhân viên</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ledger m-card-tbl" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Nhân Viên</th>
                <th>Vị Trí</th>
                <th className="r">Lượt Tour</th>
                <th className="r">Tiền Tour</th>
                <th className="r">Lượt Bán</th>
                <th className="r">Hoa Hồng</th>
                <th className="r">Tổng KD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.nv.id} onClick={() => setSelected(r.nv)} style={{ cursor: 'pointer' }}>
                  <td className="m-hide" style={{ color: LUX.ink3, fontWeight: 700 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <StaffAvatar nv={r.nv} size={34} radius={10} />
                      <span style={{ fontFamily: LUX.fontSerif, fontSize: 16.5, fontWeight: 600, color: LUX.ink, letterSpacing: '.005em' }}>{r.nv.ho_ten}</span>
                    </div>
                  </td>
                  <td data-label="Vị trí"><span className="tag sv">{ROLE_LABEL[r.nv.vi_tri] || r.nv.vi_tri}</span></td>
                  <td data-label="Lượt Tour" className="r" style={{ color: LUX.ink3 }}>{r.luotTour || '—'}</td>
                  <td data-label="Tiền Tour" className="r" style={{ fontWeight: 700, color: LUX.taupe }}>{r.tour ? formatCurrency(r.tour) : '—'}</td>
                  <td data-label="Lượt Bán" className="r" style={{ color: LUX.ink3 }}>{r.luotHH || '—'}</td>
                  <td data-label="Hoa Hồng" className="r" style={{ fontWeight: 700, color: '#8a6a35' }}>{r.hoaHong ? formatCurrency(r.hoaHong) : '—'}</td>
                  <td data-label="Tổng KD" className="r" style={{ fontWeight: 800, color: LUX.champagne, fontFamily: LUX.fontSerif }}>{formatCurrency(r.tong)}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 36, color: LUX.ink3 }}>Chưa có dữ liệu thu nhập trong {MONTHS[thang]} {nam}</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: `2px solid ${LUX.line}`, fontWeight: 800 }}>
                  <td colSpan={4} style={{ textAlign: 'right', color: LUX.ink2 }}>TỔNG CỘNG</td>
                  <td className="r" style={{ color: LUX.taupe }}>{formatCurrency(totals.tour)}</td>
                  <td></td>
                  <td className="r" style={{ color: '#8a6a35' }}>{formatCurrency(totals.hoaHong)}</td>
                  <td className="r" style={{ color: LUX.champagne, fontFamily: LUX.fontSerif }}>{formatCurrency(totals.tong)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Panel chi tiết từng đơn */}
      {selected && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.5)' }} onClick={() => setSelected(null)}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.surface2, overflowY: 'auto', boxShadow: '-6px 0 40px rgba(0,0,0,.28)', animation: 'rpSlideIn .22s ease' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 26px', background: LUX.heroGrad, color: '#fff', position: 'sticky', top: 0, zIndex: 2 }}>
              <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 16, right: 18, background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <StaffAvatar nv={selected} size={48} radius={14} style={{ border: '2px solid rgba(255,255,255,.5)' }} />
                <div>
                  <div style={{ fontFamily: LUX.fontSerif, fontSize: 23, fontWeight: 600, letterSpacing: '.005em' }}>{selected.ho_ten}</div>
                  <div style={{ fontSize: 12, opacity: .9, marginTop: 1 }}>{ROLE_LABEL[selected.vi_tri] || selected.vi_tri} · {MONTHS[thang]} {nam}</div>
                </div>
              </div>
              {(() => {
                const a = aggByNv[selected.id] || { tour: 0, hoaHong: 0 }
                return (
                  <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
                    <div><div style={{ fontSize: 11, opacity: .85 }}>Tiền Tour</div><div style={{ fontSize: 18, fontWeight: 800, fontFamily: LUX.fontSerif }}>{formatCurrency(a.tour)}</div></div>
                    <div><div style={{ fontSize: 11, opacity: .85 }}>Hoa Hồng</div><div style={{ fontSize: 18, fontWeight: 800, fontFamily: LUX.fontSerif }}>{formatCurrency(a.hoaHong)}</div></div>
                    <div><div style={{ fontSize: 11, opacity: .85 }}>Tổng</div><div style={{ fontSize: 18, fontWeight: 800, fontFamily: LUX.fontSerif }}>{formatCurrency(a.tour + a.hoaHong)}</div></div>
                  </div>
                )
              })()}
            </div>

            {/* Bảng chi tiết */}
            <div style={{ padding: '18px 26px 40px' }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: LUX.ink3 }}>Đang tải chi tiết…</div>
              ) : detail.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: LUX.ink3 }}>Không có đơn nào trong tháng</div>
              ) : (
                <table className="ledger" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 54 }}>Ngày</th>
                      <th>Mã đơn</th>
                      <th>Khách</th>
                      <th>Dịch vụ / SP</th>
                      <th className="r">Doanh số</th>
                      <th className="r">%</th>
                      <th className="r">Tour</th>
                      <th className="r">Hoa hồng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map(r => (
                      <tr key={r.id}>
                        <td style={{ color: LUX.ink3 }}>{fmtDate(r.don_hang?.ngay)}</td>
                        <td style={{ fontSize: 11.5, color: LUX.ink2 }}>{r.don_hang?.ma_don}</td>
                        <td style={{ fontSize: 12 }}>{r.don_hang?.khach_hang?.ho_ten || 'Khách lẻ'}</td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{detailName(r)}</td>
                        <td className="r" style={{ color: LUX.ink2 }}>{formatCurrency(r.thanh_tien || 0)}</td>
                        <td className="r" style={{ color: LUX.ink3 }}>{r.ti_le_hoa_hong ? r.ti_le_hoa_hong + '%' : '—'}</td>
                        <td className="r" style={{ color: (r.tien_tour || 0) > 0 ? LUX.taupe : LUX.ink3, fontWeight: 700 }}>{(r.tien_tour || 0) > 0 ? formatCurrency(r.tien_tour) : '—'}</td>
                        <td className="r" style={{ color: (r.tien_hoa_hong || 0) > 0 ? '#8a6a35' : LUX.ink3, fontWeight: 700 }}>{(r.tien_hoa_hong || 0) > 0 ? formatCurrency(r.tien_hoa_hong) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const navBtn = {
  width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'transparent',
  color: '#8a6a35', fontSize: 20, cursor: 'pointer', display: 'grid', placeItems: 'center', fontWeight: 700,
}
