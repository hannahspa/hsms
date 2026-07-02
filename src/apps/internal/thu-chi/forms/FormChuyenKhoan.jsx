import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, todayISO, formatDateInput } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'
import I from '../../../../components/shared/Icons'
import RightPanel from '../../../../components/shared/RightPanel'

const S = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 500 },
  panelOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(42,32,26,0.55)', zIndex: 500 },
  sheet: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: 'var(--surface)', overflowY: 'auto', boxShadow: '-6px 0 40px rgba(42,32,26,0.28)', animation: 'rpSlideIn .22s ease' },
  handle: { display: 'none' },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'var(--line2)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  iconBox: (bg) => ({ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  title: { fontWeight: 700, fontSize: 16, color: 'var(--ink)', fontFamily: 'var(--serif)' },
  subtitle: { fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--sans)' },
  closeBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)', padding: 4, lineHeight: 1 },
  body: { padding: '0 16px 32px' },
  amountCard: { background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 20, marginBottom: 16, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', textAlign: 'center' },
  amountLabel: { fontSize: 12, color: 'var(--ink3)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--sans)' },
  amountInput: (hasVal) => ({ width: '100%', border: 'none', outline: 'none', fontSize: 36, fontWeight: 700, textAlign: 'center', background: 'transparent', color: hasVal ? '#6C3483' : 'var(--line2)', fontFamily: 'var(--serif)' }),
  amountDisplay: { fontSize: 14, color: '#6C3483', fontWeight: 600, marginTop: 4, fontFamily: 'var(--sans)' },
  section: { background: 'var(--surface2)', borderRadius: 'var(--r)', marginBottom: 16, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', overflow: 'hidden' },
  viBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer' },
  viBtnLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  viIcon: (bg) => ({ width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  viLabel: { fontSize: 11, color: 'var(--ink3)', marginBottom: 2, fontFamily: 'var(--sans)' },
  viValue: (hasVal) => ({ fontWeight: 600, fontSize: 14, color: hasVal ? 'var(--ink)' : 'var(--ink3)', fontFamily: 'var(--sans)' }),
  arrow: { color: 'var(--champagne)', fontSize: 18 },
  arrowCenter: { display: 'flex', justifyContent: 'center', padding: '8px 0', background: 'var(--surface)', position: 'relative' },
  arrowCircle: { width: 32, height: 32, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-1)' },
  row: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: 16, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', cursor: 'pointer' },
  rowIcon: (bg) => ({ width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 11, color: 'var(--ink3)', marginBottom: 2, fontFamily: 'var(--sans)' },
  rowValue: { fontSize: 15, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' },
  textareaRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  saveBtn: (saving) => ({ width: '100%', padding: 16, background: saving ? 'var(--ink3)' : 'linear-gradient(135deg,#8B5CF6,#6C3483)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(108,52,131,0.35)', transition: 'all .2s', fontFamily: 'var(--sans)' }),
  pickSheet: { background: 'var(--surface2)', borderRadius: 20, width: '100%', maxWidth: 520, margin: '0 auto', padding: '24px 20px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(42,32,26,0.35)' },
  pickHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickTitle: { fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)' },
  pickItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer' },
  pickItemLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  pickItemIcon: { width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,var(--surface),var(--line))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  pickItemTitle: { fontWeight: 600, fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', textAlign: 'left' },
  pickItemSub: { fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--sans)', textAlign: 'left' },
  divider: { height: 1, background: 'var(--line)' },
}

function ViIcon({ loai }) {
  if (loai === 'tien_mat') return <I.Coin style={{ width: 22, height: 22, color: '#3E5A32' }} />
  if (loai === 'chuyen_khoan') return <I.Bank style={{ width: 22, height: 22, color: '#1A4F70' }} />
  return <I.Wallet style={{ width: 22, height: 22, color: '#5A3E22' }} />
}

export default function FormChuyenKhoan({ viList, user, onClose, onSaved }) {
  const [soTien, setSoTien] = useState('')
  const [ngay, setNgay] = useState(todayISO())
  const [dienGiai, setDienGiai] = useState('')
  const [saving, setSaving] = useState(false)
  const [showLich, setShowLich] = useState(false)
  const [tuViId, setTuViId] = useState(null)
  const [denViId, setDenViId] = useState(null)
  const [step, setStep] = useState('main')

  const tuVi = viList?.find(v => v.id === tuViId)
  const denVi = viList?.find(v => v.id === denViId)

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0) return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!tuViId || !denViId) return onSaved('error', 'Vui lòng chọn đầy đủ Ví gửi và Ví nhận!')
    if (tuViId === denViId) return onSaved('error', 'Ví gửi và Ví nhận không được trùng nhau!')

    if (user?.vai_tro !== 'admin') {
      const { data: freshVi } = await supabase
        .from('so_du_vi_thuc_te')
        .select('so_du_hien_tai')
        .eq('id', tuViId)
        .single()
      const soDuTu = freshVi?.so_du_hien_tai ?? tuVi?.so_du_hien_tai ?? 0
      if (parseInt(soTien) > soDuTu) {
        return onSaved('error', `Số Dư ${tuVi?.ten || 'Ví Nguồn'} không đủ để chuyển khoản tiền này.`)
      }
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('chuyen_khoan_noi_bo').insert({
        ngay,
        tu_vi_id: tuViId,
        den_vi_id: denViId,
        so_tien: parseInt(soTien),
        dien_giai: dienGiai || null,
        nguoi_thuc_hien: user?.ho_ten || null,
      })
      if (error) throw error
      onSaved('success', `Đã chuyển ${formatCurrency(parseInt(soTien))} thành công!`)
      onClose()
    } catch (err) {
      onSaved('error', 'Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Chọn ví (dùng chung cho chọn ví gửi và ví nhận) ──
  if (step === 'chon_tu_vi' || step === 'chon_den_vi') {
    const title = step === 'chon_tu_vi' ? 'Chọn Ví Gửi Đi' : 'Chọn Ví Nhận Đến'
    const excludeId = step === 'chon_tu_vi' ? denViId : tuViId
    const available = viList?.filter(v => v.id !== excludeId && (step === 'chon_den_vi' || v.loai === 'quet_the')) || []

    return (
      <div style={{ ...S.overlay, zIndex: 600 }}>
        <div style={S.pickSheet}>
          <div style={S.pickHeader}>
            <h3 style={S.pickTitle}>{title}</h3>
            <button style={S.closeBtn} onClick={() => setStep('main')}>&times;</button>
          </div>
          {available.map((vi, i) => (
            <div key={vi.id}>
              <button onClick={() => { step === 'chon_tu_vi' ? setTuViId(vi.id) : setDenViId(vi.id); setStep('main') }} style={S.pickItem}>
                <div style={S.pickItemLeft}>
                  <div style={S.pickItemIcon}><ViIcon loai={vi.loai} /></div>
                  <div>
                    <div style={S.pickItemTitle}>{vi.ten}</div>
                    <div style={S.pickItemSub}>{vi.loai === 'tien_mat' ? 'Tiền mặt' : 'Ngân hàng'}</div>
                  </div>
                </div>
              </button>
              {i < available.length - 1 && <div style={S.divider} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Form chính (panel chuẩn RightPanel — đồng bộ cách xuất hiện toàn hệ thống) ──
  return (
    <RightPanel open onClose={onClose} title="Chuyển Khoản Nội Bộ" subtitle="Quẹt thẻ về MB hoặc rút tiền mặt"
      bodyStyle={{ padding: '18px 16px 24px' }}
      footer={<button onClick={handleSave} disabled={saving} style={S.saveBtn(saving)}>{saving ? 'Đang lưu...' : 'Lưu Chuyển Khoản'}</button>}>
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={d => { setNgay(d); setShowLich(false) }} />
      <div>
          {/* Số tiền */}
          <div style={S.amountCard}>
            <div style={S.amountLabel}>Số Tiền Chuyển</div>
            <input type="number" placeholder="0" value={soTien} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))} style={S.amountInput(!!soTien)} />
            {soTien ? <div style={S.amountDisplay}>{new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ</div> : null}
          </div>

          {/* Chọn ví */}
          <div style={S.section}>
            <button onClick={() => setStep('chon_tu_vi')} style={{ ...S.viBtn, borderBottom: `1px solid var(--line)` }}>
              <div style={S.viBtnLeft}>
                <div style={S.viIcon('#FEF2F2')}>
                  {tuVi ? <ViIcon loai={tuVi.loai} /> : <I.Wallet style={{ width: 20, height: 20, color: '#C0392B' }} />}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={S.viLabel}>Từ Tài Khoản</div>
                  <div style={S.viValue(!!tuVi)}>{tuVi ? tuVi.ten : 'Chọn ví gửi...'}</div>
                </div>
              </div>
              <span style={S.arrow}>&rsaquo;</span>
            </button>

            <div style={S.arrowCenter}>
              <div style={S.arrowCircle}>
                <I.TrendDown style={{ width: 14, height: 14, color: 'var(--champagne)' }} />
              </div>
            </div>

            <button onClick={() => setStep('chon_den_vi')} style={S.viBtn}>
              <div style={S.viBtnLeft}>
                <div style={S.viIcon('#F0FDF4')}>
                  {denVi ? <ViIcon loai={denVi.loai} /> : <I.Wallet style={{ width: 20, height: 20, color: '#2D7A4F' }} />}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={S.viLabel}>Đến Tài Khoản</div>
                  <div style={S.viValue(!!denVi)}>{denVi ? denVi.ten : 'Chọn ví nhận...'}</div>
                </div>
              </div>
              <span style={S.arrow}>&rsaquo;</span>
            </button>
          </div>

          {/* Ngày */}
          <div style={S.row} onClick={() => setShowLich(true)}>
            <div style={S.rowIcon('#EFF6FF')}><I.Calendar style={{ width: 18, height: 18, color: '#1A4F70' }} /></div>
            <div style={S.rowContent}>
              <div style={S.rowLabel}>Ngày Thực Hiện</div>
              <div style={S.rowValue}>{formatDateInput(ngay)}</div>
            </div>
            <span style={S.arrow}>&rsaquo;</span>
          </div>

          {/* Diễn giải */}
          <div style={{ ...S.section, padding: '16px 20px', marginBottom: 24 }}>
            <div style={S.textareaRow}>
              <div style={S.rowIcon('#FDF4FF')}>📝</div>
              <div style={{ flex: 1 }}>
                <div style={S.rowLabel}>Diễn Giải</div>
                <textarea placeholder="Ghi chú nội dung chuyển khoản..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)', background: 'transparent', resize: 'none', fontFamily: 'var(--sans)' }} />
              </div>
            </div>
          </div>

      </div>
    </RightPanel>
  )
}
