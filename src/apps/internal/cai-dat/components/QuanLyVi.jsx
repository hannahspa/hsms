import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency } from '../../../../lib/utils'

export default function QuanLyVi({ onClose }) {
  const [viList, setViList] = useState([])
  const [editingVi, setEditingVi] = useState(null)
  const [soDuDau, setSoDuDau] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('vi').select('*').order('thu_tu')
      if (data) setViList(data)
      setLoading(false)
    }
    load()
  }, [])

  const showToast = (msg, type) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleSave = async () => {
    const val = parseInt(soDuDau.replace(/\D/g, ''))
    if (!val && val !== 0) return showToast('Vui lòng nhập số dư hợp lệ', 'error')
    setSaving(true)
    try {
      const { error } = await supabase
        .from('vi')
        .update({ so_du_dau: val })
        .eq('id', editingVi.id)
      if (error) throw error
      showToast(`Đã cập nhật số dư đầu ${editingVi.ten}`, 'success')
      setViList(prev => prev.map(v => v.id === editingVi.id ? { ...v, so_du_dau: val } : v))
      setEditingVi(null)
      setSoDuDau('')
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const getViDesc = (loai) => {
    if (loai === 'tien_mat') return 'Tiền mặt tại quầy'
    if (loai === 'ngan_hang') return 'Tài khoản ngân hàng'
    return loai || ''
  }

  if (editingVi) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 601 }}
      onClick={e => { if (e.target === e.currentTarget) setEditingVi(null) }}>
      <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Số Dư Đầu Kỳ</h3>
            <div style={{ fontSize: '13px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{editingVi.icon} {editingVi.ten}</div>
          </div>
          <button onClick={() => setEditingVi(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '4px', fontFamily: LUX.fontSans }}>Số dư đầu hiện tại</div>
          <div style={{ fontWeight: '700', fontSize: '18px', color: LUX.ink, fontFamily: LUX.fontMono }}>{formatCurrency(editingVi.so_du_dau)}</div>
        </div>

        <div style={{ background: LUX.surface2, borderRadius: LUX.radius, padding: '20px', marginBottom: '20px', border: `1px solid ${LUX.line}`, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '8px', fontFamily: LUX.fontSans }}>Số Dư Đầu Mới</div>
          <input type="number" placeholder="0" value={soDuDau} onChange={e => setSoDuDau(e.target.value.replace(/\D/g, ''))}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '32px', fontWeight: '700', textAlign: 'center', background: 'transparent', color: LUX.taupe, fontFamily: LUX.fontMono }} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setEditingVi(null)} style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, background: LUX.surface2, border: `1px solid ${LUX.line}`, fontWeight: '600', cursor: 'pointer', fontFamily: LUX.fontSans }}>Hủy</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, background: LUX.heroGrad, color: 'white', border: 'none', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: LUX.fontSans }}>
            {saving ? '...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 600 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {toast && (
          <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'error' ? '#C0392B' : '#2D7A4F', color: 'white', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '12px' }}>
            {toast.msg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Quản Lý Ví / Két</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>
        <p style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '20px', fontFamily: LUX.fontSans }}>
          Số dư đầu kỳ dùng để tính lũy kế. Chỉ nên cập nhật sau khi chốt sổ.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
        ) : viList.map((vi, i) => (
          <div key={vi.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `linear-gradient(135deg,${LUX.surface},${LUX.line})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  {vi.icon}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: LUX.ink, fontFamily: LUX.fontSans }}>{vi.ten}</div>
                  <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{getViDesc(vi.loai)}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontMono }}>{formatCurrency(vi.so_du_dau)}</div>
                <button
                  onClick={() => { setEditingVi(vi); setSoDuDau(String(vi.so_du_dau || '')) }}
                  style={{ background: 'none', border: 'none', color: LUX.taupe, fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: LUX.fontSans, marginTop: '2px' }}>
                  Chỉnh sửa
                </button>
              </div>
            </div>
            {i < viList.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
          </div>
        ))}

        <div style={{ marginTop: '20px', padding: '12px', background: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: '12px', color: '#1E40AF', fontFamily: LUX.fontSans }}>
            💡 Số dư hiện tại = Số dư đầu + Tổng thu - Tổng chi ± Chuyển khoản. Thay đổi ở đây ảnh hưởng đến toàn bộ số liệu.
          </div>
        </div>
      </div>
    </div>
  )
}
