import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, todayISO, formatDateInput } from '../../../../lib/utils'
import { HINH_THUC_THU } from '../../../../constants/enums'
import DatePicker from '../../../../components/shared/DatePicker'
import ImageUpload from '../../../../components/shared/ImageUpload'
import I from '../../../../components/shared/Icons'

const S = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 500 },
  sheet: { background: 'var(--surface)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 520, margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp .3s ease' },
  handle: { display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'var(--line2)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  iconBox: (bg) => ({ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  title: { fontWeight: 700, fontSize: 16, color: 'var(--ink)', fontFamily: 'var(--serif)' },
  subtitle: { fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--sans)' },
  closeBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)', padding: 4, lineHeight: 1 },
  body: { padding: '0 16px 32px' },
  amountCard: { background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 20, marginBottom: 12, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', textAlign: 'center' },
  amountLabel: { fontSize: 12, color: 'var(--ink3)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--sans)' },
  amountInput: (hasVal) => ({ width: '100%', border: 'none', outline: 'none', fontSize: 36, fontWeight: 700, textAlign: 'center', background: 'transparent', color: hasVal ? '#2D7A4F' : 'var(--line2)', fontFamily: 'var(--serif)' }),
  amountDisplay: { fontSize: 14, color: '#2D7A4F', fontWeight: 600, marginTop: 4, fontFamily: 'var(--sans)' },
  section: { background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '18px 20px', marginBottom: 12, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)' },
  sectionLabel: { fontSize: 12, color: 'var(--ink3)', marginBottom: 14, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--sans)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  methodBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-sm)', border: active ? '2px solid var(--espresso)' : '1px solid var(--line)', background: active ? 'var(--surface)' : 'var(--surface2)', cursor: 'pointer', transition: 'all .15s' }),
  methodIcon: { fontSize: 22 },
  methodLabel: (active) => ({ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--espresso)' : 'var(--ink)', fontFamily: 'var(--sans)' }),
  check: { marginLeft: 'auto', color: 'var(--espresso)', fontSize: 14 },
  hint: { marginTop: 12, padding: 10, background: 'rgba(160,113,79,0.06)', borderRadius: 10, fontSize: 12, color: 'var(--ink2)', textAlign: 'center', fontWeight: 500, fontFamily: 'var(--sans)' },
  row: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: 12, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', cursor: 'pointer' },
  rowIcon: (bg) => ({ width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 11, color: 'var(--ink3)', marginBottom: 2, fontFamily: 'var(--sans)' },
  rowValue: { fontSize: 15, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' },
  arrow: { fontSize: 18, color: 'var(--ink3)' },
  textareaRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  saveBtn: (saving) => ({ width: '100%', padding: 16, background: saving ? 'var(--ink3)' : 'linear-gradient(135deg,#2D7A4F,#1A5A3A)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(45,122,79,0.35)', transition: 'all .2s', fontFamily: 'var(--sans)' }),
}

function getViName(loaiVi, viList) {
  if (!loaiVi) return 'Thẻ Trả Trước (không vào ví)'
  const vi = viList.find(v => v.loai === loaiVi)
  return vi ? vi.ten : loaiVi
}

export default function FormDoanhThu({ user, onClose, onSaved, viList = [], initialData }) {
  const [soTien, setSoTien] = useState('')
  const [hinhThuc, setHinhThuc] = useState(null)
  const [ngay, setNgay] = useState(todayISO())
  const [dienGiai, setDienGiai] = useState('')
  const [chungTuUrl, setChungTuUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showLich, setShowLich] = useState(false)
  const isEdit = !!initialData

  useEffect(() => {
    if (!initialData) return
    setSoTien(String(initialData.so_tien || ''))
    setNgay(initialData.ngay || todayISO())
    setDienGiai(initialData.dien_giai || '')
    setChungTuUrl(initialData.chung_tu_url || null)
    const ht = HINH_THUC_THU.find(h => h.id === initialData.hinh_thuc)
    if (ht) setHinhThuc(ht)
  }, [initialData])

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0) return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!hinhThuc) return onSaved('error', 'Vui lòng chọn hình thức thu!')

    setSaving(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('doanh_thu').update({
          ngay: ngay, hinh_thuc: hinhThuc.id, so_tien: parseInt(soTien), dien_giai: dienGiai || null,
          chung_tu_url: chungTuUrl,
        }).eq('id', initialData.id)
        if (error) throw error
        onSaved('success', `Đã cập nhật doanh thu ${formatCurrency(parseInt(soTien))}!`)
      } else {
        const { error } = await supabase.from('doanh_thu').insert({
          ngay: ngay, hinh_thuc: hinhThuc.id, so_tien: parseInt(soTien), dien_giai: dienGiai || null,
          nguoi_nhap: user?.ho_ten || null,
          chung_tu_url: chungTuUrl,
        })
        if (error) throw error
        onSaved('success', `Đã thu ${formatCurrency(parseInt(soTien))} thành công!`)
      }
      onClose()
    } catch (err) {
      onSaved('error', 'Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={(d) => { setNgay(d); setShowLich(false) }} />

      <div style={S.sheet}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={S.handle}><div style={S.handleBar} /></div>

        <div style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.iconBox('#F0FDF4')}><I.Coin style={{ width: 18, height: 18, color: '#2D7A4F' }} /></div>
            <div>
              <div style={S.title}>{isEdit ? 'Sửa Doanh Thu' : 'Doanh Thu'}</div>
              <div style={S.subtitle}>{isEdit ? 'Chỉnh sửa doanh thu' : 'Nhập doanh thu mới'}</div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={S.body}>
          <div style={S.amountCard}>
            <div style={S.amountLabel}>Số Tiền</div>
            <input type="number" placeholder="0" value={soTien} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))} style={S.amountInput(!!soTien)} />
            {soTien ? <div style={S.amountDisplay}>{new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ</div> : null}
          </div>

          <div style={S.section}>
            <div style={S.sectionLabel}>Hình Thức Thu</div>
            <div style={S.grid2}>
              {HINH_THUC_THU.map(ht => {
                const active = hinhThuc?.id === ht.id
                return (
                  <button key={ht.id} onClick={() => setHinhThuc(ht)} style={S.methodBtn(active)}>
                    <span style={S.methodIcon}>{ht.icon}</span>
                    <span style={S.methodLabel(active)}>{ht.label}</span>
                    {active && <span style={S.check}>&#10003;</span>}
                  </button>
                )
              })}
            </div>
            {hinhThuc && (
              <div style={S.hint}>
                <I.Info style={{ width: 12, height: 12, verticalAlign: 'middle', marginRight: 4 }} />
                Tiền sẽ tự động cập nhật vào: <b style={{ color: 'var(--espresso)' }}>{getViName(hinhThuc.loaiVi, viList)}</b>
              </div>
            )}
          </div>

          <div style={S.row} onClick={() => setShowLich(true)}>
            <div style={S.rowIcon('#EFF6FF')}><I.Calendar style={{ width: 18, height: 18, color: '#1A4F70' }} /></div>
            <div style={S.rowContent}>
              <div style={S.rowLabel}>Ngày Thu</div>
              <div style={S.rowValue}>{formatDateInput(ngay)}</div>
            </div>
            <div style={S.arrow}>&rsaquo;</div>
          </div>

          <div style={{ ...S.section, marginBottom: 12 }}>
            <div style={S.textareaRow}>
              <div style={S.rowIcon('#FDF4FF')}><I.Edit style={{ width: 18, height: 18, color: '#6C3483' }} /></div>
              <div style={{ flex: 1 }}>
                <div style={S.rowLabel}>Diễn Giải</div>
                <textarea placeholder="Ghi chú thêm (không bắt buộc)..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)', background: 'transparent', resize: 'none', fontFamily: 'var(--sans)' }} />
              </div>
            </div>
          </div>

          <ImageUpload onUploaded={(url) => setChungTuUrl(url)} onRemove={() => setChungTuUrl(null)} />

          <button onClick={handleSave} disabled={saving} style={S.saveBtn(saving)}>
            {saving ? 'Đang lưu...' : (isEdit ? 'Cập Nhật' : 'Lưu Doanh Thu')}
          </button>
        </div>
      </div>
    </div>
  )
}
