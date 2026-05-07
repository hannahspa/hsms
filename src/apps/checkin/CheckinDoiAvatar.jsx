import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'

// ── Canvas helpers ────────────────────────────────────────────
function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = url
  })
}

// Trả về data URL (base64) — không cần Supabase Storage, tránh lỗi anon RLS
async function getCroppedDataUrl(imageSrc, crop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const SIZE = 320   // 320×320 đủ sắc nét, nhỏ gọn để lưu DB
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, SIZE, SIZE)
  return canvas.toDataURL('image/jpeg', 0.82)
}

// ── Avatar helpers ────────────────────────────────────────────
const GRADS = [
  'linear-gradient(135deg,#d4a574,#b08a55)',
  'linear-gradient(135deg,#a07a5c,#6a4a35)',
  'linear-gradient(135deg,#8a9a7a,#5a6a4a)',
  'linear-gradient(135deg,#b87a6a,#8a4a35)',
  'linear-gradient(135deg,#8a6a52,#5a4030)',
]
function getGrad(name) { let h = 0; for (const c of (name || '')) h += c.charCodeAt(0); return GRADS[h % GRADS.length] }
function getInitials(name) { if (!name) return '?'; const p = name.trim().split(' '); return p[p.length - 1].charAt(0).toUpperCase() }

// ── Sizes preview ─────────────────────────────────────────────
const PREVIEW_SIZES = [
  { px: 80,  label: 'Check-in'   },
  { px: 56,  label: 'Home'       },
  { px: 36,  label: 'Danh sách' },
]

