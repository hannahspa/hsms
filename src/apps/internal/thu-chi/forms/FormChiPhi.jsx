import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, todayISO, formatDateInput } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'
import ImageUpload from '../../../../components/shared/ImageUpload'
import I from '../../../../components/shared/Icons'

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
  amountCard: { background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 20, marginBottom: 12, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', textAlign: 'center' },
  amountLabel: { fontSize: 12, color: 'var(--ink3)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--sans)' },
  amountInput: (hasVal) => ({ width: '100%', border: 'none', outline: 'none', fontSize: 36, fontWeight: 700, textAlign: 'center', background: 'transparent', color: hasVal ? '#C0392B' : 'var(--line2)', fontFamily: 'var(--serif)' }),
  amountDisplay: { fontSize: 14, color: '#C0392B', fontWeight: 600, marginTop: 4, fontFamily: 'var(--sans)' },
  section: { background: 'var(--surface2)', borderRadius: 'var(--r)', marginBottom: 12, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: 12, boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', cursor: 'pointer' },
  rowWarn: (hasVal) => ({ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: 12, boxShadow: 'var(--sh-1)', border: hasVal ? '1px solid var(--line)' : '2px solid #E57373', cursor: 'pointer' }),
  rowIcon: (bg) => ({ width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  rowContent: { flex: 1, textAlign: 'left' },
  rowLabel: { fontSize: 11, color: 'var(--ink3)', marginBottom: 2, fontFamily: 'var(--sans)' },
  rowValue: (hasVal, color) => ({ fontWeight: 600, fontSize: 14, color: hasVal ? (color || 'var(--ink)') : 'var(--ink3)', fontFamily: 'var(--sans)' }),
  arrow: { color: 'var(--champagne)', fontSize: 18 },
  check: { color: 'var(--espresso)', fontSize: 18 },
  textareaRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  saveBtn: (saving) => ({ width: '100%', padding: 16, background: saving ? 'var(--ink3)' : 'linear-gradient(135deg,#E57373,#C0392B)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(192,57,43,0.35)', transition: 'all .2s', fontFamily: 'var(--sans)' }),
  // Pick list styles
  pickSheet: { background: 'var(--surface2)', borderRadius: 20, width: '100%', maxWidth: 520, margin: '0 auto', padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(42,32,26,0.35)' },
  pickHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickTitle: { fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)' },
  pickItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' },
  pickItemLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  pickItemIcon: (bg) => ({ width: 44, height: 44, borderRadius: 13, background: bg || '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }),
  pickItemTitle: { fontWeight: 600, fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)' },
  pickItemSub: { fontSize: 11, color: 'var(--ink3)', marginTop: 2, fontFamily: 'var(--sans)' },
  divider: { height: 1, background: 'var(--line)' },
  backBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)', padding: 0 },
  pickHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  avatarSm: { width: 44, height: 44, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#C0392B', fontFamily: 'var(--sans)' },
}

export default function FormChiPhi({ viList, user, onClose, onSaved, initialData }) {
  const [soTien, setSoTien] = useState('')
  const [nhomId, setNhomId] = useState(null)
  const [hangMucId, setHangMucId] = useState(null)
  const [viId, setViId] = useState(null)
  const [nguoiChiId, setNguoiChiId] = useState(null)
  const [ngay, setNgay] = useState(todayISO())
  const [dienGiai, setDienGiai] = useState('')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState('main')
  const [nhomList, setNhomList] = useState([])
  const [hangMucList, setHangMucList] = useState([])
  const [nhanVienList, setNhanVienList] = useState([])
  const [chungTuUrl, setChungTuUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLich, setShowLich] = useState(false)
  const isEdit = !!initialData

  const getHinhThucFromVi = (vi) => {
    if (!vi) return 'tien_mat'
    if (vi.ten === 'MB Bank') return 'chuyen_khoan'
    if (vi.ten === 'TP Bank') return 'quet_the'
    return 'tien_mat'
  }

  useEffect(() => {
    async function loadData() {
      const [rDM, rNV] = await Promise.all([
        supabase.from('danh_muc_chi_phi').select('*').eq('is_active', true).order('thu_tu'),
        supabase.from('nhan_vien').select('id, ho_ten, vi_tri').eq('trang_thai', 'dang_lam').order('ho_ten'),
      ])
      if (!rDM.error && rDM.data) {
        setNhomList(rDM.data.filter(d => d.parent_id === null))
        setHangMucList(rDM.data.filter(d => d.parent_id !== null))
      }
      if (rNV.data) setNhanVienList(rNV.data)
      setLoading(false)
    }
    loadData()
  }, [])

  // Khởi tạo form từ initialData sau khi danh mục & nhân viên đã load
  useEffect(() => {
    if (!initialData || loading) return
    setSoTien(String(initialData.so_tien || ''))
    setNgay(initialData.ngay || todayISO())
    setDienGiai(initialData.dien_giai || '')
    setChungTuUrl(initialData.chung_tu_url || null)
    setViId(initialData.vi_id || null)
    if (initialData.danh_muc_id) {
      setHangMucId(initialData.danh_muc_id)
      const hm = hangMucList.find(h => h.id === initialData.danh_muc_id)
      if (hm) setNhomId(hm.parent_id)
    }
    if (initialData.nguoi_nhap) {
      const nv = nhanVienList.find(n => n.ho_ten === initialData.nguoi_nhap)
      if (nv) setNguoiChiId(nv.id)
    }
  }, [initialData?.id, loading])

  const nhomSelected = nhomList.find(n => n.id === nhomId)
  const nguoiChiSelected = nhanVienList.find(n => n.id === nguoiChiId)
  const hangMucSelected = hangMucList.find(h => h.id === hangMucId)
  const viSelected = viList.find(v => v.id === viId)
  const hangMucCuaNhom = hangMucList.filter(h => h.parent_id === nhomId)

  const chonNhom = (nhom) => {
    setNhomId(nhom.id)
    setHangMucId(null)
    setStep('chon_hang_muc')
  }

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0) return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!hangMucId) return onSaved('error', 'Vui lòng chọn hạng mục chi!')
    if (!viId) return onSaved('error', 'Vui lòng chọn nguồn tiền chi (Tiền Mặt/MB Bank/TP Bank)!')
    if (!dienGiai?.trim()) return onSaved('error', 'Vui lòng nhập diễn giải!')

    const isTienMat = viSelected?.ten === 'Tiền Mặt'
    if (!isEdit && user?.vai_tro !== 'admin' && !isTienMat) {
      const { data: freshVi } = await supabase
        .from('so_du_vi_thuc_te')
        .select('so_du_hien_tai')
        .eq('id', viId)
        .single()
      const soDu = freshVi?.so_du_hien_tai ?? viSelected?.so_du_hien_tai ?? 0
      if (parseInt(soTien) > soDu) {
        return onSaved('error', `Số Dư ${viSelected?.ten || 'Ví'} không đủ để chi khoản tiền này.`)
      }
    }

    setSaving(true)
    try {
      const payload = {
        ngay: ngay,
        danh_muc_id: hangMucId,
        so_tien: parseInt(soTien),
        hinh_thuc_thanh_toan: getHinhThucFromVi(viSelected),
        vi_id: viId,
        chung_tu_url: chungTuUrl,
        dien_giai: dienGiai || null,
      }
      if (isEdit) {
        const { error } = await supabase.from('chi_phi').update(payload).eq('id', initialData.id)
        if (error) throw error
        onSaved('success', `Đã cập nhật chi phí ${formatCurrency(parseInt(soTien))}!`)
      } else {
        payload.nguoi_nhap = nguoiChiSelected?.ho_ten || user?.ho_ten || null
        const { error } = await supabase.from('chi_phi').insert(payload)
        if (error) throw error
        onSaved('success', `Đã chi ${formatCurrency(parseInt(soTien))} thành công!`)
      }
      onClose()
    } catch (err) {
      onSaved('error', 'Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const viTriLabel = (vt) => vt === 'le_tan' ? 'Lễ Tân' : vt === 'ktv' ? 'KTV' : vt === 'tap_vu' ? 'Tạp Vụ' : vt

  // ── Chọn nhóm ──
  if (step === 'chon_nhom') {
    return (
      <div style={S.overlay}>
        <div style={S.pickSheet}>
          <div style={S.pickHeader}>
            <h3 style={S.pickTitle}>Chọn Nhóm Chi</h3>
            <button style={S.closeBtn} onClick={() => setStep('main')}>&times;</button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>Đang tải dữ liệu...</div>
          ) : nhomList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink3)', fontSize: 13, fontFamily: 'var(--sans)' }}>Chưa có nhóm nào. Vui lòng thêm ở Cài Đặt.</div>
          ) : nhomList.map((nhom, i) => (
            <div key={nhom.id}>
              <button onClick={() => chonNhom(nhom)} style={S.pickItem}>
                <div style={S.pickItemLeft}>
                  <div style={S.pickItemIcon('#FEF2F2')}>{nhom.icon || <I.Tag style={{ width: 20, height: 20, color: '#C0392B' }} />}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={S.pickItemTitle}>{nhom.ten}</div>
                    <div style={S.pickItemSub}>{hangMucList.filter(h => h.parent_id === nhom.id).length} hạng mục</div>
                  </div>
                </div>
                <span style={S.arrow}>&rsaquo;</span>
              </button>
              {i < nhomList.length - 1 && <div style={S.divider} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Chọn hạng mục ──
  if (step === 'chon_hang_muc') {
    return (
      <div style={S.overlay}>
        <div style={S.pickSheet}>
          <div style={S.pickHeader}>
            <div style={S.pickHeaderLeft}>
              <button style={S.backBtn} onClick={() => setStep('chon_nhom')}>&lsaquo;</button>
              <div>
                <h3 style={S.pickTitle}>Chọn Hạng Mục</h3>
                <div style={{ fontSize: 12, color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>{nhomSelected?.icon} {nhomSelected?.ten}</div>
              </div>
            </div>
            <button style={S.closeBtn} onClick={() => setStep('main')}>&times;</button>
          </div>
          {hangMucCuaNhom.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink3)', fontSize: 13, fontFamily: 'var(--sans)' }}>Nhóm này chưa có hạng mục nào.</div>
          ) : hangMucCuaNhom.map((hm, i) => (
            <div key={hm.id}>
              <button onClick={() => { setHangMucId(hm.id); setStep('main') }} style={S.pickItem}>
                <div style={S.pickItemLeft}>
                  <div style={S.pickItemIcon('#FEF2F2')}>{hm.icon || <I.Tag style={{ width: 20, height: 20, color: '#C0392B' }} />}</div>
                  <div style={S.pickItemTitle}>{hm.ten}</div>
                </div>
                {hangMucId === hm.id && <span style={S.check}>&#10003;</span>}
              </button>
              {i < hangMucCuaNhom.length - 1 && <div style={S.divider} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Chọn ví ──
  if (step === 'chon_vi') {
    return (
      <div style={S.overlay}>
        <div style={S.pickSheet}>
          <div style={S.pickHeader}>
            <h3 style={S.pickTitle}>Chọn Nguồn Tiền Chi</h3>
            <button style={S.closeBtn} onClick={() => setStep('main')}>&times;</button>
          </div>
          {viList.map((vi, i) => (
            <div key={vi.id}>
              <button onClick={() => { setViId(vi.id); setStep('main') }} style={S.pickItem}>
                <div style={S.pickItemLeft}>
                  <div style={S.pickItemIcon(`linear-gradient(135deg,var(--surface),var(--line))`)}>
                    {vi.loai === 'tien_mat' ? <I.Coin style={{ width: 22, height: 22, color: '#3E5A32' }} /> :
                     vi.loai === 'chuyen_khoan' ? <I.Bank style={{ width: 22, height: 22, color: '#1A4F70' }} /> :
                     <I.Wallet style={{ width: 22, height: 22, color: '#5A3E22' }} />}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={S.pickItemTitle}>{vi.ten}</div>
                    <div style={S.pickItemSub}>{user?.vai_tro === 'admin' ? formatCurrency(vi.so_du_hien_tai) : '••••••'}</div>
                  </div>
                </div>
                {viId === vi.id && <span style={S.check}>&#10003;</span>}
              </button>
              {i < viList.length - 1 && <div style={S.divider} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Chọn người chi ──
  if (step === 'chon_nguoi_chi') {
    return (
      <div style={S.overlay}>
        <div style={S.pickSheet}>
          <div style={S.pickHeader}>
            <h3 style={S.pickTitle}>Người Chi Tiền</h3>
            <button style={S.closeBtn} onClick={() => setStep('main')}>&times;</button>
          </div>
          {nhanVienList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink3)', fontSize: 13, fontFamily: 'var(--sans)' }}>Đang tải danh sách nhân viên...</div>
          ) : nhanVienList.map((nv, i) => (
            <div key={nv.id}>
              <button onClick={() => { setNguoiChiId(nv.id); setStep('main') }} style={S.pickItem}>
                <div style={S.pickItemLeft}>
                  <div style={S.avatarSm}>{nv.ho_ten?.charAt(0) || '?'}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={S.pickItemTitle}>{nv.ho_ten}</div>
                    <div style={S.pickItemSub}>{viTriLabel(nv.vi_tri)}</div>
                  </div>
                </div>
                {nguoiChiId === nv.id && <span style={S.check}>&#10003;</span>}
              </button>
              {i < nhanVienList.length - 1 && <div style={S.divider} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Form chính ──
  return (
    <div style={S.panelOverlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={(d) => { setNgay(d); setShowLich(false) }} />

      <div style={S.sheet}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={S.handle}><div style={S.handleBar} /></div>

        <div style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.iconBox('#FEF2F2')}><I.Receipt style={{ width: 18, height: 18, color: '#C0392B' }} /></div>
            <div>
              <div style={S.title}>{isEdit ? 'Sửa Chi Phí' : 'Chi Phí'}</div>
              <div style={S.subtitle}>{isEdit ? 'Chỉnh sửa chi phí' : 'Nhập chi phí'}</div>
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

          {/* Nhóm + Hạng mục */}
          <div style={S.section}>
            <button onClick={() => setStep('chon_nhom')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'none', border: 'none', borderBottom: nhomId ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={S.rowIcon('#FEF2F2')}>{nhomSelected ? (nhomSelected.icon || <I.Tag style={{ width: 20, height: 20, color: '#C0392B' }} />) : <I.Tag style={{ width: 20, height: 20, color: 'var(--ink3)' }} />}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={S.rowLabel}>Nhóm Chi</div>
                  <div style={S.rowValue(!!nhomSelected, '#C0392B')}>{nhomSelected ? nhomSelected.ten : 'Chọn nhóm chi phí'}</div>
                </div>
              </div>
              <span style={S.arrow}>&rsaquo;</span>
            </button>

            {nhomId && (
              <button onClick={() => setStep('chon_hang_muc')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: hangMucId ? 'var(--surface)' : 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={S.rowIcon('#FEF2F2')}>{hangMucSelected ? (hangMucSelected.icon || <I.Tag style={{ width: 20, height: 20, color: '#C0392B' }} />) : <I.Tag style={{ width: 20, height: 20, color: 'var(--ink3)' }} />}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={S.rowLabel}>Hạng Mục</div>
                    <div style={S.rowValue(!!hangMucSelected)}>{hangMucSelected ? hangMucSelected.ten : 'Chọn hạng mục'}</div>
                  </div>
                </div>
                {hangMucId ? <span style={S.check}>&#10003;</span> : <span style={S.arrow}>&rsaquo;</span>}
              </button>
            )}
          </div>

          {/* Nguồn tiền chi */}
          <button onClick={() => setStep('chon_vi')} style={S.rowWarn(!!viId)}>
            <div style={S.rowIcon('linear-gradient(135deg,var(--surface),var(--line))')}>
              {viSelected ? (
                viSelected.loai === 'tien_mat' ? <I.Coin style={{ width: 22, height: 22, color: '#3E5A32' }} /> :
                viSelected.loai === 'chuyen_khoan' ? <I.Bank style={{ width: 22, height: 22, color: '#1A4F70' }} /> :
                <I.Wallet style={{ width: 22, height: 22, color: '#5A3E22' }} />
              ) : <I.Wallet style={{ width: 20, height: 20, color: '#C0392B' }} />}
            </div>
            <div style={S.rowContent}>
              <div style={S.rowLabel}>Nguồn Tiền Chi <span style={{ color: '#C0392B' }}>*</span></div>
              <div style={S.rowValue(!!viSelected, viSelected ? 'var(--ink)' : '#C0392B')}>
                {viSelected ? `${viSelected.ten} (${getHinhThucFromVi(viSelected).replace('_', ' ')})` : 'Bắt buộc chọn nguồn tiền!'}
              </div>
            </div>
            <span style={S.arrow}>&rsaquo;</span>
          </button>

          {/* Người chi */}
          <button onClick={() => setStep('chon_nguoi_chi')} style={S.row}>
            <div style={S.avatarSm}>{nguoiChiSelected ? nguoiChiSelected.ho_ten?.charAt(0) : <I.Users style={{ width: 18, height: 18, color: '#C0392B' }} />}</div>
            <div style={S.rowContent}>
              <div style={S.rowLabel}>Người Chi</div>
              <div style={S.rowValue(!!nguoiChiSelected)}>{nguoiChiSelected ? nguoiChiSelected.ho_ten : 'Chọn người chi'}</div>
            </div>
            <span style={S.arrow}>&rsaquo;</span>
          </button>

          {/* Ngày */}
          <div style={S.row} onClick={() => setShowLich(true)}>
            <div style={S.rowIcon('#EFF6FF')}><I.Calendar style={{ width: 18, height: 18, color: '#1A4F70' }} /></div>
            <div style={S.rowContent}>
              <div style={S.rowLabel}>Ngày Chi</div>
              <div style={S.rowValue(true)}>{formatDateInput(ngay)}</div>
            </div>
            <span style={S.arrow}>&rsaquo;</span>
          </div>

          {/* Diễn giải */}
          <div style={{ ...S.section, padding: '16px 20px', marginBottom: 24 }}>
            <div style={S.textareaRow}>
              <div style={S.rowIcon('#FDF4FF')}>📝</div>
              <div style={{ flex: 1 }}>
                <div style={S.rowLabel}>Diễn Giải <span style={{ color: '#C0392B' }}>*</span></div>
                <textarea placeholder="Nhập nội dung chi tiêu..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)', background: 'transparent', resize: 'none', fontFamily: 'var(--sans)' }} />
              </div>
            </div>
          </div>

          <ImageUpload onUploaded={(url) => setChungTuUrl(url)} onRemove={() => setChungTuUrl(null)} />

          <button onClick={handleSave} disabled={saving} style={S.saveBtn(saving)}>
            {saving ? 'Đang lưu...' : (isEdit ? 'Cập Nhật' : 'Lưu Chi Phí')}
          </button>
        </div>
      </div>
    </div>
  )
}
