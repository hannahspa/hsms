import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'

export default function TabXetDuyet() {
  const [danhSachCho, setDanhSachCho] = useState([])
  const [nvMap, setNvMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  },[])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Lấy map nhân viên
      const { data: nvData } = await supabase.from('nhan_vien').select('id, ho_ten, vi_tri')
      const map = {}
      nvData?.forEach(nv => {
        const parts = nv.ho_ten.trim().split(' ')
        map[nv.id] = {
          ten: parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : nv.ho_ten,
          vi_tri: nv.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'
        }
      })
      setNvMap(map)

      // 2. Lấy đơn OFF chờ duyệt
      const { data: offData } = await supabase
        .from('dang_ky_off')
        .select('*')
        .eq('trang_thai', 'cho_duyet')
        .order('created_at', { ascending: false })
      
      setDanhSachCho(offData ||[])
    } catch (error) {
      console.error("Lỗi fetch đơn:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDuyet = async (id, trangThaiMoi) => {
    if (trangThaiMoi === 'tu_choi') {
      const lyDo = window.prompt("Nhập lý do từ chối (Nhân viên sẽ thấy):", "Không thể duyệt do thiếu người")
      if (lyDo === null) return // User bấm Cancel
      
      await supabase.from('dang_ky_off').update({ 
        trang_thai: 'tu_choi',
        ghi_chu_duyet: lyDo 
      }).eq('id', id)
    } else {
      await supabase.from('dang_ky_off').update({ 
        trang_thai: 'duoc_duyet',
        ghi_chu_duyet: 'OK' 
      }).eq('id', id)
    }
    
    // Refresh lại data
    fetchData()
  }

  const fmtDate = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const getLoaiUI = (loaiOff) => {
    switch (loaiOff) {
      case 'off_phep': return { bg: '#DBEAFE', color: '#1E40AF', label: 'OFF Phép' }
      case 'off_ov': return { bg: '#FEE2E2', color: '#991B1B', label: 'OFF Ko Lương' }
      case 'off_t7': return { bg: '#F3E8FF', color: '#6B21A8', label: 'OFF T7/CN (x2)' }
      case 'off_t7x': return { bg: '#FEE2E2', color: '#991B1B', label: 'Vi Phạm T7/CN' }
      default: return { bg: '#F3F4F6', color: '#374151', label: loaiOff }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.text, margin: 0 }}>Đơn Xin OFF</h2>
          <div style={{ fontSize: '13px', color: COLORS.textMute, marginTop: '4px' }}>Cần anh Nam xem xét</div>
        </div>
        <div style={{ background: '#FEF2F2', color: '#C0392B', padding: '4px 12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px' }}>
          {danhSachCho.length} đơn chờ
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>Đang tải dữ liệu...</div>
      ) : danhSachCho.length === 0 ? (
        <div style={{ background: COLORS.card, padding: '40px 20px', borderRadius: '24px', textAlign: 'center', border: `1px dashed ${COLORS.border}` }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
          <div style={{ fontWeight: '700', color: COLORS.text }}>Không có đơn nào chờ duyệt!</div>
          <div style={{ fontSize: '13px', color: COLORS.textMute, marginTop: '4px' }}>Spa đang hoạt động trơn tru</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {danhSachCho.map(don => {
            const nv = nvMap[don.nhan_vien_id] || { ten: 'Không rõ', vi_tri: '' }
            const loaiUI = getLoaiUI(don.loai_off)
            
            // Check cảnh báo T7/CN
            const[y, m, d_val] = don.ngay_off.split('-')
            const isWeekend = new Date(y, m-1, d_val).getDay() === 0 || new Date(y, m-1, d_val).getDay() === 6
            const isBatKhaKhang = don.ly_do.length > 20 && don.loai_off !== 'off_phep'

            return (
              <div key={don.id} style={{ background: COLORS.card, borderRadius: '20px', padding: '16px', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: COLORS.primary, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px' }}>
                      {nv.ten.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', color: COLORS.text, fontSize: '15px' }}>{nv.ten}</div>
                      <div style={{ fontSize: '12px', color: COLORS.textMute }}>{nv.vi_tri}</div>
                    </div>
                  </div>
                  <div style={{ background: loaiUI.bg, color: loaiUI.color, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
                    {loaiUI.label}
                  </div>
                </div>

                <div style={{ background: '#FAF7F4', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: COLORS.textMute, fontWeight: '600' }}>Xin nghỉ ngày:</span>
                    <span style={{ fontSize: '14px', color: COLORS.primary, fontWeight: '800' }}>{fmtDate(don.ngay_off)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.textMute, fontWeight: '600', marginBottom: '4px' }}>Lý do:</div>
                  <div style={{ fontSize: '13px', color: COLORS.text, fontStyle: 'italic', lineHeight: '1.5' }}>
                    "{don.ly_do}"
                  </div>
                </div>

                {isWeekend && (
                  <div style={{ fontSize: '11px', color: '#C0392B', background: '#FEF2F2', padding: '6px 10px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>⚠️</span> CẢNH BÁO: Rơi vào Thứ 7 / Chủ Nhật
                  </div>
                )}
                
                {isBatKhaKhang && !isWeekend && (
                  <div style={{ fontSize: '11px', color: '#8B6914', background: '#FEF9E7', padding: '6px 10px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>🔥</span> CHÚ Ý: Bất khả kháng (Đã đủ người OFF)
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleDuyet(don.id, 'tu_choi')}
                    style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#FEE2E2', color: '#991B1B', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>
                    ❌ TỪ CHỐI
                  </button>
                  <button onClick={() => handleDuyet(don.id, 'duoc_duyet')}
                    style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#DCFCE7', color: '#166534', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>
                    ✅ DUYỆT ĐƠN
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
