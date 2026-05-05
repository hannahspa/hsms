import { useState, useRef } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency } from '../../../../lib/utils'
import * as XLSX from 'xlsx'

/**
 * Import Excel từ POS myspa.vn cho Kỳ 2 Lương Kinh Doanh.
 *
 * Cột Excel:
 *   0: Tên nhân viên
 *   5: Doanh số sau giảm
 *   7: commission (%) theo ngày tìm kiếm (= Hoa hồng)
 *   9: Tổng tiền tour NV
 *
 * Flow:
 *   - Tất cả NV: import Hoa hồng + Tiền Tour từ Excel
 *   - Lễ Tân: trả về DS_sau_giam cho parent để tính Lương Kinh Doanh
 */
export default function BangLuongImportPOS({ thang, nam, nvList, onImported }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState(null)
  const fileRef = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const parseFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })

        if (rows.length < 2) {
          showToast('File Excel trống hoặc không đúng định dạng', 'error')
          return
        }

        const header = rows[0].map(h => String(h || '').toLowerCase().trim())
        const idxTen     = header.findIndex(h => h.includes('tên') || h.includes('nhân viên'))
        const idxHoaHong = header.findIndex(h => h.includes('commission') && h.includes('ngày'))
        const idxTour    = header.findIndex(h => h.includes('tour'))
        const idxDSgiam  = header.findIndex(h => h.includes('doanh số sau giảm'))

        if (idxTen < 0) {
          showToast('Không tìm thấy cột "Tên nhân viên"', 'error')
          return
        }

        // Build name → nv map
        const nameMap = {}
        nvList.forEach(nv => {
          const parts = nv.ho_ten.trim().split(' ')
          const shortName = parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}`.toLowerCase() : nv.ho_ten.toLowerCase()
          nameMap[shortName] = nv
          nameMap[nv.ho_ten.toLowerCase()] = nv
        })

        const allList = [] // tất cả NV (KTV + Lễ Tân)
        const leTanDS = {} // DS sau giảm cho Lễ Tân
        const unmatched = []

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || !row[idxTen]) continue

          const rawName = String(row[idxTen]).trim()
          const nv = nameMap[rawName.toLowerCase()]
          if (!nv) {
            unmatched.push(rawName)
            continue
          }

          const hoaHong = idxHoaHong >= 0 ? Math.round(parseFloat(row[idxHoaHong]) || 0) : 0
          const tienTour = idxTour >= 0 ? Math.round(parseFloat(row[idxTour]) || 0) : 0
          const dsSauGiam = idxDSgiam >= 0 ? Math.round(parseFloat(row[idxDSgiam]) || 0) : 0

          allList.push({ nv, hoaHong, tienTour, tong: hoaHong + tienTour })

          // Giữ lại DS sau giảm của Lễ Tân để tính Lương Kinh Doanh
          if (nv.vi_tri === 'le_tan') {
            leTanDS[nv.ho_ten] = dsSauGiam
          }
        }

        setPreview({ allList, leTanDS, unmatched })
        if (allList.length === 0) {
          showToast('Không khớp được nhân viên nào.', 'error')
        }
      } catch (err) {
        showToast('Lỗi đọc file: ' + err.message, 'error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    parseFile(f)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!preview || preview.allList.length === 0) return
    setImporting(true)
    try {
      let ok = 0, fail = 0

      for (const item of preview.allList) {
        const { data: existing } = await supabase.from('bang_luong')
          .select('id').eq('nhan_vien_id', item.nv.id).eq('thang', thang).eq('nam', nam).maybeSingle()

        const payload = {
          nhan_vien_id: item.nv.id, thang, nam,
          hoa_hong_dv: item.hoaHong,
          hoa_hong_the: 0,
          tien_tour: item.tienTour,
        }

        if (existing) {
          const { error } = await supabase.from('bang_luong').update(payload).eq('id', existing.id)
          if (error) { fail++; continue }
        } else {
          const { error } = await supabase.from('bang_luong').insert(payload)
          if (error) { fail++; continue }
        }
        ok++
      }

      showToast(`Đã import ${ok} NV${fail > 0 ? `, ${fail} lỗi` : ''}`)
      setFile(null)
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      // Pass Lễ Tân DS + Excel rows back to parent for Lương Kinh Doanh calculation
      onImported?.(preview.leTanDS || {})
    } catch (e) {
      showToast('Lỗi import: ' + e.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: toast.type === 'error' ? LUX.danger : LUX.sage, color: 'white', padding: '12px 24px', borderRadius: LUX.radiusSm, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '13px', boxShadow: LUX.shadowLg, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Upload area */}
      <div style={{
        background: '#fdf3e0', borderRadius: LUX.radius, padding: '16px',
        border: `1px dashed ${LUX.champagne}`, textAlign: 'center',
      }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange}
          style={{ display: 'none' }} id="pos-excel-upload" />

        {!file ? (
          <label htmlFor="pos-excel-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600, color: LUX.espresso, marginBottom: 4 }}>
              Import Excel từ POS myspa.vn
            </div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3 }}>
              .xlsx — Hoa hồng + Tiền Tour cho tất cả nhân viên
            </div>
          </label>
        ) : (
          <div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 13, fontWeight: 600, color: LUX.espresso, marginBottom: 8 }}>
              {file.name}
            </div>
            <button onClick={() => { setFile(null); setPreview(null) }}
              style={{ background: 'none', border: 'none', color: LUX.danger, cursor: 'pointer', fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 600 }}>
              Chọn file khác
            </button>
          </div>
        )}
      </div>

      {/* Preview table */}
      {preview && preview.allList.length > 0 && (
        <div style={{ marginTop: 12, background: LUX.surface, borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${LUX.line}`, fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700, color: LUX.ink3, display: 'flex', justifyContent: 'space-between' }}>
            <span>{preview.allList.length} nhân viên</span>
            {preview.unmatched.length > 0 && (
              <span style={{ color: LUX.danger }}>{preview.unmatched.length} không khớp</span>
            )}
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: LUX.fontSans, fontSize: 12 }}>
              <thead>
                <tr style={{ background: LUX.bg }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: LUX.ink3, fontSize: 10 }}>NV</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: LUX.ink3, fontSize: 10 }}>Vai trò</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: LUX.ink3, fontSize: 10 }}>Hoa Hồng</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: LUX.ink3, fontSize: 10 }}>Tiền Tour</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: LUX.ink3, fontSize: 10 }}>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {preview.allList.map((item, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${LUX.line}` }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: LUX.espresso }}>
                      {item.nv.ho_ten.trim().split(' ').slice(-2).join(' ')}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: item.nv.vi_tri === 'le_tan' ? '#1A5276' : LUX.taupe, background: item.nv.vi_tri === 'le_tan' ? '#e8f0fe' : '#fdf3e0', padding: '2px 8px', borderRadius: 8 }}>
                        {item.nv.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: LUX.fontMono, color: item.hoaHong > 0 ? LUX.sage : LUX.ink3 }}>
                      {item.hoaHong > 0 ? formatCurrency(item.hoaHong) : '-'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: LUX.fontMono, color: item.tienTour > 0 ? '#1A5276' : LUX.ink3 }}>
                      {item.tienTour > 0 ? formatCurrency(item.tienTour) : '-'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: LUX.fontMono, fontWeight: 700, color: LUX.taupe }}>
                      {formatCurrency(item.tong)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.unmatched.length > 0 && (
            <div style={{ padding: '10px 16px', background: '#FFF5F5', borderTop: `1px solid ${LUX.danger}20`, fontFamily: LUX.fontSans, fontSize: 11, color: LUX.danger }}>
              Không khớp: {preview.unmatched.join(', ')}
            </div>
          )}

          {/* Import button */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${LUX.line}` }}>
            <button onClick={handleImport} disabled={importing}
              style={{ width: '100%', padding: '12px', borderRadius: LUX.radiusSm, border: 'none', background: LUX.goldGrad, color: 'white', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 14px ${LUX.gold}50`, opacity: importing ? 0.7 : 1 }}>
              {importing ? 'Đang import...' : `Áp Dụng Vào Kỳ 2 Tháng ${thang}/${nam}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
