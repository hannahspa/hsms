import { useRef, useEffect, useState } from 'react'
import { LUX } from '../../constants/lux'

// Chụp selfie xác thực chấm công (camera trước). Trả ảnh nén base64 (480px, JPEG 0.6).
// Dùng để chống check-in hộ: người khác không chụp được mặt mình.
export default function SelfieCapture({ onCapture, onCancel, title = 'Chụp ảnh xác thực' }) {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Thiết bị không hỗ trợ camera.')
      return
    }
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false,
    })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
        setReady(true)
      })
      .catch(() => setError('Không mở được camera. Hãy cấp quyền Camera cho trình duyệt rồi thử lại.'))
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const size = 480
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')
    const vw = video.videoWidth, vh = video.videoHeight
    const s = Math.min(vw, vh)
    ctx.drawImage(video, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, size, size)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
    streamRef.current?.getTracks().forEach(t => t.stop())
    onCapture(dataUrl)
  }

  const btn = (bg, enabled = true) => ({
    padding: '14px 28px', borderRadius: 14, border: 'none', background: bg, color: '#fff',
    fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 15, cursor: enabled ? 'pointer' : 'wait', opacity: enabled ? 1 : 0.6,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ color: '#f5ede0', fontFamily: LUX.fontSerif, fontSize: 19, fontWeight: 600, marginBottom: 16 }}>{title}</div>
      {error ? (
        <div style={{ color: '#fff', textAlign: 'center', maxWidth: 300 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 14, marginBottom: 22, lineHeight: 1.5 }}>{error}</div>
          <button onClick={onCancel} style={btn('rgba(255,255,255,0.16)')}>Đóng</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', width: 260, height: 260, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(212,165,116,0.6)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', background: '#000' }}>
            {/* Video phủ đầy khung tròn + căn giữa (min 100% + translate) — chắc chắn không bị nửa đen/lệch trên iPhone */}
            <video ref={videoRef} playsInline autoPlay muted
              style={{ position: 'absolute', top: '50%', left: '50%', minWidth: '100%', minHeight: '100%', width: 'auto', height: 'auto', transform: 'translate(-50%, -50%) scaleX(-1)', objectFit: 'cover' }} />
          </div>
          <div style={{ color: 'rgba(245,237,224,0.7)', fontSize: 12.5, margin: '16px 0 22px' }}>Đưa khuôn mặt vào khung tròn</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <button onClick={onCancel} style={btn('rgba(255,255,255,0.16)')}>Hủy</button>
            <button onClick={capture} disabled={!ready} style={btn('linear-gradient(135deg,#d4a574,#a07a4a)', ready)}>
              {ready ? '📸 Chụp' : 'Đang mở camera...'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
