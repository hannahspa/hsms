import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX } from '../../../constants/lux'
import { formatCurrency, formatDateInput } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'

const HINH_THUC_LABELS = {
  tien_mat:      '💵 Tiền Mặt',
  chuyen_khoan:  '🏦 Chuyển Khoản',
  quet_the:      '💳 Quẹt Thẻ',
  the_tra_truoc: '🎫 Thẻ Trả Trước',
}

export default function ChiTietGiaoDich({ giaoDich, user, onBack, onUpdated }) {
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lyDo, setLyDo] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const isAdmin = user?.vai_tro === 'admin'
  const isLeTan = user?.vai_tro === 'le_tan'
  const canEdit = isAdmin || isLeTan

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getLoaiLabel = () => {
    if (giaoDich.loai === 'thu') return 'Doanh Thu'
    if (giaoDich.loai === 'chi') return 'Chi Phí'
    return 'Chuyển Khoản Nội Bộ'
  }

  const getLoaiBang = () => {
    if (giaoDich.loai === 'thu') return 'doanh_thu'
    if (giaoDich.loai === 'chi') return 'chi_phi'
    return 'chuyen_khoan_noi_bo'
  }

  // Admin: xóa thẳng. Lễ Tân: gửi yêu cầu duyệt
  const handleDelete = async () => {
    if (!lyDo.trim()) { showToast('Vui lòng nhập lý do', 'error'); return }
    setLoading(true)
    try {
      if (isAdmin) {
        // Xóa thẳng
        const bang = getLoaiBang()
        const { error } = await supabase.from(bang).delete().eq('id', giaoDich.ban_ghi_id || giaoDich.id)
        if (error) throw error
        showToast('Đã xóa giao dịch')
        setTimeout(() => onUpdated(), 1000)
      } else {
        // Gửi yêu cầu xóa → Admin duyệt
        const { error } = await supabase.from('yeu_cau_chinh_sua').insert({
          loai_bang:     getLoaiBang(),
          ban_ghi_id:    giaoDich.ban_ghi_id || giaoDich.id,
          loai_yeu_cau:  'xoa',
          du_lieu_cu:    giaoDich,
          ly_do:         lyDo,
          nguoi_yeu_cau: user?.ho_ten || user?.email,
        })
        if (error) throw error
        showToast('Đã gửi yêu cầu xóa — chờ Cao Quốc Nam duyệt')
        setTimeout(() => onBack(), 1500)
      }
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const loaiColor = giaoDich.loai === 'thu' ? '#2D7A4F' : giaoDich.loai === 'chi' ? '#C0392B' : '#6C3483'
  const loaiIcon  = giaoDich.loai === 'thu' ? '💰' : giaoDich.loai === 'chi' ? '💸' : '🔄'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'#FAF7F4', overflowY:'auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:'20px',left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='error'?'#C0392B':'#2D7A4F',color:'white',padding:'12px 24px',borderRadius:'12px',fontWeight:'700',fontSize:'13px',boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background:LUX.heroGrad,padding:'44px 20px 24px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
          <button onClick={onBack} style={{ width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.2)',border:'1.5px solid rgba(255,255,255,0.3)',color:'white',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>←</button>
          <div style={{ color:'white',fontWeight:'700',fontSize:'18px' }}>Chi Tiết Giao Dịch</div>
        </div>

        {/* Số tiền lớn */}
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'48px',marginBottom:'8px' }}>{loaiIcon}</div>
          <div style={{ fontSize:'36px',fontWeight:'800',color:'white',letterSpacing:'-1px' }}>
            {giaoDich.loai==='chi'?'-':giaoDich.loai==='thu'?'+':''}{formatCurrency(giaoDich.so_tien)}
          </div>
          <div style={{ fontSize:'14px',color:'rgba(255,255,255,0.8)',marginTop:'4px' }}>{getLoaiLabel()}</div>
        </div>
      </div>

      <div style={{ padding:'20px 16px' }}>

        {/* Chi tiết */}
        <div style={{ background:LUX.surface2,borderRadius:'24px',padding:'20px',marginBottom:'16px',border:`1px solid ${LUX.line}`,boxShadow:LUX.shadowSm }}>
          <div style={{ fontWeight:'800',fontSize:'15px',color:LUX.ink,marginBottom:'16px' }}>Thông tin giao dịch</div>

          {[
            { label:'Ngày',        value: formatDateInput(giaoDich.ngay) },
            { label:'Hình thức',   value: HINH_THUC_LABELS[giaoDich.hinh_thuc] || giaoDich.hinh_thuc || giaoDich.mo_ta || '—' },
            { label:'Danh mục',    value: giaoDich.ten_danh_muc || giaoDich.ten_vi_tu || '—' },
            { label:'Diễn giải',   value: giaoDich.dien_giai || '—' },
          ].map(row => (
            <div key={row.label} style={{ display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${LUX.line}` }}>
              <span style={{ fontSize:'13px',color:LUX.ink3 }}>{row.label}</span>
              <span style={{ fontSize:'13px',fontWeight:'700',color:LUX.ink,maxWidth:'60%',textAlign:'right' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Nút hành động */}
        {canEdit && (
          <div style={{ display:'flex',gap:'12px',marginBottom:'16px' }}>
            <button
              onClick={() => setShowEditForm(true)}
              style={{ flex:1,padding:'16px',borderRadius:'16px',background:LUX.surface2,border:`2px solid ${LUX.taupe}`,color:LUX.taupe,fontWeight:'800',fontSize:'14px',cursor:'pointer' }}>
              ✏️ Sửa
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ flex:1,padding:'16px',borderRadius:'16px',background:'#FEF2F2',border:`2px solid ${'#C0392B'}`,color:'#C0392B',fontWeight:'800',fontSize:'14px',cursor:'pointer' }}>
              🗑️ Xóa
            </button>
          </div>
        )}

        {!isAdmin && canEdit && (
          <div style={{ background:'#FFF9F0',borderRadius:'16px',padding:'12px 16px',border:'1px solid #F0C080',fontSize:'12px',color:'#8B6914' }}>
            ℹ️ Yêu cầu sửa/xóa sẽ được gửi cho Admin duyệt trước khi thay đổi có hiệu lực.
          </div>
        )}
      </div>

      {/* Modal Xóa */}
      {showDeleteConfirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',zIndex:999 }}
          onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background:LUX.bg,borderRadius:'20px',width:'100%',maxWidth:'420px',margin:'0 auto',padding:'24px 20px',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 70px rgba(42,32,26,0.35)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'32px',textAlign:'center',marginBottom:'12px' }}>🗑️</div>
            <h3 style={{ fontSize:'18px',fontWeight:'800',color:LUX.ink,textAlign:'center',marginBottom:'8px' }}>
              {isAdmin ? 'Xóa giao dịch?' : 'Gửi yêu cầu xóa?'}
            </h3>
            <p style={{ fontSize:'13px',color:LUX.ink3,textAlign:'center',marginBottom:'20px' }}>
              {isAdmin
                ? 'Hành động này không thể hoàn tác.'
                : 'Yêu cầu sẽ được gửi cho Admin duyệt.'}
            </p>
            <textarea
              value={lyDo}
              onChange={e => setLyDo(e.target.value)}
              placeholder="Nhập lý do xóa..."
              style={{ width:'100%',padding:'12px',borderRadius:'12px',border:`1px solid ${LUX.line}`,fontSize:'14px',resize:'none',height:'80px',marginBottom:'16px',boxSizing:'border-box',outline:'none' }}
            />
            <div style={{ display:'flex',gap:'12px' }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ flex:1,padding:'14px',borderRadius:'14px',background:LUX.surface2,border:`1px solid ${LUX.line}`,fontWeight:'700',cursor:'pointer' }}>
                Hủy
              </button>
              <button onClick={handleDelete} disabled={loading}
                style={{ flex:1,padding:'14px',borderRadius:'14px',background:'#C0392B',color:'white',border:'none',fontWeight:'800',cursor:'pointer',opacity:loading?0.6:1 }}>
                {loading ? '...' : isAdmin ? 'Xóa ngay' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa */}
      {showEditForm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999 }}
          onClick={() => setShowEditForm(false)}>
          <div style={{ position:'absolute',top:0,right:0,bottom:0,width:'calc(100vw - var(--side-w, 248px))',maxWidth:'100vw',background:LUX.bg,padding:'24px 28px',overflowY:'auto',boxShadow:'-6px 0 40px rgba(42,32,26,0.28)',animation:'rpSlideIn .22s ease' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize:'18px',fontWeight:'800',color:LUX.ink,marginBottom:'20px' }}>✏️ Sửa Giao Dịch</h3>
            <EditGiaoDich
              giaoDich={giaoDich}
              user={user}
              isAdmin={isAdmin}
              onClose={() => setShowEditForm(false)}
              onUpdated={onUpdated}
              showToast={showToast}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-component: Form sửa TOÀN DIỆN ────────────────────
// Fetch bản ghi gốc từ source table để có đủ field (danh_muc_id, hinh_thuc_thanh_toan, tu_vi_id...)
// Cho phép sửa TẤT CẢ field: ngày, số tiền, diễn giải, hình thức, danh mục, ví...
function EditGiaoDich({ giaoDich, user, isAdmin, onClose, onUpdated, showToast }) {
  const [record,   setRecord]   = useState(null)  // bản ghi gốc từ source table
  const [dmList,   setDmList]   = useState([])    // danh mục chi phí
  const [viList,   setViList]   = useState([])    // danh sách ví
  const [ready,    setReady]    = useState(false)

  // Form state
  const [soTien,         setSoTien]         = useState('')
  const [dienGiai,       setDienGiai]       = useState('')
  const [ngay,           setNgay]           = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [hinhThuc,       setHinhThuc]       = useState('')       // Doanh Thu
  const [danhMucId,      setDanhMucId]      = useState('')       // Chi Phí
  const [hinhThucTT,     setHinhThucTT]     = useState('')       // Chi Phí (hinh_thuc_thanh_toan)
  const [tuViId,         setTuViId]         = useState('')       // CK Nội Bộ
  const [denViId,        setDenViId]        = useState('')       // CK Nội Bộ
  const [lyDo,           setLyDo]           = useState('')
  const [loading,        setLoading]        = useState(false)

  const loai = giaoDich.loai // 'thu' | 'chi' | 'chuyen_khoan'
  const banGhiId = giaoDich.ban_ghi_id || giaoDich.id

  const getLoaiBang = () => {
    if (loai === 'thu') return 'doanh_thu'
    if (loai === 'chi') return 'chi_phi'
    return 'chuyen_khoan_noi_bo'
  }

  // Fetch đủ dữ liệu khi mount
  useEffect(() => {
    async function load() {
      try {
        const bang = getLoaiBang()
        const [recRes, dmRes, viRes] = await Promise.all([
          supabase.from(bang).select('*').eq('id', banGhiId).single(),
          loai === 'chi' ? supabase.from('danh_muc_chi_phi').select('*').eq('is_active', true).order('thu_tu') : Promise.resolve(null),
          loai === 'chuyen_khoan' ? supabase.from('vi').select('*').eq('is_active', true).order('thu_tu') : Promise.resolve(null),
        ])

        const rec = recRes.data
        setRecord(rec)
        if (dmRes) setDmList(dmRes.data || [])
        if (viRes) setViList(viRes.data || [])

        // Khởi tạo form state từ bản ghi gốc
        if (rec) {
          setSoTien(String(rec.so_tien || ''))
          setDienGiai(rec.dien_giai || '')
          setNgay(rec.ngay || '')
          if (loai === 'thu') {
            setHinhThuc(rec.hinh_thuc || '')
          } else if (loai === 'chi') {
            setDanhMucId(rec.danh_muc_id || '')
            setHinhThucTT(rec.hinh_thuc_thanh_toan || '')
          } else if (loai === 'chuyen_khoan') {
            setTuViId(rec.tu_vi_id || '')
            setDenViId(rec.den_vi_id || '')
          }
        }
        setReady(true)
      } catch (e) {
        console.error('Load edit data:', e)
        // Fallback: dùng dữ liệu từ view
        setSoTien(String(giaoDich.so_tien || ''))
        setDienGiai(giaoDich.dien_giai || '')
        setNgay(giaoDich.ngay || '')
        if (loai === 'thu') setHinhThuc(giaoDich.hinh_thuc || '')
        if (loai === 'chi') setHinhThucTT(giaoDich.hinh_thuc || '')
        setReady(true)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!lyDo.trim()) { showToast('Vui lòng nhập lý do sửa', 'error'); return }
    const parsed = parseInt(soTien.replace(/\D/g, ''))
    if (!parsed || parsed <= 0) { showToast('Số tiền không hợp lệ', 'error'); return }

    setLoading(true)
    try {
      // Xây dựng duLieuMoi với TẤT CẢ field liên quan
      const duLieuMoi = { so_tien: parsed, dien_giai: dienGiai, ngay }
      if (loai === 'thu') {
        duLieuMoi.hinh_thuc = hinhThuc
      } else if (loai === 'chi') {
        duLieuMoi.danh_muc_id = danhMucId
        duLieuMoi.hinh_thuc_thanh_toan = hinhThucTT
      } else if (loai === 'chuyen_khoan') {
        duLieuMoi.tu_vi_id = tuViId
        duLieuMoi.den_vi_id = denViId
      }

      // du_lieu_cu = bản ghi gốc từ source table (nếu có) nếu không thì dùng view
      const duLieuCu = record || giaoDich

      if (isAdmin) {
        const { error } = await supabase
          .from(getLoaiBang())
          .update(duLieuMoi)
          .eq('id', banGhiId)
        if (error) throw error
        showToast('Đã cập nhật giao dịch')
        setTimeout(() => onUpdated(), 1000)
      } else {
        const { error } = await supabase.from('yeu_cau_chinh_sua').insert({
          loai_bang:     getLoaiBang(),
          ban_ghi_id:    banGhiId,
          loai_yeu_cau:  'sua',
          du_lieu_cu:    duLieuCu,
          du_lieu_moi:   duLieuMoi,
          ly_do:         lyDo,
          nguoi_yeu_cau: user?.ho_ten || user?.email,
        })
        if (error) throw error
        showToast('Đã gửi yêu cầu sửa — chờ Admin duyệt')
        setTimeout(() => onClose(), 1500)
      }
    } catch(e) {
      showToast('Lỗi: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatInput = (val) => {
    const num = String(val || '').replace(/\D/g, '')
    return num ? parseInt(num).toLocaleString('vi-VN') : ''
  }

  if (!ready) return <div style={{textAlign:'center',padding:'40px',color:LUX.ink3}}>Đang tải dữ liệu...</div>

  const selectStyle = {
    width: '100%', padding: '14px', borderRadius: '12px',
    border: `1px solid ${LUX.line}`, background: LUX.surface2,
    fontSize: '14px', color: LUX.ink, outline: 'none',
    boxSizing: 'border-box', fontFamily: LUX.fontSans, cursor: 'pointer',
  }

  return (
    <div>
      {/* Ngày */}
      <div style={{ marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>Ngày</div>
        <button onClick={() => setShowDatePicker(true)}
          style={{ width:'100%',padding:'14px',borderRadius:'12px',border:`1px solid ${LUX.line}`,background:LUX.surface2,textAlign:'left',fontSize:'14px',color:LUX.ink,cursor:'pointer',fontFamily:LUX.fontSans,display:'flex',alignItems:'center',gap:'8px' }}>
          <span>📅</span> {formatDateInput(ngay)}
        </button>
        <DatePicker open={showDatePicker} selectedDate={ngay}
          onClose={() => setShowDatePicker(false)}
          onConfirm={d => { setNgay(d); setShowDatePicker(false) }} />
      </div>

      {/* Doanh Thu: Hình thức */}
      {loai === 'thu' && (
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>Hình thức thanh toán</div>
          <select value={hinhThuc} onChange={e => setHinhThuc(e.target.value)} style={selectStyle}>
            <option value="tien_mat">💵 Tiền Mặt</option>
            <option value="chuyen_khoan">🏦 Chuyển Khoản</option>
            <option value="quet_the">💳 Quẹt Thẻ</option>
            <option value="the_tra_truoc">🎫 Thẻ Trả Trước</option>
          </select>
        </div>
      )}

      {/* Chi Phí: Danh mục + Hình thức thanh toán */}
      {loai === 'chi' && (
        <>
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>Danh mục chi phí</div>
            <select value={danhMucId} onChange={e => setDanhMucId(e.target.value)} style={selectStyle}>
              <option value="">-- Chọn danh mục --</option>
              {dmList.filter(d => d.parent_id).map(d => (
                <option key={d.id} value={d.id}>{d.ten}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>Tài khoản chi</div>
            <select value={hinhThucTT} onChange={e => setHinhThucTT(e.target.value)} style={selectStyle}>
              <option value="tien_mat">💵 Tiền Mặt</option>
              <option value="chuyen_khoan">🏦 Chuyển Khoản</option>
              <option value="quet_the">💳 Quẹt Thẻ</option>
            </select>
          </div>
        </>
      )}

      {/* Chuyển Khoản Nội Bộ: Ví nguồn → Ví đích */}
      {loai === 'chuyen_khoan' && (
        <>
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>Từ ví</div>
            <select value={tuViId} onChange={e => setTuViId(e.target.value)} style={selectStyle}>
              <option value="">-- Chọn ví nguồn --</option>
              {viList.map(v => (
                <option key={v.id} value={v.id}>{v.icon} {v.ten}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>Đến ví</div>
            <select value={denViId} onChange={e => setDenViId(e.target.value)} style={selectStyle}>
              <option value="">-- Chọn ví đích --</option>
              {viList.map(v => (
                <option key={v.id} value={v.id}>{v.icon} {v.ten}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Số tiền */}
      <div style={{ marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>Số tiền (đ)</div>
        <input
          value={formatInput(soTien)}
          onChange={e => setSoTien(e.target.value.replace(/\D/g,''))}
          style={{ width:'100%',padding:'14px',borderRadius:'12px',border:`1px solid ${LUX.line}`,fontSize:'18px',fontWeight:'800',color:LUX.ink,outline:'none',boxSizing:'border-box' }}
        />
      </div>

      {/* Diễn giải */}
      <div style={{ marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>Diễn giải</div>
        <input
          value={dienGiai}
          onChange={e => setDienGiai(e.target.value)}
          style={{ width:'100%',padding:'14px',borderRadius:'12px',border:`1px solid ${LUX.line}`,fontSize:'14px',color:LUX.ink,outline:'none',boxSizing:'border-box' }}
        />
      </div>

      {/* Lý do */}
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'6px',fontWeight:'600' }}>
          Lý do {isAdmin ? '' : '(bắt buộc — gửi Admin duyệt)'}
        </div>
        <textarea
          value={lyDo}
          onChange={e => setLyDo(e.target.value)}
          placeholder="Nhập lý do chỉnh sửa..."
          style={{ width:'100%',padding:'12px',borderRadius:'12px',border:`1px solid ${LUX.line}`,fontSize:'14px',resize:'none',height:'72px',outline:'none',boxSizing:'border-box' }}
        />
      </div>

      {/* Show diff summary */}
      {record && (
        <div style={{ background:'#FFF9F0',borderRadius:'12px',padding:'10px 14px',marginBottom:'16px',border:'1px solid #F0C080',fontSize:'11px',color:'#8B6914' }}>
          <div style={{fontWeight:'700',marginBottom:'4px'}}>Thay đổi sẽ được áp dụng:</div>
          {loai === 'thu' && hinhThuc !== (record.hinh_thuc || '') && <div>• Hình thức: {record.hinh_thuc} → {hinhThuc}</div>}
          {loai === 'chi' && danhMucId !== (record.danh_muc_id || '') && <div>• Danh mục: đổi sang ID mới</div>}
          {loai === 'chi' && hinhThucTT !== (record.hinh_thuc_thanh_toan || '') && <div>• TK chi: {record.hinh_thuc_thanh_toan} → {hinhThucTT}</div>}
          {loai === 'chuyen_khoan' && tuViId !== (record.tu_vi_id || '') && <div>• Ví nguồn: thay đổi</div>}
          {loai === 'chuyen_khoan' && denViId !== (record.den_vi_id || '') && <div>• Ví đích: thay đổi</div>}
          {parseInt(soTien.replace(/\D/g,'')) !== (record.so_tien || 0) && <div>• Số tiền: {formatCurrency(record.so_tien)} → {formatCurrency(parseInt(soTien.replace(/\D/g,'')))}</div>}
          {dienGiai !== (record.dien_giai || '') && <div>• Diễn giải: {record.dien_giai || '(trống)'} → {dienGiai || '(trống)'}</div>}
          {ngay !== (record.ngay || '') && <div>• Ngày: {formatDateInput(record.ngay)} → {formatDateInput(ngay)}</div>}
        </div>
      )}

      <div style={{ display:'flex',gap:'12px' }}>
        <button onClick={onClose}
          style={{ flex:1,padding:'14px',borderRadius:'14px',background:LUX.surface2,border:`1px solid ${LUX.line}`,fontWeight:'700',cursor:'pointer' }}>
          Hủy
        </button>
        <button onClick={handleSave} disabled={loading}
          style={{ flex:1,padding:'14px',borderRadius:'14px',background:LUX.heroGrad,color:'white',border:'none',fontWeight:'800',cursor:'pointer',opacity:loading?0.6:1 }}>
          {loading ? '...' : isAdmin ? 'Lưu ngay' : 'Gửi yêu cầu'}
        </button>
      </div>
    </div>
  )
}