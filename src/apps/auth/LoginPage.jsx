import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { COLORS } from '../../constants/colors'

export default function LoginPage() {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!phone || !password) {
      setError('Vui lòng nhập số điện thoại và mật khẩu')
      return
    }
    
    setLoading(true)
    setError('')
    try {
      // Trick: Dùng số điện thoại + đuôi @hannahspa.vn để xài ké hệ thống Email Auth của Supabase
      const fakeEmail = `${phone}@hannahspa.vn`
      await login(fakeEmail, password)
      // Chuyển hướng tự động dựa theo role sẽ được xử lý ở App.jsx
    } catch (err) {
      setError('Đăng nhập thất bại. Kiểm tra lại thông tin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: COLORS.card, padding: '40px 32px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: COLORS.primary, fontSize: '28px', fontWeight: '800', fontFamily: 'Dancing Script, cursive', marginBottom: '8px' }}>
            Hannah Luxury
          </h1>
          <p style={{ color: COLORS.textMute, fontSize: '14px' }}>Hệ thống quản trị nội bộ</p>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textSub, marginBottom: '8px', textTransform: 'uppercase' }}>Số Điện Thoại</label>
            <input 
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="09..."
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textSub, marginBottom: '8px', textTransform: 'uppercase' }}>Mật khẩu</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '8px',
              width: '100%', 
              padding: '16px', 
              background: COLORS.grad, 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px', 
              fontWeight: '800', 
              fontSize: '15px', 
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(160, 113, 79, 0.2)'
            }}
          >
            {loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
          </button>
        </form>
      </div>
    </div>
  )
}