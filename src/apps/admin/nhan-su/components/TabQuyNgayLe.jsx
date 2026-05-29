import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { getNowVN } from '../../../../lib/utils'

// ── Danh sách ngày lễ quốc gia (sync với lib/luong.js) ──
const HOLIDAYS_META = [
  { date: '2025-01-01', ten: 'Tết Dương Lịch 2025' },
  { date: '2025-01-28', ten: 'Tết Âm Lịch 2025 (28 Tết)' },
  { date: '2025-01-29', ten: 'Tết Âm Lịch 2025 (Mùng 1)' },
  { date: '2025-01-30', ten: 'Tết Âm Lịch 2025 (Mùng 2)' },
  { date: '2025-04-30', ten: 'Ngày Giải Phóng 2025' },
  { date: '2025-05-01', ten: 'Quốc Tế Lao Động 2025' },
  { date: '2025-09-02', ten: 'Quốc Khánh 2025' },
  { date: '2026-01-01', ten: 'Tết Dương Lịch 2026' },
  { date: '2026-02-16', ten: 'Tết Âm Lịch 2026 (29 Tết)' },
  { date: '2026-02-17', ten: 'Tết Âm Lịch 2026 (Mùng 1)' },
  { date: '2026-02-18', ten: 'Tết Âm Lịch 2026 (Mùng 2)' },
  { date: '2026-04-30', ten: 'Ngày Giải Phóng 2026' },
  { date: '2026-05-01', ten: 'Quốc Tế Lao Động 2026' },
  { date: '2026-09-02', ten: 'Quốc Khánh 2026' },
  { date: '2027-01-01', ten: 'Tết Dương Lịch 2027' },
  { date: '2027-02-05', ten: 'Tết Âm Lịch 2027 (29 Tết)' },
  { date: '2027-02-06', ten: 'Tết Âm Lịch 2027 (Mùng 1)' },
  { date: '2027-02-07', ten: 'Tết Âm Lịch 2027 (Mùng 2)' },
  { date: '2027-04-30', ten: 'Ngày Giải Phóng 2027' },
  { date: '2027-05-01', ten: 'Quốc Tế Lao Động 2027' },
  { date: '2027-09-02', ten: 'Quốc Khánh 2027' },
]

