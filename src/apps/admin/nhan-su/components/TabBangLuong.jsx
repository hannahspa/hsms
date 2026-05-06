import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, getNowVN } from '../../../../lib/utils'
import { tinhLuong as calcLuong } from '../../../../lib/luong'
import BangLuongImportPOS from './BangLuongImportPOS'
import ConfirmDialog from '../../../../components/shared/ConfirmDialog'

const DON_GIA_TANG_CA = 25000

function canChot(thang, nam, ky) {
  const now = getNowVN()
  const curM = now.getMonth() + 1
  const curY = now.getFullYear()
  const curD = now.getDate()
  // Current or future month → never chot
  if (nam > curY || (nam === curY && thang >= curM)) return false
  // Determine if this is the "previous month" (month right before current)
  const prevM = curM === 1 ? 12 : curM - 1
  const prevY = curM === 1 ? curY - 1 : curY
  const isPrev = (thang === prevM && nam === prevY)
  // Older than previous month → always OK
  if (!isPrev) return true
  // Previous month → gate by payroll cycle
  if (ky === 1) return curD >= 5
  return curD >= 15
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

function TrangThaiBadge({ tt }) {
  if (tt === 'da_phat_luong') return <Chip bg="#dcfce7" color="#166534">💰 Đã Phát Lương</Chip>
  if (tt === 'da_chot') return <Chip bg="#eef2e7" color="#5a6a4a">✓ Đã Chốt</Chip>
  if (tt === 'da_tinh') return <Chip bg="#ede9f8" color="#5a4a8a">● Đã Tính</Chip>
  return <Chip bg={LUX.surface} color={LUX.ink3}>○ Chưa Tính</Chip>
}
function Chip({ bg, color, children }) {
  return (
    <span style={{ background: bg, color, padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, fontFamily: LUX.fontSans }}>
      {children}
    </span>
  )
}

function MoneyInput({ label, value, onChange, readOnly, color }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input type="text" readOnly={readOnly}
          value={value === 0 ? '' : new Intl.NumberFormat('vi-VN').format(value)}
          onChange={readOnly ? undefined : e => { const raw = e.target.value.replace(/\D/g, ''); onChange(raw === '' ? 0 : parseInt(raw)) }}
          placeholder="0"
          style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: LUX.radiusSm, border: `1px solid ${readOnly ? LUX.line : LUX.champagne}`, background: readOnly ? LUX.bg : LUX.surface2, fontFamily: LUX.fontMono, fontSize: '15px', fontWeight: 600, color: color || LUX.ink, boxSizing: 'border-box', outline: 'none' }}
        />
        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3 }}>đ</span>
      </div>
    </div>
  )
}

