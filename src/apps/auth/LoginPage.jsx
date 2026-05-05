import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { COLORS } from '../../constants/colors'

export default function LoginPage() {
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('') // SĐT hoặc email
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    const id = identifier.trim()
    if (!id || !password) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    setLoading(true)
    setError('')
    try {
      // Nếu nhập SĐT → thêm prefix nv để tránh Supabase reject email bắt đầu bằng số
      // Nếu đã có @ → dùng thẳng (admin nhập email thật)
      const email = id.includes('@') ? id : `nv${id}@hannahspa.vn`
      await login(email, password)
      // Redirect xử lý trong App.jsx (RequireAuth) sau khi user profile load xong
    } catch {
      setError('Sai thông tin đăng nhập. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>

      {/* Header gradient */}
      <div style={{ background: COLORS.grad, padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌸</div>
        <div style={{ color: 'white', fontSize: '26px', fontWeight: '800', fontFamily: 'Dancing Script, cursive', marginBottom: '4px' }}>
          Hannah Beauty & Spa
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
          Giữ Mãi Nét Thanh Xuân Của Bạn
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontWeight: '800', fontSize: '20px', color: COLORS.text }}>Đăng Nhập</div>
            <div style={{ color: COLORS.textMute, fontSize: '13px', marginTop: '4px' }}>
              Dành cho Quản trị viên & Lễ Tân
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Identifier */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textSub, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Số Điện Thoại hoặc Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="09xxxxxxxx  hoặc  email@..."
                autoComplete="username"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: `1.5px solid ${identifier ? COLORS.primary : COLORS.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', color: COLORS.text, background: COLORS.card, transition: 'border-color 0.2s' }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textSub, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mật Khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ width: '100%', padding: '14px 48px 14px 16px', borderRadius: '14px', border: `1.5px solid ${password ? COLORS.primary : COLORS.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', color: COLORS.text, background: COLORS.card, transition: 'border-color 0.2s' }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: COLORS.textMute, padding: '0' }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || !identifier || !password}
              style={{ marginTop: '8px', width: '100%', padding: '16px', background: (loading || !identifier || !password) ? '#E5E7EB' : COLORS.grad, color: (loading || !identifier || !password) ? COLORS.textMute : 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: (loading || !identifier || !password) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: (loading || !identifier || !password) ? 'none' : '0 4px 16px rgba(160,113,79,0.3)', letterSpacing: '0.5px' }}>
              {loading ? '⏳ Đang đăng nhập...' : 'ĐĂNG NHẬP'}
            </button>

          </form>

          {/* Ghi chú */}
          <div style={{ marginTop: '28px', background: COLORS.card, borderRadius: '16px', padding: '16px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '12px', color: COLORS.textMute, fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
              Hướng dẫn
            </div>
            <div style={{ fontSize: '12px', color: COLORS.textSub, lineHeight: '1.7' }}>
              <div>👑 <strong>Admin</strong> — nhập email hoặc số điện thoại</div>
              <div>💁 <strong>Lễ Tân</strong> — nhập số điện thoại</div>
              <div style={{ marginTop: '8px', color: COLORS.textMute }}>
                KTV & Tạp Vụ sử dụng trang{' '}
                <a href="/checkin" style={{ color: COLORS.primary, fontWeight: '700' }}>/checkin</a>
                {' '}(đăng nhập bằng PIN)
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
