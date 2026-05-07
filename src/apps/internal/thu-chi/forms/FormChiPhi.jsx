import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, todayISO, formatDateInput } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'
import ImageUpload from '../../../../components/shared/ImageUpload'

export default function FormChiPhi({ viList, user, onClose, onSaved }) {
  const [soTien,       setSoTien]       = useState('')
  const [nhomId,       setNhomId]       = useState(null)
  const [hangMucId,    setHangMucId]    = useState(null)
  const [viId,         setViId]         = useState(null)
  const [nguoiChiId,   setNguoiChiId]   = useState(null)
  const [ngay,         setNgay]         = useState(todayISO())
  const [dienGiai,     setDienGiai]     = useState('')
  const [saving,       setSaving]       = useState(false)
  const [step,         setStep]         = useState('main')
  const [nhomList,     setNhomList]     = useState([])
  const [hangMucList,  setHangMucList]  = useState([])
  const [nhanVienList, setNhanVienList] = useState([])
  const [chungTuUrl,   setChungTuUrl]   = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [showLich,     setShowLich]     = useState(false)

  useEffect(() => {
    async function loadDanhMuc() {
      const { data, error } = await supabase
        .from('danh_muc_chi_phi')
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

  useEffect(() => {
    async function loadNhanVien() {
      const { data } = await supabase
        .from('nhan_vien')
        .select('id, ho_ten, vi_tri')
        .eq('trang_thai', 'dang_lam')
        .order('ho_ten')
      if (data) setNhanVienList(data)
    }
    loadNhanVien()
  }, [])

  const nhomSelected      = nhomList.find(n => n.id === nhomId)
  const nguoiChiSelected  = nhanVienList.find(n => n.id === nguoiChiId)
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
    if (!dienGiai?.trim()) return onSaved('error', 'Vui lòng nhập diễn giải!')

    // Kiểm tra số dư chỉ với Lễ Tân — Admin có thể nhập dữ liệu lịch sử không cần kiểm tra
    if (user?.vai_tro !== 'admin') {
      const { data: freshVi } = await supabase
        .from('so_du_vi_thuc_te')
        .select('so_du_hien_tai')
        .eq('id', viId)
        .single()
      const soDu = freshVi?.so_du_hien_tai ?? viSelected?.so_du_hien_tai ?? 0
      if (parseInt(soTien) > soDu) {
        return onSaved('error', `Số Dư ${viSelected?.ten || 'Ví'} không đủ để chi khoản tiền này.`)
      }
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('chi_phi').insert({
        ngay: ngay,
        danh_muc_id: hangMucId,
        so_tien: parseInt(soTien),
        hinh_thuc_thanh_toan: viSelected?.loai || 'tien_mat',
        vi_id: viId,
        nguoi_nhap: nguoiChiSelected?.ho_ten || user?.ho_ten || null,
        chung_tu_url: chungTuUrl,
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

  const overlayBg = 'rgba(42,32,26,0.55)'

  // ── Chọn nhóm ──
  if (step === 'chon_nhom') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: overlayBg, display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Chọn Nhóm Chi</h3>
            <button onClick={() => setStep('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải dữ liệu...</div>
          ) : nhomList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: LUX.ink3, fontSize: '13px', fontFamily: LUX.fontSans }}>Chưa có nhóm nào. Vui lòng thêm ở Cài Đặt.</div>
          ) : nhomList.map((nhom, i) => (
            <div key={nhom.id}>
              <button onClick={() => chonNhom(nhom)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{nhom.icon || '📁'}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: LUX.ink, fontFamily: LUX.fontSans }}>{nhom.ten}</div>
                    <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '2px', fontFamily: LUX.fontSans }}>
                      {hangMucList.filter(h => h.parent_id === nhom.id).length} hạng mục
                    </div>
                  </div>
                </div>
                <span style={{ color: LUX.gold, fontSize: '18px' }}>›</span>
              </button>
              {i < nhomList.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Chọn hạng mục ──
  if (step === 'chon_hang_muc') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: overlayBg, display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setStep('chon_nhom')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>‹</button>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Chọn Hạng Mục</h3>
              <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{nhomSelected?.icon} {nhomSelected?.ten}</div>
            </div>
          </div>
          {hangMucCuaNhom.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: LUX.ink3, fontSize: '13px', fontFamily: LUX.fontSans }}>Nhóm này chưa có hạng mục nào.</div>
          ) : hangMucCuaNhom.map((hm, i) => (
            <div key={hm.id}>
              <button onClick={() => { setHangMucId(hm.id); setStep('main') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{hm.icon || '🏷️'}</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSans }}>{hm.ten}</div>
                </div>
                {hangMucId === hm.id && <span style={{ color: LUX.taupe, fontSize: '18px' }}>✓</span>}
              </button>
              {i < hangMucCuaNhom.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Chọn ví ──
  if (step === 'chon_vi') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: overlayBg, display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Chọn Ví Chi Ra</h3>
            <button onClick={() => setStep('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
          </div>
          {viList.map((vi, i) => (
            <div key={vi.id}>
              <button onClick={() => { setViId(vi.id); setStep('main') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: `linear-gradient(135deg,${LUX.surface},${LUX.line})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{vi.icon}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: LUX.ink, fontFamily: LUX.fontSans }}>{vi.ten}</div>
                    <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{user?.vai_tro === 'admin' ? formatCurrency(vi.so_du_hien_tai) : '••••••'}</div>
                  </div>
                </div>
                {viId === vi.id && <span style={{ color: LUX.taupe, fontSize: '20px' }}>✓</span>}
              </button>
              {i < viList.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Chọn người chi ──
  if (step === 'chon_nguoi_chi') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: overlayBg, display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Người Chi Tiền</h3>
            <button onClick={() => setStep('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
          </div>
          {nhanVienList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: LUX.ink3, fontSize: '13px', fontFamily: LUX.fontSans }}>Đang tải danh sách nhân viên...</div>
          ) : nhanVienList.map((nv, i) => (
            <div key={nv.id}>
              <button onClick={() => { setNguoiChiId(nv.id); setStep('main') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#C0392B', fontFamily: LUX.fontSans }}>
                    {nv.ho_ten?.charAt(0) || '?'}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: LUX.ink, fontFamily: LUX.fontSans }}>{nv.ho_ten}</div>
                    <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{nv.vi_tri === 'le_tan' ? 'Lễ Tân' : nv.vi_tri === 'ktv' ? 'KTV' : nv.vi_tri === 'tap_vu' ? 'Tạp Vụ' : nv.vi_tri}</div>
                  </div>
                </div>
                {nguoiChiId === nv.id && <span style={{ color: LUX.taupe, fontSize: '20px' }}>✓</span>}
              </button>
              {i < nhanVienList.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Form chính ──
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: overlayBg, display: 'flex', alignItems: 'flex-end', zIndex: 500 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={(newDate) => { setNgay(newDate); setShowLich(false); }} />

      <div style={{ background: LUX.surface, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}><div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: LUX.line2 }} /></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💸</div>
            <div><div style={{ fontWeight: '700', fontSize: '16px', color: LUX.ink, fontFamily: LUX.fontSerif }}>Chi Phí</div><div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Nhập chi phí</div></div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>

        <div style={{ padding: '0 16px 32px' }}>
          <div style={{ background: LUX.surface2, borderRadius: LUX.radius, padding: '20px', marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: LUX.fontSans }}>Số Tiền</div>
            <input type="number" placeholder="0" value={soTien} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '36px', fontWeight: '700', textAlign: 'center', background: 'transparent', color: soTien ? '#C0392B' : LUX.line2, fontFamily: LUX.fontMono }} />
            {soTien && <div style={{ fontSize: '14px', color: '#C0392B', fontWeight: '600', marginTop: '4px', fontFamily: LUX.fontSans }}>{new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ</div>}
          </div>

          <div style={{ background: LUX.surface2, borderRadius: LUX.radius, marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`, overflow: 'hidden' }}>
            <button onClick={() => setStep('chon_nhom')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'none', border: 'none', borderBottom: nhomId ? `1px solid ${LUX.line}` : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{nhomSelected ? (nhomSelected.icon||'📂') : '📂'}</div>
                <div style={{ textAlign: 'left' }}><div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px', fontFamily: LUX.fontSans }}>Nhóm Chi</div><div style={{ fontWeight: '600', fontSize: '14px', color: nhomSelected ? '#C0392B' : LUX.ink3, fontFamily: LUX.fontSans }}>{nhomSelected ? nhomSelected.ten : 'Chọn nhóm chi phí'}</div></div>
              </div>
              <span style={{ color: LUX.gold, fontSize: '18px' }}>›</span>
            </button>

            {nhomId && (
              <button onClick={() => setStep('chon_hang_muc')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: hangMucId ? LUX.surface : 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{hangMucSelected ? (hangMucSelected.icon||'🏷️') : '🏷️'}</div>
                  <div style={{ textAlign: 'left' }}><div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px', fontFamily: LUX.fontSans }}>Hạng Mục</div><div style={{ fontWeight: '600', fontSize: '14px', color: hangMucSelected ? LUX.ink : LUX.ink3, fontFamily: LUX.fontSans }}>{hangMucSelected ? hangMucSelected.ten : 'Chọn hạng mục'}</div></div>
                </div>
                {hangMucId ? <span style={{ color: LUX.taupe, fontSize: '18px' }}>✓</span> : <span style={{ color: LUX.gold, fontSize: '18px' }}>›</span>}
              </button>
            )}
          </div>

          <button onClick={() => setStep('chon_vi')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: LUX.surface2, borderRadius: LUX.radius, padding: '16px 20px', marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `linear-gradient(135deg,${LUX.surface},${LUX.line})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{viSelected ? viSelected.icon : '💳'}</div>
              <div style={{ textAlign: 'left' }}><div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px', fontFamily: LUX.fontSans }}>Ví Chi Ra</div><div style={{ fontWeight: '600', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSans }}>{viSelected ? viSelected.ten : 'Chọn tài khoản'}</div></div>
            </div>
            <span style={{ color: LUX.gold, fontSize: '18px' }}>›</span>
          </button>

          <button onClick={() => setStep('chon_nguoi_chi')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: LUX.surface2, borderRadius: LUX.radius, padding: '16px 20px', marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#C0392B', fontFamily: LUX.fontSans }}>
                {nguoiChiSelected ? nguoiChiSelected.ho_ten?.charAt(0) : '👤'}
              </div>
              <div style={{ textAlign: 'left' }}><div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px', fontFamily: LUX.fontSans }}>Người Chi</div><div style={{ fontWeight: '600', fontSize: '14px', color: nguoiChiSelected ? LUX.ink : LUX.ink3, fontFamily: LUX.fontSans }}>{nguoiChiSelected ? nguoiChiSelected.ho_ten : 'Chọn người chi'}</div></div>
            </div>
            <span style={{ color: LUX.gold, fontSize: '18px' }}>›</span>
          </button>

          <div onClick={() => setShowLich(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: LUX.surface2, borderRadius: LUX.radius, padding: '16px 20px', marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`, cursor: 'pointer' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📅</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px', fontFamily: LUX.fontSans }}>Ngày Chi</div><div style={{ fontSize: '15px', fontWeight: '600', color: LUX.ink, fontFamily: LUX.fontSans }}>{formatDateInput(ngay)}</div></div>
            <div style={{ fontSize: '18px', color: LUX.ink3 }}>›</div>
          </div>

          <div style={{ background: LUX.surface2, borderRadius: LUX.radius, padding: '16px 20px', marginBottom: '24px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '4px', fontFamily: LUX.fontSans }}>Diễn Giải <span style={{color:'#C0392B'}}>*</span></div><textarea placeholder="Nhập nội dung chi tiêu..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', color: LUX.ink, background: 'transparent', resize: 'none', fontFamily: LUX.fontSans }} /></div>
            </div>
          </div>

          <ImageUpload
            onUploaded={(url) => setChungTuUrl(url)}
            onRemove={() => setChungTuUrl(null)}
          />

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', background: saving ? LUX.ink3 : 'linear-gradient(135deg,#E57373,#C0392B)', border: 'none', borderRadius: LUX.radius, color: 'white', fontSize: '16px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(192,57,43,0.35)', transition: 'all 0.2s', fontFamily: LUX.fontSans }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Chi Phí'}
          </button>
        </div>
      </div>
    </div>
  )
}