export default function TabBangLuong() {
  const now = getNowVN()
  const [thang,     setThang]     = useState(now.getMonth() + 1)
  const [nam,       setNam]       = useState(now.getFullYear())
  const [ky,        setKy]        = useState(1) // 1 = Lương Cứng, 2 = Lương KD
  const [nvList,    setNvList]    = useState([])
  const [luongData, setLuongData] = useState({})
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [editState, setEditState] = useState({})
  const [saving,    setSaving]    = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [leTanDS,   setLeTanDS]   = useState(null) // { 'Khánh Duy': ds, 'Ngọc Phương': ds }
  const [leTanInput, setLeTanInput] = useState({ tongDT: 0, dtMyPham: 0, dsKD: 0, dsNP: 0 })
  const [calcLeTan,  setCalcLeTan]  = useState(null) // preview result
  const [toast,     setToast]     = useState(null)
  const [confirm,   setConfirm]   = useState(null)

  const prevMonth = () => { if (thang === 1) { setThang(12); setNam(n=>n-1) } else setThang(t=>t-1) }
  const nextMonth = () => { if (thang === 12) { setThang(1); setNam(n=>n+1) } else setThang(t=>t+1) }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const soNgay    = new Date(nam, thang, 0).getDate()
      const startDate = `${nam}-${String(thang).padStart(2,'0')}-01`
      const endDate   = `${nam}-${String(thang).padStart(2,'0')}-${String(soNgay).padStart(2,'0')}`

      const [resNv, resChamCong, resOff, resBangLuong, resQuyOff] = await Promise.all([
        supabase.from('nhan_vien')
          .select('id, ho_ten, vi_tri, luong_cung, avatar_url, trang_thai, gioi_han_off_thang, ky_quy_trang_thai, ky_quy_so_thang')
          .eq('trang_thai', 'dang_lam').order('vi_tri').order('ho_ten'),
        supabase.from('cham_cong')
          .select('nhan_vien_id, ngay, loai, gio_vao, gio_ra, he_so, tang_ca_gio, trang_thai_tang_ca')
          .gte('ngay', startDate).lte('ngay', endDate),
        supabase.from('dang_ky_off')
          .select('nhan_vien_id, ngay_off, loai_off')
          .gte('ngay_off', startDate).lte('ngay_off', endDate).eq('trang_thai', 'duoc_duyet'),
        supabase.from('bang_luong').select('*').eq('thang', thang).eq('nam', nam),
        supabase.from('quy_ngay_off')
          .select('nhan_vien_id, nam, so_ngay_tich, so_ngay_da_dung, so_dung_thang_nay').eq('nam', nam),
      ])

      const nvData = resNv.data || []
      const ccByNv = {}, offByNv = {}
      ;(resChamCong.data || []).forEach(r => { if (!ccByNv[r.nhan_vien_id]) ccByNv[r.nhan_vien_id] = []; ccByNv[r.nhan_vien_id].push(r) })
      ;(resOff.data || []).forEach(r => { if (!offByNv[r.nhan_vien_id]) offByNv[r.nhan_vien_id] = []; offByNv[r.nhan_vien_id].push(r) })
      const bangLuongMap = {}; (resBangLuong.data || []).forEach(r => { bangLuongMap[r.nhan_vien_id] = r })
      const quyOffMap    = {}; (resQuyOff.data || []).forEach(r => { quyOffMap[r.nhan_vien_id] = r })

      // For current month: cap at today's date for real-time data
      const nowRef = getNowVN()
      const isCurrentMonth = thang === nowRef.getMonth() + 1 && nam === nowRef.getFullYear()
      const todayRef = isCurrentMonth ? nowRef.getDate() : null

      const result = {}
      nvData.forEach(nv => {
        const bl = bangLuongMap[nv.id]
        const quy = quyOffMap[nv.id]
        result[nv.id] = calcLuong(nv, ccByNv[nv.id] || [], offByNv[nv.id] || [], bl, nam, thang, {
          so_da_tich_luy: quy?.so_ngay_tich || 0,
          so_da_dung: quy?.so_ngay_da_dung || 0,
          so_dung_thang_nay: quy?.so_dung_thang_nay || 0,
        }, todayRef)
        result[nv.id].kyQuyTrangThai = nv.ky_quy_trang_thai || 'hoan_tat'
        result[nv.id].trangThaiLC  = bl?.trang_thai_lc || bl?.trang_thai || 'chua_tinh'
        result[nv.id].trangThaiLKD = bl?.trang_thai_lkd || 'chua_tinh'
        result[nv.id].bangLuongId  = bl?.id || null
        // Store raw KD values from DB for edit state
        result[nv.id].hoaHongDV  = bl?.hoa_hong_dv || 0
        result[nv.id].tienTour   = bl?.tien_tour || 0
        result[nv.id].thuongDatDoanhSo = bl?.hoa_hong_the || 0  // Thưởng Đạt Doanh Số
        result[nv.id].truUngLuong = bl?.tru_ung_luong || 0
      })

      setNvList(nvData)
      setLuongData(result)
    } catch (e) { console.error('TabBangLuong:', e) }
    finally { setLoading(false) }
  }, [thang, nam])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openDetail = (nv) => {
    const ld = luongData[nv.id]
    if (ky === 1) {
      setEditState({ truUngLuong: ld?.truUngLuong ?? 0 })
    } else {
      setEditState({
        hoaHongDV:  ld?.hoaHongDV ?? 0,
        tienTour:   ld?.tienTour  ?? 0,
        thuongDS:   ld?.thuongDatDoanhSo ?? 0,
      })
    }
    setSelected(nv)
  }

  const handleLuu = async (chot = false) => {
    if (!selected) return
    if (chot && !canChot(thang, nam, ky)) {
      const now = getNowVN()
      const isCurrent = thang === now.getMonth() + 1 && nam === now.getFullYear()
      showToast(
        isCurrent
          ? 'Không thể chốt lương tháng hiện tại. Hãy đợi hết tháng.'
          : `Kỳ ${ky} chỉ được chốt từ ngày ${ky === 1 ? '05' : '15'} tháng sau.`,
        'error'
      )
      return
    }
    setSaving(true)
    try {
      const ld = luongData[selected.id]
      let payload, error

      if (ky === 1) {
        // Kỳ 1 — Lương Cứng
        const tongLuongCung = ld.luongCoBan + ld.tienTangCa - ld.tienPhat - ld.truKyQuy - editState.truUngLuong
        payload = {
          nhan_vien_id: selected.id, thang, nam,
          luong_co_ban: ld.luongCoBan, tien_tang_ca: ld.tienTangCa, tien_phat: ld.tienPhat,
          tru_ung_luong: editState.truUngLuong, tru_ky_quy: ld.truKyQuy,
          tong_linh: ld.tongLinh, // keep total updated
          trang_thai_lc: chot ? 'da_chot' : 'da_tinh',
        }
      } else {
        // Kỳ 2 — Lương Kinh Doanh
        const tongKinhDoanh = editState.hoaHongDV + editState.tienTour + (editState.thuongDS || 0)
        const tongLC = ld.luongCoBan + ld.tienTangCa - ld.tienPhat - ld.truKyQuy - (ld.truUngLuong || 0)
        const tongLinh = tongLC + tongKinhDoanh
        payload = {
          nhan_vien_id: selected.id, thang, nam,
          hoa_hong_dv: editState.hoaHongDV,
          hoa_hong_the: editState.thuongDS || 0,
          tien_tour: editState.tienTour,
          tong_linh: tongLinh,
          trang_thai_lkd: chot ? 'da_chot' : 'da_tinh',
        }
      }

      if (ld.bangLuongId) {
        ;({ error } = await supabase.from('bang_luong').update(payload).eq('id', ld.bangLuongId))
      } else {
        payload.nhan_vien_id = selected.id
        payload.thang = thang
        payload.nam = nam
        ;({ error } = await supabase.from('bang_luong').insert(payload))
      }
      if (error) throw error
      showToast(chot ? '✓ Đã chốt lương Kỳ ' + ky + '!' : '✓ Đã lưu bảng lương Kỳ ' + ky)
      await fetchAll()
      setSelected(null)
    } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleUnlock = async () => {
    if (!selected) return
    const ld = luongData[selected.id]
    if (!ld?.bangLuongId) return
    setSaving(true)
    try {
      const col = ky === 1 ? 'trang_thai_lc' : 'trang_thai_lkd'
      const { error } = await supabase.from('bang_luong')
        .update({ [col]: 'da_tinh' }).eq('id', ld.bangLuongId)
      if (error) throw error
      showToast('✓ Đã mở chốt Kỳ ' + ky + ' — có thể chỉnh sửa')
      await fetchAll()
      setSelected(null)
    } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const handlePhatLuong = () => {
    const nvIds = Object.keys(luongData)
    if (nvIds.length === 0) return
    setConfirm({
      title: `Phát Lương Kỳ ${ky}`,
      message: `Xác nhận đã thanh toán lương cho TẤT CẢ ${nvIds.length} nhân viên?`,
      note: ky === 1 ? 'Ký quỹ sẽ tự động +1 tháng cho nhân viên đang đóng.' : null,
      confirmLabel: 'Đã Phát Lương 💰',
      onConfirm: async () => {
        setConfirm(null)
        setSaving(true)
        try {
          const col = ky === 1 ? 'trang_thai_lc' : 'trang_thai_lkd'
          const bangLuongIds = nvIds.map(id => luongData[id]?.bangLuongId).filter(Boolean)
          if (bangLuongIds.length > 0) {
            const { error } = await supabase.from('bang_luong')
              .update({ [col]: 'da_phat_luong' }).in('id', bangLuongIds)
            if (error) throw error
          }
          if (ky === 1) {
            const nvDangDong = nvList.filter(nv =>
              nv.ky_quy_trang_thai === 'dang_dong' && (nv.ky_quy_so_thang || 0) < 12
            )
            for (const nv of nvDangDong) {
              const thangMoi = (nv.ky_quy_so_thang || 0) + 1
              const trangThaiMoi = thangMoi >= 12 ? 'hoan_tat' : 'dang_dong'
              await supabase.from('nhan_vien').update({
                ky_quy_so_thang: thangMoi,
                ky_quy_trang_thai: trangThaiMoi,
              }).eq('id', nv.id)
            }
            showToast(nvDangDong.length > 0
              ? `✓ Đã phát lương Kỳ ${ky} + cập nhật ký quỹ ${nvDangDong.length} NV`
              : `✓ Đã phát lương Kỳ ${ky}`)
          } else {
            showToast(`✓ Đã phát lương Kỳ ${ky} cho ${nvIds.length} nhân viên`)
          }
          await fetchAll()
        } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
        finally { setSaving(false) }
      },
    })
  }

  const handleMoPhatLuong = () => {
    const nvIds = Object.keys(luongData)
    if (nvIds.length === 0) return
    setConfirm({
      title: `Mở Phát Lương Kỳ ${ky}`,
      message: `Quay về trạng thái Đã Chốt cho tất cả ${nvIds.length} nhân viên?`,
      note: ky === 1 ? 'Ký quỹ đã tăng sẽ KHÔNG tự động giảm.' : null,
      confirmLabel: 'Mở Phát Lương',
      danger: true,
      onConfirm: async () => {
        setConfirm(null)
        setSaving(true)
        try {
          const col = ky === 1 ? 'trang_thai_lc' : 'trang_thai_lkd'
          const bangLuongIds = nvIds.map(id => luongData[id]?.bangLuongId).filter(Boolean)
          if (bangLuongIds.length > 0) {
            const { error } = await supabase.from('bang_luong')
              .update({ [col]: 'da_chot' }).in('id', bangLuongIds)
            if (error) throw error
          }
          showToast(`✓ Đã mở phát lương Kỳ ${ky} — quay về Đã Chốt`)
          await fetchAll()
        } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
        finally { setSaving(false) }
      },
    })
  }

  // ── Tính Lễ Tân ──
  const tinhLeTan = () => {
    const tongDT = leTanInput.tongDT || 0
    const dtMP   = leTanInput.dtMyPham || 0
    const dsKD   = leTanInput.dsKD || 0
    const dsNP   = leTanInput.dsNP || 0

    // Bậc 1: 150tr - DS_KD - DS_NP - DT_Mỹ_Phẩm, tối thiểu 0
    const coSo1 = Math.max(0, 150000000 - dsKD - dsNP - dtMP)
    const hh1 = Math.round(coSo1 * 0.01)

    // Bậc 2: phần vượt >150tr
    const vuot = Math.max(0, tongDT - 150000000)
    const hh2 = Math.round(vuot * 0.015)

    const moiNguoi = hh1 + hh2
    setCalcLeTan({ dsKD, dsNP, coSo1, hh1, vuot, hh2, moiNguoi })
  }

  const handleSaveLeTan = async () => {
    if (!calcLeTan || !leTanDS) return
    setSaving(true)
    try {
      const leTanNames = Object.keys(leTanDS)
      // Find NV IDs for Lễ Tân
      const leTanNVs = nvList.filter(nv => nv.vi_tri === 'le_tan' && leTanNames.includes(nv.ho_ten))

      for (const nv of leTanNVs) {
        const ld = luongData[nv.id]
        // Lễ Tân: Hoa hồng từ Excel + Lương Kinh Doanh (công thức) + Thưởng
        const hhExcel = ld?.hoaHongDV || 0
        const thuongDS = ld?.thuongDatDoanhSo || 0
        const tongKinhDoanh = hhExcel + calcLeTan.moiNguoi + thuongDS
        const tongLC = ld ? (ld.luongCoBan + ld.tienTangCa - ld.tienPhat - ld.truKyQuy - (ld.truUngLuong || 0)) : 0
        const tongLinh = tongLC + tongKinhDoanh

        const payload = {
          nhan_vien_id: nv.id, thang, nam,
          hoa_hong_dv: hhExcel,              // Hoa hồng từ Excel
          hoa_hong_the: thuongDS,             // Thưởng Đạt Doanh Số
          tien_tour: calcLeTan.moiNguoi,      // Lương Kinh Doanh (công thức)
          tong_linh: tongLinh,
        }

        const { data: existing } = await supabase.from('bang_luong')
          .select('id').eq('nhan_vien_id', nv.id).eq('thang', thang).eq('nam', nam).maybeSingle()

        if (existing) {
          await supabase.from('bang_luong').update(payload).eq('id', existing.id)
        } else {
          await supabase.from('bang_luong').insert(payload)
        }
      }

      showToast(`Đã tính Lễ Tân: ${formatCurrency(calcLeTan.moiNguoi)}/người`)
      setLeTanDS(null)
      setCalcLeTan(null)
      await fetchAll()
    } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  // Tổng chi theo kỳ đang chọn
  const tongTheoKy = ky === 1
    ? Object.values(luongData).reduce((s, ld) => s + (ld?.luongCoBan || 0) + (ld?.tienTangCa || 0) - (ld?.tienPhat || 0) - (ld?.truKyQuy || 0) - (ld?.truUngLuong || 0), 0)
    : Object.values(luongData).reduce((s, ld) => s + (ld?.hoaHongDV || 0) + (ld?.tienTour || 0) + (ld?.thuongDatDoanhSo || 0), 0)

  const tongLinhTatCa = Object.values(luongData).reduce((s, ld) => s + (ld?.tongLinh || 0), 0)

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: toast.type === 'error' ? LUX.danger : LUX.sage, color: 'white', padding: '12px 24px', borderRadius: LUX.radiusSm, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '13px', boxShadow: LUX.shadowLg, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Chọn tháng */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: LUX.surface, borderRadius: LUX.radius, padding: '12px 16px', marginBottom: '6px', border: `1px solid ${LUX.line}`, boxShadow: LUX.shadowSm }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '22px', color: LUX.taupe, cursor: 'pointer', padding: '4px 8px' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: '20px', color: LUX.espresso }}>Tháng {thang} / {nam}</div>
        </div>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '22px', color: LUX.taupe, cursor: 'pointer', padding: '4px 8px' }}>›</button>
      </div>

      {/* Badge cảnh báo tháng hiện tại / chưa đến kỳ chốt */}
      {(() => {
        const now = getNowVN()
        const isCurrent = thang === now.getMonth() + 1 && nam === now.getFullYear()
        const canChotNow = canChot(thang, nam, ky)
        if (isCurrent) {
          return (
            <div style={{ background: '#e8f0fe', borderRadius: LUX.radiusSm, padding: '8px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #a8c8f0' }}>
              <span style={{ fontSize: 14 }}>🕐</span>
              <div>
                <span style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: '#1A5276' }}>Dữ liệu thời gian thực</span>
                <span style={{ fontFamily: LUX.fontSans, fontSize: 11, color: '#1A527699', marginLeft: 8 }}>— chưa thể chốt đến hết tháng</span>
              </div>
            </div>
          )
        }
        if (!canChotNow && !isCurrent) {
          const chotM = thang === 12 ? 1 : thang + 1
          const chotY = thang === 12 ? nam + 1 : nam
          return (
            <div style={{ background: '#fdf3e0', borderRadius: LUX.radiusSm, padding: '8px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e8d5b0' }}>
              <span style={{ fontSize: 14 }}>📅</span>
              <span style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 600, color: LUX.taupe }}>
                Kỳ {ky} được chốt từ ngày {ky === 1 ? '05' : '15'}/{String(chotM).padStart(2,'0')}/{chotY}
              </span>
            </div>
          )
        }
        return null
      })()}

      {/* ── Kỳ tab switch ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: LUX.surface2, borderRadius: LUX.radius, padding: 4, border: `1px solid ${LUX.line}` }}>
        {[
          { k: 1, title: 'Kỳ 1 · Lương Cứng', sub: 'Chốt mùng 5' },
          { k: 2, title: 'Kỳ 2 · Lương Kinh Doanh', sub: 'Chốt ngày 15' },
        ].map(tab => (
          <button key={tab.k} onClick={() => { setKy(tab.k); setSelected(null) }}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: LUX.radiusSm,
              border: ky === tab.k ? `1px solid ${LUX.champagne}` : '1px solid transparent',
              background: ky === tab.k ? 'linear-gradient(135deg,#fdf3e0,#f9ead0)' : 'transparent',
              color: ky === tab.k ? LUX.espresso : LUX.ink3,
              fontFamily: LUX.fontSans, fontWeight: ky === tab.k ? 700 : 500, fontSize: 13,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
            <div>{tab.title}</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{tab.sub}</div>
          </button>
        ))}
      </div>

      {/* Tổng chi lương */}
      <div style={{ background: ky === 1 ? LUX.heroGrad : 'linear-gradient(135deg,#1A5276,#154360)', borderRadius: LUX.radius, padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {ky === 1 ? `Tổng Lương Cứng Tháng ${thang}` : `Tổng Lương KD Tháng ${thang}`}
          </div>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: '28px', fontWeight: 600, color: LUX.champagne, marginTop: '4px' }}>
            {formatCurrency(tongTheoKy)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: LUX.fontSans, fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Tổng 2 kỳ</div>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>{formatCurrency(tongLinhTatCa)}</div>
        </div>
      </div>

      {/* ── Đã Phát Lương button ── */}
      {(() => {
        const allNvIds = Object.keys(luongData)
        if (allNvIds.length === 0) return null
        const col = ky === 1 ? 'trangThaiLC' : 'trangThaiLKD'
        const allChot = allNvIds.every(id => luongData[id]?.[col] === 'da_chot')
        const allPhat = allNvIds.every(id => luongData[id]?.[col] === 'da_phat_luong')
        const somePhat = allNvIds.some(id => luongData[id]?.[col] === 'da_phat_luong')

        if (allPhat) {
          return (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ background: '#dcfce7', borderRadius: LUX.radius, padding: '14px 18px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '14px', color: '#166534' }}>💰 Đã Phát Lương Kỳ {ky}</div>
                  <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: '#16653499', marginTop: '2px' }}>
                    {allNvIds.length} nhân viên · {ky === 1 ? 'Ký quỹ đã được cập nhật' : 'Lương kinh doanh đã thanh toán'}
                  </div>
                </div>
                <button onClick={handleMoPhatLuong} disabled={saving}
                  style={{ padding: '8px 16px', borderRadius: LUX.radiusSm, border: '1px solid #86efac', background: 'white', color: '#166534', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  {saving ? '...' : '↩ Mở Phát Lương'}
                </button>
              </div>
            </div>
          )
        }

        if (allChot) {
          return (
            <div style={{ marginBottom: '16px' }}>
              <button onClick={handlePhatLuong} disabled={saving}
                style={{ width: '100%', padding: '16px', borderRadius: LUX.radius, border: 'none',
                  background: 'linear-gradient(135deg,#059669,#047857)',
                  color: 'white', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '15px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 24px rgba(5,150,105,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>💰</span>
                {saving ? 'Đang xử lý...' : `Xác Nhận Đã Phát Lương Kỳ ${ky} — ${allNvIds.length} Nhân Viên`}
              </button>
              {ky === 1 && <div style={{ textAlign: 'center', marginTop: '6px', fontFamily: LUX.fontSans, fontSize: '10px', color: LUX.ink3 }}>
                Ký quỹ sẽ tự động +1 tháng cho nhân viên đang đóng
              </div>}
            </div>
          )
        }

        if (somePhat) {
          return (
            <div style={{ marginBottom: '16px', background: '#fef9e7', borderRadius: LUX.radiusSm, padding: '10px 14px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 600, color: LUX.taupe }}>
                Một số nhân viên đã phát lương, số khác chưa. Hãy chốt tất cả trước khi phát lương hàng loạt.
              </span>
            </div>
          )
        }

        return null
      })()}

      {/* Import POS button (Kỳ 2 only) */}
      {ky === 2 && (
        <div style={{ marginBottom: 16 }}>
          {!showImport ? (
            <button onClick={() => setShowImport(true)}
              style={{ width: '100%', padding: '12px', borderRadius: LUX.radius, border: `1px dashed ${LUX.champagne}`, background: '#fdf3e0', color: LUX.taupe, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📎</span> Import Excel POS (myspa.vn)
            </button>
          ) : (
            <BangLuongImportPOS
              thang={thang} nam={nam} nvList={nvList}
              onImported={(ltDS) => {
                setShowImport(false)
                setLeTanDS(ltDS)
                // Auto-fill DS sau giảm từ Excel
                const dsKD = Object.entries(ltDS || {}).find(([ten]) => ten.includes('Khánh Duy'))?.[1] || 0
                const dsNP = Object.entries(ltDS || {}).find(([ten]) => ten.includes('Ngọc Phương'))?.[1] || 0
                setLeTanInput(s => ({ ...s, dsKD, dsNP }))
                fetchAll()
              }}
            />
          )}
        </div>
      )}

      {/* ── Tính Lương Kinh Doanh Lễ Tân (luôn hiển thị trong Kỳ 2) ── */}
      {ky === 2 && (
        <div style={{ marginBottom: 16, background: 'linear-gradient(135deg,#e8f0fe,#d4e4fc)', borderRadius: LUX.radius, padding: 18, border: '1px solid #a8c8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>👔</span>
            <div>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 17, fontWeight: 600, color: '#1A5276' }}>Lương Kinh Doanh Lễ Tân</div>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: '#1A5276', opacity: 0.7 }}>
                Khánh Duy & Ngọc Phương — nhập số liệu từ POS
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 10, fontWeight: 600, color: '#1A5276', marginBottom: 4, textTransform: 'uppercase' }}>Tổng Doanh Thu POS</div>
              <input type="text" placeholder="0"
                value={leTanInput.tongDT === 0 ? '' : new Intl.NumberFormat('vi-VN').format(leTanInput.tongDT)}
                onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, '')) || 0; setLeTanInput(s => ({ ...s, tongDT: v })) }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #a8c8f0', fontFamily: LUX.fontMono, fontSize: 14, fontWeight: 600, color: LUX.ink, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 10, fontWeight: 600, color: '#1A5276', marginBottom: 4, textTransform: 'uppercase' }}>Doanh Thu Mỹ Phẩm</div>
              <input type="text" placeholder="0"
                value={leTanInput.dtMyPham === 0 ? '' : new Intl.NumberFormat('vi-VN').format(leTanInput.dtMyPham)}
                onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, '')) || 0; setLeTanInput(s => ({ ...s, dtMyPham: v })) }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #a8c8f0', fontFamily: LUX.fontMono, fontSize: 14, fontWeight: 600, color: LUX.ink, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          {/* DS sau giảm — auto từ Excel hoặc nhập tay */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 10, fontWeight: 600, color: '#1A5276', marginBottom: 4, textTransform: 'uppercase' }}>
                DS sau giảm Khánh Duy {leTanDS?.['Đỗ Thị Khánh Duy'] ? '(từ Excel)' : ''}
              </div>
              <input type="text" placeholder="0"
                value={leTanInput.dsKD === 0 ? '' : new Intl.NumberFormat('vi-VN').format(leTanInput.dsKD)}
                onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, '')) || 0; setLeTanInput(s => ({ ...s, dsKD: v })) }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #a8c8f0', fontFamily: LUX.fontMono, fontSize: 14, fontWeight: 600, color: LUX.ink, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 10, fontWeight: 600, color: '#1A5276', marginBottom: 4, textTransform: 'uppercase' }}>
                DS sau giảm Ngọc Phương {leTanDS?.['Hồ Ngọc Phương'] ? '(từ Excel)' : ''}
              </div>
              <input type="text" placeholder="0"
                value={leTanInput.dsNP === 0 ? '' : new Intl.NumberFormat('vi-VN').format(leTanInput.dsNP)}
                onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, '')) || 0; setLeTanInput(s => ({ ...s, dsNP: v })) }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #a8c8f0', fontFamily: LUX.fontMono, fontSize: 14, fontWeight: 600, color: LUX.ink, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          <button onClick={tinhLeTan}
            style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1A5276,#154360)', color: 'white', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: calcLeTan ? 14 : 0 }}>
            Tính Lương Kinh Doanh
          </button>

          {/* Kết quả tính Lễ Tân */}
          {calcLeTan && (() => {
            const ltNVs = nvList.filter(nv => nv.vi_tri === 'le_tan')
            const kd = ltNVs.find(nv => nv.ho_ten.includes('Khánh Duy'))
            const np = ltNVs.find(nv => nv.ho_ten.includes('Ngọc Phương'))
            const hhKdExcel = kd ? (luongData[kd.id]?.hoaHongDV || 0) : 0
            const hhNpExcel = np ? (luongData[np.id]?.hoaHongDV || 0) : 0
            const thuongKD = kd ? (luongData[kd.id]?.thuongDatDoanhSo || 0) : 0
            const thuongNP = np ? (luongData[np.id]?.thuongDatDoanhSo || 0) : 0
            const tongKD = calcLeTan.moiNguoi + hhKdExcel + thuongKD
            const tongNP = calcLeTan.moiNguoi + hhNpExcel + thuongNP
            return (
              <div style={{ background: 'white', borderRadius: 12, padding: 14, border: '1px solid #a8c8f0' }}>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 10, fontWeight: 700, color: '#1A5276', textTransform: 'uppercase', marginBottom: 10 }}>
                  Chi tiết công thức
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink2 }}>
                  <span>DS Khánh Duy:</span>  <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(calcLeTan.dsKD)}</span>
                  <span>DS Ngọc Phương:</span>  <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(calcLeTan.dsNP)}</span>
                  <span>DT Mỹ Phẩm:</span>       <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(leTanInput.dtMyPham)}</span>
                  <span style={{ color: '#1A5276', fontWeight: 700 }}>Cơ sở bậc 1:</span> <span style={{ textAlign: 'right', fontWeight: 700, color: '#1A5276' }}>{formatCurrency(calcLeTan.coSo1)}</span>
                  <span>HH bậc 1 (1%):</span>    <span style={{ textAlign: 'right', fontWeight: 600 }}>+{formatCurrency(calcLeTan.hh1)}</span>
                  <span>Vượt &gt;150tr:</span>        <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(calcLeTan.vuot)}</span>
                  <span>HH bậc 2 (1.5%):</span>  <span style={{ textAlign: 'right', fontWeight: 600 }}>+{formatCurrency(calcLeTan.hh2)}</span>
                </div>

                {/* ── Thông tin Chấm Công Tham Khảo ── */}
                <div style={{ borderTop: '1.5px solid #a8c8f0', marginTop: 12, paddingTop: 12 }}>
                  <div style={{ fontFamily: LUX.fontSans, fontSize: 10, fontWeight: 700, color: '#1A5276', textTransform: 'uppercase', marginBottom: 10 }}>
                    Thông tin Chấm Công Tham Khảo
                  </div>

                  {/* Khánh Duy */}
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700, color: '#1A5276', marginBottom: 8 }}>Khánh Duy</div>
                    {[
                      { label: 'Lương Kinh Doanh', value: calcLeTan.moiNguoi },
                      { label: 'Hoa Hồng (Excel)', value: hhKdExcel },
                      { label: 'Thưởng Đạt Doanh Số', value: thuongKD },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink2 }}>
                        <span>{item.label}</span>
                        <span style={{ fontFamily: LUX.fontMono, fontWeight: 600 }}>{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #d4e4fc', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: LUX.fontSerif, fontSize: 14, fontWeight: 700, color: '#1A5276' }}>Tổng</span>
                      <span style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 700, color: '#1A5276' }}>{formatCurrency(tongKD)}</span>
                    </div>
                  </div>

                  {/* Ngọc Phương */}
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700, color: '#1A5276', marginBottom: 8 }}>Ngọc Phương</div>
                    {[
                      { label: 'Lương Kinh Doanh', value: calcLeTan.moiNguoi },
                      { label: 'Hoa Hồng (Excel)', value: hhNpExcel },
                      { label: 'Thưởng Đạt Doanh Số', value: thuongNP },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink2 }}>
                        <span>{item.label}</span>
                        <span style={{ fontFamily: LUX.fontMono, fontWeight: 600 }}>{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #d4e4fc', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: LUX.fontSerif, fontSize: 14, fontWeight: 700, color: '#1A5276' }}>Tổng</span>
                      <span style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 700, color: '#1A5276' }}>{formatCurrency(tongNP)}</span>
                    </div>
                  </div>
                </div>

                <button onClick={handleSaveLeTan} disabled={saving}
                  style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: LUX.goldGrad, color: 'white', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 14px ${LUX.gold}50`, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Đang lưu...' : `Áp Dụng Lương Kinh Doanh Cho Lễ Tân`}
                </button>
              </div>
            )
          })()}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tính lương...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {nvList.map(nv => {
            const ld = luongData[nv.id]
            if (!ld) return null
            const kyTT = ky === 1 ? ld.trangThaiLC : ld.trangThaiLKD
            const kyTong = ky === 1
              ? ld.luongCoBan + ld.tienTangCa - ld.tienPhat - ld.truKyQuy - ld.truUngLuong
              : ld.hoaHongDV + ld.tienTour + (ld.thuongDatDoanhSo || 0)
            const isLeTan = nv.vi_tri === 'le_tan'

            return (
              <button key={nv.id} onClick={() => openDetail(nv)}
                style={{ background: LUX.surface, borderRadius: LUX.radius, padding: '14px 16px', border: `1px solid ${LUX.line}`, boxShadow: LUX.shadowSm, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                {/* Avatar */}
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0 }}>
                  {nv.avatar_url ? <img src={nv.avatar_url} alt={nv.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: getAvatarColor(nv.ho_ten), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: 'white', fontFamily: LUX.fontSans }}>{getInitials(nv.ho_ten)}</div>}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: LUX.fontSerif, fontSize: '17px', fontWeight: 600, color: LUX.espresso, marginBottom: '4px' }}>
                    {nv.ho_ten.trim().split(' ').slice(-2).join(' ')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <TrangThaiBadge tt={kyTT} />
                    <span style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3 }}>{ld.ngayCong} ngày công</span>
                    {ld.soPhamT7X > 0 && <span style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.danger, fontWeight: 700 }}>⚠ {ld.soPhamT7X} vi phạm</span>}
                  </div>
                </div>
                {/* Tiền kỳ này */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: LUX.fontMono, fontSize: '15px', fontWeight: 700, color: ky === 1 ? LUX.taupe : '#1A5276' }}>{formatCurrency(kyTong)}</div>
                  {ky === 1 && ld.tienTangCa > 0 && <div style={{ fontFamily: LUX.fontMono, fontSize: '10px', color: '#6a4a8a', fontWeight: 600 }}>+TC {formatCurrency(ld.tienTangCa)}</div>}
                  {ky === 2 && !isLeTan && (ld.hoaHongDV + ld.tienTour + (ld.thuongDatDoanhSo || 0)) > 0 && <div style={{ fontFamily: LUX.fontMono, fontSize: '10px', color: '#1A5276', fontWeight: 600 }}>{[ld.hoaHongDV > 0 && 'HH', ld.tienTour > 0 && 'Tour', (ld.thuongDatDoanhSo || 0) > 0 && 'Thưởng'].filter(Boolean).join(' + ')}</div>}
                  {ky === 2 && isLeTan && (ld.hoaHongDV + ld.tienTour + (ld.thuongDatDoanhSo || 0)) > 0 && <div style={{ fontFamily: LUX.fontMono, fontSize: '10px', color: '#1A5276', fontWeight: 600 }}>{[ld.hoaHongDV > 0 && 'HH', ld.tienTour > 0 && 'LgKD', (ld.thuongDatDoanhSo || 0) > 0 && 'Thưởng'].filter(Boolean).join(' + ')}</div>}
                </div>
                <div style={{ color: LUX.line2, fontSize: '18px', flexShrink: 0 }}>›</div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog open={!!confirm} {...(confirm || {})} onCancel={() => setConfirm(null)} />

      {/* ── Bottom sheet chi tiết ── */}
      {selected && (() => {
        const ld = luongData[selected.id]
        if (!ld) return null
        const isChot = ky === 1 ? ld.trangThaiLC === 'da_chot' : ld.trangThaiLKD === 'da_chot'
        const isLeTan = selected.vi_tri === 'le_tan'

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', zIndex: 999, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setSelected(null)}>
            <div style={{ background: LUX.bg, borderRadius: `${LUX.radiusLg} ${LUX.radiusLg} 0 0`, width: '100%', maxWidth: '480px', margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', paddingBottom: '40px' }}
              onClick={e => e.stopPropagation()}>
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                <div style={{ width: '40px', height: '3px', borderRadius: '2px', background: LUX.line2 }} />
              </div>
              {/* Header */}
              <div style={{ background: ky === 1 ? LUX.heroGrad : 'linear-gradient(135deg,#1A5276,#154360)', margin: '12px 16px 0', borderRadius: LUX.radius, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: '22px', color: 'white' }}>{selected.ho_ten}</div>
                  <div style={{ fontFamily: LUX.fontSans, fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                    {ky === 1 ? `Kỳ 1 · Lương Cứng — Tháng ${thang}/${nam}` : `Kỳ 2 · Lương Kinh Doanh — Tháng ${thang}/${nam}`}
                  </div>
                </div>
                <TrangThaiBadge tt={ky === 1 ? ld.trangThaiLC : ld.trangThaiLKD} />
              </div>

              <div style={{ padding: '16px' }}>
                {ky === 1 ? (
                  <>
                    {/* KỲ 1 — Chấm công */}
                    <BLSection title="Chấm Công Tháng Này">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '8px' }}>
                        {[
                          { label:'Ngày công',    value: ld.ngayCong,       color:'#5a6a4a', bg:'#eef2e7' },
                          { label:'Tăng ca (h)',   value: ld.tongTangCa,     color:'#6a4a8a', bg:'#ede9f8' },
                          { label:'OFF Có Lương', value: ld.soOffCoLuong,   color: LUX.taupe, bg:'#f5e8d4' },
                        ].map(item => (
                          <div key={item.label} style={{ background: item.bg, borderRadius: LUX.radiusSm, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ fontFamily: LUX.fontSerif, fontSize: '22px', fontWeight: 600, color: item.color }}>{item.value}</div>
                            <div style={{ fontFamily: LUX.fontSans, fontSize: '9px', color: LUX.ink3, fontWeight: 600, marginTop: '2px', lineHeight: 1.2 }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                        {[
                          { label:'OFF Ko Lương', value: ld.soOffPhepVuot + ld.soOffOV, isDanger: (ld.soOffPhepVuot + ld.soOffOV) > 0 },
                          { label:'OFF T7/CN',    value: ld.soOffT7CN, isDanger: ld.soOffT7CN > 0 },
                          { label:'Vi phạm T7X',  value: ld.soPhamT7X, isDanger: ld.soPhamT7X > 0 },
                        ].map(item => (
                          <div key={item.label} style={{ background: item.isDanger ? '#f5e0da' : LUX.surface, borderRadius: LUX.radiusSm, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ fontFamily: LUX.fontSerif, fontSize: '22px', fontWeight: 600, color: item.isDanger ? LUX.danger : LUX.ink3 }}>{item.value}</div>
                            <div style={{ fontFamily: LUX.fontSans, fontSize: '9px', color: LUX.ink3, fontWeight: 600, marginTop: '2px', lineHeight: 1.2 }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </BLSection>

                    {/* Chi tiết lương Kỳ 1 */}
                    <BLSection title="Chi Tiết Lương Cứng">
                      <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginBottom: '10px', background: LUX.bg, borderRadius: '10px', padding: '8px 12px' }}>
                        {formatCurrency(selected.luong_cung)} ÷ {ld.soNgayThang} ngày × {ld.ngayCong} ngày công
                      </div>
                      <MoneyInput label="Lương cơ bản (tự động)" value={ld.luongCoBan} onChange={()=>{}} readOnly color={LUX.taupe} />
                      <MoneyInput label={`Tăng ca (${ld.tongTangCa}h × ${DON_GIA_TANG_CA.toLocaleString('vi-VN')}đ)`} value={ld.tienTangCa} onChange={()=>{}} readOnly color="#6a4a8a" />
                      {ld.tienPhat > 0 && <MoneyInput label={`Phạt T7/CN (${ld.soPhamT7X} lần)`} value={-ld.tienPhat} onChange={()=>{}} readOnly color={LUX.danger} />}
                      {ld.truKyQuy > 0 && <MoneyInput label="Trừ ký quỹ tháng này" value={-ld.truKyQuy} onChange={()=>{}} readOnly color={LUX.danger} />}
                    </BLSection>

                    {/* Điều chỉnh Kỳ 1 */}
                    <BLSection title="Điều Chỉnh">
                      {isChot ? (
                        <div style={{ textAlign: 'center', padding: '12px', fontFamily: LUX.fontSans, color: LUX.ink3, fontSize: '13px', background: LUX.bg, borderRadius: LUX.radiusSm }}>
                          Kỳ 1 đã chốt — không thể chỉnh sửa
                        </div>
                      ) : (
                        <MoneyInput label="Trừ ứng lương tháng trước" value={editState.truUngLuong} onChange={v => setEditState(s => ({ ...s, truUngLuong: v }))} color={LUX.danger} />
                      )}
                    </BLSection>
                  </>
                ) : (
                  <>
                    {/* KỲ 2 — Lương Kinh Doanh: phân biệt KTV vs Lễ Tân */}
                    {isLeTan ? (
                      <>
                        <BLSection title="Lương Kinh Doanh — Lễ Tân">
                          <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginBottom: '12px', background: LUX.bg, borderRadius: '10px', padding: '8px 12px', lineHeight: 1.6 }}>
                            Lương KD từ công thức (Tính ở trên) + Hoa hồng từ Excel POS + Thưởng
                          </div>
                          {isChot ? (
                            <div style={{ textAlign: 'center', padding: '12px', fontFamily: LUX.fontSans, color: LUX.ink3, fontSize: '13px', background: LUX.bg, borderRadius: LUX.radiusSm }}>
                              Kỳ 2 đã chốt — không thể chỉnh sửa
                            </div>
                          ) : (
                            <>
                              <MoneyInput label="Lương Kinh Doanh (công thức)" value={editState.tienTour} onChange={v => setEditState(s => ({ ...s, tienTour: v }))} color="#6a4a8a" />
                              <MoneyInput label="Hoa Hồng (từ Excel POS)" value={editState.hoaHongDV} onChange={v => setEditState(s => ({ ...s, hoaHongDV: v }))} color="#1A5276" />
                              <MoneyInput label="Thưởng Đạt Doanh Số" value={editState.thuongDS || 0} onChange={v => setEditState(s => ({ ...s, thuongDS: v }))} color="#166534" />
                            </>
                          )}
                        </BLSection>

                        <BLSection title="Tổng Hợp Lương Kinh Doanh">
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                            {[
                              { label:'Lương KD', value: formatCurrency(editState.tienTour), color:'#6a4a8a', bg:'#ede9f8' },
                              { label:'Hoa Hồng', value: formatCurrency(editState.hoaHongDV), color:'#1A5276', bg:'#e8f0fe' },
                              { label:'Thưởng DS', value: formatCurrency(editState.thuongDS || 0), color:'#166534', bg:'#dcfce7' },
                            ].map(item => (
                              <div key={item.label} style={{ background: item.bg, borderRadius: LUX.radiusSm, padding: '10px 8px', textAlign: 'center' }}>
                                <div style={{ fontFamily: LUX.fontSerif, fontSize: '22px', fontWeight: 600, color: item.color }}>{item.value}</div>
                                <div style={{ fontFamily: LUX.fontSans, fontSize: '9px', color: LUX.ink3, fontWeight: 600, marginTop: '2px', lineHeight: 1.2 }}>{item.label}</div>
                              </div>
                            ))}
                          </div>
                        </BLSection>
                      </>
                    ) : (
                      <>
                        <BLSection title="Dữ Liệu Kinh Doanh — KTV">
                          <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginBottom: '12px', background: LUX.bg, borderRadius: '10px', padding: '8px 12px', lineHeight: 1.6 }}>
                            Dữ liệu từ myspa.vn, import qua Excel hoặc nhập tay
                          </div>
                          {isChot ? (
                            <div style={{ textAlign: 'center', padding: '12px', fontFamily: LUX.fontSans, color: LUX.ink3, fontSize: '13px', background: LUX.bg, borderRadius: LUX.radiusSm }}>
                              Kỳ 2 đã chốt — không thể chỉnh sửa
                            </div>
                          ) : (
                            <>
                              <MoneyInput label="Hoa hồng (từ Excel POS)" value={editState.hoaHongDV} onChange={v => setEditState(s => ({ ...s, hoaHongDV: v }))} color="#1A5276" />
                              <MoneyInput label="Tiền tour" value={editState.tienTour} onChange={v => setEditState(s => ({ ...s, tienTour: v }))} color="#1A5276" />
                              <MoneyInput label="Thưởng Đạt Doanh Số" value={editState.thuongDS || 0} onChange={v => setEditState(s => ({ ...s, thuongDS: v }))} color="#166534" />
                            </>
                          )}
                        </BLSection>

                        <BLSection title="Thông Tin Chấm Công Tham Khảo">
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                            {[
                              { label:'Ngày công', value: ld.ngayCong, color:'#5a6a4a', bg:'#eef2e7' },
                              { label:'Đi làm',    value: ld.soNgayDiLam, color:LUX.taupe, bg:'#f5e8d4' },
                              { label:'Tăng ca',  value: ld.tongTangCa + 'h', color:'#6a4a8a', bg:'#ede9f8' },
                            ].map(item => (
                              <div key={item.label} style={{ background: item.bg, borderRadius: LUX.radiusSm, padding: '10px 8px', textAlign: 'center' }}>
                                <div style={{ fontFamily: LUX.fontSerif, fontSize: '22px', fontWeight: 600, color: item.color }}>{item.value}</div>
                                <div style={{ fontFamily: LUX.fontSans, fontSize: '9px', color: LUX.ink3, fontWeight: 600, marginTop: '2px', lineHeight: 1.2 }}>{item.label}</div>
                              </div>
                            ))}
                          </div>
                        </BLSection>
                      </>
                    )}
                  </>
                )}

                {/* Tổng */}
                <div style={{ background: ky === 1 ? LUX.heroGrad : 'linear-gradient(135deg,#1A5276,#154360)', borderRadius: LUX.radius, padding: '20px 24px', marginBottom: '16px' }}>
                  <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    {ky === 1 ? 'Tổng Lương Cứng' : 'Tổng Lương Kinh Doanh'}
                  </div>
                  <div style={{ fontFamily: LUX.fontSerif, fontSize: '32px', fontWeight: 600, color: LUX.champagne }}>
                    {ky === 1
                      ? formatCurrency(ld.luongCoBan + ld.tienTangCa - ld.tienPhat - ld.truKyQuy - editState.truUngLuong)
                      : formatCurrency(editState.hoaHongDV + editState.tienTour + (editState.thuongDS || 0))
                    }
                  </div>
                  <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', lineHeight: 1.6 }}>
                    {ky === 1 ? (
                      <>
                        {formatCurrency(ld.luongCoBan)} cơ bản
                        {ld.tienTangCa > 0 && ` + ${formatCurrency(ld.tienTangCa)} TC`}
                        {ld.tienPhat > 0 && ` − ${formatCurrency(ld.tienPhat)} phạt`}
                        {ld.truKyQuy > 0 && ` − ${formatCurrency(ld.truKyQuy)} KQ`}
                        {editState.truUngLuong > 0 && ` − ${formatCurrency(editState.truUngLuong)} ứng`}
                      </>
                    ) : (
                      <>
                        {isLeTan
                          ? `${formatCurrency(editState.tienTour)} LgKD + ${formatCurrency(editState.hoaHongDV)} HH${(editState.thuongDS || 0) > 0 ? ` + ${formatCurrency(editState.thuongDS)} Thưởng` : ''}`
                          : `${formatCurrency(editState.hoaHongDV)} HH${editState.tienTour > 0 ? ` + ${formatCurrency(editState.tienTour)} Tour` : ''}${(editState.thuongDS || 0) > 0 ? ` + ${formatCurrency(editState.thuongDS)} Thưởng` : ''}`
                        }
                        {!editState.hoaHongDV && !editState.tienTour && !(editState.thuongDS || 0) && 'Chưa có dữ liệu'}
                      </>
                    )}
                  </div>
                </div>

                {/* Nút hành động */}
                {isChot ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setConfirm({ title: `Mở Chốt Kỳ ${ky}`, message: `Mở chốt cho ${selected.ho_ten}? Có thể chỉnh sửa lại sau khi mở.`, confirmLabel: 'Mở Chốt', danger: true, onConfirm: () => { setConfirm(null); handleUnlock() } })} disabled={saving}
                      style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, border: `1px solid ${LUX.danger}`, background: '#fff5f5', color: LUX.danger, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                      {saving ? '...' : '🔓 Mở Chốt'}
                    </button>
                    <button onClick={() => setSelected(null)}
                      style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, background: LUX.surface2, fontFamily: LUX.fontSans, color: LUX.ink3, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                      Đóng
                    </button>
                  </div>
                ) : canChot(thang, nam, ky) ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleLuu(false)} disabled={saving}
                      style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, background: LUX.surface2, fontFamily: LUX.fontSans, color: LUX.ink2, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                      {saving ? '...' : 'Lưu'}
                    </button>
                    <button onClick={() => handleLuu(true)} disabled={saving}
                      style={{ flex: 2, padding: '14px', borderRadius: LUX.radius, border: 'none', background: ky === 1 ? LUX.goldGrad : 'linear-gradient(135deg,#1E7E34,#166534)', color: 'white', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: `0 4px 16px ${ky === 1 ? LUX.gold : '#166534'}50` }}>
                      {saving ? 'Đang lưu...' : `Lưu & Chốt Kỳ ${ky}`}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handleLuu(false)} disabled={saving}
                    style={{ width: '100%', padding: '14px', borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, background: LUX.surface2, fontFamily: LUX.fontSans, color: LUX.ink2, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                    {saving ? '...' : 'Lưu'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function BLSection({ title, children }) {
  return (
    <div style={{ background: LUX.surface2, borderRadius: LUX.radiusSm, padding: '16px', marginBottom: '12px', border: `1px solid ${LUX.line}` }}>
      <div style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '10px', color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{title}</div>
      {children}
    </div>
  )
}
