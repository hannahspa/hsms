import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'

export default function AvatarUpload({ currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
      onUploaded?.(publicUrl)
    } catch (err) {
      console.error('Avatar upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const url = preview || currentUrl

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden',
        border: `2px solid ${LUX.line}`, background: LUX.surface2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '32px', color: LUX.ink3,
      }}>
        {url ? (
          <img src={url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>👤</span>
        )}
      </div>

      <label style={{
        padding: '8px 16px', borderRadius: LUX.radiusSm,
        background: LUX.surface2, border: `1px solid ${LUX.line}`,
        fontFamily: LUX.fontSans, fontSize: '12px', fontWeight: 600,
        color: LUX.taupe, cursor: 'pointer',
        opacity: uploading ? 0.5 : 1,
      }}>
        {uploading ? '⏳ Đang tải...' : (url ? 'Đổi ảnh' : 'Tải ảnh lên')}
        <input type="file" accept="image/*" onChange={handleFile}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  )
}
