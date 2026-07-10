import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import Modal from '../../../../components/ui/Modal'
import { LUX } from '../../../../constants/lux'
import { getNowVN } from '../../../../lib/utils'
import { tinhLuong, getDaysInMonth } from '../../../../lib/luong'

// ── helpers ──
const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const fmtTime = (ts) => { if (!ts) return ''; return new Date(ts).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) }
const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const getDayVi = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return DAY_VI[new Date(y, m-1, d).getDay()] }

const LOAI_CFG = {
  off_phep: { bg: '#eef2e7', color: '#5a6a4a', label: 'OFF Phép' },
  off_ov:   { bg: '#f5e0da', color: '#C0392B', label: 'OFF Ko Lương' },
  off_t7:   { bg: '#ede9f8', color: '#6a4a8a', label: 'OFF T7/CN (×2)' },
  off_t7x:  { bg: '#f5e0da', color: '#C0392B', label: 'Vi Phạm T7/CN' },
}
const TRANG_THAI_CFG = {
  cho_duyet:  { bg: '#FFF9F0', color: '#B8860B', label: 'Chờ Duyệt' },
  duoc_duyet: { bg: '#eef2e7', color: '#2D7A4F', label: 'Đã Duyệt' },
  tu_choi:    { bg: '#f5e0da', color: '#C0392B', label: 'Từ Chối' },
}

// ── Badge ──
const Badge = ({ bg, color, label }) => (
  <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: LUX.fontSans, whiteSpace: 'nowrap' }}>
    {label}
  </span>
)

// ── Th / Td ──
const TH = ({ children, w, align = 'left' }) => (
  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: LUX.fontSans, textAlign: align, width: w, whiteSpace: 'nowrap', background: '#F7F4F0', borderBottom: `2px solid ${LUX.line}` }}>
    {children}
  </th>
)
const TD = ({ children, align = 'left', muted, label, act }) => (
  <td data-label={label} className={act ? 'act' : undefined} style={{ padding: '11px 14px', fontSize: 13, fontFamily: LUX.fontSans, textAlign: align, color: muted ? LUX.ink3 : LUX.ink2, verticalAlign: 'middle' }}>
    {children}
  </td>
)

