import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, getNowVN, hashPin, todayISO } from '../../../../lib/utils'
import AdminSuaChamCong from './AdminSuaChamCong'
import AvatarUpload from '../../../../components/shared/AvatarUpload'
import { KY_QUY_TONG, KY_QUY_MOIS, KY_QUY_THUONG } from '../../../../lib/luong'

const VI_TRI_OPTS  = [
  { value: 'ktv',    label: 'KTV' },
  { value: 'le_tan', label: 'Lễ Tân' },
  { value: 'tap_vu', label: 'Tạp Vụ' },
]
const VI_TRI_LABEL = { ktv: 'KTV', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ' }
const VI_TRI_COLOR = {
  ktv:    { bg: '#f5e8d4', color: LUX.taupe },
  le_tan: { bg: '#eef2e7', color: '#5a6a4a' },
  tap_vu: { bg: LUX.surface, color: LUX.ink3 },
}

function getInitials(name) {
  const parts = name.trim().split(' ')
  return parts[parts.length - 1].charAt(0).toUpperCase()
}
function getAvatarColor(name) {
  const p = [LUX.taupe, LUX.champagne, LUX.rose, LUX.sage, '#6a5a4a']
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return p[h % p.length]
}
function fmtNgay(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function soThoiGianLam(ngayBatDau) {
  if (!ngayBatDau) return ''
  const now   = getNowVN()
  const start = new Date(ngayBatDau)
  const days  = Math.floor((now - start) / 86400000)
  const nam   = Math.floor(days / 365)
  const thang = Math.floor((days % 365) / 30)
  if (nam > 0) return `${nam} năm${thang > 0 ? ` ${thang} tháng` : ''}`
  if (thang > 0) return `${thang} tháng`
  return `${days} ngày`
}

function KyQuyBadge({ nv }) {
  const tt = nv.ky_quy_trang_thai
  const da = nv.ky_quy_so_thang || 0
  if (tt === 'hoan_tat')    return <Chip bg="#eef2e7" color="#5a6a4a">✓ Hoàn tất ký quỹ</Chip>
  if (tt === 'da_hoan_tra') return <Chip bg="#ede9f8" color="#5a4a8a">✓ Đã hoàn trả</Chip>
  if (tt === 'dang_dong')   return <Chip bg="#f5e8d4" color={LUX.taupe}>🔒 {da}/{KY_QUY_TONG} tháng</Chip>
  return null
}

function KyQuyDetail({ nv }) {
  const tt = nv.ky_quy_trang_thai
  const da = nv.ky_quy_so_thang || 0
  if (tt === 'hoan_tat') return (
    <div>
      <div style={{ fontFamily: LUX.fontSans, fontWeight: 700, color: '#5a6a4a', fontSize: '13px' }}>✓ Hoàn tất {KY_QUY_TONG} tháng</div>
      <div style={{ fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3, marginTop: '2px' }}>
        Tích lũy: {formatCurrency(KY_QUY_TONG * KY_QUY_MOIS + KY_QUY_THUONG)} (gồm thưởng 500k)
      </div>
    </div>
  )
  if (tt === 'da_hoan_tra') return (
    <div>
      <div style={{ fontFamily: LUX.fontSans, fontWeight: 700, color: '#5a4a8a', fontSize: '13px' }}>✓ Đã hoàn trả</div>
      <div style={{ fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3, marginTop: '2px' }}>
        {formatCurrency(KY_QUY_TONG * KY_QUY_MOIS + KY_QUY_THUONG)}
      </div>
    </div>
  )
  if (tt === 'dang_dong') {
    const con = KY_QUY_TONG - da
    const pct = Math.round((da / KY_QUY_TONG) * 100)
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '13px', color: LUX.ink }}>{da}/{KY_QUY_TONG} tháng — còn {con}</span>
          <span style={{ fontFamily: LUX.fontMono, fontSize: '12px', color: LUX.ink3 }}>{pct}%</span>
        </div>
        <div style={{ background: LUX.line, borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: LUX.goldGrad, borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3 }}>
          <span>Đã đóng: {formatCurrency(da * KY_QUY_MOIS)}</span>
          <span>Còn lại: {formatCurrency(con * KY_QUY_MOIS)}</span>
        </div>
        {nv.ky_quy_bat_dau && (
          <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginTop: '4px' }}>
            Bắt đầu: {fmtNgay(nv.ky_quy_bat_dau)}
          </div>
        )}
      </div>
    )
  }
  return <div style={{ fontFamily: LUX.fontSans, color: LUX.ink3, fontSize: '13px' }}>Chưa bắt đầu đóng ký quỹ</div>
}

