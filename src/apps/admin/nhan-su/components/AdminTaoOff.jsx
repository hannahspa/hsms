import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { todayISO, getNowVN } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'
import { useAuth } from '../../../../context/AuthContext'

const LOAI_OFF = [
  { value: 'off_phep', label: 'OFF Phép',            desc: 'Có lương, trừ vào giới hạn tháng',   color: '#DBEAFE', textColor: '#1E40AF' },
  { value: 'off_ov',   label: 'OFF Không Lương (OV)', desc: 'Vượt giới hạn phép hoặc ngày thường', color: '#FEE2E2', textColor: '#991B1B' },
  { value: 'off_t7',   label: 'OFF T7/CN Có Lý Do',  desc: 'Tính x2 ngày công',                  color: '#F3E8FF', textColor: '#6B21A8' },
  { value: 'off_t7x',  label: 'OFF T7/CN Không Phép', desc: 'Phạt T7: -300k, CN: -500k',          color: '#FEE2E2', textColor: '#991B1B' },
]

const VI_TRI_LABEL = { ktv: 'KTV', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ' }

function getInitials(name) {
  const parts = name.trim().split(' ')
  return parts[parts.length - 1].charAt(0).toUpperCase()
}
function getAvatarColor(name) {
  const p = ['#A0714F','#C9A96E','#7D5A3C','#B8860B','#8B6914']
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return p[h % p.length]
}
function formatNgayHienThi(iso) {
  if (!iso) return 'Chọn ngày'
  const [y, m, d] = iso.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const THU = ['CN','T2','T3','T4','T5','T6','T7']
  return `${THU[date.getDay()]} ${d}/${m}/${y}`
}

export default function AdminTaoOff({ open, onClose, onSuccess }) {
  const { user } = useAuth()
  const [nvList,     setNvList]     = useState([])
  const [nvId,       setNvId]       = useState('')
  const [ngayOff,    setNgayOff]    = useState(todayISO())
  const [loaiOff,    setLoaiOff]    = useState('off_phep')
  const [ghiChu,     setGhiChu]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [loadingNv,  setLoadingNv]  = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [trungLich,  setTrungLich]  = useState(null) // off đã tồn tại nếu có
  const [toast,      setToast]      = useState(null)

  useEffect(() => {
    if (open) {
      fetchNv()
      setNgayOff(todayISO())
      setLoaiOff('off_phep')
      setGhiChu('')
      setNvId('')
      setTrungLich(null)
    }
  }, [open])

  // Khi đổi NV hoặc ngày → kiểm tra trùng lịch
  useEffect(() => {
    if (nvId && ngayOff) checkTrungLich()
    else setTrungLich(null)
  }, [nvId, ngayOff])

  // Tự động chọn loại OFF phù hợp khi đổi ngày
  useEffect(() => {
    if (!ngayOff) return
    const [y, m, d] = ngayOff.split('-').map(Number)
    const day = new Date(y, m - 1, d).getDay()
    const isWeekend = day === 0 || day === 6
    if (isWeekend && loaiOff === 'off_phep') setLoaiOff('off_t7')
    if (!isWeekend && (loaiOff === 'off_t7' || loaiOff === 'off_t7x')) setLoaiOff('off_phep')
  }, [ngayOff])

  const fetchNv = async () => {
    setLoadingNv(true)
    const { data } = await supabase
      .from('nhan_vien')
      .select('id, ho_ten, vi_tri, avatar_url, gioi_han_off_thang')
      .eq('trang_thai', 'dang_lam')
      .order('vi_tri').order('ho_ten')
    setNvList(data || [])
    setLoadingNv(false)
  }

  const checkTrungLich = async () => {
    const { data } = await supabase
      .from('dang_ky_off')
      .select('id, loai_off, trang_thai')
      .eq('nhan_vien_id', nvId)
      .eq('ngay_off', ngayOff)
      .in('trang_thai', ['cho_duyet', 'duoc_duyet'])
      .maybeSingle()
    setTrungLich(data || null)
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = async () => {
    if (!nvId)    { showToast('Vui lòng chọn nhân viên', 'error'); return }
    if (!ngayOff) { showToast('Vui lòng chọn ngày OFF', 'error'); return }
    if (trungLich) {
      showToast('Nhân viên đã có OFF ngày này!', 'error'); return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('dang_ky_off').insert({
        nhan_vien_id: nvId,
        ngay_off:     ngayOff,
        loai_off:     loaiOff,
        ly_do:        ghiChu.trim() || 'Admin tạo trực tiếp',
        trang_thai:   'duoc_duyet',
        nguon:        'admin',
        ghi_chu_duyet: `Tạo bởi ${user?.ho_ten || 'Admin'}`,
      })
      if (error) throw error
      showToast('✅ Đã tạo OFF thành công!')
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const selectedNv = nvList.find(nv => nv.id === nvId)
  const [y, m, d]  = ngayOff.split('-').map(Number)
  const isWeekend  = ngayOff ? [0,6].includes(new Date(y, m-1, d).getDay()) : false

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: toast.type === 'error' ? COLORS.chi : '#2D7A4F', color: 'white', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'flex-end' }}
        onClick={onClose}>

        {/* Sheet */}
        <div style={{ background: COLORS.bg, borderRadius: '28px 28px 0 0', width: '100%', maxWidth: '480px', margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', paddingBottom: '40px' }}
          onClick={e => e.stopPropagation()}>

          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: COLORS.border }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: COLORS.text }}>Tạo OFF Cho Nhân Viên</div>
              <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '2px' }}>Duyệt ngay, không cần NV gửi đơn</div>
            </div>
            <button onClick={onClose}
              style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: COLORS.card, fontSize: '18px', cursor: 'pointer', color: COLORS.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* Chọn nhân viên */}
            <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px', marginBottom: '12px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '12px', color: COLORS.textMute, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Nhân Viên <span style={{ color: COLORS.chi }}>*</span>
              </div>

              {loadingNv ? (
                <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMute }}>Đang tải...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {nvList.map(nv => {
                    const isActive = nv.id === nvId
                    return (
                      <button key={nv.id} onClick={() => setNvId(nv.id)}
                        style={{ padding: '10px 6px', borderRadius: '14px', border: `2px solid ${isActive ? COLORS.primary : COLORS.border}`, background: isActive ? '#FFF5EE' : COLORS.card, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                          {nv.avatar_url ? (
                            <img src={nv.avatar_url} alt={nv.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: isActive ? COLORS.primary : getAvatarColor(nv.ho_ten), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'white' }}>
                              {getInitials(nv.ho_ten)}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: isActive ? COLORS.primary : COLORS.text, textAlign: 'center', lineHeight: '1.2' }}>
                          {nv.ho_ten.trim().split(' ').slice(-2).join(' ')}
                        </div>
                        <div style={{ fontSize: '9px', color: COLORS.textMute }}>
                          {VI_TRI_LABEL[nv.vi_tri]}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Chọn ngày */}
            <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px', marginBottom: '12px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '12px', color: COLORS.textMute, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Ngày OFF <span style={{ color: COLORS.chi }}>*</span>
              </div>
              <button onClick={() => setShowPicker(true)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: `2px solid ${COLORS.primary}`, background: '#FFF5EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontWeight: '800', fontSize: '16px', color: COLORS.primary }}>
                  {formatNgayHienThi(ngayOff)}
                </span>
                <span style={{ fontSize: '20px' }}>📅</span>
              </button>

              {isWeekend && (
                <div style={{ marginTop: '8px', background: '#FEF2F2', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#C0392B', fontWeight: '600', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  ⚠️ Ngày T7/CN — Loại OFF tự động điều chỉnh bên dưới
                </div>
              )}

              {/* Cảnh báo trùng lịch */}
              {trungLich && (
                <div style={{ marginTop: '8px', background: '#FEE2E2', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#991B1B', fontWeight: '700', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  🚫 Nhân viên đã có OFF ngày này ({trungLich.trang_thai === 'duoc_duyet' ? 'đã duyệt' : 'chờ duyệt'})
                </div>
              )}
            </div>

            {/* Loại OFF */}
            <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px', marginBottom: '12px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '12px', color: COLORS.textMute, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Loại OFF
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {LOAI_OFF.map(item => {
                  const isDisabled = isWeekend
                    ? (item.value === 'off_phep' || item.value === 'off_ov')
                    : (item.value === 'off_t7'   || item.value === 'off_t7x')
                  const isSelected = loaiOff === item.value
                  return (
                    <button key={item.value} onClick={() => !isDisabled && setLoaiOff(item.value)}
                      disabled={isDisabled}
                      style={{ padding: '12px 14px', borderRadius: '12px', border: `2px solid ${isSelected ? COLORS.primary : COLORS.border}`, background: isDisabled ? '#F9FAFB' : (isSelected ? item.color : COLORS.card), cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.4 : 1, textAlign: 'left', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: isSelected ? item.textColor : COLORS.text }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>
                          {isDisabled ? '🔒 Không áp dụng cho ngày này' : item.desc}
                        </div>
                      </div>
                      {isSelected && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: item.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                      </div>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Ghi chú (tùy chọn) */}
            <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px', marginBottom: '20px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '12px', color: COLORS.textMute, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Ghi Chú (tùy chọn)
              </div>
              <textarea
                value={ghiChu}
                onChange={e => setGhiChu(e.target.value)}
                placeholder="Lý do tạo OFF trực tiếp... (nếu để trống sẽ ghi 'Admin tạo trực tiếp')"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '13px', resize: 'none', height: '72px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: COLORS.text }}
              />
            </div>

            {/* Preview tóm tắt */}
            {selectedNv && ngayOff && (
              <div style={{ background: 'linear-gradient(135deg,#FFF9F0,#FDEBD0)', borderRadius: '16px', padding: '14px 16px', marginBottom: '16px', border: '1px solid rgba(201,169,110,0.3)' }}>
                <div style={{ fontSize: '12px', color: COLORS.textSub, fontWeight: '700', marginBottom: '8px' }}>XÁC NHẬN TẠO OFF:</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.text }}>
                  {selectedNv.ho_ten.trim().split(' ').slice(-2).join(' ')} — {formatNgayHienThi(ngayOff)}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.textSub, marginTop: '4px' }}>
                  {LOAI_OFF.find(l => l.value === loaiOff)?.label} · Duyệt ngay · Nguồn: Admin
                </div>
              </div>
            )}

            {/* Nút submit */}
            <button onClick={handleSubmit}
              disabled={loading || !nvId || !ngayOff || !!trungLich}
              style={{ width: '100%', padding: '16px', borderRadius: '18px', border: 'none', background: (!nvId || !ngayOff || trungLich) ? '#E5E7EB' : COLORS.grad, color: (!nvId || !ngayOff || trungLich) ? COLORS.textMute : 'white', fontWeight: '800', fontSize: '16px', cursor: (!nvId || !ngayOff || trungLich) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: (!nvId || !ngayOff || trungLich) ? 'none' : '0 4px 16px rgba(160,113,79,0.3)' }}>
              {loading ? '⏳ Đang tạo...' : '✅ Tạo OFF & Duyệt Ngay'}
            </button>

          </div>
        </div>
      </div>

      {/* DatePicker */}
      <DatePicker
        open={showPicker}
        selectedDate={ngayOff}
        onClose={() => setShowPicker(false)}
        onConfirm={(iso) => { setNgayOff(iso); setShowPicker(false) }}
      />
    </>
  )
}
