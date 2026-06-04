import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'

export default function DoiMatKhau({ onClose }) {
  const [matKhauCu, setMatKhauCu] = useState('')
  const [matKhauMoi, setMatKhauMoi] = useState('')
  const [xacNhan, setXacNhan] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const handleDoiMatKhau = async () => {
    if (!matKhauCu || !matKhauMoi || !xacNhan) return setMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ các trường' })
    if (matKhauMoi.length < 6) return setMsg({ type: 'error', text: 'Mật khẩu mới phải ít nhất 6 ký tự' })
    if (matKhauMoi !== xacNhan) return setMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' })

    setLoading(true)
    setMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: matKhauMoi })
      if (error) throw error
      setMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' })
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      setMsg({ type: 'error', text: 'Lỗi: ' + (err.message === 'New password should be different from the old password.' ? 'Mật khẩu mới phải khác mật khẩu cũ' : err.message) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 600 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: LUX.surface2, borderRadius: '20px', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(42,32,26,0.35)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Đổi Mật Khẩu</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', background: msg.type === 'error' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${msg.type === 'error' ? '#FECACA' : '#BBF7D0'}`, color: msg.type === 'error' ? '#C0392B' : '#2D7A4F', fontSize: '13px', fontWeight: '600', fontFamily: LUX.fontSans }}>
            {msg.text}
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '4px', fontFamily: LUX.fontSans }}>Mật khẩu hiện tại</div>
          <input type="password" value={matKhauCu} onChange={e => setMatKhauCu(e.target.value)}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${LUX.line}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '4px', fontFamily: LUX.fontSans }}>Mật khẩu mới</div>
          <input type="password" value={matKhauMoi} onChange={e => setMatKhauMoi(e.target.value)}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${LUX.line}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '4px', fontFamily: LUX.fontSans }}>Xác nhận mật khẩu mới</div>
          <input type="password" value={xacNhan} onChange={e => setXacNhan(e.target.value)}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${LUX.line}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, background: LUX.surface2, border: `1px solid ${LUX.line}`, fontWeight: '600', cursor: 'pointer', fontFamily: LUX.fontSans }}>Hủy</button>
          <button onClick={handleDoiMatKhau} disabled={loading} style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, background: LUX.heroGrad, color: 'white', border: 'none', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: LUX.fontSans }}>
            {loading ? '...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </div>
    </div>
  )
}