// ─────────────────────────────────────────────────────────────
export default function CheckinDoiAvatar({ nhanVien, onBack, onUpdated }) {
  const [imageSrc,         setImageSrc]         = useState(null)
  const [crop,             setCrop]             = useState({ x: 0, y: 0 })
  const [zoom,             setZoom]             = useState(1)
  const [croppedAreaPixels,setCroppedAreaPixels]= useState(null)
  const [croppedPreview,   setCroppedPreview]   = useState(null)
  const [currentUrl,       setCurrentUrl]       = useState(nhanVien.avatar_url || null)
  const [uploading,        setUploading]        = useState(false)
  const [toast,            setToast]            = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Chọn ảnh từ gallery / camera
  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result)
      setCroppedPreview(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  // Cắt ảnh → preview tạm (data URL, không cần upload)
  const handlePreviewCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) return
    const dataUrl = await getCroppedDataUrl(imageSrc, croppedAreaPixels)
    setCroppedPreview(dataUrl)
  }

  // Xác nhận → lưu data URL thẳng vào DB (không qua Supabase Storage)
  // Tránh lỗi RLS anon: checkin không có Supabase Auth session
  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return
    setUploading(true)
    try {
      const dataUrl = await getCroppedDataUrl(imageSrc, croppedAreaPixels)

      const { error: dbErr } = await supabase
        .from('nhan_vien').update({ avatar_url: dataUrl }).eq('id', nhanVien.id)
      if (dbErr) throw dbErr

      setCurrentUrl(dataUrl)
      setImageSrc(null)
      setCroppedPreview(null)
      showToast('✓ Đã cập nhật ảnh đại diện!')
      onUpdated?.(dataUrl)
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    await supabase.from('nhan_vien').update({ avatar_url: null }).eq('id', nhanVien.id)
    setCurrentUrl(null)
    showToast('Đã xóa ảnh đại diện')
    onUpdated?.(null)
  }

  const previewUrl = croppedPreview || currentUrl
  const grad       = getGrad(nhanVien.ho_ten)
  const initials   = getInitials(nhanVien.ho_ten)

  // ── Màn hình Crop ─────────────────────────────────────────
  if (imageSrc) return (
    <div style={{ minHeight: '100dvh', background: '#0a0705', display: 'flex', flexDirection: 'column' }}>
      {toast && <ToastBubble toast={toast} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '52px 20px 12px', gap: 12, flexShrink: 0 }}>
        <button onClick={() => { setImageSrc(null); setCroppedPreview(null) }}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center', fontFamily: 'inherit' }}>
          ←
        </button>
        <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: 'white' }}>Cắt ảnh</div>
        <div style={{ marginLeft: 'auto', fontFamily: LUX.fontSans, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Kéo & phóng to để điều chỉnh
        </div>
      </div>

      {/* Crop zone — chiếm phần lớn màn hình */}
      <div style={{ position: 'relative', height: '52vw', minHeight: 280, maxHeight: 420, flexShrink: 0 }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#0a0705' },
            cropAreaStyle: {
              border: `2.5px solid ${LUX.gold}`,
              boxShadow: '0 0 0 9999px rgba(10,7,5,0.75)',
            },
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ flex: 1, padding: '16px 20px 40px', background: '#0a0705', display: 'flex', flexDirection: 'column' }}>
        {/* Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
          <input type="range" min={1} max={3} step={0.05} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: LUX.gold, height: 4 }}
          />
          <span style={{ fontSize: 16, opacity: 0.5 }}>🔎</span>
        </div>

        {/* Preview 3 kích thước */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
          {PREVIEW_SIZES.map(({ px, label }) => (
            <div key={px} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: px, height: px, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${LUX.gold}50`, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {croppedPreview
                  ? <img src={croppedPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: px * 0.4, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: LUX.fontSans }}>{initials}</span>
                }
              </div>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: LUX.fontSans }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Nút xem trước + lưu */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePreviewCrop}
            style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(201,169,110,0.15)', border: `1px solid ${LUX.gold}40`, color: LUX.gold, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Xem trước
          </button>
          <button onClick={handleSave} disabled={uploading}
            style={{ flex: 2, padding: '14px', borderRadius: 14, background: uploading ? 'rgba(201,169,110,0.4)' : LUX.goldGrad, border: 'none', color: 'white', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 14, cursor: uploading ? 'not-allowed' : 'pointer', boxShadow: uploading ? 'none' : `0 6px 20px ${LUX.gold}40` }}>
            {uploading ? '⏳ Đang lưu...' : '✓ Cắt & Lưu'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Màn hình hiển thị avatar hiện tại ────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#2a1f15 0%,#1a1209 50%,#0f0a06 100%)', display: 'flex', flexDirection: 'column', fontFamily: LUX.fontSans }}>
      {toast && <ToastBubble toast={toast} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '52px 20px 20px', gap: 12 }}>
        <button onClick={onBack}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center', fontFamily: 'inherit' }}>
          ←
        </button>
        <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: 'white' }}>Ảnh Đại Diện</div>
      </div>

      {/* Avatar lớn + preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px 40px' }}>
        {/* Avatar chính */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ width: 140, height: 140, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${LUX.gold}60`, boxShadow: `0 12px 48px rgba(201,169,110,0.25)` }}>
            {previewUrl
              ? <img src={previewUrl} alt={nhanVien.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: LUX.fontSerif, fontSize: 56, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{initials}</span>
                </div>
            }
          </div>
          {/* Camera badge */}
          <div style={{ position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, borderRadius: '50%', background: LUX.goldGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '2px solid #0a0705' }}>
            📷
          </div>
        </div>

        <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, color: 'white', marginBottom: 4 }}>{nhanVien.ho_ten}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 36 }}>
          {previewUrl ? 'Ảnh hiển thị trong check-in & toàn hệ thống' : 'Chưa có ảnh đại diện'}
        </div>

        {/* Preview 3 size */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20, marginBottom: 40 }}>
          {PREVIEW_SIZES.map(({ px, label }) => (
            <div key={px} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: px, height: px, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${LUX.gold}40`, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previewUrl
                  ? <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: px * 0.4, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{initials}</span>
                }
              </div>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label>
            <div style={{ padding: '16px', borderRadius: 16, background: LUX.goldGrad, color: 'white', fontWeight: 700, fontSize: 15, textAlign: 'center', cursor: 'pointer', boxShadow: `0 6px 20px ${LUX.gold}40` }}>
              📷 Chọn ảnh / Chụp mới
            </div>
            {/* Không dùng capture — để OS tự hiện picker (camera + thư viện) */}
            <input type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
          </label>

          {previewUrl && (
            <button onClick={handleRemove}
              style={{ padding: '14px', borderRadius: 16, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontFamily: LUX.fontSans, fontSize: 13, cursor: 'pointer' }}>
              Xóa ảnh hiện tại
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ToastBubble({ toast }) {
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'error' ? '#C0392B' : '#2D7A4F', color: 'white', padding: '12px 24px', borderRadius: 12, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
      {toast.msg}
    </div>
  )
}
