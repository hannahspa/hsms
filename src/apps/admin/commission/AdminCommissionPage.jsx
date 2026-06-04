import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../lib/utils'
import { C } from '../../../constants/colors'

const MONTHS = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

const SOURCE_LABELS = {
  myspa_commission: 'MySpa đã khóa',
  pos: 'POS HSMS',
  manual: 'Nhập tay',
  payroll: 'Bảng lương',
}

const AV_GRAD = [
  'linear-gradient(135deg,#C9A96E,#A0714F)',
  'linear-gradient(135deg,#7D9EC0,#5A7A9A)',
  'linear-gradient(135deg,#7BB88F,#4E9467)',
  'linear-gradient(135deg,#B8A898,#8B7355)',
  'linear-gradient(135deg,#c4998a,#a87366)',
]
function getGrad(name) { let h = 0; for (const c of (name||'')) h += c.charCodeAt(0); return AV_GRAD[h % AV_GRAD.length] }
function getInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return (p[p.length-1][0]||'').toUpperCase()
}
function fmtDate(iso) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function sourceLabel(source) {
  return SOURCE_LABELS[source] || source || 'Không rõ nguồn'
}

function itemNameFromNote(note = '') {
  const text = String(note || '')
  const idx = text.lastIndexOf(' - ')
  return idx >= 0 ? text.slice(idx + 3).trim() : ''
}

function normalizeLedgerRow(r) {
  const line = r.line_item || {}
  return {
    id: r.id,
    nguon: r.nguon || 'pos',
    ghi_chu: r.ghi_chu || '',
    thu_nhap_loai: r.loai,
    thu_nhap_trang_thai: r.trang_thai || 'phat_sinh',
    so_tien_thu_nhap: r.so_tien || 0,
    thanh_tien: r.doanh_so_tinh || line.thanh_tien || 0,
    tien_tour: r.loai === 'tour' ? (r.so_tien || 0) : 0,
    tien_hoa_hong: r.loai === 'hoa_hong' ? (r.so_tien || 0) : 0,
    ti_le_hoa_hong: r.ti_le || 0,
    loai_item: line.loai_item || r.loai,
    so_luong: line.so_luong || 1,
    dich_vu: line.dich_vu,
    san_pham: line.san_pham,
    the_lieu_trinh: line.the_lieu_trinh,
    don_hang: r.don_hang,
  }
}

