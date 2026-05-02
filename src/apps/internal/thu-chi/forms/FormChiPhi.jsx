import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { formatCurrency, todayISO } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

export default function FormChiPhi({ viList, onClose, onSaved }) {
  const [soTien,      setSoTien]      = useState('')
  const[nhomId,      setNhomId]      = useState(null)
  const[hangMucId,   setHangMucId]   = useState(null)
  const [viId,        setViId]        = useState(null)
  const [ngay,        setNgay]        = useState(todayISO())
  const [dienGiai,    setDienGiai]    = useState('')
  const[saving,      setSaving]      = useState(false)
  const [step,        setStep]        = useState('main')
  const [nhomList,    setNhomList]    = useState([])
  const[hangMucList, setHangMucList] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showLich,    setShowLich]    = useState(false) // Thêm state quản lý Lịch

  // LOGIC CŨ CỦA ANH: Lấy danh mục tự động từ Database
  useEffect(() => {
    async function loadDanhMuc() {
      const { data, error } = await supabase
        .from('danh_muc_chi_phi') // Đổi tên bảng theo chuẩn
        .select('*')
        .eq('is_active', true)
        .order('thu_tu')
        
      if (!error && data) {
        setNhomList(data.filter(d => d.parent_id === null))
        setHangMucList(data.filter(d => d.parent_id !== null))
      }
      setLoading(false)
    }
    loadDanhMuc()
  },[])

  const nhomSelected    = nhomList.find(n => n.id === nhomId)
  const hangMucSelected = hangMucList.find(h => h.id === hangMucId)
  const viSelected      = viList.find(v => v.id === viId)
  const hangMucCuaNhom  = hangMucList.filter(h => h.parent_id === nhomId)

  const chonNhom = (nhom) => {
    setNhomId(nhom.id)
    setHangMucId(null)
    setStep('chon_hang_muc')
  }

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0) return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!hangMucId) return onSaved('error', 'Vui lòng chọn hạng mục chi!')
    if (!viId)      return onSaved('error', 'Vui lòng chọn ví chi ra!')
    setSaving(true)
    try {
      // ĐỔI NƠI LƯU: Lưu vào bảng chi_phi theo chuẩn kế toán
      const { error } = await supabase.from('chi_phi').insert({
        ngay: ngay,
        danh_muc_id: hangMucId,
        so_tien: parseInt(soTien),
        hinh_thuc_thanh_toan: viSelected?.loai || 'tien_mat',
        dien_giai: dienGiai || null,
      })
      if (error) throw error
      onSaved('success', `Đã chi ${formatCurrency(parseInt(soTien))} thành công!`)
      onClose()
    } catch (err) {
      onSaved('error', 'Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const displayDate = (isoDate) => {
    const [y, m, d] = isoDate.split('-')
    return `${d}/${m}/${y}`
  }

  // CÁC MÀN HÌNH CHỌN (Giữ nguyên UI chuẩn đẹp của anh)
  if (step === 'chon_nhom') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: COLORS.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.text }}>Chọn Nhóm Chi</h3>
            <button onClick={() => setStep('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>✕</button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMute }}>Đang tải dữ liệu...</div>
          ) : nhomList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMute, fontSize: '13px' }}>Chưa có nhóm nào. Vui lòng thêm ở Cài Đặt.</div>
          ) : nhomList.map((nhom, i) => (
            <div key={nhom.id}>
              <button onClick={() => chonNhom(nhom)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{nhom.icon || '📁'}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: COLORS.text }}>{nhom.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>
                      {hangMucList.filter(h => h.parent_id === nhom.id).length} hạng mục
                    </div>
                  </div>
                </div>
                <span style={{ color: COLORS.gold, fontSize: '18px' }}>›</span>
              </button>
              {i < nhomList.length - 1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'chon_hang_muc') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: COLORS.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setStep('chon_nhom')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>‹</button>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.text }}>Chọn Hạng Mục</h3>
              <div style={{ fontSize: '12px', color: COLORS.textMute }}>{nhomSelected?.icon} {nhomSelected?.ten}</div>
            </div>
          </div>
          {hangMucCuaNhom.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMute, fontSize: '13px' }}>Nhóm này chưa có hạng mục nào.</div>
          ) : hangMucCuaNhom.map((hm, i) => (
            <div key={hm.id}>
              <button onClick={() => { setHangMucId(hm.id); setStep('main') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{hm.icon || '🏷️'}</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{hm.ten}</div>
                </div>
                {hangMucId === hm.id && <span style={{ color: COLORS.primary, fontSize: '18px' }}>✓</span>}
              </button>
              {i < hangMucCuaNhom.length - 1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'chon_vi') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: COLORS.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '24px 20px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.text }}>Chọn Ví Chi Ra</h3>
            <button onClick={() => setStep('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>✕</button>
          </div>
          {viList.map((vi, i) => (
            <div key={vi.id}>
              <button onClick={() => { setViId(vi.id); setStep('main') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{vi.icon}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: COLORS.text }}>{vi.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>{formatCurrency(vi.so_du_dau)}</div>
                  </div>
                </div>
                {viId === vi.id && <span style={{ color: COLORS.primary, fontSize: '20px' }}>✓</span>}
              </button>
              {i < viList.length - 1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      
      {/* NHÚNG LỊCH THÔNG MINH TẠI ĐÂY */}
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={(newDate) => { setNgay(newDate); setShowLich(false); }} />

      <div style={{ background: COLORS.bg, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}><div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E0D4CA' }} /></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💸</div>
            <div><div style={{ fontWeight: '700', fontSize: '16px', color: COLORS.text }}>Chi Phí</div><div style={{ fontSize: '11px', color: COLORS.textMute }}>Nhập chi phí</div></div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>✕</button>
        </div>

        <div style={{ padding: '0 16px 32px' }}>
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Số Tiền</div>
            <input type="number" placeholder="0" value={soTien} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '36px', fontWeight: '800', textAlign: 'center', background: 'transparent', color: soTien ? COLORS.chi : '#D0C0B0' }} />
            {soTien && <div style={{ fontSize: '14px', color: COLORS.chi, fontWeight: '600', marginTop: '4px' }}>{new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ</div>}
          </div>

          <div style={{ background: COLORS.card, borderRadius: '20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            <button onClick={() => setStep('chon_nhom')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'none', border: 'none', borderBottom: nhomId ? `1px solid ${COLORS.border}` : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{nhomSelected ? (nhomSelected.icon||'📂') : '📂'}</div>
                <div style={{ textAlign: 'left' }}><div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Nhóm Chi</div><div style={{ fontWeight: '600', fontSize: '14px', color: nhomSelected ? COLORS.chi : COLORS.textMute }}>{nhomSelected ? nhomSelected.ten : 'Chọn nhóm chi phí'}</div></div>
              </div>
              <span style={{ color: COLORS.gold, fontSize: '18px' }}>›</span>
            </button>

            {nhomId && (
              <button onClick={() => setStep('chon_hang_muc')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: hangMucId ? 'linear-gradient(135deg,#FFF8F5,#FFF0EB)' : 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{hangMucSelected ? (hangMucSelected.icon||'🏷️') : '🏷️'}</div>
                  <div style={{ textAlign: 'left' }}><div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Hạng Mục</div><div style={{ fontWeight: '600', fontSize: '14px', color: hangMucSelected ? COLORS.text : COLORS.textMute }}>{hangMucSelected ? hangMucSelected.ten : 'Chọn hạng mục'}</div></div>
                </div>
                {hangMucId ? <span style={{ color: COLORS.primary, fontSize: '18px' }}>✓</span> : <span style={{ color: COLORS.gold, fontSize: '18px' }}>›</span>}
              </button>
            )}
          </div>

          <button onClick={() => setStep('chon_vi')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{viSelected ? viSelected.icon : '💳'}</div>
              <div style={{ textAlign: 'left' }}><div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Ví Chi Ra</div><div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{viSelected ? viSelected.ten : 'Chọn tài khoản'}</div></div>
            </div>
            <span style={{ color: COLORS.gold, fontSize: '18px' }}>›</span>
          </button>

          {/* DÙNG DATEPICKER CHUẨN */}
          <div onClick={() => setShowLich(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📅</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Ngày Chi</div><div style={{ fontSize: '15px', fontWeight: '700', color: COLORS.text }}>{displayDate(ngay)}</div></div>
            <div style={{ fontSize: '18px', color: COLORS.textMute }}>›</div>
          </div>

          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '24px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '4px' }}>Diễn Giải</div><textarea placeholder="Ghi chú thêm (không bắt buộc)..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', color: COLORS.text, background: 'transparent', resize: 'none', fontFamily: 'inherit' }} /></div>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', background: saving ? '#C4A882' : 'linear-gradient(135deg,#E57373,#C0392B)', border: 'none', borderRadius: '18px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(192,57,43,0.4)', transition: 'all 0.2s' }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Chi Phí'}
          </button>
        </div>
      </div>
    </div>
  )
}