export default function TabXetDuyet({ onUpdate }) {
  const now = getNowVN()
  const [danhSachCho, setDanhSachCho] = useState([])
  const [dungLeList,  setDungLeList]  = useState([])
  const [suaXoaList,  setSuaXoaList]  = useState([])
  const [suaDonList,  setSuaDonList]  = useState([])   // yêu cầu sửa ĐƠN HÀNG (Lễ tân đề xuất)
  const [tangCaList,  setTangCaList]  = useState([])   // yêu cầu duyệt TĂNG CA (NV check-out muộn)
  const [nvMap,       setNvMap]       = useState({})
  const [loading,     setLoading]     = useState(true)

  // Quản lý OFF theo tháng
  const [thangXem,    setThangXem]    = useState(now.getMonth() + 1)
  const [namXem,      setNamXem]      = useState(now.getFullYear())
  const [offTheoThang, setOffTheoThang] = useState([])
  const [loadingOff,  setLoadingOff]  = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // off object

  // Reject modal
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectLyDo,  setRejectLyDo]  = useState('')

  const openRejectModal = (type, id, defaultReason) => { setRejectModal({ type, id, defaultReason }); setRejectLyDo(defaultReason) }
  const closeRejectModal = () => { setRejectModal(null); setRejectLyDo('') }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchOffTheoThang() }, [thangXem, namXem, nvMap])

  // ── Fetch pending items ──
  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: nvData } = await supabase.from('nhan_vien').select('id, ho_ten, vi_tri')
      const map = {}
      nvData?.forEach(nv => {
        const parts = nv.ho_ten.trim().split(' ')
        map[nv.id] = {
          ten: parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : nv.ho_ten,
          ho_ten: nv.ho_ten,
          vi_tri: nv.vi_tri === 'le_tan' ? 'Lễ Tân' : nv.vi_tri === 'tap_vu' ? 'Tạp Vụ' : 'KTV',
        }
      })
      setNvMap(map)

      const [offRes, leRes, sxRes, donRes, tcRes] = await Promise.all([
        supabase.from('dang_ky_off').select('*').eq('trang_thai', 'cho_duyet').order('ngay_off'),
        supabase.from('yeu_cau_chinh_sua').select('*').eq('loai_yeu_cau', 'dung_ngay_le').eq('trang_thai', 'cho_duyet').order('created_at', { ascending: false }),
        supabase.from('yeu_cau_chinh_sua').select('*').in('loai_yeu_cau', ['sua', 'xoa']).eq('trang_thai', 'cho_duyet').neq('loai_bang', 'don_hang').order('created_at', { ascending: false }),
        supabase.from('yeu_cau_chinh_sua').select('*').eq('loai_yeu_cau', 'sua').eq('loai_bang', 'don_hang').eq('trang_thai', 'cho_duyet').order('created_at', { ascending: false }),
        supabase.from('yeu_cau_chinh_sua').select('*').eq('loai_yeu_cau', 'duyet_tang_ca').eq('trang_thai', 'cho_duyet').order('created_at', { ascending: false }),
      ])
      setDanhSachCho(offRes.data || [])
      setDungLeList(leRes.data || [])
      setSuaXoaList(sxRes.data || [])
      setSuaDonList(donRes.data || [])
      setTangCaList(tcRes.data || [])
    } catch (e) { console.error('TabXetDuyet:', e) }
    finally { setLoading(false) }
  }

  // ── Fetch OFF theo tháng ──
  const fetchOffTheoThang = async () => {
    if (Object.keys(nvMap).length === 0) return
    setLoadingOff(true)
    const startDate = `${namXem}-${String(thangXem).padStart(2,'0')}-01`
    const endDate   = `${namXem}-${String(thangXem).padStart(2,'0')}-31`
    const { data } = await supabase
      .from('dang_ky_off').select('*')
      .gte('ngay_off', startDate).lte('ngay_off', endDate)
      .order('ngay_off')
    setOffTheoThang(data || [])
    setLoadingOff(false)
  }

  // ── Actions OFF chờ duyệt ──
  const handleDuyet = async (id, trangThaiMoi) => {
    if (trangThaiMoi === 'tu_choi') {
      openRejectModal('off', id, 'Không thể duyệt do thiếu người')
    } else {
      await supabase.from('dang_ky_off').update({ trang_thai: 'duoc_duyet', ghi_chu_duyet: 'OK' }).eq('id', id)
      fetchData(); fetchOffTheoThang(); onUpdate?.()
    }
  }

  const executeRejectOff = async (id, lyDo) => {
    await supabase.from('dang_ky_off').update({ trang_thai: 'tu_choi', ghi_chu_duyet: lyDo }).eq('id', id)
    fetchData(); fetchOffTheoThang(); onUpdate?.()
  }

  // ── Xóa OFF (Admin) ──
  const handleDeleteOff = async (off) => {
    const { error } = await supabase.from('dang_ky_off').delete().eq('id', off.id)
    if (!error) { fetchData(); fetchOffTheoThang(); onUpdate?.(); setDeleteConfirm(null) }
    else console.error('Xóa OFF lỗi:', error)
  }

  // ── Actions Dùng Ngày Lễ ──
  const executeRejectLe = async (yeuCauId, lyDo) => {
    await supabase.from('yeu_cau_chinh_sua').update({ trang_thai: 'tu_choi', nguoi_duyet: 'Admin', ghi_chu_duyet: lyDo }).eq('id', yeuCauId)
    fetchData(); onUpdate?.()
  }

  const handleDuyetDungLe = async (yeuCauId, duyet) => {
    if (!duyet) { openRejectModal('le', yeuCauId, 'Chưa đủ điều kiện'); return }
    const yc = dungLeList.find(d => d.id === yeuCauId)
    if (!yc) return
    const { so_dung_thang_nay, thang, nam } = yc.du_lieu_moi || {}
    const nvId = yc.du_lieu_cu?.nhan_vien_id
    if (!nvId || !so_dung_thang_nay) return
    const thangEff = thang || (now.getMonth() + 1)
    const namEff = nam || now.getFullYear()

    // Xác định NGÀY OFF vượt (không lương) cụ thể để gắn cac_ngay_bu → lịch hiện
    // icon 🎁 + lương tính theo ngày (nhất quán với TabQuyNgayLe & AdminSuaChamCong).
    const startDate = `${namEff}-${String(thangEff).padStart(2, '0')}-01`
    const endDate = `${namEff}-${String(thangEff).padStart(2, '0')}-${String(getDaysInMonth(namEff, thangEff)).padStart(2, '0')}`
    const [nvRes, ccRes, offRes, quyRes] = await Promise.all([
      supabase.from('nhan_vien').select('id, ho_ten, vi_tri, luong_cung, gioi_han_off_thang, ngay_bat_dau, ky_quy_trang_thai').eq('id', nvId).maybeSingle(),
      supabase.from('cham_cong').select('ngay, loai, gio_vao, gio_ra, he_so, tang_ca_gio').eq('nhan_vien_id', nvId).gte('ngay', startDate).lte('ngay', endDate),
      supabase.from('dang_ky_off').select('ngay_off, loai_off, trang_thai').eq('nhan_vien_id', nvId).eq('trang_thai', 'duoc_duyet').gte('ngay_off', startDate).lte('ngay_off', endDate),
      supabase.from('quy_ngay_off').select('id, so_ngay_da_dung, so_dung_thang_nay, lich_su_dung').eq('nhan_vien_id', nvId).eq('nam', namEff).maybeSingle(),
    ])
    const quyData = quyRes.data
    const lsCu = Array.isArray(quyData?.lich_su_dung) ? quyData.lich_su_dung : []

    const nowRef = getNowVN()
    const isCurrent = thangEff === nowRef.getMonth() + 1 && namEff === nowRef.getFullYear()
    const todayRef = isCurrent ? nowRef.getDate() : null
    const calc = tinhLuong(nvRes.data || {}, ccRes.data || [], offRes.data || [], null, namEff, thangEff,
      { lich_su_dung: lsCu }, todayRef)

    // Chọn ngày OFF vượt chưa bù, cộng dồn trọng số cho đủ số quỹ được duyệt
    // (T7/CN tốn 2 quỹ). Bỏ qua ngày mà trọng số > quỹ còn lại để không âm quỹ.
    const cacNgayBu = []
    let conLai = so_dung_thang_nay
    for (const item of (calc.ngayVuotChuaBu || [])) {
      if (conLai <= 0) break
      if (item.trong_so <= conLai) { cacNgayBu.push(item.ngay); conLai -= item.trong_so }
    }

    if (quyData) {
      const entry = {
        nam: namEff, thang: thangEff, so_ngay: so_dung_thang_nay, cac_ngay_bu: cacNgayBu,
        ghi_chu: `Bù off vượt T${thangEff}/${namEff} (duyệt yêu cầu NV)`, ts: new Date().toISOString(),
      }
      await supabase.from('quy_ngay_off').update({
        lich_su_dung: [...lsCu, entry],
        so_dung_thang_nay: (quyData.so_dung_thang_nay || 0) + so_dung_thang_nay,
        so_ngay_da_dung: (quyData.so_ngay_da_dung || 0) + so_dung_thang_nay,
      }).eq('id', quyData.id)
    }
    await supabase.from('yeu_cau_chinh_sua').update({ trang_thai: 'da_duyet', nguoi_duyet: 'Admin' }).eq('id', yeuCauId)
    fetchData(); onUpdate?.()
  }

  // ── Actions Duyệt Tăng Ca ──
  // NV check-out muộn → RPC ghi tang_ca_gio=0 tạm + tạo YC. Admin duyệt → ghi số
  // giờ thật vào cham_cong (lịch hiện + lương cộng tiền). Từ chối → giữ 0.
  const handleDuyetTangCa = async (yc, duyet) => {
    const gio = Number(yc.du_lieu_moi?.tang_ca_gio) || 0
    if (duyet) {
      if (yc.ban_ghi_id) await supabase.from('cham_cong').update({ tang_ca_gio: gio, trang_thai_tang_ca: 'duyet' }).eq('id', yc.ban_ghi_id)
      await supabase.from('yeu_cau_chinh_sua').update({ trang_thai: 'da_duyet', nguoi_duyet: 'Admin' }).eq('id', yc.id)
    } else {
      if (yc.ban_ghi_id) await supabase.from('cham_cong').update({ tang_ca_gio: 0, trang_thai_tang_ca: 'khong_co' }).eq('id', yc.ban_ghi_id)
      await supabase.from('yeu_cau_chinh_sua').update({ trang_thai: 'tu_choi', nguoi_duyet: 'Admin' }).eq('id', yc.id)
    }
    fetchData(); onUpdate?.()
  }

  const handleDuyetTatCaTangCa = async () => {
    for (const yc of tangCaList) {
      const gio = Number(yc.du_lieu_moi?.tang_ca_gio) || 0
      if (yc.ban_ghi_id) await supabase.from('cham_cong').update({ tang_ca_gio: gio, trang_thai_tang_ca: 'duyet' }).eq('id', yc.ban_ghi_id)
      await supabase.from('yeu_cau_chinh_sua').update({ trang_thai: 'da_duyet', nguoi_duyet: 'Admin' }).eq('id', yc.id)
    }
    fetchData(); onUpdate?.()
  }

  // ── Actions Sửa/Xóa ──
  const handleDuyetSuaXoa = async (ycId, duyet) => {
    if (!duyet) { openRejectModal('sx', ycId, 'Không đủ thông tin hoặc sai số liệu'); return }
    const yc = suaXoaList.find(d => d.id === ycId)
    if (!yc || !yc.ban_ghi_id) return
    try {
      let result
      if (yc.loai_yeu_cau === 'sua') {
        if (!yc.du_lieu_moi || Object.keys(yc.du_lieu_moi).length === 0) return
        result = await supabase.from(yc.loai_bang).update(yc.du_lieu_moi).eq('id', yc.ban_ghi_id)
      } else if (yc.loai_yeu_cau === 'xoa') {
        result = await supabase.from(yc.loai_bang).delete().eq('id', yc.ban_ghi_id)
      } else return
      if (result.error) { console.error('Lỗi:', result.error); return }
      await supabase.from('yeu_cau_chinh_sua').update({ trang_thai: 'da_duyet', nguoi_duyet: 'Admin' }).eq('id', ycId)
    } catch (e) { console.error('Duyet sua/xoa:', e); return }
    fetchData(); onUpdate?.()
  }

  const executeRejectSuaXoa = async (ycId, lyDo) => {
    await supabase.from('yeu_cau_chinh_sua').update({ trang_thai: 'tu_choi', nguoi_duyet: 'Admin', ghi_chu_duyet: lyDo }).eq('id', ycId)
    fetchData(); onUpdate?.()
  }

  // ── Tháng picker helpers ──
  const prevMonth = () => { if (thangXem === 1) { setThangXem(12); setNamXem(n => n - 1) } else setThangXem(t => t - 1) }
  const nextMonth = () => { if (thangXem === 12) { setThangXem(1); setNamXem(n => n + 1) } else setThangXem(t => t + 1) }

  // Thống kê OFF theo tháng
  const offStats = offTheoThang.reduce((acc, o) => {
    const tt = o.trang_thai; acc[tt] = (acc[tt] || 0) + 1; return acc
  }, {})

  const pendingTotal = danhSachCho.length + dungLeList.length + suaXoaList.length + suaDonList.length + tangCaList.length

  // ─────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ══════════════════════════════════
          SECTION 1 — Đơn Chờ Duyệt (tổng hợp)
      ══════════════════════════════════ */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: LUX.espresso }}>Đơn Chờ Xét Duyệt</div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink3, marginTop: 2 }}>OFF chờ duyệt + yêu cầu chỉnh sửa từ Lễ Tân</div>
          </div>
          {pendingTotal > 0 && (
            <span style={{ background: '#f5e0da', color: '#C0392B', padding: '4px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13, fontFamily: LUX.fontSans }}>
              {pendingTotal} đang chờ
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
        ) : pendingTotal === 0 ? (
          <div style={{ background: LUX.surface, border: `1px dashed ${LUX.line2}`, borderRadius: LUX.radiusLg, padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, color: LUX.espresso }}>Không có đơn nào chờ duyệt</div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink3, marginTop: 4 }}>Spa đang vận hành trơn tru</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── 1a. OFF Chờ Duyệt ── */}
            {danhSachCho.length > 0 && (
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  📋 Đơn Xin OFF ({danhSachCho.length})
                </div>
                <div style={{ border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden', background: LUX.surface }}>
                  <table className="duyet-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <TH>Nhân Viên</TH>
                        <TH w={60}>Vị Trí</TH>
                        <TH w={90}>Ngày OFF</TH>
                        <TH w={120}>Loại</TH>
                        <TH>Lý Do</TH>
                        <TH w={120} align="center">Nộp lúc</TH>
                        <TH w={160} align="center">Hành Động</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {danhSachCho.map((don, i) => {
                        const nv = nvMap[don.nhan_vien_id] || { ten: 'Không rõ', vi_tri: '' }
                        const lcfg = LOAI_CFG[don.loai_off] || { bg: LUX.surface, color: LUX.ink2, label: don.loai_off }
                        const dayLabel = getDayVi(don.ngay_off)
                        const isWeekend = dayLabel === 'T7' || dayLabel === 'CN'
                        return (
                          <tr key={don.id} style={{ borderTop: i > 0 ? `1px solid ${LUX.line}` : 'none', background: i % 2 === 0 ? 'white' : LUX.bg }}>
                            <TD>
                              <div style={{ fontWeight: 600, color: LUX.espresso }}>{nv.ten}</div>
                            </TD>
                            <TD label="Vị trí" muted>{nv.vi_tri}</TD>
                            <TD>
                              <span style={{ fontFamily: LUX.fontMono, fontWeight: 600, color: isWeekend ? '#C0392B' : LUX.ink }}>
                                {dayLabel} {fmtDate(don.ngay_off)}
                              </span>
                              {isWeekend && <span style={{ fontSize: 9, marginLeft: 4, color: '#C0392B', fontWeight: 700 }}>T7/CN</span>}
                            </TD>
                            <TD><Badge {...lcfg} /></TD>
                            <TD><span style={{ color: LUX.ink3, fontStyle: 'italic', fontSize: 12 }}>{don.ly_do}</span></TD>
                            <TD label="Nộp lúc" align="center" muted><span style={{ fontSize: 11 }}>{fmtTime(don.created_at)}</span></TD>
                            <TD act align="center">
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <button onClick={() => handleDuyet(don.id, 'tu_choi')}
                                  style={{ padding: '6px 14px', borderRadius: 8, background: '#fff', color: '#C0392B', border: '1px solid #C0392B40', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                                  Từ Chối
                                </button>
                                <button onClick={() => handleDuyet(don.id, 'duoc_duyet')}
                                  style={{ padding: '6px 14px', borderRadius: 8, background: LUX.goldGrad, color: 'white', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                                  Duyệt
                                </button>
                              </div>
                            </TD>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 1b. Dùng Ngày Lễ ── */}
            {dungLeList.length > 0 && (
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  🎌 Dùng Ngày Lễ Bù OV ({dungLeList.length})
                </div>
                <div style={{ border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden', background: LUX.surface }}>
                  <table className="duyet-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <TH>Nhân Viên</TH>
                        <TH w={70}>Số Ngày</TH>
                        <TH>Lý Do</TH>
                        <TH w={120} align="center">Nộp lúc</TH>
                        <TH w={160} align="center">Hành Động</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {dungLeList.map((yc, i) => {
                        const nvId = yc.du_lieu_cu?.nhan_vien_id
                        const nv = nvId && nvMap[nvId] ? nvMap[nvId] : { ten: yc.du_lieu_cu?.nhan_vien_ten || 'Không rõ', vi_tri: '' }
                        return (
                          <tr key={yc.id} style={{ borderTop: i > 0 ? `1px solid ${LUX.line}` : 'none', background: i % 2 === 0 ? 'white' : LUX.bg }}>
                            <TD><span style={{ fontWeight: 600, color: LUX.espresso }}>{nv.ten}</span></TD>
                            <TD><Badge bg="#fdf3e0" color={LUX.taupe} label={`${yc.du_lieu_moi?.so_dung_thang_nay || 0} ngày`} /></TD>
                            <TD><span style={{ color: LUX.ink3, fontStyle: 'italic', fontSize: 12 }}>{yc.ly_do}</span></TD>
                            <TD label="Nộp lúc" align="center" muted><span style={{ fontSize: 11 }}>{fmtTime(yc.created_at)}</span></TD>
                            <TD act align="center">
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <button onClick={() => handleDuyetDungLe(yc.id, false)}
                                  style={{ padding: '6px 14px', borderRadius: 8, background: '#fff', color: '#C0392B', border: '1px solid #C0392B40', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                                  Từ Chối
                                </button>
                                <button onClick={() => handleDuyetDungLe(yc.id, true)}
                                  style={{ padding: '6px 14px', borderRadius: 8, background: LUX.goldGrad, color: 'white', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                                  Duyệt
                                </button>
                              </div>
                            </TD>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 1b2. Duyệt Tăng Ca ── */}
            {tangCaList.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ⏰ Duyệt Tăng Ca ({tangCaList.length})
                  </div>
                  <button onClick={handleDuyetTatCaTangCa}
                    style={{ padding: '6px 14px', borderRadius: 8, background: LUX.goldGrad, color: 'white', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                    ✓ Duyệt Tất Cả
                  </button>
                </div>
                <div style={{ border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden', background: LUX.surface }}>
                  <table className="duyet-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <TH>Nhân Viên</TH>
                        <TH w={80} align="center">Số Giờ</TH>
                        <TH w={100} align="right">Thành Tiền</TH>
                        <TH>Chi Tiết</TH>
                        <TH w={120} align="center">Nộp lúc</TH>
                        <TH w={160} align="center">Hành Động</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {tangCaList.map((yc, i) => {
                        const gio = Number(yc.du_lieu_moi?.tang_ca_gio) || 0
                        const tien = Math.round(gio * 25000)
                        return (
                          <tr key={yc.id} style={{ borderTop: i > 0 ? `1px solid ${LUX.line}` : 'none', background: i % 2 === 0 ? 'white' : LUX.bg }}>
                            <TD><span style={{ fontWeight: 600, color: LUX.espresso }}>{yc.nguoi_yeu_cau || '—'}</span></TD>
                            <TD align="center"><Badge bg="#ede9f8" color="#6a4a8a" label={`${gio.toFixed(2)}h`} /></TD>
                            <TD align="right"><span style={{ fontFamily: LUX.fontMono, color: '#2D7A4F', fontWeight: 600 }}>{tien.toLocaleString('vi-VN')}₫</span></TD>
                            <TD><span style={{ color: LUX.ink3, fontStyle: 'italic', fontSize: 12 }}>{yc.ly_do}</span></TD>
                            <TD label="Nộp lúc" align="center" muted><span style={{ fontSize: 11 }}>{fmtTime(yc.created_at)}</span></TD>
                            <TD act align="center">
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <button onClick={() => handleDuyetTangCa(yc, false)}
                                  style={{ padding: '6px 14px', borderRadius: 8, background: '#fff', color: '#C0392B', border: '1px solid #C0392B40', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                                  Từ Chối
                                </button>
                                <button onClick={() => handleDuyetTangCa(yc, true)}
                                  style={{ padding: '6px 14px', borderRadius: 8, background: LUX.goldGrad, color: 'white', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                                  Duyệt
                                </button>
                              </div>
                            </TD>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 1c. Sửa / Xóa Giao Dịch ── */}
            {suaXoaList.length > 0 && (
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  ✏️ Yêu Cầu Sửa / Xóa / Gia Hạn Thẻ ({suaXoaList.length})
                </div>
                <div style={{ border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden', background: LUX.surface }}>
                  <table className="duyet-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <TH>Loại YC</TH>
                        <TH>Bảng</TH>
                        <TH align="right" w={120}>Giá Trị Cũ</TH>
                        <TH align="right" w={120}>Giá Trị Mới</TH>
                        <TH>Lý Do</TH>
                        <TH w={110} align="center">Người YC</TH>
                        <TH w={160} align="center">Hành Động</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {suaXoaList.map((yc, i) => {
                        const isSua = yc.loai_yeu_cau === 'sua'
                        const isOff = yc.loai_bang === 'dang_ky_off'
                        const isThe = yc.loai_bang === 'the_lieu_trinh'
                        const isNgay = isOff || isThe
                        const fmtNgay = (d) => d ? String(d).split('-').reverse().join('/') : '—'
                        const bangLabel = yc.loai_bang === 'doanh_thu' ? 'Doanh Thu' : yc.loai_bang === 'chi_phi' ? 'Chi Phí' : isOff ? '🔄 Đổi Ngày OFF' : isThe ? '🎟 Gia Hạn Thẻ' : 'Chuyển Khoản'
                        return (
                          <tr key={yc.id} style={{ borderTop: i > 0 ? `1px solid ${LUX.line}` : 'none', background: i % 2 === 0 ? 'white' : LUX.bg }}>
                            <TD>
                              <Badge bg={isSua ? '#fdf3e0' : '#FEF2F2'} color={isSua ? LUX.taupe : '#C0392B'} label={isSua ? '✏️ Sửa' : '🗑️ Xóa'} />
                            </TD>
                            <TD muted>{bangLabel}</TD>
                            <TD align="right">
                              <span style={{ fontFamily: LUX.fontMono, color: '#C0392B' }}>
                                {isNgay ? fmtNgay(yc.du_lieu_cu?.ngay_off || yc.du_lieu_cu?.ngay_het_han) : (yc.du_lieu_cu?.so_tien ? Number(yc.du_lieu_cu.so_tien).toLocaleString('vi-VN') + '₫' : '—')}
                              </span>
                            </TD>
                            <TD align="right">
                              {isSua
                                ? <span style={{ fontFamily: LUX.fontMono, color: '#2D7A4F' }}>{isNgay ? fmtNgay(yc.du_lieu_moi?.ngay_off || yc.du_lieu_moi?.ngay_het_han) : (yc.du_lieu_moi?.so_tien ? Number(yc.du_lieu_moi.so_tien).toLocaleString('vi-VN') + '₫' : '—')}</span>
                                : <span style={{ color: LUX.ink3, fontSize: 12 }}>Xóa bản ghi</span>
                              }
                            </TD>
                            <TD><span style={{ color: LUX.ink3, fontStyle: 'italic', fontSize: 12 }}>{yc.ly_do}</span></TD>
                            <TD label="Người YC" align="center" muted><span style={{ fontSize: 12 }}>{yc.nguoi_yeu_cau || '—'}</span></TD>
                            <TD act align="center">
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <button onClick={() => handleDuyetSuaXoa(yc.id, false)}
                                  style={{ padding: '6px 14px', borderRadius: 8, background: '#fff', color: '#C0392B', border: '1px solid #C0392B40', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                                  Từ Chối
                                </button>
                                <button onClick={() => handleDuyetSuaXoa(yc.id, true)}
                                  style={{ padding: '6px 14px', borderRadius: 8, background: LUX.goldGrad, color: 'white', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                                  Duyệt
                                </button>
                              </div>
                            </TD>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 1d. Sửa Đơn Hàng (Lễ tân đề xuất) ── */}
            {suaDonList.length > 0 && (
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  🧾 Yêu Cầu Sửa Đơn Hàng ({suaDonList.length})
                </div>
                <div style={{ border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden', background: LUX.surface }}>
                  <table className="duyet-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <TH>Mã Đơn</TH>
                        <TH>Lý Do</TH>
                        <TH w={120} align="center">Người YC</TH>
                        <TH w={120} align="center">Nộp lúc</TH>
                        <TH w={160} align="center">Hành Động</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {suaDonList.map((yc, i) => (
                        <tr key={yc.id} style={{ borderTop: i > 0 ? `1px solid ${LUX.line}` : 'none', background: i % 2 === 0 ? 'white' : LUX.bg }}>
                          <TD><span style={{ fontWeight: 700, color: LUX.espresso, fontFamily: LUX.fontMono }}>{yc.du_lieu_cu?.ma_don || '—'}</span></TD>
                          <TD><span style={{ color: LUX.ink3, fontStyle: 'italic', fontSize: 12 }}>{yc.ly_do}</span></TD>
                          <TD label="Người YC" align="center" muted><span style={{ fontSize: 12 }}>{yc.nguoi_yeu_cau || '—'}</span></TD>
                          <TD label="Nộp lúc" align="center" muted><span style={{ fontSize: 11 }}>{fmtTime(yc.created_at)}</span></TD>
                          <TD act align="center">
                            <button onClick={() => { window.location.href = `/pos?resume=${yc.ban_ghi_id}&yc=${yc.id}` }}
                              style={{ padding: '6px 14px', borderRadius: 8, background: LUX.goldGrad, color: 'white', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                              Xem &amp; Duyệt →
                            </button>
                          </TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════
          SECTION 2 — Quản Lý OFF Theo Tháng
      ══════════════════════════════════ */}
      <section>
        {/* Header + điều hướng tháng */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: LUX.espresso }}>Quản Lý Ngày OFF</div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink3, marginTop: 2 }}>Admin có thể xóa đăng ký OFF bất kỳ (kể cả đã duyệt)</div>
          </div>
          {/* Tháng selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${LUX.line}`, background: LUX.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: LUX.ink2, fontFamily: LUX.fontSans }}>‹</button>
            <div style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 14, color: LUX.espresso, minWidth: 100, textAlign: 'center' }}>
              Tháng {thangXem}/{namXem}
            </div>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${LUX.line}`, background: LUX.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: LUX.ink2, fontFamily: LUX.fontSans }}>›</button>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Chờ Duyệt', count: offStats.cho_duyet || 0, bg: '#FFF9F0', color: '#B8860B' },
            { label: 'Đã Duyệt',  count: offStats.duoc_duyet || 0, bg: '#eef2e7', color: '#2D7A4F' },
            { label: 'Từ Chối',   count: offStats.tu_choi || 0,    bg: '#FEF2F2', color: '#C0392B' },
            { label: 'Tổng Cộng', count: offTheoThang.length,       bg: LUX.surface, color: LUX.ink2 },
          ].map(({ label, count, bg, color }) => (
            <div key={label} style={{ flex: 1, background: bg, borderRadius: LUX.radiusSm, padding: '10px 14px', border: `1px solid ${LUX.line}` }}>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: LUX.fontMono, fontSize: 20, fontWeight: 700, color }}>{count}</div>
            </div>
          ))}
        </div>

        {/* Table OFF tháng */}
        {loadingOff ? (
          <div style={{ textAlign: 'center', padding: 32, color: LUX.ink3, fontFamily: LUX.fontSans, fontSize: 13 }}>Đang tải...</div>
        ) : offTheoThang.length === 0 ? (
          <div style={{ background: LUX.surface, border: `1px dashed ${LUX.line2}`, borderRadius: LUX.radiusLg, padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink3 }}>Không có đăng ký OFF nào trong tháng {thangXem}/{namXem}</div>
          </div>
        ) : (
          <div style={{ border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden', background: LUX.surface }}>
            <table className="duyet-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH>Nhân Viên</TH>
                  <TH w={60}>Vị Trí</TH>
                  <TH w={110}>Ngày OFF</TH>
                  <TH w={130}>Loại</TH>
                  <TH w={110}>Trạng Thái</TH>
                  <TH>Lý Do</TH>
                  <TH w={80} align="center">Nguồn</TH>
                  <TH w={90} align="center">Hành Động</TH>
                </tr>
              </thead>
              <tbody>
                {offTheoThang.map((off, i) => {
                  const nv = nvMap[off.nhan_vien_id] || { ten: 'Không rõ', vi_tri: '' }
                  const lcfg = LOAI_CFG[off.loai_off] || { bg: LUX.surface, color: LUX.ink2, label: off.loai_off }
                  const ttcfg = TRANG_THAI_CFG[off.trang_thai] || { bg: LUX.surface, color: LUX.ink2, label: off.trang_thai }
                  const dayLabel = getDayVi(off.ngay_off)
                  const isWeekend = dayLabel === 'T7' || dayLabel === 'CN'
                  return (
                    <tr key={off.id} style={{ borderTop: i > 0 ? `1px solid ${LUX.line}` : 'none', background: i % 2 === 0 ? 'white' : LUX.bg }}>
                      <TD><span style={{ fontWeight: 600, color: LUX.espresso }}>{nv.ten}</span></TD>
                      <TD label="Vị trí" muted>{nv.vi_tri}</TD>
                      <TD>
                        <span style={{ fontFamily: LUX.fontMono, fontWeight: 600, fontSize: 13, color: isWeekend ? '#C0392B' : LUX.ink }}>
                          {dayLabel} {fmtDate(off.ngay_off)}
                        </span>
                      </TD>
                      <TD><Badge {...lcfg} /></TD>
                      <TD><Badge {...ttcfg} /></TD>
                      <TD><span style={{ color: LUX.ink3, fontStyle: 'italic', fontSize: 12 }}>{off.ly_do || '—'}</span></TD>
                      <TD align="center">
                        <span style={{ fontSize: 11, color: LUX.ink3, background: LUX.bg, padding: '2px 8px', borderRadius: 6, fontFamily: LUX.fontSans }}>
                          {off.nguon === 'admin' ? '👤 Admin' : '📱 NV'}
                        </span>
                      </TD>
                      <TD align="center">
                        <button
                          onClick={() => setDeleteConfirm(off)}
                          style={{ padding: '5px 12px', borderRadius: 8, background: '#FEF2F2', color: '#C0392B', border: '1px solid #C0392B30', fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: LUX.fontSans }}
                        >
                          🗑 Xóa
                        </button>
                      </TD>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <Modal open onClose={closeRejectModal} size="sm" icon="✕"
          title="Lý do từ chối" subtitle="Nhân viên sẽ thấy lý do này"
          footer={
            <>
              <button onClick={closeRejectModal}
                style={{ padding: '10px 18px', borderRadius: LUX.radius, background: LUX.bg, border: `1px solid ${LUX.line}`, color: LUX.ink2, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Hủy
              </button>
              <button onClick={() => {
                const lyDo = rejectLyDo.trim() || rejectModal.defaultReason
                if (rejectModal.type === 'off') executeRejectOff(rejectModal.id, lyDo)
                else if (rejectModal.type === 'sx') executeRejectSuaXoa(rejectModal.id, lyDo)
                else executeRejectLe(rejectModal.id, lyDo)
                closeRejectModal()
              }}
                style={{ padding: '10px 18px', borderRadius: LUX.radius, background: '#C0392B', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Xác Nhận Từ Chối
              </button>
            </>
          }>
          <textarea
            value={rejectLyDo} onChange={e => setRejectLyDo(e.target.value)} rows={3} autoFocus
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${LUX.line}`, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }}
          />
        </Modal>
      )}

      {/* ── Xóa OFF Confirm Modal ── */}
      {deleteConfirm && (
        <Modal open onClose={() => setDeleteConfirm(null)} size="sm" icon="🗑️"
          title="Xóa Đăng Ký OFF"
          footer={
            <>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: '10px 18px', borderRadius: LUX.radius, background: LUX.bg, border: `1px solid ${LUX.line}`, color: LUX.ink2, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Hủy
              </button>
              <button onClick={() => handleDeleteOff(deleteConfirm)}
                style={{ padding: '10px 18px', borderRadius: LUX.radius, background: '#C0392B', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Xóa Ngay
              </button>
            </>
          }>
          <div style={{ fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink3, lineHeight: 1.6 }}>
            Xóa đăng ký OFF ngày <strong style={{ color: LUX.espresso }}>{fmtDate(deleteConfirm.ngay_off)}</strong> của{' '}
            <strong style={{ color: LUX.espresso }}>{nvMap[deleteConfirm.nhan_vien_id]?.ten || 'Không rõ'}</strong>?<br/>
            <span style={{ color: '#C0392B', fontSize: 12 }}>Hành động này không thể hoàn tác.</span>
          </div>
        </Modal>
      )}
    </div>
  )
}