function Chip({ bg, color, children }) {
  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: '7px', fontSize: '10px', fontWeight: 700, fontFamily: LUX.fontSans }}>
      {children}
    </span>
  )
}

function LuxField({ label, value, onChange, type = 'text', placeholder = '', readOnly }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input type={type} value={value || ''} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '11px 14px', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`, fontFamily: LUX.fontSans, fontSize: '14px', color: LUX.ink, background: readOnly ? LUX.bg : LUX.surface2, boxSizing: 'border-box', outline: 'none' }}
      />
    </div>
  )
}

function LuxSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '11px 14px', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`, fontFamily: LUX.fontSans, fontSize: '14px', color: LUX.ink, background: LUX.surface2, outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function LuxMoney({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type="text"
          value={value === 0 ? '' : new Intl.NumberFormat('vi-VN').format(value)}
          onChange={e => { const raw = e.target.value.replace(/\D/g, ''); onChange(raw === '' ? 0 : parseInt(raw)) }}
          placeholder="0"
          style={{ width: '100%', padding: '11px 42px 11px 14px', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.champagne}80`, fontFamily: LUX.fontMono, fontSize: '15px', fontWeight: 600, color: LUX.espresso, background: LUX.surface2, boxSizing: 'border-box', outline: 'none' }}
        />
        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3 }}>đ</span>
      </div>
    </div>
  )
}

function LuxSectionLabel({ children }) {
  return (
    <div style={{ fontFamily: LUX.fontSans, fontSize: '10px', fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', marginTop: '6px', paddingTop: '10px', borderTop: `1px solid ${LUX.line}` }}>
      {children}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────
export default function TabHoSo() {
  const [nvList,       setNvList]       = useState([])
  const [thangMap,     setThangMap]     = useState({})
  const [quyOffMap,    setQuyOffMap]    = useState({})
  const [loading,      setLoading]      = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [editSheet, setEditSheet] = useState(null)
  const [chamCongSheet, setChamCongSheet] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [kpi,       setKpi]       = useState({ diLam: 0, choDuyet: 0 })

  // KPI tổng quan (gộp từ trang Danh Sách cũ): đang trực hôm nay + chờ duyệt
  useEffect(() => {
    const today = todayISO()
    Promise.all([
      supabase.from('cham_cong').select('nhan_vien_id').eq('ngay', today).not('gio_vao', 'is', null),
      supabase.from('dang_ky_off').select('id', { count: 'exact', head: true }).eq('trang_thai', 'cho_duyet'),
      supabase.from('yeu_cau_chinh_sua').select('id', { count: 'exact', head: true }).eq('trang_thai', 'cho_duyet'),
    ]).then(([cc, od, yc]) => setKpi({ diLam: (cc.data || []).length, choDuyet: (od.count || 0) + (yc.count || 0) }))
      .catch(() => {})
  }, [])

  const now   = getNowVN()
  const thang = now.getMonth() + 1
  const nam   = now.getFullYear()

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const startDate = `${nam}-${String(thang).padStart(2,'0')}-01`
      const lastDay   = new Date(nam, thang, 0).getDate()
      const endDate   = `${nam}-${String(thang).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`

      const [resNv, resChamCong, resOff, resQuy] = await Promise.all([
        supabase.from('nhan_vien')
          .select('id, ho_ten, vi_tri, luong_cung, ngay_bat_dau, trang_thai, avatar_url, gioi_han_off_thang, ky_quy_trang_thai, ky_quy_so_thang, ky_quy_bat_dau, so_dien_thoai, pin_hash')
          .order('vi_tri').order('ho_ten'),
        supabase.from('cham_cong')
          .select('nhan_vien_id, he_so, tang_ca_gio')
          .gte('ngay', startDate).lte('ngay', endDate),
        supabase.from('dang_ky_off')
          .select('nhan_vien_id, loai_off, trang_thai')
          .gte('ngay_off', startDate).lte('ngay_off', endDate)
          .in('trang_thai', ['cho_duyet', 'duoc_duyet']),
        supabase.from('quy_ngay_off')
          .select('id, nhan_vien_id, so_ngay_tich, so_ngay_da_dung, so_dung_thang_nay, ly_do_tich_luy')
          .eq('nam', nam),
      ])

      setNvList(resNv.data || [])

      const tMap = {}
      ;(resChamCong.data || []).forEach(r => {
        if (!tMap[r.nhan_vien_id]) tMap[r.nhan_vien_id] = { ngayCong: 0, tangCa: 0, soOff: 0 }
        tMap[r.nhan_vien_id].ngayCong += r.he_so || 0
        tMap[r.nhan_vien_id].tangCa   += r.tang_ca_gio || 0
      })
      ;(resOff.data || []).forEach(r => {
        if (r.trang_thai === 'duoc_duyet') {
          if (!tMap[r.nhan_vien_id]) tMap[r.nhan_vien_id] = { ngayCong: 0, tangCa: 0, soOff: 0 }
          tMap[r.nhan_vien_id].soOff++
        }
      })
      setThangMap(tMap)

      const qMap = {}
      ;(resQuy.data || []).forEach(r => { qMap[r.nhan_vien_id] = r })
      setQuyOffMap(qMap)
    } catch (e) { console.error('TabHoSo:', e) }
    finally { setLoading(false) }
  }

  const openAdd = () => setEditSheet({
    mode: 'add',
    nv: { ho_ten: '', vi_tri: 'ktv', luong_cung: 0, so_dien_thoai: '', ngay_bat_dau: '', gioi_han_off_thang: 3, trang_thai: 'dang_lam', ky_quy_trang_thai: 'dang_dong', ky_quy_so_thang: 0, ky_quy_bat_dau: '', pin: '' }
  })

  const openEdit = (nv) => {
    const q = quyOffMap[nv.id]
    setEditSheet({ mode: 'edit', nv: { ...nv, so_ngay_tich: q?.so_ngay_tich || 0, quy_id: q?.id || null, so_ngay_da_dung: q?.so_ngay_da_dung || 0 } })
    setSelected(null)
  }

  const handleSave = async () => {
    if (!editSheet) return
    const { mode, nv } = editSheet
    if (!nv.ho_ten?.trim()) { showToast('Vui lòng nhập họ tên', 'error'); return }
    if (!nv.luong_cung)     { showToast('Vui lòng nhập lương cứng', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ho_ten: nv.ho_ten.trim(), vi_tri: nv.vi_tri,
        luong_cung: nv.luong_cung, so_dien_thoai: nv.so_dien_thoai || null,
        ngay_bat_dau: nv.ngay_bat_dau || null,
        gioi_han_off_thang: parseInt(nv.gioi_han_off_thang) || 3,
        trang_thai: nv.trang_thai || 'dang_lam',
        ky_quy_trang_thai: nv.ky_quy_trang_thai || 'dang_dong',
        ky_quy_so_thang: parseInt(nv.ky_quy_so_thang) || 0,
        ky_quy_bat_dau: nv.ky_quy_bat_dau || null,
        avatar_url: nv.avatar_url || null,
      }
      let error
      if (mode === 'add') {
        if (nv.pin && nv.pin.length === 4) {
          payload.pin_hash = await hashPin(nv.pin)
        }
        ;({ error } = await supabase.from('nhan_vien').insert(payload))
      } else {
        ;({ error } = await supabase.from('nhan_vien').update(payload).eq('id', nv.id))
        if (!error && nv.pin && nv.pin.length === 4) {
          const hashed = await hashPin(nv.pin)
          await supabase.from('nhan_vien').update({ pin_hash: hashed }).eq('id', nv.id)
        }
      }
      if (error) throw error

      // Save quy_ngay_off for edit mode
      if (mode === 'edit' && nv.so_ngay_tich !== undefined) {
        const quyPayload = {
          nhan_vien_id: nv.id,
          nam,
          so_ngay_tich: parseInt(nv.so_ngay_tich) || 0,
          ly_do_tich_luy: nv.ly_do_tich_luy || null,
        }
        if (nv.quy_id) {
          const { error: qErr } = await supabase.from('quy_ngay_off').update(quyPayload).eq('id', nv.quy_id)
          if (qErr) console.error('quy_ngay_off update:', qErr)
        } else if (quyPayload.so_ngay_tich > 0) {
          const { error: qErr } = await supabase.from('quy_ngay_off').insert(quyPayload)
          if (qErr) console.error('quy_ngay_off insert:', qErr)
        }
      }

      showToast(mode === 'add' ? '✓ Đã thêm nhân viên mới' : '✓ Đã cập nhật hồ sơ')
      setEditSheet(null)
      await fetchAll()
    } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const q = search.trim().toLowerCase()
  const matchFilter = (nv) =>
    (roleFilter === 'all' || nv.vi_tri === roleFilter) &&
    (!q || [nv.ho_ten, nv.so_dien_thoai, nv.vi_tri].filter(Boolean).join(' ').toLowerCase().includes(q))
  const activeList  = nvList.filter(nv => nv.trang_thai === 'dang_lam' && matchFilter(nv))
  const specialList = nvList.filter(nv => nv.trang_thai === 'dac_biet' && matchFilter(nv))
  const tongNV = nvList.filter(nv => nv.trang_thai === 'dang_lam' || nv.trang_thai === 'dac_biet').length

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: toast.type === 'error' ? LUX.danger : LUX.sage, color: 'white', padding: '12px 24px', borderRadius: LUX.radiusSm, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '13px', boxShadow: LUX.shadowLg, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* KPI tổng quan (gộp từ Danh Sách NV) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { l: 'Tổng nhân viên', v: tongNV, sub: 'đang quản lý' },
          { l: 'Đang trực hôm nay', v: kpi.diLam, sub: 'đã check-in' },
          { l: 'Chờ duyệt', v: kpi.choDuyet, sub: 'OFF + sửa', danger: kpi.choDuyet > 0 },
        ].map(k => (
          <div key={k.l} style={{ background: LUX.surface, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: '14px 18px', boxShadow: LUX.shadowSm }}>
            <div style={{ fontFamily: LUX.fontSans, fontSize: '10px', fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.l}</div>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: '26px', fontWeight: 700, color: k.danger ? '#2D7A4F' : LUX.espresso, marginTop: '4px', lineHeight: 1 }}>{k.v}</div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginTop: '3px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tìm kiếm + lọc vị trí + Thêm NV */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên / SĐT..."
          style={{ flex: 1, minWidth: '220px', height: '40px', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`, padding: '0 14px', fontFamily: LUX.fontSans, fontSize: '13px', outline: 'none', background: LUX.surface, color: LUX.ink }} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ height: '40px', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`, padding: '0 12px', fontFamily: LUX.fontSans, fontSize: '13px', background: LUX.surface, color: LUX.ink, cursor: 'pointer' }}>
          <option value="all">Tất cả vị trí</option>
          <option value="ktv">Kỹ Thuật Viên</option>
          <option value="le_tan">Lễ Tân</option>
          <option value="tap_vu">Tạp Vụ</option>
        </select>
        <button onClick={openAdd}
          style={{ background: LUX.goldGrad, color: 'white', border: 'none', borderRadius: LUX.radiusSm, padding: '0 20px', height: '40px', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 4px 14px ${LUX.gold}50`, whiteSpace: 'nowrap' }}>
          + Thêm nhân viên
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
      ) : (
        <>
          {/* Section label */}
          <div style={{ fontFamily: LUX.fontSans, fontWeight: 600, fontSize: '10px', color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Nhân Viên — {activeList.length} người
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {activeList.map(nv => {
              const vc = VI_TRI_COLOR[nv.vi_tri] || VI_TRI_COLOR.tap_vu
              const tm = thangMap[nv.id]
              return (
                <button key={nv.id} onClick={() => setSelected(nv)}
                  style={{ background: LUX.surface, borderRadius: LUX.radius, padding: '14px 16px', border: `1px solid ${LUX.line}`, boxShadow: LUX.shadowSm, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  {/* Avatar */}
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', border: `2px solid ${LUX.line}`, flexShrink: 0 }}>
                    {nv.avatar_url
                      ? <img src={nv.avatar_url} alt={nv.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: getAvatarColor(nv.ho_ten), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px', fontWeight: 700, color: 'white', fontFamily: LUX.fontSans }}>{getInitials(nv.ho_ten)}</div>
                    }
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: LUX.fontSerif, fontSize: '17px', fontWeight: 600, color: LUX.espresso }}>
                        {nv.ho_ten.trim().split(' ').slice(-2).join(' ')}
                      </span>
                      <span style={{ background: vc.bg, color: vc.color, padding: '1px 7px', borderRadius: '7px', fontSize: '10px', fontWeight: 700, fontFamily: LUX.fontSans }}>
                        {VI_TRI_LABEL[nv.vi_tri]}
                      </span>
                    </div>
                    <div style={{ fontFamily: LUX.fontMono, fontSize: '12px', color: LUX.taupe }}>
                      {formatCurrency(nv.luong_cung)}/tháng
                    </div>
                    <div style={{ marginTop: '4px' }}><KyQuyBadge nv={nv} /></div>
                  </div>
                  {/* Stats tháng */}
                  {tm ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: LUX.fontSerif, fontSize: '22px', fontWeight: 600, color: LUX.espresso, lineHeight: 1 }}>
                        {tm.ngayCong.toFixed(1)}
                      </div>
                      <div style={{ fontFamily: LUX.fontSans, fontSize: '9px', color: LUX.ink3, marginTop: '2px' }}>ngày công</div>
                      {tm.tangCa > 0 && (
                        <div style={{ fontFamily: LUX.fontMono, fontSize: '9px', color: '#6a4a8a', fontWeight: 600, marginTop: '2px' }}>
                          +{tm.tangCa.toFixed(1)}h TC
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontFamily: LUX.fontSans, fontSize: '10px', color: LUX.ink3, textAlign: 'right', flexShrink: 0 }}>Chưa có<br/>dữ liệu</div>
                  )}
                  <div style={{ color: LUX.line2, fontSize: '18px', flexShrink: 0 }}>›</div>
                </button>
              )
            })}
          </div>

          {/* Nhân viên đặc biệt */}
          {specialList.length > 0 && (
            <>
              <div style={{ fontFamily: LUX.fontSans, fontWeight: 600, fontSize: '10px', color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Nhân Viên Đặc Biệt
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px' }}>
              {specialList.map(nv => (
                <button key={nv.id} onClick={() => setSelected(nv)}
                  style={{ background: LUX.surface, borderRadius: LUX.radius, padding: '14px 16px', border: `1px solid ${LUX.line}`, display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', border: `2px solid ${LUX.line}`, flexShrink: 0 }}>
                    {nv.avatar_url
                      ? <img src={nv.avatar_url} alt={nv.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: getAvatarColor(nv.ho_ten), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px', fontWeight: 700, color: 'white', fontFamily: LUX.fontSans }}>{getInitials(nv.ho_ten)}</div>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: LUX.fontSerif, fontSize: '17px', fontWeight: 600, color: LUX.espresso }}>{nv.ho_ten.trim().split(' ').slice(-2).join(' ')}</div>
                    <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginTop: '2px' }}>{VI_TRI_LABEL[nv.vi_tri]} · Lương CK thẳng</div>
                  </div>
                  <div style={{ fontFamily: LUX.fontMono, fontSize: '12px', color: LUX.taupe, flexShrink: 0 }}>{formatCurrency(nv.luong_cung)}</div>
                  <div style={{ color: LUX.line2, fontSize: '18px', flexShrink: 0 }}>›</div>
                </button>
              ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Panel trượt phải: Chi tiết hồ sơ (giống Danh Sách Đơn Hàng) ── */}
      {selected && createPortal(
        <>
        <style>{`@keyframes hsSlideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.4)', zIndex: 10000 }}
          onClick={() => setSelected(null)}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.bg, display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 40px rgba(42,32,26,0.28)', animation: 'hsSlideIn .22s ease' }}
            onClick={e => e.stopPropagation()}>

            {/* Header cố định */}
            <div style={{ background: LUX.heroGrad, padding: '22px 24px', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '18px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt={selected.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, color: 'white', fontFamily: LUX.fontSans }}>{getInitials(selected.ho_ten)}</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: '24px', color: 'white', lineHeight: 1.2 }}>{selected.ho_ten}</div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                  {VI_TRI_LABEL[selected.vi_tri]} · {soThoiGianLam(selected.ngay_bat_dau)}
                </div>
              </div>
              <button onClick={() => setSelected(null)} title="Đóng"
                style={{ width: 36, height: 36, borderRadius: 11, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            {/* Nội dung cuộn — lưới 2-3 cột để tận dụng bề rộng */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '8px 24px', alignItems: 'start' }}>
              <SheetSection title="Thông Tin Chung">
                <SheetRow label="Ngày vào làm" value={fmtNgay(selected.ngay_bat_dau)} />
                <SheetRow label="Thâm niên"    value={soThoiGianLam(selected.ngay_bat_dau)} />
                <SheetRow label="SĐT"          value={selected.so_dien_thoai || '—'} />
                <SheetRow label="Lương cứng"   value={formatCurrency(selected.luong_cung)} highlight />
                <SheetRow label="Giới hạn OFF" value={`${selected.gioi_han_off_thang || 3} ngày/tháng`} />
              </SheetSection>

              <SheetSection title={`Tháng ${thang}/${nam}`}>
                {thangMap[selected.id] ? (
                  <>
                    <SheetRow label="Ngày công" value={(thangMap[selected.id].ngayCong||0).toFixed(2)} highlight />
                    <SheetRow label="Tăng ca"   value={`${(thangMap[selected.id].tangCa||0).toFixed(2)}h`} />
                    <SheetRow label="Số OFF"    value={`${thangMap[selected.id].soOff||0}/${selected.gioi_han_off_thang||3}`} />
                  </>
                ) : (
                  <div style={{ fontFamily: LUX.fontSans, fontSize: '13px', color: LUX.ink3 }}>Chưa có dữ liệu tháng này</div>
                )}
              </SheetSection>

              {(() => {
                const q = quyOffMap[selected.id]
                return (
                  <SheetSection title={`Ngày Lễ Tích Luỹ ${nam}`}>
                    {q ? (
                      <>
                        <SheetRow label="Đã tích luỹ" value={`${q.so_ngay_tich || 0} ngày`} highlight />
                        <SheetRow label="Đã dùng" value={`${q.so_ngay_da_dung || 0} ngày`} />
                        <SheetRow label="Còn lại" value={`${(q.so_ngay_tich || 0) - (q.so_ngay_da_dung || 0)} ngày`} highlight />
                        {q.ly_do_tich_luy && <SheetRow label="Lý do" value={q.ly_do_tich_luy} />}
                      </>
                    ) : (
                      <div style={{ fontFamily: LUX.fontSans, fontSize: '13px', color: LUX.ink3 }}>Chưa có ngày tích luỹ</div>
                    )}
                  </SheetSection>
                )
              })()}

              <SheetSection title="Ký Quỹ (500k/tháng × 12)">
                <KyQuyDetail nv={selected} />
              </SheetSection>
              </div>
            </div>

            {/* Nút hành động cố định ở đáy */}
            <div style={{ flexShrink: 0, borderTop: `1px solid ${LUX.line}`, background: LUX.bg, padding: '14px 24px', display: 'flex', gap: '10px' }}>
              <button onClick={() => setChamCongSheet(selected)}
                style={{ flex: 1, background: LUX.surface2, color: LUX.espresso, border: `2px solid ${LUX.gold}60`, borderRadius: LUX.radius, padding: '14px', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                📋 Sửa Chấm Công
              </button>
              <button onClick={() => openEdit(selected)}
                style={{ flex: 1, background: LUX.goldGrad, color: 'white', border: 'none', borderRadius: LUX.radius, padding: '14px', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: `0 4px 16px ${LUX.gold}50` }}>
                Chỉnh Sửa Hồ Sơ
              </button>
            </div>
          </div>
        </div>
        </>
      , document.body)}

      {/* ── Panel: Form Thêm / Sửa (full chiều cao tới menu) ── */}
      {editSheet && createPortal(
        <>
        <style>{`@keyframes hsSlideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.4)', zIndex: 10001 }}
          onClick={() => setEditSheet(null)}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.bg, overflowY: 'auto', paddingBottom: '24px', boxShadow: '-6px 0 40px rgba(42,32,26,0.28)', animation: 'hsSlideIn .22s ease' }}
            onClick={e => e.stopPropagation()}>
            {/* Form header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px 14px', position: 'sticky', top: 0, background: LUX.bg, zIndex: 2 }}>
              <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: '22px', color: LUX.espresso }}>
                {editSheet.mode === 'add' ? 'Thêm Nhân Viên' : 'Chỉnh Sửa Hồ Sơ'}
              </div>
              <button onClick={() => setEditSheet(null)}
                style={{ background: LUX.line, border: 'none', borderRadius: '10px', padding: '6px 14px', fontSize: '13px', color: LUX.ink3, cursor: 'pointer', fontFamily: LUX.fontSans, fontWeight: 600 }}>
                Huỷ
              </button>
            </div>

            <div style={{ padding: '0 28px', maxWidth: 820, margin: '0 auto' }}>
              {/* Avatar — đặt đầu tiên để dễ nhìn thấy */}
              <AvatarUpload
                nvId={editSheet.nv.id}
                nvName={editSheet.nv.ho_ten}
                currentUrl={editSheet.nv.avatar_url}
                onUploaded={url => setEditSheet(s => ({ ...s, nv: { ...s.nv, avatar_url: url } }))}
              />

              <LuxSectionLabel>Thông Tin Cơ Bản</LuxSectionLabel>
              <LuxField label="Họ và Tên *" value={editSheet.nv.ho_ten}
                onChange={v => setEditSheet(s => ({ ...s, nv: { ...s.nv, ho_ten: v } }))}
                placeholder="Nguyễn Thị Ví Dụ" />
              <LuxSelect label="Vị Trí" value={editSheet.nv.vi_tri}
                onChange={v => setEditSheet(s => ({ ...s, nv: { ...s.nv, vi_tri: v } }))}
                options={VI_TRI_OPTS} />
              <LuxField label="Số Điện Thoại" value={editSheet.nv.so_dien_thoai}
                onChange={v => setEditSheet(s => ({ ...s, nv: { ...s.nv, so_dien_thoai: v } }))}
                placeholder="0912 345 678" />

              <LuxField label="Ngày Vào Làm (dd/MM/yyyy)" value={editSheet.nv.ngay_bat_dau}
                onChange={v => {
                  let iso = v
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) { const [d, m, y] = v.split('/'); iso = `${y}-${m}-${d}` }
                  setEditSheet(s => ({ ...s, nv: { ...s.nv, ngay_bat_dau: iso } }))
                }}
                placeholder="18/04/2025" />

              <LuxSectionLabel>Lương & Giới Hạn</LuxSectionLabel>
              <LuxMoney label="Lương Cứng *" value={editSheet.nv.luong_cung}
                onChange={v => setEditSheet(s => ({ ...s, nv: { ...s.nv, luong_cung: v } }))} />
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Giới Hạn OFF / Tháng</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[3, 4].map(n => (
                    <button key={n} onClick={() => setEditSheet(s => ({ ...s, nv: { ...s.nv, gioi_han_off_thang: n } }))}
                      style={{ flex: 1, padding: '10px', borderRadius: LUX.radiusSm, border: `2px solid ${editSheet.nv.gioi_han_off_thang === n ? LUX.gold : LUX.line}`, background: editSheet.nv.gioi_han_off_thang === n ? '#f5e8d4' : LUX.surface2, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '14px', color: editSheet.nv.gioi_han_off_thang === n ? LUX.taupe : LUX.ink3, cursor: 'pointer' }}>
                      {n} ngày
                    </button>
                  ))}
                </div>
              </div>

{editSheet.mode === 'edit' && (
                <>
                  <LuxSectionLabel>Ngày Lễ Tích Luỹ {nam}</LuxSectionLabel>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số Ngày Tích Luỹ</label>
                    <input type="number" min="0" max="30"
                      value={editSheet.nv.so_ngay_tich || 0}
                      onChange={e => setEditSheet(s => ({ ...s, nv: { ...s.nv, so_ngay_tich: parseInt(e.target.value) || 0 } }))}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`, fontFamily: LUX.fontMono, fontSize: '15px', color: LUX.ink, background: LUX.surface2, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <LuxField label="Lý Do Tích Luỹ" value={editSheet.nv.ly_do_tich_luy || ''}
                    onChange={v => setEditSheet(s => ({ ...s, nv: { ...s.nv, ly_do_tich_luy: v } }))}
                    placeholder="Tích luỹ từ ngày lễ 30/04, 01/05" />
                </>
              )}

              <LuxSectionLabel>Ký Quỹ</LuxSectionLabel>
              <LuxSelect label="Trạng Thái Ký Quỹ" value={editSheet.nv.ky_quy_trang_thai}
                onChange={v => setEditSheet(s => ({ ...s, nv: { ...s.nv, ky_quy_trang_thai: v } }))}
                options={[
                  { value: 'dang_dong',   label: 'Đang đóng' },
                  { value: 'hoan_tat',    label: 'Hoàn tất 12 tháng' },
                  { value: 'da_hoan_tra', label: 'Đã hoàn trả' },
                ]} />
              <LuxField label="Ngày Bắt Đầu Ký Quỹ" value={editSheet.nv.ky_quy_bat_dau}
                onChange={v => {
                  let iso = v
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) { const [d, m, y] = v.split('/'); iso = `${y}-${m}-${d}` }
                  setEditSheet(s => ({ ...s, nv: { ...s.nv, ky_quy_bat_dau: iso } }))
                }}
                placeholder="01/03/2026" />
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số Tháng Đã Đóng</label>
                <input type="number" min="0" max="12"
                  value={editSheet.nv.ky_quy_so_thang || 0}
                  onChange={e => setEditSheet(s => ({ ...s, nv: { ...s.nv, ky_quy_so_thang: parseInt(e.target.value) || 0 } }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`, fontFamily: LUX.fontMono, fontSize: '15px', color: LUX.ink, background: LUX.surface2, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <LuxSectionLabel>{editSheet.mode === 'add' ? 'Đăng Nhập Checkin' : 'Đặt Lại PIN Checkin'}</LuxSectionLabel>
              <LuxField label={editSheet.mode === 'add' ? 'PIN Checkin (4 số)' : 'PIN Mới (bỏ trống = giữ nguyên)'}
                value={editSheet.nv.pin}
                onChange={v => setEditSheet(s => ({ ...s, nv: { ...s.nv, pin: v.replace(/\D/g, '').slice(0, 4) } }))}
                placeholder="1234" />

              {editSheet.mode === 'edit' && (
                <>
                  <LuxSectionLabel>Trạng Thái</LuxSectionLabel>
                  <LuxSelect label="Trạng Thái Nhân Viên" value={editSheet.nv.trang_thai}
                    onChange={v => setEditSheet(s => ({ ...s, nv: { ...s.nv, trang_thai: v } }))}
                    options={[
                      { value: 'dang_lam',  label: 'Đang làm' },
                      { value: 'dac_biet',  label: 'Đặc biệt (lương CK thẳng)' },
                      { value: 'nghi_viec', label: 'Nghỉ việc' },
                    ]} />
                </>
              )}

              <button onClick={handleSave} disabled={saving}
                style={{ width: '100%', background: saving ? LUX.champagne2 : LUX.goldGrad, color: 'white', border: 'none', borderRadius: LUX.radius, padding: '15px', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '20px', boxShadow: `0 4px 16px ${LUX.gold}50` }}>
                {saving ? 'Đang lưu...' : (editSheet.mode === 'add' ? 'Thêm Nhân Viên' : 'Lưu Thay Đổi')}
              </button>
            </div>
          </div>
        </div>
        </>
      , document.body)}

      {/* ── Admin Sửa Chấm Công Sheet ── */}
      {chamCongSheet && (
        <AdminSuaChamCong
          nhanVien={chamCongSheet}
          onClose={() => setChamCongSheet(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  )
}

function SheetSection({ title, children }) {
  return (
    <div style={{ background: LUX.surface2, borderRadius: LUX.radiusSm, padding: '14px 16px', marginBottom: '10px', border: `1px solid ${LUX.line}` }}>
      <div style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '10px', color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{title}</div>
      {children}
    </div>
  )
}
function SheetRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${LUX.line}` }}>
      <span style={{ fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3 }}>{label}</span>
      <span style={{ fontFamily: highlight ? LUX.fontMono : LUX.fontSans, fontSize: '13px', fontWeight: highlight ? 700 : 600, color: highlight ? LUX.taupe : LUX.ink }}>{value}</span>
    </div>
  )
}