// ── Chi tiết modal ────────────────────────────────────────────────────────────
function DetailModal({ nv, thang, nam, startDate, endDate, onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    // Dùng VIEW realtime từ don_hang_chi_tiet để khớp MySpa
    const { data: ledgerRows, error: ledgerError } = await supabase
      .from('v_nhan_vien_thu_nhap')
      .select(`
        id, loai, nguon, so_tien, ti_le, doanh_so_tinh, ngay, trang_thai, ghi_chu,
        don_hang:don_hang_id(id, ngay, ma_don, trang_thai, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)),
        line_item:don_hang_chi_tiet_id(
          loai_item, so_luong, thanh_tien,
          dich_vu:dich_vu_id(ten),
          san_pham:san_pham_id(ten),
          the_lieu_trinh:the_lieu_trinh_id(ten_dich_vu)
        )
      `)
      .gte('ngay', startDate)
      .lte('ngay', endDate)
      .eq('nhan_vien_id', nv.id)
      .eq('is_test', false)
      .neq('trang_thai', 'huy')
      .order('created_at', { ascending: false })

    if (!ledgerError) {
      setRows((ledgerRows || []).map(normalizeLedgerRow).filter(r => r.don_hang?.ngay))
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('don_hang_chi_tiet')
      .select(`
        id, thanh_tien, tien_tour, tien_hoa_hong, ti_le_hoa_hong, loai_item, so_luong,
        dich_vu:dich_vu_id(ten),
        san_pham:san_pham_id(ten),
        the_lieu_trinh:the_lieu_trinh_id(ten_dich_vu),
        don_hang:don_hang_id(ngay, ma_don, trang_thai, is_test, khach_hang:khach_hang_id(ho_ten, so_dien_thoai))
      `)
      .gte('don_hang.ngay', startDate)
      .lte('don_hang.ngay', endDate)
      .eq('nhan_vien_id', nv.id)
      .neq('don_hang.trang_thai', 'huy')
      .order('created_at', { ascending: false })
    setRows((data || []).filter(r => r.don_hang?.ngay && !r.don_hang?.is_test))
    setLoading(false)
  }, [nv.id, startDate, endDate])

  useEffect(() => { loadRows() }, [loadRows])

  const markAll = async (status) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('nhan_vien_thu_nhap')
        .update({ trang_thai: status })
        .eq('nhan_vien_id', nv.id)
        .gte('ngay', startDate)
        .lte('ngay', endDate)
        .eq('is_test', false)
        .neq('trang_thai', 'huy')
      if (error) throw error
      await loadRows()
    } catch (e) {
      alert(e.message || 'Không cập nhật được trạng thái đối soát')
    } finally {
      setSaving(false)
    }
  }

  const tongDT = rows.reduce((s, r) => s + (r.thanh_tien || 0), 0)
  const tongTour = rows.reduce((s, r) => s + (r.tien_tour || 0), 0)
  const tongCommission = rows.reduce((s, r) => s + (r.tien_hoa_hong || 0), 0)
  const tongThuNhap = tongTour + tongCommission
  const nguonMap = rows.reduce((map, row) => {
    const key = row.nguon || 'pos'
    if (!map[key]) map[key] = { rows: 0, amount: 0 }
    map[key].rows += 1
    map[key].amount += row.so_tien_thu_nhap || 0
    return map
  }, {})
  const doiSoatCount = rows.filter(r => ['doi_soat', 'da_chot', 'da_tra'].includes(r.thu_nhap_trang_thai)).length
  const daChotCount = rows.filter(r => ['da_chot', 'da_tra'].includes(r.thu_nhap_trang_thai)).length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,.45)',
    }} onClick={onClose}>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw',
        background: '#fff',
        display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 40px rgba(0,0,0,.28)', animation: 'rpSlideIn .22s ease',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px 24px 12px',
          background: C.grad, borderRadius: '16px 16px 0 0', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--serif)' }}>
              {nv.ho_ten}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
              Chi tiết Lương Kinh Doanh · {MONTHS[thang]} {nam} · {rows.length} giao dịch
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Tổng thu nhập</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'var(--serif)' }}>{formatCurrency(tongThuNhap)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={saving || rows.length === 0} onClick={() => markAll('doi_soat')} style={{
                height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.28)',
                background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              }}>Đối soát</button>
              <button disabled={saving || rows.length === 0} onClick={() => markAll('da_chot')} style={{
                height: 32, padding: '0 12px', borderRadius: 8, border: 'none',
                background: '#fff', color: '#7D5A3C', fontSize: 11, fontWeight: 800, cursor: saving ? 'wait' : 'pointer',
              }}>Chốt</button>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8,
              color: '#fff', cursor: 'pointer', fontSize: 18, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        </div>

        {/* Summary strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
          borderBottom: '1px solid var(--line)', background: '#fafaf9', flexShrink: 0,
        }}>
          {[
            { l: 'Tổng Doanh Số', v: formatCurrency(tongDT), c: C.ink },
            { l: 'Tiền Tour', v: formatCurrency(tongTour), c: C.thu },
            { l: 'Hoa Hồng', v: formatCurrency(tongCommission), c: C.gold },
            { l: 'Tổng Thu Nhập', v: formatCurrency(tongThuNhap), c: C.chi },
            { l: 'Đối Soát', v: `${doiSoatCount}/${rows.length}`, c: daChotCount === rows.length && rows.length > 0 ? C.thu : C.ink2 },
          ].map(it => (
            <div key={it.l} style={{ padding: '12px 20px', borderRight: '1px solid var(--line)' }}>
              <div style={{ fontSize: 10, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.07em' }}>{it.l}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: it.c, fontFamily: 'var(--serif)', marginTop: 2 }}>{it.v}</div>
            </div>
          ))}
        </div>

        {Object.keys(nguonMap).length > 0 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--line)', background: '#fffdf9', flexWrap: 'wrap' }}>
            {Object.entries(nguonMap).map(([source, data]) => (
              <span key={source} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 9px', borderRadius: 999,
                background: source === 'myspa_commission' ? 'rgba(201,169,110,.16)' : 'rgba(45,122,79,.09)',
                color: source === 'myspa_commission' ? C.primary : C.thu,
                fontSize: 11, fontWeight: 800,
              }}>
                {sourceLabel(source)}
                <span style={{ color: C.ink2, fontWeight: 700 }}>{data.rows} dòng</span>
                <span>{formatCurrency(data.amount)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: C.ink3 }}>Đang tải...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f5f0ea', zIndex: 1 }}>
                <tr>
                  {['Ngày', 'Mã đơn', 'Khách hàng', 'Dịch vụ / Sản phẩm', 'Khoản', 'Nguồn', 'Doanh số', '%', 'Số tiền', 'Trạng thái'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: h === 'Doanh số' || h === 'Số tiền' ? 'right' : 'left',
                      fontWeight: 700, fontSize: 10, color: C.ink2, textTransform: 'uppercase',
                      letterSpacing: '.06em', whiteSpace: 'nowrap', borderBottom: '2px solid var(--line)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const tenDV = r.dich_vu?.ten || r.san_pham?.ten || r.the_lieu_trinh?.ten_dich_vu || itemNameFromNote(r.ghi_chu) || '—'
                  const kh = r.don_hang?.khach_hang
                  const loai = r.thu_nhap_loai === 'hoa_hong' ? 'Hoa hồng' : 'Tour'
                  const trangThai = r.thu_nhap_trang_thai || 'phat_sinh'
                  const badgeColor = trangThai === 'da_chot' || trangThai === 'da_tra' ? C.thu : trangThai === 'doi_soat' ? C.gold : C.ink3
                  const badgeBg = trangThai === 'da_chot' || trangThai === 'da_tra' ? 'rgba(45,122,79,.1)' : trangThai === 'doi_soat' ? 'rgba(201,169,110,.16)' : '#f1ece6'
                  const trangThaiLabel = trangThai === 'da_chot' ? 'Đã chốt' : trangThai === 'da_tra' ? 'Đã trả' : trangThai === 'doi_soat' ? 'Đã đối soát' : 'Phát sinh'
                  return (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf9', borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 12px', color: C.ink2, whiteSpace: 'nowrap' }}>{fmtDate(r.don_hang?.ngay)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>{r.don_hang?.ma_don || '—'}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{kh?.ho_ten || 'Khách lẻ'}</div>
                        {kh?.so_dien_thoai && <div style={{ fontSize: 10, color: C.ink3 }}>{kh.so_dien_thoai}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                        <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.3 }}>{tenDV}</div>
                        {(r.so_luong > 1) && <div style={{ fontSize: 10, color: C.ink3 }}>×{r.so_luong}</div>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                          background: r.thu_nhap_loai === 'hoa_hong' ? 'rgba(201,169,110,.16)' : 'rgba(45,122,79,.1)',
                          color: r.thu_nhap_loai === 'hoa_hong' ? C.primary : C.thu,
                        }}>{loai}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '3px 7px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          background: r.nguon === 'myspa_commission' ? 'rgba(201,169,110,.15)' : 'rgba(45,122,79,.08)',
                          color: r.nguon === 'myspa_commission' ? C.primary : C.thu,
                        }}>
                          {sourceLabel(r.nguon)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--serif)', fontWeight: 600, color: C.ink }}>
                        {formatCurrency(r.thanh_tien || 0)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.ink2 }}>
                          {r.ti_le_hoa_hong > 0 ? `${r.ti_le_hoa_hong}%` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: C.thu }}>
                          {(r.so_tien_thu_nhap || r.tien_tour || r.tien_hoa_hong || 0) > 0 ? formatCurrency(r.so_tien_thu_nhap || r.tien_tour || r.tien_hoa_hong || 0) : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          borderRadius: 20, padding: '3px 8px',
                          fontSize: 10.5, fontWeight: 800,
                          background: badgeBg, color: badgeColor,
                        }}>{trangThaiLabel}</span>
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: C.ink3 }}>Không có giao dịch</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminCommissionPage() {
  const now = getNowVN()
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam, setNam]     = useState(now.getFullYear())
  const [rows, setRows]   = useState([])
  const [loading, setLoading] = useState(false)
  const [detailNV, setDetailNV] = useState(null)

  const soNgay   = new Date(nam, thang, 0).getDate()
  const startDate = `${nam}-${String(thang).padStart(2,'0')}-01`
  const endDate   = `${nam}-${String(thang).padStart(2,'0')}-${String(soNgay).padStart(2,'0')}`

  const prevMonth = () => { if (thang===1){setThang(12);setNam(n=>n-1)}else setThang(t=>t-1) }
  const nextMonth = () => { if (thang===12){setThang(1);setNam(n=>n+1)}else setThang(t=>t+1) }

  const load = useCallback(async () => {
    setLoading(true)
    setDetailNV(null)
    try {
      const { data: ledgerRows, error: ledgerError } = await supabase
        .from('v_nhan_vien_thu_nhap')
        .select(`
          id, don_hang_id, nhan_vien_id, loai, nguon, so_tien, doanh_so_tinh, ngay, trang_thai,
          nhan_vien:nhan_vien_id(ho_ten, vi_tri)
        `)
        .gte('ngay', startDate)
        .lte('ngay', endDate)
        .eq('is_test', false)
        .neq('trang_thai', 'huy')

      if (!ledgerError) {
        const map = {}
        ;(ledgerRows || []).forEach(r => {
          const id = r.nhan_vien_id
          if (!id) return
          if (!map[id]) {
            map[id] = {
              id,
              ho_ten: r.nhan_vien?.ho_ten || '—',
              vi_tri: r.nhan_vien?.vi_tri || '',
              orderIds: new Set(),
              sourceMap: {},
              soLuot: 0,
              tongDS: 0,
              tongTienTour: 0,
              tongHoaHongThe: 0,
            }
          }
          if (r.don_hang_id) map[id].orderIds.add(r.don_hang_id)
          const source = r.nguon || 'pos'
          if (!map[id].sourceMap[source]) map[id].sourceMap[source] = { rows: 0, amount: 0 }
          map[id].sourceMap[source].rows += 1
          map[id].sourceMap[source].amount += (r.so_tien || 0)
          map[id].soLuot += 1
          map[id].tongDS += (r.doanh_so_tinh || 0)
          if (r.loai === 'hoa_hong') {
            map[id].tongHoaHongThe += (r.so_tien || 0)
          } else if (r.loai === 'tour') {
            map[id].tongTienTour += (r.so_tien || 0)
          }
        })

        const sorted = Object.values(map)
          .map(r => ({ ...r, soDon: r.orderIds.size }))
          .sort((a,b) => (b.tongTienTour + b.tongHoaHongThe) - (a.tongTienTour + a.tongHoaHongThe))
        setRows(sorted)
        return
      }

      const { data } = await supabase
        .from('don_hang_chi_tiet')
        .select(`
          id, nhan_vien_id, tien_tour, tien_hoa_hong, thanh_tien, loai_item, so_luong,
          nhan_vien:nhan_vien_id(ho_ten, vi_tri),
          don_hang:don_hang_id(ngay, trang_thai, is_test)
        `)
        .gte('don_hang.ngay', startDate)
        .lte('don_hang.ngay', endDate)
        .not('nhan_vien_id', 'is', null)
        .neq('don_hang.trang_thai', 'huy')

      const items = (data || []).filter(r => r.don_hang?.ngay && !r.don_hang?.is_test)

      const map = {}
      items.forEach(r => {
        const id = r.nhan_vien_id
        if (!id) return
        if (!map[id]) {
          map[id] = {
            id,
            ho_ten: r.nhan_vien?.ho_ten || '—',
            vi_tri: r.nhan_vien?.vi_tri || '',
            soDon: 0,
            soLuot: 0,
            tongDS: 0,       // Doanh số
            tongTienTour: 0, // Tiền Tour (hoa hồng thực hiện DV)
            tongHoaHongThe: 0, // Hoa hồng bán thẻ LT
          }
        }
        map[id].soLuot += (r.so_luong || 1)
        map[id].tongDS += (r.thanh_tien || 0)
        if (r.loai_item === 'the_moi' || r.loai_item === 'san_pham') {
          map[id].tongHoaHongThe += (r.tien_hoa_hong || 0)
        } else {
          map[id].tongTienTour += (r.tien_tour || 0)
        }
      })

      const sorted = Object.values(map).sort((a,b) =>
        (b.tongTienTour + b.tongHoaHongThe) - (a.tongTienTour + a.tongHoaHongThe)
      )
      setRows(sorted)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [thang, nam])

  useEffect(() => { load() }, [load])

  const tongDS   = rows.reduce((s,r) => s + r.tongDS, 0)
  const tongTour = rows.reduce((s,r) => s + r.tongTienTour, 0)
  const tongThe  = rows.reduce((s,r) => s + r.tongHoaHongThe, 0)
  const tongTong = tongTour + tongThe
  const sourceTotals = rows.reduce((map, row) => {
    Object.entries(row.sourceMap || {}).forEach(([source, data]) => {
      if (!map[source]) map[source] = { rows: 0, amount: 0 }
      map[source].rows += data.rows || 0
      map[source].amount += data.amount || 0
    })
    return map
  }, {})

  return (
    <div>
      {/* Header */}
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Lương Kinh Doanh</div>
          <div className="sub">
            {MONTHS[thang]} {nam} · {startDate} → {endDate} · {rows.length} nhân viên
          </div>
        </div>
        <div className="acts">
          <button onClick={prevMonth} className="icon-btn" style={{ width: 34, height: 34 }}>‹</button>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', padding: '0 6px' }}>
            {MONTHS[thang]} {nam}
          </span>
          <button onClick={nextMonth} className="icon-btn" style={{ width: 34, height: 34 }}>›</button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="it">
          <div className="l">Tổng Doanh Số</div>
          <div className="v">{formatCurrency(tongDS)}</div>
          <div className="d">dịch vụ có KTV</div>
        </div>
        <div className="it">
          <div className="l">Tiền Tour</div>
          <div className="v" style={{ color: C.thu }}>{formatCurrency(tongTour)}</div>
          <div className="d">thực hiện dịch vụ</div>
        </div>
        <div className="it">
          <div className="l">Hoa Hồng Thẻ LT</div>
          <div className="v" style={{ color: C.gold }}>{formatCurrency(tongThe)}</div>
          <div className="d">bán liệu trình</div>
        </div>
        <div className="it">
          <div className="l">Tổng Chi Trả</div>
          <div className="v" style={{ color: C.chi }}>{formatCurrency(tongTong)}</div>
          <div className="d">Tour + Thẻ LT</div>
        </div>
      </div>

      {Object.keys(sourceTotals).length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.ink, fontFamily: 'var(--serif)' }}>Nguồn dữ liệu thu nhập</div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>
              Dữ liệu cũ từ MySpa đã khóa riêng, POS HSMS mới sẽ tự nối tiếp sau go-live.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {Object.entries(sourceTotals).map(([source, data]) => (
              <span key={source} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 999,
                background: source === 'myspa_commission' ? 'rgba(201,169,110,.16)' : 'rgba(45,122,79,.09)',
                color: source === 'myspa_commission' ? C.primary : C.thu,
                fontSize: 12, fontWeight: 800,
              }}>
                {sourceLabel(source)}
                <span style={{ color: C.ink2 }}>{data.rows} dòng</span>
                <span>{formatCurrency(data.amount)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bảng */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: C.ink3 }}>Đang tải dữ liệu...</div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: C.ink, marginBottom: 6 }}>Chưa có dữ liệu</div>
          <div style={{ fontSize: 13, color: C.ink3 }}>Lương kinh doanh được ghi nhận khi KTV/Lễ Tân thực hiện hoặc bán dịch vụ trong POS</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f0ea' }}>
                {[
                  { l: 'Nhân Viên', align: 'left', pl: 20 },
                  { l: 'Doanh Số', align: 'right' },
                  { l: 'Lượt DV', align: 'right' },
                  { l: 'Tiền Tour', align: 'right' },
                  { l: 'Hoa Hồng Bán Thẻ', align: 'right' },
                  { l: 'Tổng LKD', align: 'right' },
                  { l: 'Tỷ lệ', align: 'center' },
                  { l: '', align: 'center', pr: 20 },
                ].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 12px', textAlign: h.align,
                    paddingLeft: h.pl || 12, paddingRight: h.pr || 12,
                    fontWeight: 700, fontSize: 10, color: C.ink2,
                    textTransform: 'uppercase', letterSpacing: '.06em',
                    borderBottom: '2px solid var(--line)', whiteSpace: 'nowrap',
                  }}>{h.l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const tongLKD = r.tongTienTour + r.tongHoaHongThe
                const tiLe = r.tongDS > 0 ? (tongLKD / r.tongDS * 100).toFixed(1) : '0'
                const barW = tongDS > 0 ? (r.tongDS / tongDS * 100) : 0
                return (
                  <tr key={r.id} style={{
                    background: i % 2 === 0 ? '#fff' : '#fafaf9',
                    borderBottom: '1px solid var(--line)',
                    transition: 'background .1s',
                  }}>
                    {/* NV */}
                    <td style={{ padding: '12px 12px 12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: getGrad(r.ho_ten),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: '#fff',
                        }}>{getInitials(r.ho_ten)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>
                            {r.ho_ten.trim().split(' ').slice(-2).join(' ')}
                          </div>
                          <div style={{ fontSize: 10, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 1 }}>
                            {r.vi_tri === 'ktv' ? 'KTV' : r.vi_tri === 'le_tan' ? 'Lễ Tân' : r.vi_tri}
                          </div>
                          {r.sourceMap?.myspa_commission && (
                            <div style={{ fontSize: 10, color: C.primary, fontWeight: 800, marginTop: 2 }}>
                              MySpa {formatCurrency(r.sourceMap.myspa_commission.amount)}
                            </div>
                          )}
                        </div>
                        {i === 0 && (
                          <span style={{ background: '#f5e8d4', color: '#b08a55', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>TOP</span>
                        )}
                      </div>
                    </td>

                    {/* Doanh số */}
                    <td style={{ padding: '12px', textAlign: 'right', minWidth: 110 }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 600, color: C.ink }}>
                        {formatCurrency(r.tongDS)}
                      </div>
                      <div style={{ height: 3, background: '#eee', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: barW+'%', background: C.primary, borderRadius: 2 }} />
                      </div>
                    </td>

                    {/* Lượt DV */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: C.ink }}>
                        {r.soLuot}
                      </span>
                    </td>

                    {/* Tiền Tour */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: C.thu }}>
                        {r.tongTienTour > 0 ? formatCurrency(r.tongTienTour) : '—'}
                      </span>
                    </td>

                    {/* Hoa Hồng Bán Thẻ */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: C.gold }}>
                        {r.tongHoaHongThe > 0 ? formatCurrency(r.tongHoaHongThe) : '—'}
                      </span>
                    </td>

                    {/* Tổng LKD */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: C.chi }}>
                        {formatCurrency(tongLKD)}
                      </div>
                    </td>

                    {/* Tỷ lệ */}
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        background: 'rgba(45,122,79,.1)', color: C.thu,
                        padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      }}>{tiLe}%</span>
                    </td>

                    {/* Chi tiết */}
                    <td style={{ padding: '12px 20px 12px 12px', textAlign: 'center' }}>
                      <button onClick={() => setDetailNV({ ...r })}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', border: 'none',
                          background: C.grad, color: '#fff',
                          cursor: 'pointer', fontSize: 14, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>→</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Footer tổng */}
            <tfoot>
              <tr style={{ background: '#f0ebe4', borderTop: '2px solid var(--line)' }}>
                <td style={{ padding: '12px 12px 12px 20px', fontWeight: 700, fontSize: 13, color: C.ink }}>
                  Tổng cộng
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--serif)', fontWeight: 700, color: C.ink }}>
                  {formatCurrency(tongDS)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--serif)', fontWeight: 700, color: C.ink }}>
                  {rows.reduce((s,r)=>s+r.soLuot,0)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--serif)', fontWeight: 700, color: C.thu }}>
                  {formatCurrency(tongTour)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--serif)', fontWeight: 700, color: C.gold }}>
                  {formatCurrency(tongThe)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--serif)', fontWeight: 700, color: C.chi }}>
                  {formatCurrency(tongTong)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Chi tiết Modal */}
      {detailNV && (
        <DetailModal
          nv={detailNV}
          thang={thang}
          nam={nam}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setDetailNV(null)}
        />
      )}
    </div>
  )
}
