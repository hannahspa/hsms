import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../lib/utils'
import I from '../../../components/shared/Icons'

const MONTHS = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

function getInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return (p[p.length - 1][0] || '').toUpperCase()
}

const AV_GRAD = [
  'linear-gradient(135deg,#C9A96E,#A0714F)',
  'linear-gradient(135deg,#7D9EC0,#5A7A9A)',
  'linear-gradient(135deg,#7BB88F,#4E9467)',
  'linear-gradient(135deg,#B8A898,#8B7355)',
  'linear-gradient(135deg,#c4998a,#a87366)',
]
function getGrad(name) { let h = 0; for (const c of (name || '')) h += c.charCodeAt(0); return AV_GRAD[h % AV_GRAD.length] }

export default function AdminCommissionPage() {
  const now = getNowVN()
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam, setNam]     = useState(now.getFullYear())
  const [rows, setRows]   = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const soNgay = new Date(nam, thang, 0).getDate()
  const startDate = `${nam}-${String(thang).padStart(2,'0')}-01`
  const endDate   = `${nam}-${String(thang).padStart(2,'0')}-${String(soNgay).padStart(2,'0')}`

  const prevMonth = () => { if (thang === 1) { setThang(12); setNam(n=>n-1) } else setThang(t=>t-1) }
  const nextMonth = () => { if (thang === 12) { setThang(1); setNam(n=>n+1) } else setThang(t=>t+1) }

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(null)
    try {
      // Fetch tất cả dòng hàng có nhan_vien_id trong tháng này
      const { data } = await supabase
        .from('don_hang_chi_tiet')
        .select(`
          id, nhan_vien_id, tien_hoa_hong, thanh_tien, loai_item, so_luong,
          nhan_vien:nhan_vien_id(ho_ten, vi_tri),
          don_hang:don_hang_id(ngay, trang_thai, ma_don)
        `)
        .gte('don_hang.ngay', startDate)
        .lte('don_hang.ngay', endDate)
        .not('nhan_vien_id', 'is', null)
        .neq('don_hang.trang_thai', 'huy')

      const items = (data || []).filter(r => r.don_hang?.ngay) // lọc join null

      // Group theo nhan_vien_id
      const map = {}
      items.forEach(r => {
        const id = r.nhan_vien_id
        if (!id) return
        if (!map[id]) {
          map[id] = {
            id,
            ho_ten: r.nhan_vien?.ho_ten || '—',
            vi_tri: r.nhan_vien?.vi_tri || '',
            soLuotDV: 0,
            tongDoanhThu: 0,
            tongHoaHong: 0,
          }
        }
        map[id].soLuotDV += (r.so_luong || 1)
        map[id].tongDoanhThu += (r.thanh_tien || 0)
        map[id].tongHoaHong += (r.tien_hoa_hong || 0)
      })

      const sorted = Object.values(map).sort((a, b) => b.tongHoaHong - a.tongHoaHong)
      setRows(sorted)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [thang, nam])

  useEffect(() => { load() }, [load])

  const openDetail = async (nv) => {
    setSelected(nv)
    setLoadingDetail(true)
    try {
      const { data } = await supabase
        .from('don_hang_chi_tiet')
        .select(`
          id, tien_hoa_hong, thanh_tien, loai_item, so_luong,
          dich_vu:dich_vu_id(ten),
          san_pham:san_pham_id(ten),
          don_hang:don_hang_id(ngay, ma_don)
        `)
        .gte('don_hang.ngay', startDate)
        .lte('don_hang.ngay', endDate)
        .eq('nhan_vien_id', nv.id)
        .neq('don_hang.trang_thai', 'huy')
        .order('don_hang.ngay', { ascending: false })
      setDetail((data || []).filter(r => r.don_hang?.ngay))
    } catch (e) { setDetail([]) }
    finally { setLoadingDetail(false) }
  }

  const maxHH = rows[0]?.tongHoaHong || 1
  const tongHH = rows.reduce((s, r) => s + r.tongHoaHong, 0)
  const tongDT = rows.reduce((s, r) => s + r.tongDoanhThu, 0)

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div className="mod-head" style={{ marginBottom: 16 }}>
          <div>
            <div className="ttl">Hoa Hồng KTV</div>
            <div className="sub">{MONTHS[thang]} {nam} · {rows.length} nhân viên · {rows.reduce((s,r)=>s+r.soLuotDV,0)} lượt dịch vụ</div>
          </div>
          <div className="acts">
            <button onClick={prevMonth} className="icon-btn" style={{ width: 34, height: 34 }}>‹</button>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', padding: '0 4px' }}>
              {MONTHS[thang]} {nam}
            </span>
            <button onClick={nextMonth} className="icon-btn" style={{ width: 34, height: 34 }}>›</button>
          </div>
        </div>

        {/* Strip */}
        <div className="strip" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
          <div className="it">
            <div className="l">Tổng Hoa Hồng</div>
            <div className="v" style={{ color: '#426a2c' }}>{formatCurrency(tongHH)}</div>
            <div className="d">{rows.length} KTV</div>
          </div>
          <div className="it">
            <div className="l">Doanh Thu KTV Tạo Ra</div>
            <div className="v">{formatCurrency(tongDT)}</div>
            <div className="d">từ POS HSMS</div>
          </div>
          <div className="it">
            <div className="l">Tỉ Lệ HH / DT</div>
            <div className="v">{tongDT > 0 ? (tongHH / tongDT * 100).toFixed(1) : '0'}<span style={{ fontSize: 14 }}>%</span></div>
            <div className="d">trung bình</div>
          </div>
        </div>

        {/* Danh sách KTV */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>Đang tải dữ liệu...</div>
        ) : rows.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 6 }}>Chưa có dữ liệu hoa hồng</div>
            <div style={{ fontSize: 13 }}>Hoa hồng được ghi nhận khi KTV thực hiện dịch vụ trong POS</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Nhân Viên</th>
                  <th className="amount">Lượt DV</th>
                  <th>Doanh Thu</th>
                  <th>Hoa Hồng</th>
                  <th style={{ paddingRight: 20 }}>Tỉ Lệ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const pct = Math.min(100, (r.tongHoaHong / maxHH) * 100)
                  const tlHH = r.tongDoanhThu > 0 ? (r.tongHoaHong / r.tongDoanhThu * 100).toFixed(1) : '0'
                  const isActive = selected?.id === r.id
                  return (
                    <tr key={r.id} onClick={() => isActive ? setSelected(null) : openDetail(r)}
                      style={{ cursor: 'pointer', ...(isActive ? { background: 'rgba(201,169,110,.07)', borderLeft: '3px solid var(--champagne)' } : {}) }}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: getGrad(r.ho_ten), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {getInitials(r.ho_ten)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                              {r.ho_ten.trim().split(' ').slice(-2).join(' ')}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                              {r.vi_tri === 'ktv' ? 'KTV' : r.vi_tri === 'le_tan' ? 'Lễ Tân' : r.vi_tri}
                            </div>
                          </div>
                          {i === 0 && <span style={{ background: '#f5e8d4', color: '#b08a55', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>TOP</span>}
                        </div>
                      </td>
                      <td className="amount">
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700 }}>{r.soLuotDV}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{formatCurrency(r.tongDoanhThu)}</div>
                        <div className="bar-h" style={{ marginTop: 4 }}>
                          <i style={{ width: pct + '%', background: 'var(--primary)' }} />
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: '#426a2c' }}>
                          {formatCurrency(r.tongHoaHong)}
                        </div>
                      </td>
                      <td style={{ paddingRight: 20 }}>
                        <span style={{ background: '#eef2e7', color: '#5a6a4a', padding: '3px 9px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                          {tlHH}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <aside style={{
          width: 300, flexShrink: 0,
          background: 'var(--surface)', border: '1px solid var(--bord)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-2)',
          padding: 20, animation: 'viewIn .3s var(--ease-out) both',
          position: 'sticky', top: 24, maxHeight: '85vh', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              {selected.ho_ten.trim().split(' ').slice(-2).join(' ')}
            </div>
            <button className="icon-btn" style={{ width: 26, height: 26, fontSize: 14 }} onClick={() => setSelected(null)}>✕</button>
          </div>

          {/* Summary */}
          <div style={{ background: 'linear-gradient(135deg,rgba(66,106,44,.12),rgba(66,106,44,.05))', border: '1px solid rgba(66,106,44,.2)', borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 6 }}>
              Tổng Hoa Hồng {MONTHS[thang]}
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: '#426a2c' }}>
              {formatCurrency(selected.tongHoaHong)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
              {selected.soLuotDV} lượt · {formatCurrency(selected.tongDoanhThu)} DT
            </div>
          </div>

          {/* Chi tiết từng giao dịch */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Chi tiết ({detail.length})
          </div>
          {loadingDetail ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink3)', fontSize: 13 }}>Đang tải...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {detail.map(d => {
                const tenSP = d.dich_vu?.ten || d.san_pham?.ten || 'Dịch vụ'
                const ngay = d.don_hang?.ngay
                return (
                  <div key={d.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', flex: 1, marginRight: 8 }}>{tenSP}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#426a2c', flexShrink: 0 }}>{formatCurrency(d.tien_hoa_hong || 0)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                        {ngay ? (() => { const [y,m,dd] = ngay.split('-'); return `${dd}/${m}` })() : '—'}
                        {d.don_hang?.ma_don ? ` · ${d.don_hang.ma_don}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{formatCurrency(d.thanh_tien || 0)} DT</div>
                    </div>
                  </div>
                )
              })}
              {detail.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink3)', fontSize: 13 }}>Không có giao dịch</div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
