// Chuông Thông Báo — hiển thị yêu cầu chờ duyệt (OFF, sửa/xóa, dùng ngày lễ)
// Click → dropdown với nút Duyệt/Từ chối inline cho OFF
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import I from './Icons'

const LOAI_CFG = {
  off_phep: { bg: '#eef2e7', color: '#5a6a4a', label: 'Phép' },
  off_ov:   { bg: '#f5e0da', color: '#C0392B', label: 'Ko Lương' },
  off_t7:   { bg: '#ede9f8', color: '#6a4a8a', label: 'T7/CN (×2)' },
  off_t7x:  { bg: '#f5e0da', color: '#C0392B', label: 'Vi Phạm T7/CN' },
}

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}` }
const getDay = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return DAYS[new Date(y, m-1, d).getDay()] }

const YC_LABEL = {
  sua: 'Sửa', xoa: 'Xóa', dung_ngay_le: 'Dùng Ngày Lễ',
}

export default function NotificationBell() {
  const [offList, setOffList] = useState([])
  const [otherList, setOtherList] = useState([])
  const [donList, setDonList] = useState([])   // yêu cầu sửa ĐƠN HÀNG (Lễ tân đề xuất)
  const [nvMap, setNvMap] = useState({})
  const [show, setShow] = useState(false)
  const [actionId, setActionId] = useState(null)        // id đang xử lý
  const [rejectId, setRejectId] = useState(null)         // id đang mở input từ chối
  const [rejectReason, setRejectReason] = useState('')

  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const pollRef = useRef(null)

  // ── Fetch data ──
  const fetchData = async () => {
    try {
      const [{ data: nvData }, { data: offData }, { data: leData }, { data: sxData }, { data: donData }] = await Promise.all([
        supabase.from('nhan_vien').select('id, ho_ten'),
        supabase.from('dang_ky_off').select('id, nhan_vien_id, ngay_off, loai_off, ly_do').eq('trang_thai', 'cho_duyet').order('ngay_off'),
        supabase.from('yeu_cau_chinh_sua').select('id, loai_yeu_cau, loai_bang, ly_do, du_lieu_cu').eq('loai_yeu_cau', 'dung_ngay_le').eq('trang_thai', 'cho_duyet').order('created_at'),
        supabase.from('yeu_cau_chinh_sua').select('id, loai_yeu_cau, loai_bang, ly_do').in('loai_yeu_cau', ['sua', 'xoa']).eq('trang_thai', 'cho_duyet').neq('loai_bang', 'don_hang').order('created_at'),
        supabase.from('yeu_cau_chinh_sua').select('id, ban_ghi_id, ly_do, du_lieu_cu, nguoi_yeu_cau, created_at').eq('loai_yeu_cau', 'sua').eq('loai_bang', 'don_hang').eq('trang_thai', 'cho_duyet').order('created_at'),
      ])
      const map = {}
      nvData?.forEach(n => { map[n.id] = n.ho_ten })
      setNvMap(map)
      setOffList(offData || [])
      setOtherList([...(leData || []), ...(sxData || [])])
      setDonList(donData || [])
    } catch (_) { /* silence */ }
  }

  useEffect(() => {
    fetchData()
    pollRef.current = setInterval(fetchData, 30_000)
    return () => clearInterval(pollRef.current)
  }, [])

  // ── Click outside ──
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Focus input khi mở reject
  useEffect(() => {
    if (rejectId) inputRef.current?.focus()
  }, [rejectId])

  // ── Actions ──
  const handleApprove = async (id) => {
    setActionId(id)
    await supabase.from('dang_ky_off').update({ trang_thai: 'duoc_duyet', ghi_chu_duyet: 'OK' }).eq('id', id)
    setOffList(prev => prev.filter(o => o.id !== id))
    setActionId(null)
  }

  const handleReject = async (id) => {
    const reason = rejectReason.trim() || 'Không thể duyệt'
    setActionId(id)
    await supabase.from('dang_ky_off').update({ trang_thai: 'tu_choi', ghi_chu_duyet: reason }).eq('id', id)
    setOffList(prev => prev.filter(o => o.id !== id))
    setRejectId(null)
    setRejectReason('')
    setActionId(null)
  }

  const total = offList.length + otherList.length + donList.length

  // ── Styles ──
  const badgeStyle = {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    background: '#E74C3C', color: '#fff',
    fontSize: 10, fontWeight: 700, fontFamily: 'var(--sans)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 5px', lineHeight: 1,
  }

  const dropdownStyle = {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    width: 360, background: 'var(--surface2)',
    borderRadius: 'var(--r)', boxShadow: 'var(--sh-3)',
    border: '1px solid var(--line)', zIndex: 300,
    animation: 'ssIn .12s ease',
  }

  const rowStyle = (isLast) => ({
    padding: '12px 16px',
    borderBottom: isLast ? 'none' : '1px solid var(--line)',
  })

  const btnBase = {
    border: 'none', borderRadius: 6, cursor: 'pointer',
    padding: '6px 14px', fontSize: 11, fontWeight: 700,
    fontFamily: 'var(--sans)', transition: 'all .12s',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  }
  const approveBtn = { ...btnBase, background: '#eef2e7', color: '#2D7A4F' }
  const rejectBtn  = { ...btnBase, background: '#f5e0da', color: '#C0392B' }

  const linkStyle = {
    display: 'block', padding: '10px 16px', textAlign: 'center',
    fontSize: 12, color: 'var(--champagne)', fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none',
    borderTop: '1px solid var(--line)',
    fontFamily: 'var(--sans)',
  }

  return (
    <div ref={wrapRef} className="notif-wrap">
      <button className="notif-btn" onClick={() => setShow(!show)} title="Thông báo">
        <I.Bell style={{ width: 17, height: 17 }} />
        {total > 0 && <span style={badgeStyle}>{total > 99 ? '99+' : total}</span>}
      </button>

      {show && (
        <div style={dropdownStyle}>
          {/* ── Header ── */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>Thông Báo</span>
            {total > 0 && (
              <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>
                {total} đang chờ
              </span>
            )}
          </div>

          <div className="notif-dropdown-inner">
            {/* ── Trạng thái rỗng ── */}
            {total === 0 && (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ink3)', fontSize: 12.5 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                Không có yêu cầu nào đang chờ
              </div>
            )}

            {/* ── YÊU CẦU OFF ── */}
            {offList.length > 0 && (
              <>
                <div className="smart-search-group-label" style={{ paddingTop: 8 }}>Yêu Cầu OFF ({offList.length})</div>
                {offList.map((off, i) => {
                  const nvName = nvMap[off.nhan_vien_id] || '...'
                  const loai = LOAI_CFG[off.loai_off] || {}
                  const isLast = i === offList.length - 1 && otherList.length === 0
                  const isBusy = actionId === off.id

                  return (
                    <div key={off.id} style={rowStyle(isLast)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{nvName}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>·</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)' }}>
                          {getDay(off.ngay_off)} {fmtDate(off.ngay_off)}
                        </span>
                        <span style={{ background: loai.bg, color: loai.color, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                          {loai.label || off.loai_off}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 8 }}>
                        {off.ly_do || '—'}
                      </div>

                      {/* Actions */}
                      {rejectId === off.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            ref={inputRef}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleReject(off.id); if (e.key === 'Escape') { setRejectId(null); setRejectReason('') } }}
                            placeholder="Lý do từ chối..."
                            style={{
                              flex: 1, padding: '5px 8px', fontSize: 12, borderRadius: 6,
                              border: '1px solid var(--line)', background: 'var(--bg2)', color: 'var(--ink)',
                              outline: 'none', fontFamily: 'var(--sans)',
                            }}
                          />
                          <button onClick={() => handleReject(off.id)} disabled={isBusy} style={{ ...rejectBtn, opacity: isBusy ? 0.5 : 1 }}>
                            Xác nhận
                          </button>
                          <button onClick={() => { setRejectId(null); setRejectReason('') }} style={{ ...btnBase, background: 'var(--bg2)', color: 'var(--ink3)' }}>
                            Huỷ
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleApprove(off.id)} disabled={isBusy} style={{ ...approveBtn, opacity: isBusy ? 0.5 : 1 }}>
                            <span style={{ fontSize: 13 }}>✓</span> Duyệt
                          </button>
                          <button onClick={() => { setRejectId(off.id); setRejectReason('Không thể duyệt do thiếu người') }} disabled={isBusy} style={{ ...rejectBtn, opacity: isBusy ? 0.5 : 1 }}>
                            <span style={{ fontSize: 13 }}>✕</span> Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}

            {/* ── YÊU CẦU SỬA ĐƠN HÀNG (Lễ tân đề xuất) ── */}
            {donList.length > 0 && (
              <>
                <div className="smart-search-group-label" style={{ paddingTop: 8 }}>Yêu Cầu Sửa Đơn ({donList.length})</div>
                {donList.map((don, i) => {
                  const isLast = i === donList.length - 1 && otherList.length === 0
                  const maDon = don.du_lieu_cu?.ma_don || ''
                  return (
                    <div key={don.id} style={rowStyle(isLast)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ background: '#F4EFFA', color: '#6C3483', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>✏️ Sửa đơn</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{maDon}</span>
                        {don.nguoi_yeu_cau && <span style={{ fontSize: 11, color: 'var(--ink3)' }}>· {don.nguoi_yeu_cau}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 8 }}>{don.ly_do || '—'}</div>
                      <button
                        onClick={() => { setShow(false); window.location.href = `/pos?resume=${don.ban_ghi_id}&yc=${don.id}` }}
                        style={{ ...btnBase, background: 'var(--grad-gold, #C9A96E)', color: '#2a1d14' }}>
                        Xem & Duyệt →
                      </button>
                    </div>
                  )
                })}
              </>
            )}

            {/* ── YÊU CẦU KHÁC ── */}
            {otherList.length > 0 && (
              <>
                <div className="smart-search-group-label" style={{ paddingTop: 8 }}>Yêu Cầu Khác ({otherList.length})</div>
                {otherList.map((yc, i) => {
                  const isLast = i === otherList.length - 1
                  const label = YC_LABEL[yc.loai_yeu_cau] || yc.loai_yeu_cau
                  const bangLabel = yc.loai_bang === 'doanh_thu' ? 'Doanh Thu' : yc.loai_bang === 'chi_phi' ? 'Chi Phí' : yc.loai_bang === 'chuyen_khoan_noi_bo' ? 'CK Nội Bộ' : yc.loai_bang === 'the_lieu_trinh' ? 'Gia Hạn Thẻ' : (yc.loai_bang || '')
                  const nvCu = yc.du_lieu_cu?.nhan_vien_ten || ''

                  return (
                    <div key={yc.id} style={rowStyle(isLast)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: '#FFF9F0', color: '#B8860B', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                          {label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                          {bangLabel}
                        </span>
                        {nvCu && <span style={{ fontSize: 11, color: 'var(--ink3)' }}>· {nvCu}</span>}
                      </div>
                      {yc.ly_do && (
                        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>
                          {yc.ly_do}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* ── Footer link ── */}
          {total > 0 && (
            <a style={linkStyle} href="/admin/nhan-su/xet-duyet" onClick={(e) => { e.preventDefault(); setShow(false); window.location.href = '/admin/nhan-su/xet-duyet' }}>
              Xem tất cả trong Xét Duyệt →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
