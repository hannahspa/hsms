import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, todayISO, getNowVN } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'

// ── Meta hình thức / loại ──────────────────────────────
const methodMeta = {
  tien_mat:      { label: 'Tiền Mặt',      color: '#3e5a32', bg: '#eef5e8' },
  chuyen_khoan:  { label: 'MB Bank',       color: '#1a4f70', bg: '#e8f1f6' },
  quet_the:      { label: 'TP Bank',       color: '#5e2f74', bg: '#f1eaf4' },
  the_tra_truoc: { label: 'Thẻ Trả Trước', color: '#8a6a52', bg: '#f6efe4' },
  the_lieu_trinh:{ label: 'Thẻ Liệu Trình',color: '#8a6a52', bg: '#f6efe4' },
}
const loaiMeta = {
  thu: { label: 'Thu',          color: '#2d6a2d', bg: '#e8f2e3', sign: '+' },
  chi: { label: 'Chi',          color: '#b85a4a', bg: '#f5e8e3', sign: '−' },
  ck:  { label: 'Chuyển Khoản', color: '#7a6a8a', bg: '#efeaf4', sign: '↔' },
}
const PAGE_SIZE = 60

const parseVND = s => parseInt(String(s).replace(/\D/g, ''), 10) || 0
const fmtInput = n => n ? new Intl.NumberFormat('vi-VN').format(n) : ''

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

function previousMonthFirstISO(now) {
  let year = now.getFullYear()
  let month = now.getMonth()
  if (month < 1) {
    year -= 1
    month = 12
  }
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'
}

