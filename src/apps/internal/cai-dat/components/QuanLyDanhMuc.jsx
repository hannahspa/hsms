import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { notify } from '../../../../components/ui/notify'

export default function QuanLyDanhMuc({ onClose }) {
  const [danhMuc, setDanhMuc] = useState([])
  const[loading, setLoading] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState(null)
  
  // State cho Form Thêm/Sửa
  const [editItem, setEditItem] = useState(null) // null = không mở form, {} = mở form
  const [formData, setFormData] = useState({ id: '', ten: '', icon: '', parent_id: '', is_active: true })
  const [saving, setSaving] = useState(false)

  // 1. TẢI DỮ LIỆU
  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase.from('danh_muc_chi_phi').select('*').order('thu_tu');
    if (data) setDanhMuc(data);
    setLoading(false)
  }

  useEffect(() => { loadData() },[])

  // Phân tách Nhóm (cha) và Hạng mục (con)
  const nhomList = danhMuc.filter(d => d.parent_id === null)
  const hangMucList = danhMuc.filter(d => d.parent_id !== null)

  // 2. XỬ LÝ LƯU (THÊM HOẶC SỬA)
  const handleSave = async () => {
    if (!formData.ten) return notify('Vui lòng nhập tên hạng mục!', 'error');
    setSaving(true)
    try {
      if (formData.id) {
        // Lệnh UPDATE (Sửa)
        await supabase.from('danh_muc_chi_phi').update({
          ten: formData.ten, icon: formData.icon, is_active: formData.is_active
        }).eq('id', formData.id);
      } else {
        // Lệnh INSERT (Thêm mới)
        await supabase.from('danh_muc_chi_phi').insert({
          ten: formData.ten, icon: formData.icon, parent_id: formData.parent_id, is_active: true, thu_tu: 99
        });
      }
      await loadData(); // Tải lại dữ liệu mới nhất
      setEditItem(null); // Đóng form
    } catch (err) { notify('Lỗi: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  // 3. MỞ FORM THÊM MỚI (Thuộc 1 nhóm)
  const openAddForm = (nhomId) => {
    setFormData({ id: '', ten: '', icon: '🏷️', parent_id: nhomId, is_active: true });
    setEditItem('add');
  }

  // 4. MỞ FORM SỬA (1 Hạng mục)
  const openEditForm = (item) => {
    setFormData({ id: item.id, ten: item.ten, icon: item.icon, parent_id: item.parent_id, is_active: item.is_active });
    setEditItem('edit');
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FAF7F4', zIndex: 900, overflowY: 'auto', animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn { from{opacity:0; transform:translateX(20px)} to{opacity:1; transform:translateX(0)} }`}</style>
      
      {/* HEADER QUAY LẠI */}
      <div style={{ background: LUX.surface2, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '15px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', color: LUX.taupe, cursor: 'pointer', fontWeight: '800' }}>‹</button>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: LUX.ink, margin: 0 }}>Danh Mục Chi Phí</h2>
      </div>

      <div style={{ padding: '20px 16px', paddingBottom: '100px' }}>
        <div style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '20px', lineHeight: '1.5' }}>
          💡 Quản lý các hạng mục chi tiêu của Spa. Bạn có thể thêm mới hoặc ẩn các hạng mục không dùng nữa. 
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3 }}>Đang tải danh mục...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {nhomList.map(nhom => {
              const isOpen = expandedGroup === nhom.id;
              const childs = hangMucList.filter(h => h.parent_id === nhom.id);
              
              return (
                <div key={nhom.id} style={{ background: LUX.surface2, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(139,94,60,0.05)', border: `1px solid ${LUX.line}` }}>
                  
                  {/* HEADER NHÓM */}
                  <button onClick={() => setExpandedGroup(isOpen ? null : nhom.id)} style={{ width: '100%', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isOpen ? 'linear-gradient(135deg, #FDFBF9, #F5EDE6)' : 'white', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '24px' }}>{nhom.icon}</div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: LUX.ink }}>{nhom.ten}</div>
                        <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '2px' }}>{childs.length} hạng mục con</div>
                      </div>
                    </div>
                    <div style={{ color: LUX.taupe, fontSize: '20px', fontWeight: '700', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }}>›</div>
                  </button>

                  {/* NỘI DUNG BÊN TRONG KHI MỞ RA */}
                  {isOpen && (
                    <div style={{ padding: '10px 20px 20px', borderTop: `1px solid ${LUX.line}` }}>
                      {childs.map((item, i) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < childs.length - 1 ? '1px dashed #E0D4CA' : 'none', opacity: item.is_active ? 1 : 0.4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '20px' }}>{item.icon}</div>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: LUX.ink, textDecoration: item.is_active ? 'none' : 'line-through' }}>{item.ten}</div>
                          </div>
                          <button onClick={() => openEditForm(item)} style={{ background: '#F5F5F5', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: LUX.ink2, cursor: 'pointer' }}>Sửa</button>
                        </div>
                      ))}
                      
                      {/* Nút thêm mới */}
                      <button onClick={() => openAddForm(nhom.id)} style={{ width: '100%', marginTop: '14px', padding: '14px', border: `1px dashed ${LUX.taupe}`, borderRadius: '14px', background: 'transparent', color: LUX.taupe, fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>+</span> Thêm hạng mục mới
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* POPUP THÊM/SỬA HẠNG MỤC */}
      {editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }} onClick={() => setEditItem(null)}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.bg, padding: '24px 28px', overflowY: 'auto', boxShadow: '-6px 0 40px rgba(42,32,26,0.28)', animation: 'rpSlideIn .22s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>{editItem === 'add' ? 'Thêm Hạng Mục' : 'Sửa Hạng Mục'}</h3>
              <button onClick={() => setEditItem(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: LUX.ink3 }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ width: '70px' }}>
                <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '6px', fontWeight: '600' }}>Icon (Emoji)</div>
                <input type="text" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} style={{ width: '100%', padding: '14px 0', textAlign: 'center', borderRadius: '14px', border: `1px solid ${LUX.line}`, fontSize: '20px', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '6px', fontWeight: '600' }}>Tên hạng mục</div>
                <input type="text" value={formData.ten} onChange={e => setFormData({...formData, ten: e.target.value})} placeholder="Vd: Mua hoa trang trí..." style={{ width: '100%', padding: '14px', borderRadius: '14px', border: `1px solid ${LUX.line}`, fontSize: '14px', fontWeight: '600', color: LUX.ink, outline: 'none' }} />
              </div>
            </div>

            {/* Trạng thái Ẩn/Hiện (Chỉ có khi Sửa) */}
            {editItem === 'edit' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: LUX.surface2, borderRadius: '16px', border: `1px solid ${LUX.line}`, marginBottom: '24px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: LUX.ink }}>Hoạt động</div>
                  <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '2px' }}>Tắt để ẩn khỏi màn hình nhập liệu</div>
                </div>
                {/* Nút Toggle Switch tự làm */}
                <div onClick={() => setFormData({...formData, is_active: !formData.is_active})} style={{ width: '50px', height: '28px', borderRadius: '20px', background: formData.is_active ? '#2D7A4F' : '#E0E0E0', position: 'relative', cursor: 'pointer', transition: '0.3s' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: formData.is_active ? '24px' : '2px', transition: '0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            )}

            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', background: LUX.taupe, color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}>
              {saving ? '⏳ Đang lưu...' : '💾 Lưu Thay Đổi'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}