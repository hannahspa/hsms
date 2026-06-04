import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++ }
  return `${bytes.toFixed(1)} ${units[i]}`
}

export default function DonChungTu({ onClose }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: buckets } = await supabase.storage.listBuckets()
        const bucket = buckets?.find(b => b.name === 'chung-tu')
        if (!bucket) {
          setStats({ exists: false })
          setLoading(false)
          return
        }

        // List all files recursively
        let totalSize = 0
        let totalFiles = 0
        const folders = []

        const { data: rootList } = await supabase.storage.from('chung-tu').list()
        if (rootList) {
          for (const item of rootList) {
            if (item.id === null || item.metadata === null) {
              // It's a folder (year)
              const { data: monthList } = await supabase.storage.from('chung-tu').list(item.name)
              if (monthList) {
                for (const month of monthList) {
                  const { data: fileList } = await supabase.storage.from('chung-tu').list(`${item.name}/${month.name}`)
                  if (fileList) {
                    const folderSize = fileList.reduce((s, f) => s + (f.metadata?.size || 0), 0)
                    totalSize += folderSize
                    totalFiles += fileList.length
                    folders.push({ path: `${item.name}/${month.name}`, files: fileList.length, size: folderSize })
                  }
                }
              }
            } else {
              totalSize += item.metadata?.size || 0
              totalFiles += 1
            }
          }
        }

        setStats({ exists: true, totalSize, totalFiles, folders })
      } catch (err) {
        console.error('Storage stats error:', err)
        setStats({ exists: false, error: err.message })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDeleteFolder = async (folderPath) => {
    setDeleting(true)
    try {
      const { data: fileList } = await supabase.storage.from('chung-tu').list(folderPath)
      if (fileList && fileList.length > 0) {
        const paths = fileList.map(f => `${folderPath}/${f.name}`)
        const { error } = await supabase.storage.from('chung-tu').remove(paths)
        if (error) throw error
      }
      setMsg({ type: 'success', text: `Đã xoá ${folderPath}` })
      // Refresh
      setStats(prev => ({
        ...prev,
        folders: prev.folders.filter(f => f.path !== folderPath),
        totalFiles: prev.totalFiles - (fileList?.length || 0),
        totalSize: prev.totalSize - (prev.folders.find(f => f.path === folderPath)?.size || 0),
      }))
    } catch (err) {
      setMsg({ type: 'error', text: 'Lỗi: ' + err.message })
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 600 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: LUX.surface2, borderRadius: '20px', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(42,32,26,0.35)' }}
        onClick={e => e.stopPropagation()}>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', background: msg.type === 'error' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${msg.type === 'error' ? '#FECACA' : '#BBF7D0'}`, color: msg.type === 'error' ? '#C0392B' : '#2D7A4F', fontSize: '13px', fontWeight: '600', fontFamily: LUX.fontSans }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Dọn Chứng Từ Cũ</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang quét storage...</div>
        ) : !stats?.exists ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: '600', color: LUX.ink, marginBottom: '4px', fontFamily: LUX.fontSans }}>Chưa có chứng từ nào</div>
            <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Bucket "chung-tu" chưa được tạo hoặc trống</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontMono }}>{stats.totalFiles}</div>
                <div style={{ fontSize: '10px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Files</div>
              </div>
              <div style={{ background: '#FDF4FF', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontMono }}>{formatBytes(stats.totalSize)}</div>
                <div style={{ fontSize: '10px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Dung lượng</div>
              </div>
              <div style={{ background: '#FEF2F2', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontMono }}>{stats.folders.length}</div>
                <div style={{ fontSize: '10px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Thư mục</div>
              </div>
            </div>

            {stats.folders.length > 0 && (
              <>
                <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '8px', fontWeight: '600', fontFamily: LUX.fontSans }}>CHỨNG TỪ THEO THÁNG</div>
                {stats.folders.map((f, i) => (
                  <div key={f.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < stats.folders.length - 1 ? `1px solid ${LUX.line}` : 'none' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: LUX.ink, fontFamily: LUX.fontSans }}>{f.path}</div>
                      <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{f.files} files • {formatBytes(f.size)}</div>
                    </div>
                    {confirmDelete === f.path ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setConfirmDelete(null)} style={{ padding: '4px 10px', borderRadius: '8px', border: `1px solid ${LUX.line}`, background: LUX.surface, fontSize: '11px', cursor: 'pointer', fontFamily: LUX.fontSans }}>Hủy</button>
                        <button onClick={() => handleDeleteFolder(f.path)} disabled={deleting} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', background: '#C0392B', color: 'white', fontSize: '11px', cursor: 'pointer', fontFamily: LUX.fontSans }}>Xoá</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(f.path)} style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: LUX.fontSans }}>🗑️</button>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
