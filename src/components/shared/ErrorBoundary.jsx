import { Component } from 'react'
import { LUX } from '../../constants/lux'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: LUX.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          fontFamily: LUX.fontSans,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', marginBottom: 24,
            background: 'linear-gradient(135deg, #C9A96E, #A0714F, #7D5A3C)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 8px 32px rgba(139,94,60,0.25)',
          }}>
            <span style={{ fontSize: 36, color: '#f5ede0', fontFamily: LUX.fontSerif, fontWeight: 600 }}>!</span>
          </div>
          <h2 style={{
            fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600,
            color: LUX.espresso, margin: '0 0 8px', textAlign: 'center',
          }}>
            Đã xảy ra lỗi
          </h2>
          <p style={{
            fontSize: 14, color: LUX.ink3, textAlign: 'center',
            marginBottom: 24, lineHeight: 1.5, maxWidth: 360,
          }}>
            Vui lòng thử tải lại trang. Nếu lỗi vẫn tiếp tục, liên hệ quản lý.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px', borderRadius: 999,
              background: 'linear-gradient(135deg, #C9A96E, #A0714F, #7D5A3C)',
              border: 'none', color: 'white', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: LUX.fontSans,
              boxShadow: '0 4px 16px rgba(139,94,60,0.3)',
            }}
          >
            Tải Lại Trang
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
