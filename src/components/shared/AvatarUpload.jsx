import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts[parts.length - 1].charAt(0).toUpperCase()
}
function getAvatarColor(name) {
  if (!name) return LUX.taupe
  const p = [LUX.taupe, '#8a6a4a', LUX.rose, LUX.sage, '#5a4a6a']
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return p[h % p.length]
}

export default function AvatarUpload({ currentUrl, onUploaded, nvId, nvName }) {
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState(null)
  const [error,     setError]     = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const ext      = file.name.split('.').pop() || 'jpg'
      // Dùng nvId làm tên file để upsert đúng — không tạo file mới mỗi lần đổi ảnh
      const fileName = nvId ? `${nvId}.${ext}` : `${Date.now()}.${ext}`
      const { data, error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
      // Thêm cache-bust để ảnh cũ không bị cache khi đổi
      onUploaded?.(publicUrl + '?t=' + Date.now())
    } catch (err) {
      console.error('Avatar upload:', err)
      setPreview(null)
      setError('Upload thất bại: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUploaded?.(null)
  }

  const url = preview || currentUrl
  const bgColor = getAvatarColor(nvName)

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Ảnh Đại Diện
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: LUX.surface2, borderRadius: LUX.radiusSm, padding: '16px', border: `1px solid ${LUX.line}` }}>
        {/* Avatar preview */}
        <div style={{ width: '76px', height: '76px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, border: `2px solid ${url ? LUX.champagne : LUX.line}`, background: url ? 'transparent' : bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: url ? `0 4px 16px ${bgColor}40` : 'none', transition: 'all 0.2s' }}>
          {url
            ? <img src={url} alt={nvName || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '30px', fontWeight: 700, color: 'white', fontFamily: LUX.fontSans }}>{getInitials(nvName)}</span>
          }
        </div>

        {/* Info + Actions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: '15px', fontWeight: 600, color: LUX.espresso, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nvName || 'Nhân viên'}
          </div>
          <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginBottom: '10px', lineHeight: 1.4 }}>
            {url ? '✓ Đã có ảnh · ' : ''}Hiển thị trong Check-in &amp; toàn hệ thống
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ padding: '8px 16px', borderRadius: LUX.radiusSm, background: uploading ? LUX.champagne2 : LUX.goldGrad, fontFamily: LUX.fontSans, fontSize: '12px', fontWeight: 700, color: 'white', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.8 : 1, display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: uploading ? 'none' : `0 3px 10px ${LUX.gold}40`, whiteSpace: 'nowrap' }}>
              {uploading ? '⏳ Đang tải...' : url ? '📷 Đổi ảnh' : '📷 Tải ảnh lên'}
              <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
            </label>
            {url && !uploading && (
              <button onClick={handleRemove} style={{ padding: '8px 12px', borderRadius: LUX.radiusSm, background: LUX.surface, border: `1px solid ${LUX.line}`, fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Xóa ảnh
              </button>
            )}
          </div>

          {error && (
            <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.danger, marginTop: '6px' }}>{error}</div>
          )}
        </div>
      </div>
    </div>
  )
}