function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const TH = ({ children, w, align = 'left' }) => (
  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: LUX.fontSans, textAlign: align, width: w, whiteSpace: 'nowrap', background: '#F7F4F0', borderBottom: `2px solid ${LUX.line}` }}>
    {children}
  </th>
)
const TD = ({ children, align = 'left', muted, style: sx }) => (
  <td style={{ padding: '11px 14px', fontSize: 13, fontFamily: LUX.fontSans, textAlign: align, color: muted ? LUX.ink3 : LUX.ink2, verticalAlign: 'middle', ...sx }}>
    {children}
  </td>
)

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5e9d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
      <div>
        <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso }}>{title}</div>
        {sub && <div style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink3, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Pill badge ──
function Pill({ n, color = '#2D7A4F', bg = '#eef2e7' }) {
  return (
    <span style={{ background: bg, color, padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: LUX.fontSans }}>
      {n}
    </span>
  )
}

export default function TabQuyNgayLe() {
  const now = getNowVN()
  const [nam, setNam] = useState(now.getFullYear())
  const [nvList,  setNvList]  = useState([])
  const [ccLeMap, setCcLeMap] = useState({})  // date → [nhan_vien_id, ...]
  const [quyMap,  setQuyMap]  = useState({})  // nhan_vien_id → {so_ngay_tich, so_ngay_da_dung, so_dung_thang_nay, id}
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)

  // Modal tích lũy hàng loạt từ ngày lễ
  const [modalLeNgay, setModalLeNgay] = useState(null) // { date, ten, nvDiLam: [nvId, ...] }
  const [selNvIds,    setSelNvIds]    = useState([])
  const [soNgayThem,  setSoNgayThem]  = useState(1)
  const [ghiChuThem,  setGhiChuThem]  = useState('')
  const [saving,      setSaving]      = useState(false)

  // Modal cộng thủ công cho 1 NV
  const [modalThuCong, setModalThuCong] = useState(null) // nv object
  const [tcSoNgay,  setTcSoNgay]  = useState(1)
  const [tcLyDo,    setTcLyDo]    = useState('')

  // Modal reset tháng (so_dung_thang_nay → 0)
  const [showReset,  setShowReset]  = useState(false)
  const [thangReset, setThangReset] = useState(now.getMonth() + 1)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const holidaysOfYear = HOLIDAYS_META.filter(h => h.date.startsWith(String(nam)))

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const startYear = `${nam}-01-01`
      const endYear   = `${nam}-12-31`
      const holidayDates = holidaysOfYear.map(h => h.date)

      const [nvRes, ccRes, quyRes] = await Promise.all([
        supabase.from('nhan_vien').select('id, ho_ten, vi_tri').eq('trang_thai', 'dang_lam').order('vi_tri').order('ho_ten'),
        // Lấy cham_cong ngày lễ, loai='di_lam'
        supabase.from('cham_cong').select('nhan_vien_id, ngay').in('ngay', holidayDates).eq('loai', 'di_lam'),
        supabase.from('quy_ngay_off').select('id, nhan_vien_id, so_ngay_tich, so_ngay_da_dung, so_dung_thang_nay').eq('nam', nam),
      ])

      setNvList(nvRes.data || [])

      // Build ccLeMap: date → Set(nhan_vien_id)
      const cm = {}
      ;(ccRes.data || []).forEach(r => {
        const d = String(r.ngay).substring(0, 10)
        if (!cm[d]) cm[d] = new Set()
        cm[d].add(r.nhan_vien_id)
      })
      setCcLeMap(cm)

      // Build quyMap: nhan_vien_id → row
      const qm = {}
      ;(quyRes.data || []).forEach(r => { qm[r.nhan_vien_id] = r })
      setQuyMap(qm)
    } catch (e) {
      console.error('TabQuyNgayLe:', e)
      showToast('Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }, [nam])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Mở modal tích lũy ngày lễ ──
  const openModalLe = (h) => {
    const nvDiLam = [...(ccLeMap[h.date] || new Set())]
    setModalLeNgay({ ...h, nvDiLam })
    setSelNvIds(nvDiLam)  // mặc định chọn tất cả NV đi làm
    setSoNgayThem(1)
    setGhiChuThem(`Đi làm ngày lễ: ${h.ten}`)
  }

  // ── Lưu tích lũy ngày lễ ──
  const handleSaveLe = async () => {
    if (selNvIds.length === 0) { showToast('Chọn ít nhất 1 nhân viên', 'error'); return }
    setSaving(true)
    try {
      for (const nvId of selNvIds) {
        const existing = quyMap[nvId]
        if (existing) {
          await supabase.from('quy_ngay_off').update({
            so_ngay_tich: (existing.so_ngay_tich || 0) + soNgayThem,
            ghi_chu: ghiChuThem,
          }).eq('id', existing.id)
        } else {
          await supabase.from('quy_ngay_off').insert({
            nhan_vien_id: nvId,
            nam,
            ly_do_tich_luy: `Đi làm ngày lễ`,
            so_ngay_tich: soNgayThem,
            so_ngay_da_dung: 0,
            so_dung_thang_nay: 0,
            ghi_chu: ghiChuThem,
          })
        }
      }
      showToast(`Đã tích lũy ${soNgayThem} ngày cho ${selNvIds.length} NV ✓`)
      setModalLeNgay(null)
      await fetchAll()
    } catch (e) {
      console.error(e)
      showToast('Lỗi lưu dữ liệu', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Lưu cộng thủ công ──
  const handleSaveThuCong = async () => {
    if (!modalThuCong) return
    if (tcSoNgay <= 0) { showToast('Số ngày phải > 0', 'error'); return }
    setSaving(true)
    try {
      const existing = quyMap[modalThuCong.id]
      if (existing) {
        await supabase.from('quy_ngay_off').update({
          so_ngay_tich: (existing.so_ngay_tich || 0) + tcSoNgay,
          ghi_chu: tcLyDo,
        }).eq('id', existing.id)
      } else {
        await supabase.from('quy_ngay_off').insert({
          nhan_vien_id: modalThuCong.id,
          nam,
          ly_do_tich_luy: tcLyDo || 'Cộng thủ công',
          so_ngay_tich: tcSoNgay,
          so_ngay_da_dung: 0,
          so_dung_thang_nay: 0,
          ghi_chu: tcLyDo,
        })
      }
      showToast(`Đã cộng ${tcSoNgay} ngày cho ${modalThuCong.ho_ten} ✓`)
      setModalThuCong(null)
      await fetchAll()
    } catch (e) {
      console.error(e)
      showToast('Lỗi lưu', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Reset so_dung_thang_nay sau khi chốt lương ──
  const handleResetThang = async () => {
    setSaving(true)
    try {
      // Reset về 0 cho toàn bộ NV năm này
      const ids = Object.values(quyMap).map(q => q.id).filter(Boolean)
      if (ids.length > 0) {
        for (const qid of ids) {
          await supabase.from('quy_ngay_off').update({ so_dung_thang_nay: 0 }).eq('id', qid)
        }
      }
      showToast(`Đã reset "Dùng Tháng ${thangReset}" về 0 cho tất cả NV ✓`)
      setShowReset(false)
      await fetchAll()
    } catch (e) {
      console.error(e)
      showToast('Lỗi reset', 'error')
    } finally {
      setSaving(false)
    }
  }

  const MONTHS = ['','Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12']
  const nvMap = Object.fromEntries(nvList.map(nv => [nv.id, nv]))
  const viLabel = (v) => v === 'le_tan' ? 'Lễ Tân' : v === 'tap_vu' ? 'Tạp Vụ' : 'KTV'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#C0392B' : '#2D7A4F', color: '#fff', borderRadius: 10, padding: '12px 20px', fontFamily: LUX.fontSans, fontSize: 14, boxShadow: LUX.shadowLg }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header + năm picker ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <SectionTitle icon="🎌" title="Quỹ Ngày OFF Từ Ngày Lễ" sub="Nhân viên đi làm ngày lễ được tích lũy ngày OFF có lương để bù OV" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setNam(n => n - 1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${LUX.line}`, background: '#fff', cursor: 'pointer', fontSize: 16 }}>‹</button>
          <span style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 15, color: LUX.espresso, minWidth: 52, textAlign: 'center' }}>Năm {nam}</span>
          <button onClick={() => setNam(n => n + 1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${LUX.line}`, background: '#fff', cursor: 'pointer', fontSize: 16 }}>›</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
      ) : (
        <>
          {/* ════════════════════════════════════════════
              SECTION 1 — Ngày lễ & NV đi làm
          ════════════════════════════════════════════ */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 17, fontWeight: 600, color: LUX.espresso }}>
                Ngày Lễ Năm {nam}
                <span style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink3, fontWeight: 400, marginLeft: 8 }}>— bấm "Tích Lũy" để ghi nhận cho NV đi làm</span>
              </div>
            </div>

            {holidaysOfYear.length === 0 ? (
              <div style={{ padding: '20px 0', color: LUX.ink3, fontFamily: LUX.fontSans, fontSize: 13 }}>Chưa có dữ liệu ngày lễ năm {nam}</div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LUX.line}`, overflow: 'hidden', boxShadow: LUX.shadowSm }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <TH w={110}>Ngày</TH>
                      <TH>Tên Ngày Lễ</TH>
                      <TH>NV Đi Làm</TH>
                      <TH w={80} align="center">Đã Ghi</TH>
                      <TH w={120} align="center">Thao Tác</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {holidaysOfYear.map((h, idx) => {
                      const diLamIds = [...(ccLeMap[h.date] || new Set())]
                      const diLamNvs = diLamIds.map(id => nvMap[id]).filter(Boolean)
                      const daTichIds = diLamIds.filter(id => (quyMap[id]?.so_ngay_tich || 0) > 0)
                      return (
                        <tr key={h.date} style={{ borderTop: idx > 0 ? `1px solid ${LUX.line}` : 'none', background: idx % 2 === 0 ? '#fdfcfb' : '#fff' }}>
                          <TD>
                            <span style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 13, color: LUX.espresso }}>{fmtDate(h.date)}</span>
                          </TD>
                          <TD>
                            <span style={{ fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink2 }}>{h.ten}</span>
                          </TD>
                          <TD>
                            {diLamNvs.length === 0 ? (
                              <span style={{ color: LUX.ink3, fontSize: 12, fontStyle: 'italic' }}>Không ai đi làm</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {diLamNvs.map(nv => (
                                  <span key={nv.id} style={{ background: '#eef2e7', color: '#3a6a3a', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontFamily: LUX.fontSans, fontWeight: 600 }}>
                                    {nv.ho_ten.split(' ').slice(-1)[0]}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TD>
                          <TD align="center">
                            {daTichIds.length > 0 ? (
                              <Pill n={`${daTichIds.length} NV`} />
                            ) : (
                              <span style={{ color: LUX.ink3, fontSize: 11 }}>—</span>
                            )}
                          </TD>
                          <TD align="center">
                            {diLamNvs.length > 0 && (
                              <button onClick={() => openModalLe(h)} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${LUX.champagne}`, background: 'linear-gradient(135deg,#fdf3e0,#f9ead0)', color: LUX.espresso, fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                Tích Lũy
                              </button>
                            )}
                          </TD>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ════════════════════════════════════════════
              SECTION 2 — Quỹ từng nhân viên
          ════════════════════════════════════════════ */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 17, fontWeight: 600, color: LUX.espresso }}>
                Quỹ Ngày OFF Từng Nhân Viên
                <span style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink3, fontWeight: 400, marginLeft: 8 }}>— Năm {nam}</span>
              </div>
              <button onClick={() => setShowReset(true)} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid #e0b0b0`, background: '#fff5f5', color: '#C0392B', fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                🔄 Reset "Dùng Tháng Này"
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${LUX.line}`, overflow: 'hidden', boxShadow: LUX.shadowSm }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <TH>Nhân Viên</TH>
                    <TH w={80}>Vị Trí</TH>
                    <TH w={110} align="center">Tổng Tích Lũy</TH>
                    <TH w={110} align="center">Đã Dùng (Năm)</TH>
                    <TH w={120} align="center">Dùng Tháng Này</TH>
                    <TH w={90} align="center">Còn Lại</TH>
                    <TH w={100} align="center">Thao Tác</TH>
                  </tr>
                </thead>
                <tbody>
                  {nvList.map((nv, idx) => {
                    const q = quyMap[nv.id]
                    const tich    = q?.so_ngay_tich        || 0
                    const daDung  = q?.so_ngay_da_dung     || 0
                    const dungTN  = q?.so_dung_thang_nay   || 0
                    const conLai  = Math.max(0, tich - daDung)
                    return (
                      <tr key={nv.id} style={{ borderTop: idx > 0 ? `1px solid ${LUX.line}` : 'none', background: idx % 2 === 0 ? '#fdfcfb' : '#fff' }}>
                        <TD>
                          <span style={{ fontFamily: LUX.fontSans, fontWeight: 600, color: LUX.espresso }}>{nv.ho_ten}</span>
                        </TD>
                        <TD muted>
                          <span style={{ fontSize: 11 }}>{viLabel(nv.vi_tri)}</span>
                        </TD>
                        <TD align="center">
                          {tich > 0 ? (
                            <Pill n={`${tich} ngày`} color="#2D7A4F" bg="#eef2e7" />
                          ) : (
                            <span style={{ color: LUX.ink3, fontSize: 12 }}>0</span>
                          )}
                        </TD>
                        <TD align="center">
                          {daDung > 0 ? (
                            <Pill n={`${daDung} ngày`} color="#7a5520" bg="#f5e9d4" />
                          ) : (
                            <span style={{ color: LUX.ink3, fontSize: 12 }}>0</span>
                          )}
                        </TD>
                        <TD align="center">
                          {dungTN > 0 ? (
                            <Pill n={`${dungTN} ngày`} color="#1a5276" bg="#d6eaf8" />
                          ) : (
                            <span style={{ color: LUX.ink3, fontSize: 12 }}>0</span>
                          )}
                        </TD>
                        <TD align="center">
                          <span style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 14, color: conLai > 0 ? '#2D7A4F' : LUX.ink3 }}>
                            {conLai} ngày
                          </span>
                        </TD>
                        <TD align="center">
                          <button onClick={() => { setModalThuCong(nv); setTcSoNgay(1); setTcLyDo('') }} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${LUX.line}`, background: '#fff', color: LUX.espresso, fontFamily: LUX.fontSans, fontSize: 12, cursor: 'pointer' }}>
                            + Cộng
                          </button>
                        </TD>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Chú giải */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { color: '#eef2e7', fc: '#2D7A4F', label: 'Tổng Tích Lũy — tổng ngày lễ đã đi làm được ghi nhận' },
                { color: '#f5e9d4', fc: '#7a5520', label: 'Đã Dùng (Năm) — tổng ngày đã bù OV trong năm' },
                { color: '#d6eaf8', fc: '#1a5276', label: 'Dùng Tháng Này — đang áp dụng cho bảng lương tháng hiện tại' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, border: `1px solid ${item.fc}` }} />
                  {item.label}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ════════════════════════════════════════════
          MODAL — Tích Lũy Ngày Lễ
      ════════════════════════════════════════════ */}
      {modalLeNgay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 460, maxWidth: '95vw', boxShadow: LUX.shadowLg }}>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso, marginBottom: 4 }}>Tích Lũy Ngày Lễ</div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink3, marginBottom: 20 }}>
              {modalLeNgay.ten} — {fmtDate(modalLeNgay.date)}
            </div>

            {/* Danh sách NV đi làm */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Chọn nhân viên được tích lũy
              </div>
              {modalLeNgay.nvDiLam.length === 0 ? (
                <div style={{ color: LUX.ink3, fontSize: 13, fontStyle: 'italic', fontFamily: LUX.fontSans }}>Không có NV nào check-in ngày này</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {modalLeNgay.nvDiLam.map(nvId => {
                    const nv = nvMap[nvId]
                    if (!nv) return null
                    const checked = selNvIds.includes(nvId)
                    return (
                      <label key={nvId} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '7px 12px', borderRadius: 8, border: `1px solid ${checked ? LUX.champagne : LUX.line}`, background: checked ? '#fdf3e0' : '#fdfcfb' }}>
                        <input type="checkbox" checked={checked} onChange={() => setSelNvIds(s => checked ? s.filter(x => x !== nvId) : [...s, nvId])} style={{ width: 15, height: 15 }} />
                        <span style={{ fontFamily: LUX.fontSans, fontWeight: 600, fontSize: 13, color: LUX.espresso }}>{nv.ho_ten}</span>
                        <span style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3 }}>{viLabel(nv.vi_tri)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Số ngày & ghi chú */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', marginBottom: 6 }}>Số Ngày</div>
                <input type="number" min={0.5} max={3} step={0.5} value={soNgayThem} onChange={e => setSoNgayThem(parseFloat(e.target.value) || 1)}
                  style={{ width: '100%', height: 36, borderRadius: 8, border: `1px solid ${LUX.line}`, padding: '0 10px', fontFamily: LUX.fontSans, fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', marginBottom: 6 }}>Ghi Chú</div>
                <input value={ghiChuThem} onChange={e => setGhiChuThem(e.target.value)}
                  style={{ width: '100%', height: 36, borderRadius: 8, border: `1px solid ${LUX.line}`, padding: '0 10px', fontFamily: LUX.fontSans, fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalLeNgay(null)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${LUX.line}`, background: '#fff', fontFamily: LUX.fontSans, fontSize: 13, cursor: 'pointer', color: LUX.ink2 }}>Huỷ</button>
              <button onClick={handleSaveLe} disabled={saving || selNvIds.length === 0}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#fff', fontFamily: LUX.fontSans, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Đang lưu...' : `Tích Lũy ${selNvIds.length} NV`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODAL — Cộng Thủ Công
      ════════════════════════════════════════════ */}
      {modalThuCong && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, maxWidth: '95vw', boxShadow: LUX.shadowLg }}>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso, marginBottom: 4 }}>Cộng Ngày Lễ Thủ Công</div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink3, marginBottom: 20 }}>{modalThuCong.ho_ten}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', marginBottom: 6 }}>Số Ngày Cộng Thêm</div>
                <input type="number" min={0.5} max={10} step={0.5} value={tcSoNgay} onChange={e => setTcSoNgay(parseFloat(e.target.value) || 1)}
                  style={{ width: '100%', height: 36, borderRadius: 8, border: `1px solid ${LUX.line}`, padding: '0 10px', fontFamily: LUX.fontSans, fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', marginBottom: 6 }}>Lý Do</div>
                <input value={tcLyDo} onChange={e => setTcLyDo(e.target.value)} placeholder="VD: Đi làm ngày Tết 2026..."
                  style={{ width: '100%', height: 36, borderRadius: 8, border: `1px solid ${LUX.line}`, padding: '0 10px', fontFamily: LUX.fontSans, fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalThuCong(null)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${LUX.line}`, background: '#fff', fontFamily: LUX.fontSans, fontSize: 13, cursor: 'pointer', color: LUX.ink2 }}>Huỷ</button>
              <button onClick={handleSaveThuCong} disabled={saving}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#fff', fontFamily: LUX.fontSans, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Đang lưu...' : 'Cộng Ngày'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODAL — Reset Tháng
      ════════════════════════════════════════════ */}
      {showReset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, maxWidth: '95vw', boxShadow: LUX.shadowLg }}>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: '#C0392B', marginBottom: 4 }}>Reset "Dùng Tháng Này"</div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink2, marginBottom: 20, lineHeight: 1.5 }}>
              Sau khi chốt bảng lương tháng <strong>{MONTHS[thangReset]}/{nam}</strong>, bấm Reset để cột "Dùng Tháng Này" về 0 cho tất cả nhân viên — chuẩn bị cho tháng tiếp theo.
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', marginBottom: 6 }}>Đây là reset cho tháng</div>
              <select value={thangReset} onChange={e => setThangReset(+e.target.value)}
                style={{ height: 36, borderRadius: 8, border: `1px solid ${LUX.line}`, padding: '0 10px', fontFamily: LUX.fontSans, fontSize: 13, outline: 'none', width: '100%' }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m} năm {nam}</option>
                ))}
              </select>
            </div>
            <div style={{ background: '#fff5f5', border: '1px solid #f5c6c6', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <span style={{ fontFamily: LUX.fontSans, fontSize: 12, color: '#C0392B' }}>⚠️ Chỉ reset sau khi đã chốt bảng lương và phát lương. Thao tác này không thể hoàn tác.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowReset(false)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${LUX.line}`, background: '#fff', fontFamily: LUX.fontSans, fontSize: 13, cursor: 'pointer', color: LUX.ink2 }}>Huỷ</button>
              <button onClick={handleResetThang} disabled={saving}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#C0392B', color: '#fff', fontFamily: LUX.fontSans, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Đang reset...' : 'Xác Nhận Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
