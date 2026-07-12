import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'
import { notify } from '../ui/notify'

export default function ImageUpload({ onUploaded, onRemove }) {
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [_uploadedUrl, setUploadedUrl] = useState(null)
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const now = new Date()
      const nam = now.getFullYear()
      const thang = String(now.getMonth() + 1).padStart(2, '0')
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${crypto.randomUUID()}.${ext}`
      const path = `chung-tu/${nam}/${thang}/${fileName}`

      const { error } = await supabase.storage
        .from('chung-tu')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('chung-tu')
        .getPublicUrl(path)

      const publicUrl = urlData?.publicUrl
      setUploadedUrl(publicUrl)
      onUploaded?.(publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      setPreview(null)
      notify('Không thể upload chứng từ. Kiểm tra kết nối hoặc bucket chưa được tạo.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setUploadedUrl(null)
    onRemove?.()
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {preview ? (
        <div style={{ background: LUX.surface2, borderRadius: LUX.radius, padding: '12px', border: `1px solid ${LUX.line}`, boxShadow: LUX.shadowSm }}>
          <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '8px', fontFamily: LUX.fontSans }}>
            {uploading ? '⏳ Đang tải lên...' : '📎 Chứng từ'}
          </div>
          <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
            <img src={preview} alt="Chứng từ" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${LUX.line}`, background: LUX.surface, fontWeight: '600', fontSize: '12px', color: LUX.ink, cursor: 'pointer', fontFamily: LUX.fontSans }}
            >
              🔄 Đổi ảnh
            </button>
            <button
              onClick={handleRemove}
              disabled={uploading}
              style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #FECACA', background: '#FEF2F2', fontWeight: '600', fontSize: '12px', color: '#C0392B', cursor: 'pointer', fontFamily: LUX.fontSans }}
            >
              ✕ Xoá
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', background: LUX.surface2, borderRadius: LUX.radius, padding: '16px 20px', border: `1px dashed ${LUX.line}`, cursor: 'pointer', boxShadow: LUX.shadowSm }}
        >
          <span style={{ fontSize: '20px' }}>📷</span>
          <span style={{ fontWeight: '600', fontSize: '13px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
            {uploading ? 'Đang tải...' : 'Chụp / Chọn chứng từ'}
          </span>
        </button>
      )}
    </div>
  )
}
