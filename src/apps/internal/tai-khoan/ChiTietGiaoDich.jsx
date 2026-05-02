import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { formatCurrency } from '../../../lib/utils'

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

  const fmt = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

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
        showToast('Đã gửi yêu cầu xóa — chờ Admin duyệt')
        setTimeout(() => onBack(), 1500)
      }
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const loaiColor = giaoDich.loai === 'thu' ? COLORS.thu : giaoDich.loai === 'chi' ? COLORS.chi : COLORS.chuyenKhoan
  const loaiIcon  = giaoDich.loai === 'thu' ? '💰' : giaoDich.loai === 'chi' ? '💸' : '🔄'

  return (
    <div style={{ background:'#FAF7F4',minHeight:'100vh',paddingBottom:'100px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:'20px',left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='error'?COLORS.chi:'#2D7A4F',color:'white',padding:'12px 24px',borderRadius:'12px',fontWeight:'700',fontSize:'13px',boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background:COLORS.grad,padding:'44px 20px 24px' }}>
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
        <div style={{ background:COLORS.card,borderRadius:'24px',padding:'20px',marginBottom:'16px',border:`1px solid ${COLORS.border}`,boxShadow:COLORS.shadow }}>
          <div style={{ fontWeight:'800',fontSize:'15px',color:COLORS.text,marginBottom:'16px' }}>Thông tin giao dịch</div>

          {[
            { label:'Ngày',        value: fmt(giaoDich.ngay) },
            { label:'Hình thức',   value: HINH_THUC_LABELS[giaoDich.hinh_thuc] || giaoDich.hinh_thuc || giaoDich.mo_ta || '—' },
            { label:'Danh mục',    value: giaoDich.ten_danh_muc || giaoDich.ten_vi_tu || '—' },
            { label:'Diễn giải',   value: giaoDich.dien_giai || '—' },
          ].map(row => (
            <div key={row.label} style={{ display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${COLORS.border}` }}>
              <span style={{ fontSize:'13px',color:COLORS.textMute }}>{row.label}</span>
              <span style={{ fontSize:'13px',fontWeight:'700',color:COLORS.text,maxWidth:'60%',textAlign:'right' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Nút hành động */}
        {canEdit && (
          <div style={{ display:'flex',gap:'12px',marginBottom:'16px' }}>
            <button
              onClick={() => setShowEditForm(true)}
              style={{ flex:1,padding:'16px',borderRadius:'16px',background:COLORS.card,border:`2px solid ${COLORS.primary}`,color:COLORS.primary,fontWeight:'800',fontSize:'14px',cursor:'pointer' }}>
              ✏️ Sửa
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ flex:1,padding:'16px',borderRadius:'16px',background:'#FEF2F2',border:`2px solid ${COLORS.chi}`,color:COLORS.chi,fontWeight:'800',fontSize:'14px',cursor:'pointer' }}>
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
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',zIndex:999 }}
          onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background:COLORS.bg,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'420px',margin:'0 auto',padding:'24px 20px 40px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'32px',textAlign:'center',marginBottom:'12px' }}>🗑️</div>
            <h3 style={{ fontSize:'18px',fontWeight:'800',color:COLORS.text,textAlign:'center',marginBottom:'8px' }}>
              {isAdmin ? 'Xóa giao dịch?' : 'Gửi yêu cầu xóa?'}
            </h3>
            <p style={{ fontSize:'13px',color:COLORS.textMute,textAlign:'center',marginBottom:'20px' }}>
              {isAdmin
                ? 'Hành động này không thể hoàn tác.'
                : 'Yêu cầu sẽ được gửi cho Admin duyệt.'}
            </p>
            <textarea
              value={lyDo}
              onChange={e => setLyDo(e.target.value)}
              placeholder="Nhập lý do xóa..."
              style={{ width:'100%',padding:'12px',borderRadius:'12px',border:`1px solid ${COLORS.border}`,fontSize:'14px',resize:'none',height:'80px',marginBottom:'16px',boxSizing:'border-box',outline:'none' }}
            />
            <div style={{ display:'flex',gap:'12px' }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ flex:1,padding:'14px',borderRadius:'14px',background:COLORS.card,border:`1px solid ${COLORS.border}`,fontWeight:'700',cursor:'pointer' }}>
                Hủy
              </button>
              <button onClick={handleDelete} disabled={loading}
                style={{ flex:1,padding:'14px',borderRadius:'14px',background:COLORS.chi,color:'white',border:'none',fontWeight:'800',cursor:'pointer',opacity:loading?0.6:1 }}>
                {loading ? '...' : isAdmin ? 'Xóa ngay' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa — placeholder, anh muốn tôi làm đầy đủ thì nói */}
      {showEditForm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',zIndex:999 }}
          onClick={() => setShowEditForm(false)}>
          <div style={{ background:COLORS.bg,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'420px',margin:'0 auto',padding:'24px 20px 40px' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize:'18px',fontWeight:'800',color:COLORS.text,marginBottom:'20px' }}>✏️ Sửa Giao Dịch</h3>
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

// ── Sub-component: Form sửa ───────────────────────────────
function EditGiaoDich({ giaoDich, user, isAdmin, onClose, onUpdated, showToast }) {
  const [soTien,    setSoTien]    = useState(String(giaoDich.so_tien))
  const [dienGiai,  setDienGiai]  = useState(giaoDich.dien_giai || '')
  const [lyDo,      setLyDo]      = useState('')
  const [loading,   setLoading]   = useState(false)

  const getLoaiBang = () => {
    if (giaoDich.loai === 'thu') return 'doanh_thu'
    if (giaoDich.loai === 'chi') return 'chi_phi'
    return 'chuyen_khoan_noi_bo'
  }

  const handleSave = async () => {
    if (!lyDo.trim()) { showToast('Vui lòng nhập lý do sửa', 'error'); return }
    const parsed = parseInt(soTien.replace(/\D/g, ''))
    if (!parsed || parsed <= 0) { showToast('Số tiền không hợp lệ', 'error'); return }

    setLoading(true)
    try {
      const duLieuMoi = { so_tien: parsed, dien_giai: dienGiai }

      if (isAdmin) {
        const { error } = await supabase
          .from(getLoaiBang())
          .update(duLieuMoi)
          .eq('id', giaoDich.ban_ghi_id || giaoDich.id)
        if (error) throw error
        showToast('Đã cập nhật giao dịch')
        setTimeout(() => onUpdated(), 1000)
      } else {
        const { error } = await supabase.from('yeu_cau_chinh_sua').insert({
          loai_bang:     getLoaiBang(),
          ban_ghi_id:    giaoDich.ban_ghi_id || giaoDich.id,
          loai_yeu_cau:  'sua',
          du_lieu_cu:    giaoDich,
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
    const num = val.replace(/\D/g, '')
    return num ? parseInt(num).toLocaleString('vi-VN') : ''
  }

  return (
    <div>
      <div style={{ marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',color:COLORS.textMute,marginBottom:'6px',fontWeight:'600' }}>Số tiền (đ)</div>
        <input
          value={formatInput(soTien)}
          onChange={e => setSoTien(e.target.value.replace(/\D/g,''))}
          style={{ width:'100%',padding:'14px',borderRadius:'12px',border:`1px solid ${COLORS.border}`,fontSize:'18px',fontWeight:'800',color:COLORS.text,outline:'none',boxSizing:'border-box' }}
        />
      </div>
      <div style={{ marginBottom:'16px' }}>
        <div style={{ fontSize:'12px',color:COLORS.textMute,marginBottom:'6px',fontWeight:'600' }}>Diễn giải</div>
        <input
          value={dienGiai}
          onChange={e => setDienGiai(e.target.value)}
          style={{ width:'100%',padding:'14px',borderRadius:'12px',border:`1px solid ${COLORS.border}`,fontSize:'14px',color:COLORS.text,outline:'none',boxSizing:'border-box' }}
        />
      </div>
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'12px',color:COLORS.textMute,marginBottom:'6px',fontWeight:'600' }}>
          Lý do {isAdmin ? '' : '(bắt buộc — gửi Admin duyệt)'}
        </div>
        <textarea
          value={lyDo}
          onChange={e => setLyDo(e.target.value)}
          placeholder="Nhập lý do chỉnh sửa..."
          style={{ width:'100%',padding:'12px',borderRadius:'12px',border:`1px solid ${COLORS.border}`,fontSize:'14px',resize:'none',height:'72px',outline:'none',boxSizing:'border-box' }}
        />
      </div>
      <div style={{ display:'flex',gap:'12px' }}>
        <button onClick={onClose}
          style={{ flex:1,padding:'14px',borderRadius:'14px',background:COLORS.card,border:`1px solid ${COLORS.border}`,fontWeight:'700',cursor:'pointer' }}>
          Hủy
        </button>
        <button onClick={handleSave} disabled={loading}
          style={{ flex:1,padding:'14px',borderRadius:'14px',background:COLORS.grad,color:'white',border:'none',fontWeight:'800',cursor:'pointer',opacity:loading?0.6:1 }}>
          {loading ? '...' : isAdmin ? 'Lưu ngay' : 'Gửi yêu cầu'}
        </button>
      </div>
    </div>
  )
}