export default function DanhSachThuChi({ user }) {
  const isAdmin = user?.vai_tro === 'admin'
  const now = getNowVN()
  // Mặc định: Admin xem từ đầu tháng trước; Lễ Tân chỉ 7 ngày gần nhất (gọn + bảo mật)
  const today = todayISO()
  const firstPrevMonth = previousMonthFirstISO(now)
  const last7 = addDaysISO(today, -6)
  const defaultTuNgay = isAdmin ? firstPrevMonth : last7

  const [tuNgay, setTuNgay] = useState(defaultTuNgay)
  const [denNgay, setDenNgay] = useState(today)
  const [loaiFilter, setLoaiFilter] = useState('all') // all | thu | chi | ck
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [danhMuc, setDanhMuc] = useState({})       // id -> ten
  const [viMap, setViMap] = useState({})           // id -> ten
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [showTu, setShowTu] = useState(false)
  const [showDen, setShowDen] = useState(false)
  const [editing, setEditing] = useState(null)     // bản ghi đang sửa
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      supabase.from('doanh_thu').select('id, ngay, hinh_thuc, so_tien, dien_giai, nguoi_nhap, nguon, created_at').gte('ngay', tuNgay).lte('ngay', denNgay),
      supabase.from('chi_phi').select('id, ngay, hinh_thuc_thanh_toan, so_tien, dien_giai, nguoi_nhap, danh_muc_id, vi_id, created_at').gte('ngay', tuNgay).lte('ngay', denNgay),
      supabase.from('chuyen_khoan_noi_bo').select('id, ngay, tu_vi_id, den_vi_id, so_tien, dien_giai, nguoi_thuc_hien, created_at').gte('ngay', tuNgay).lte('ngay', denNgay),
      supabase.from('danh_muc_chi_phi').select('id, ten'),
      supabase.from('vi').select('id, ten'),
    ]).then(([rDT, rCP, rCK, rDM, rVi]) => {
      if (!alive) return
      const dm = {}; (rDM.data || []).forEach(d => { dm[d.id] = d.ten })
      const vm = {}; (rVi.data || []).forEach(v => { vm[v.id] = v.ten })
      const all = []
      ;(rDT.data || []).forEach(r => all.push({
        _table: 'doanh_thu', loai: 'thu', id: r.id, ngay: r.ngay, so_tien: r.so_tien || 0,
        dien_giai: r.dien_giai || 'Doanh thu', hinh_thuc: r.hinh_thuc, danh_muc: null,
        nguoi: r.nguoi_nhap, nguon: r.nguon, created_at: r.created_at,
      }))
      ;(rCP.data || []).forEach(r => all.push({
        _table: 'chi_phi', loai: 'chi', id: r.id, ngay: r.ngay, so_tien: r.so_tien || 0,
        dien_giai: r.dien_giai || 'Chi phí', hinh_thuc: r.hinh_thuc_thanh_toan, danh_muc: dm[r.danh_muc_id] || null,
        danh_muc_id: r.danh_muc_id, nguoi: r.nguoi_nhap, nguon: null, created_at: r.created_at,
      }))
      ;(rCK.data || []).forEach(r => all.push({
        _table: 'chuyen_khoan_noi_bo', loai: 'ck', id: r.id, ngay: r.ngay, so_tien: r.so_tien || 0,
        dien_giai: r.dien_giai || `${vm[r.tu_vi_id] || '?'} → ${vm[r.den_vi_id] || '?'}`,
        hinh_thuc: null, danh_muc: null, nguoi: r.nguoi_thuc_hien, nguon: null, created_at: r.created_at,
      }))
      // Sắp xếp: ngày giảm dần, rồi created_at giảm dần
      all.sort((a, b) => (b.ngay || '').localeCompare(a.ngay || '') || String(b.created_at || '').localeCompare(String(a.created_at || '')))
      setDanhMuc(dm); setViMap(vm); setRows(all); setLoading(false); setPage(1)
    }).catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [tuNgay, denNgay, refresh])

  // Lọc client
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return rows.filter(r => {
      if (loaiFilter !== 'all' && r.loai !== loaiFilter) return false
      if (kw && !(`${r.dien_giai} ${r.danh_muc || ''} ${r.nguoi || ''}`.toLowerCase().includes(kw))) return false
      return true
    })
  }, [rows, loaiFilter, search])

  const tongThu = filtered.filter(r => r.loai === 'thu').reduce((s, r) => s + r.so_tien, 0)
  const tongChi = filtered.filter(r => r.loai === 'chi').reduce((s, r) => s + r.so_tien, 0)
  const tongCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const fmtNgay = d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}` }

  const handleDelete = async (row) => {
    if (!isAdmin) return
    if (row.loai === 'thu' && row.nguon === 'pos') {
      alert('Đây là doanh thu tự động từ POS (đơn hàng). Không nên xóa trực tiếp — hãy hủy đơn hàng tương ứng trong POS.')
      return
    }
    if (!window.confirm(`Xóa giao dịch "${row.dien_giai}" (${formatCurrency(row.so_tien)})?\nThao tác KHÔNG thể hoàn tác.`)) return
    const { error } = await supabase.from(row._table).delete().eq('id', row.id)
    if (error) { alert('Lỗi xóa: ' + error.message); return }
    setRefresh(k => k + 1)
  }

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <DatePicker open={showTu} selectedDate={tuNgay} onClose={() => setShowTu(false)} onConfirm={d => { setTuNgay(d); setShowTu(false) }} />
      <DatePicker open={showDen} selectedDate={denNgay} onClose={() => setShowDen(false)} onConfirm={d => { setDenNgay(d); setShowDen(false) }} />
      {editing && (
        <EditModal row={editing} danhMucList={danhMuc} viMap={viMap}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setRefresh(k => k + 1) }} />
      )}

      {/* HEADER */}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl" style={{ letterSpacing: '-.01em' }}>Danh Sách Thu Chi</div>
          <div className="sub">Toàn bộ giao dịch thu, chi, chuyển khoản — {isAdmin ? 'sửa/xóa trực tiếp' : 'chỉ xem'}</div>
        </div>
        <div className="acts">
          <button onClick={() => setShowTu(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.Calendar style={{ width: 13, height: 13 }} /> Từ {fmtNgay(tuNgay)}
          </button>
          <button onClick={() => setShowDen(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.Calendar style={{ width: 13, height: 13 }} /> Đến {fmtNgay(denNgay)}
          </button>
        </div>
      </div>

      {/* TỔNG KẾT — chỉ Admin (Lễ Tân không xem tổng thu/chi/lãi lỗ) */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <SummaryCard label="Tổng Giao Dịch" value={`${tongCount}`} isText tone="dark" />
          <SummaryCard label="Tổng Thu" value={tongThu} tone="good" />
          <SummaryCard label="Tổng Chi" value={tongChi} tone="bad" />
          <SummaryCard label="Chênh Lệch (Thu − Chi)" value={tongThu - tongChi} tone={tongThu - tongChi >= 0 ? 'good' : 'bad'} />
        </div>
      )}

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 3 }}>
          {[['all', 'Tất cả'], ['thu', 'Thu'], ['chi', 'Chi'], ['ck', 'Chuyển Khoản']].map(([k, l]) => (
            <button key={k} onClick={() => { setLoaiFilter(k); setPage(1) }}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--sans)',
                background: loaiFilter === k ? 'var(--espresso)' : 'transparent',
                color: loaiFilter === k ? '#f3e6d2' : 'var(--ink2)',
              }}>{l}</button>
          ))}
        </div>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Tìm diễn giải, danh mục, người nhập..."
          style={{ flex: 1, minWidth: 240, padding: '8px 14px', borderRadius: 20, border: '1px solid var(--line2)', background: 'var(--surface2)', fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--sans)' }} />
      </div>

      {/* BẢNG */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-b" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50, color: 'var(--ink3)' }}>Đang tải...</div>
          ) : pageRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 50, color: 'var(--ink3)', fontSize: 13 }}>Không có giao dịch nào khớp bộ lọc</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Ngày</th>
                  <th>Giờ</th>
                  <th>Loại</th>
                  <th>Diễn Giải</th>
                  <th>Danh Mục / Hình Thức</th>
                  <th>Người Nhập</th>
                  <th className="amount">Số Tiền</th>
                  {isAdmin && <th style={{ textAlign: 'center', paddingRight: 20 }}>Thao Tác</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => {
                  const lm = loaiMeta[r.loai]
                  const hm = r.hinh_thuc ? methodMeta[r.hinh_thuc] : null
                  const isPos = r.loai === 'thu' && r.nguon === 'pos'
                  return (
                    <tr key={`${r._table}-${r.id}`}>
                      <td style={{ paddingLeft: 20, whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--ink2)' }}>{fmtNgay(r.ngay)}</td>
                      <td className="time">{formatTime(r.created_at)}</td>
                      <td><span style={{ ...badge(lm.bg, lm.color) }}>{lm.label}</span></td>
                      <td className="desc" style={{ maxWidth: 280 }}>
                        {r.dien_giai}
                        {isPos && <span style={{ ...badge('#f5ede3', '#6e3a2a'), marginLeft: 6, fontSize: 9 }}>POS</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {r.danh_muc && <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>{r.danh_muc}</span>}
                        {r.danh_muc && hm && ' · '}
                        {hm && <span style={{ color: hm.color }}>{hm.label}</span>}
                        {!r.danh_muc && !hm && <span style={{ color: 'var(--ink4)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{r.nguoi || '—'}</td>
                      <td className="amount" style={{ fontFamily: 'var(--sans)', fontVariantNumeric: 'tabular-nums', fontWeight: 750, color: lm.color }}>
                        {lm.sign}{formatCurrency(r.so_tien)}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'center', paddingRight: 20, whiteSpace: 'nowrap' }}>
                          {r.loai === 'ck' || isPos ? (
                            <span style={{ fontSize: 11, color: 'var(--ink4)' }} title={isPos ? 'Doanh thu POS — sửa qua đơn hàng' : 'Chuyển khoản nội bộ'}>khóa</span>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button onClick={() => setEditing(r)} className="icon-btn" style={{ width: 28, height: 28 }} title="Sửa"><I.Edit style={{ width: 12, height: 12 }} /></button>
                              <button onClick={() => handleDelete(r)} className="icon-btn" style={{ width: 28, height: 28 }} title="Xóa"><I.Trash style={{ width: 12, height: 12, color: 'var(--danger, #b85a4a)' }} /></button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* PHÂN TRANG */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="icon-btn" style={{ width: 32, height: 32, opacity: page === 1 ? .4 : 1 }}>‹</button>
          <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 600, minWidth: 90, textAlign: 'center' }}>Trang {page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="icon-btn" style={{ width: 32, height: 32, opacity: page === totalPages ? .4 : 1 }}>›</button>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────
function badge(bg, color) {
  return { background: bg, color, padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }
}

function SummaryCard({ label, value, tone, isText }) {
  const colors = { dark: 'var(--ink)', good: '#2d6a2d', bad: '#b85a4a' }
  return (
    <div className="it" style={{ padding: '16px 18px' }}>
      <div className="l" style={{ fontSize: 10, letterSpacing: '.12em', fontWeight: 750 }}>{label}</div>
      <div style={{ fontFamily: 'var(--sans)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 800, color: colors[tone] || colors.dark, marginTop: 6 }}>
        {isText ? value : formatCurrency(value)}
      </div>
    </div>
  )
}

// ── Modal sửa giao dịch (admin) ──────────────────────
function EditModal({ row, danhMucList, viMap, onClose, onSaved }) {
  const [soTien, setSoTien] = useState(fmtInput(row.so_tien))
  const [dienGiai, setDienGiai] = useState(row.dien_giai || '')
  const [hinhThuc, setHinhThuc] = useState(row.hinh_thuc || 'tien_mat')
  const [danhMucId, setDanhMucId] = useState(row.danh_muc_id || '')
  const [ngay, setNgay] = useState(row.ngay)
  const [showLich, setShowLich] = useState(false)
  const [saving, setSaving] = useState(false)

  const isChi = row.loai === 'chi'
  const isThu = row.loai === 'thu'
  // Danh mục con (hạng mục) cho chi phí
  const dmOptions = Object.entries(danhMucList).map(([id, ten]) => ({ id, ten }))

  const handleSave = async () => {
    const tien = parseVND(soTien)
    if (tien <= 0) { alert('Số tiền phải lớn hơn 0'); return }
    setSaving(true)
    const payload = { so_tien: tien, dien_giai: dienGiai, ngay }
    if (isThu) payload.hinh_thuc = hinhThuc
    if (isChi) { payload.hinh_thuc_thanh_toan = hinhThuc; if (danhMucId) payload.danh_muc_id = danhMucId }
    const { error } = await supabase.from(row._table).update(payload).eq('id', row.id)
    setSaving(false)
    if (error) { alert('Lỗi lưu: ' + error.message); return }
    onSaved()
  }

  const fmtNgay = d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}` }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,29,20,0.4)', backdropFilter: 'blur(3px)', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: 'var(--surface2)', overflowY: 'auto', boxShadow: '-6px 0 40px rgba(42,29,20,0.3)', animation: 'rpSlideIn .22s ease' }}>
        <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={d => { setNgay(d); setShowLich(false) }} />
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
            Sửa {loaiMeta[row.loai].label}
          </div>
          <button onClick={onClose} className="icon-btn" style={{ width: 30, height: 30 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Ngày">
            <button onClick={() => setShowLich(true)} className="btn" style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
              <I.Calendar style={{ width: 13, height: 13 }} /> {fmtNgay(ngay)}
            </button>
          </Field>
          <Field label="Số tiền">
            <input value={soTien} onChange={e => setSoTien(fmtInput(parseVND(e.target.value)))} style={inputStyle} placeholder="0" />
          </Field>
          <Field label="Diễn giải">
            <input value={dienGiai} onChange={e => setDienGiai(e.target.value)} style={inputStyle} placeholder="Nội dung giao dịch" />
          </Field>
          {(isThu || isChi) && (
            <Field label={isThu ? 'Hình thức nhận tiền' : 'Nguồn tiền chi'}>
              <select value={hinhThuc} onChange={e => setHinhThuc(e.target.value)} style={inputStyle}>
                <option value="tien_mat">Tiền Mặt</option>
                <option value="chuyen_khoan">MB Bank (Chuyển khoản)</option>
                <option value="quet_the">TP Bank (Quẹt thẻ)</option>
                {isThu && <option value="the_tra_truoc">Thẻ Trả Trước</option>}
              </select>
            </Field>
          )}
          {isChi && (
            <Field label="Danh mục chi">
              <select value={danhMucId} onChange={e => setDanhMucId(e.target.value)} style={inputStyle}>
                <option value="">— Chọn danh mục —</option>
                {dmOptions.map(o => <option key={o.id} value={o.id}>{o.ten}</option>)}
              </select>
            </Field>
          )}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn">Hủy</button>
          <button onClick={handleSave} disabled={saving} className="btn gold" style={{ opacity: saving ? .6 : 1 }}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 5, display: 'block' }}>{label}</label>
      {children}
    </div>
  )
}
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line2)', background: 'var(--surface2)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--sans)' }
