import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import DatePicker from '../../../components/shared/DatePicker'
import { notify } from '../../../components/ui/notify'
import { formatCurrency, todayISO } from '../../../lib/utils'
import { addDurationISO } from '../../../lib/dateMath'
import { posService } from '../../../services/posService'

// Ô nhập tiền/định dạng VNĐ dùng chung trong các modal thẻ
const parseVND = (s) => parseInt(String(s).replace(/\D/g, ''), 10) || 0
const fmtVND = (n) => new Intl.NumberFormat('vi-VN').format(n || 0)

const inputStyle = {
  width: '100%', boxSizing: 'border-box', border: '1px solid var(--bord)', borderRadius: 8,
  padding: '9px 11px', fontSize: 13.5, outline: 'none', fontFamily: 'var(--sans)', color: 'var(--ink)',
}
const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--ink2)', marginBottom: 5, display: 'block' }

/**
 * CardActionsModals — các hộp thoại hành động Admin trên 1 thẻ liệu trình.
 * Props:
 *  - action  : { type: 'toggleFreeze' | 'delete', card } | null
 *  - onClose : () => void
 *  - onDone  : () => void   (reload snapshot sau khi xong)
 *  - user    : { id, ho_ten }
 */
export default function CardActionsModals({ action, onClose, onDone, user }) {
  if (!action) return null
  const { type, card } = action
  const nguoiId = user?.id || null

  if (type === 'toggleFreeze') {
    return <FreezeModal card={card} nguoiId={nguoiId} onClose={onClose} onDone={onDone} />
  }
  if (type === 'delete') {
    return <DeleteModal card={card} nguoiId={nguoiId} onClose={onClose} onDone={onDone} />
  }
  if (type === 'refund') {
    return <RefundModal card={card} user={user} onClose={onClose} onDone={onDone} />
  }
  if (type === 'convert') {
    return <ConvertModal card={card} user={user} onClose={onClose} onDone={onDone} />
  }
  return null
}

// ── Hoàn tiền thẻ ──────────────────────────────────────────────────────────
const HINH_THUC_OPTS = [
  { v: 'tien_mat', l: 'Tiền mặt (két)' },
  { v: 'chuyen_khoan', l: 'Chuyển khoản (MB Bank)' },
]

function RefundModal({ card, user, onClose, onDone }) {
  const quy = posService.computeCardConvertValue(card)
  const [soTien, setSoTien] = useState(quy.giaTriConLai)
  const [hinhThuc, setHinhThuc] = useState('tien_mat')
  const [lyDo, setLyDo] = useState('')
  const [saving, setSaving] = useState(false)

  const run = async () => {
    const money = parseVND(String(soTien))
    if (money <= 0) { notify('Nhập số tiền hoàn hợp lệ.', 'error'); return }
    setSaving(true)
    try {
      await posService.refundCard(card.id, {
        soTien: money, hinhThuc, lyDo: lyDo.trim(),
        nguoi: user?.ho_ten || 'Admin', nguoiId: user?.id || null,
      })
      notify('Đã hoàn tiền ' + fmtVND(money) + 'đ và ghi vào Sổ Chi.')
      onDone?.()
      onClose?.()
    } catch (err) {
      notify('Lỗi hoàn tiền: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open onClose={onClose}
      icon="💵"
      title="Hoàn tiền thẻ liệu trình"
      subtitle={card.ten_dich_vu}
      footer={<>
        <button className="btn ghost" onClick={onClose} disabled={saving}>Huỷ</button>
        <button className="btn gold" onClick={run} disabled={saving}>{saving ? 'Đang xử lý...' : 'Hoàn tiền'}</button>
      </>}
    >
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.7 }}>
        <div>Giá trị thẻ: <b>{formatCurrency(quy.giaTri)}</b> · Đã dùng: <b>{quy.daDung}</b> buổi</div>
        <div>Đơn giá gốc/buổi: <b>{formatCurrency(quy.donGiaGoc)}</b> <span style={{ color: 'var(--ink3)' }}>({quy.nguon})</span></div>
        <div style={{ marginTop: 4 }}>Gợi ý hoàn (giá trị còn lại): <b style={{ color: 'var(--thu)' }}>{formatCurrency(quy.giaTriConLai)}</b></div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Số tiền hoàn</label>
          <input value={soTien ? fmtVND(parseVND(String(soTien))) : ''} onChange={e => setSoTien(parseVND(e.target.value))} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Hình thức</label>
          <select value={hinhThuc} onChange={e => setHinhThuc(e.target.value)} style={inputStyle}>
            {HINH_THUC_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Lý do (tuỳ chọn)</label>
        <input value={lyDo} onChange={e => setLyDo(e.target.value)} placeholder="Ví dụ: khách yêu cầu ngừng liệu trình" style={inputStyle} />
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5 }}>
        Thao tác này ghi 1 khoản <b>chi</b> vào Sổ Thu Chi (trừ ví tương ứng), đóng thẻ và ghi nhật ký.
      </div>
    </Modal>
  )
}

// ── Đóng / Mở thẻ ──────────────────────────────────────────────────────────
function FreezeModal({ card, nguoiId, onClose, onDone }) {
  const [saving, setSaving] = useState(false)
  const freezing = !card.bi_dong   // đang mở → sẽ đóng

  const run = async () => {
    setSaving(true)
    try {
      await posService.setCardFrozen(card.id, freezing, { nguoiId, cardSnapshot: card })
      notify(freezing ? 'Đã đóng thẻ liệu trình.' : 'Đã mở lại thẻ liệu trình.')
      onDone?.()
      onClose?.()
    } catch (err) {
      notify('Lỗi: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open onClose={onClose}
      icon={freezing ? '🔒' : '🔓'}
      title={freezing ? 'Đóng thẻ liệu trình' : 'Mở lại thẻ liệu trình'}
      subtitle={card.ten_dich_vu}
      footer={<>
        <button className="btn ghost" onClick={onClose} disabled={saving}>Huỷ</button>
        <button className="btn gold" onClick={run} disabled={saving}>{saving ? 'Đang lưu...' : (freezing ? 'Đóng thẻ' : 'Mở thẻ')}</button>
      </>}
    >
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.6 }}>
        {freezing
          ? 'Thẻ bị đóng sẽ KHÔNG dùng được ở POS (không trừ buổi). Anh có thể MỞ LẠI bất cứ lúc nào. Hành động này được ghi nhật ký.'
          : 'Mở lại thẻ để khách tiếp tục sử dụng ở POS. Hành động này được ghi nhật ký.'}
      </p>
    </Modal>
  )
}

// ── Xoá mềm thẻ ────────────────────────────────────────────────────────────
function DeleteModal({ card, nguoiId, onClose, onDone }) {
  const [saving, setSaving] = useState(false)
  const [lyDo, setLyDo] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const canDelete = confirmText.trim().toUpperCase() === 'XOA' || confirmText.trim().toUpperCase() === 'XÓA'

  const run = async () => {
    if (!lyDo.trim()) { notify('Vui lòng nhập lý do xoá.', 'error'); return }
    if (!canDelete) { notify('Gõ "XOA" để xác nhận.', 'error'); return }
    setSaving(true)
    try {
      await posService.softDeleteCard(card.id, { nguoiId, lyDo: lyDo.trim(), cardSnapshot: card })
      notify('Đã xoá (ẩn) thẻ liệu trình. Dữ liệu vẫn được lưu để đối soát.')
      onDone?.()
      onClose?.()
    } catch (err) {
      notify('Lỗi: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open onClose={onClose}
      icon="🗑️"
      title="Xoá thẻ liệu trình"
      subtitle={card.ten_dich_vu}
      footer={<>
        <button className="btn ghost" onClick={onClose} disabled={saving}>Huỷ</button>
        <button className="btn" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }} onClick={run} disabled={saving || !canDelete || !lyDo.trim()}>
          {saving ? 'Đang xoá...' : 'Xoá thẻ'}
        </button>
      </>}
    >
      <div style={{ background: 'rgba(192,57,43,.07)', border: '1px solid rgba(192,57,43,.25)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12.5, color: '#9e2818', lineHeight: 1.55 }}>
        Xoá <b>ẩn mềm</b>: thẻ biến mất khỏi danh sách và POS nhưng <b>vẫn còn trong hệ thống</b> để đối soát/khôi phục.
        Số buổi có thể chưa đồng bộ MySpa nên KHÔNG xoá cứng.
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Lý do xoá <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input value={lyDo} onChange={e => setLyDo(e.target.value)} placeholder="Ví dụ: tạo nhầm, trùng thẻ..." style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Gõ <b>XOA</b> để xác nhận</label>
        <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="XOA" style={inputStyle} />
      </div>
    </Modal>
  )
}

// ── Chuyển đổi thẻ A → B ────────────────────────────────────────────────────
function ConvertModal({ card, user, onClose, onDone }) {
  const quy = posService.computeCardConvertValue(card)
  const [quyDoi, setQuyDoi] = useState(quy.giaTriConLai)   // giá trị mang sang (sửa được)
  const [svcSearch, setSvcSearch] = useState('')
  const [svcResults, setSvcResults] = useState([])
  const [svc, setSvc] = useState(null)                     // dịch vụ B đã chọn
  const [tenB, setTenB] = useState('')
  const [soBuoiMua, setSoBuoiMua] = useState(1)
  const [soBuoiTang, setSoBuoiTang] = useState(0)
  const [giaThe, setGiaThe] = useState(0)                  // giá thẻ B (tổng)
  const [ngayHH, setNgayHH] = useState(addDurationISO(todayISO(), 1, 'year'))
  const [hhOpen, setHhOpen] = useState(false)
  const [ktvList, setKtvList] = useState([])
  const [sellerId, setSellerId] = useState('')
  const [hinhThuc, setHinhThuc] = useState('tien_mat')
  const [saving, setSaving] = useState(false)

  useEffect(() => { posService.getKTVs().then(d => setKtvList(d || [])).catch(() => {}) }, [])

  const doSearch = async (q) => {
    setSvcSearch(q)
    if (!q || q.length < 2) { setSvcResults([]); return }
    try { setSvcResults((await posService.getServices(q)).slice(0, 8)) } catch { setSvcResults([]) }
  }
  const pickSvc = (dv) => {
    setSvc(dv); setTenB(dv.ten); setSvcResults([]); setSvcSearch(dv.ten)
    setGiaThe((dv.gia_co_ban || 0) * Math.max(1, soBuoiMua))
  }

  const bu = Math.max(0, (Number(giaThe) || 0) - (Number(quyDoi) || 0))

  const run = async () => {
    if (!tenB.trim()) { notify('Chọn/nhập tên gói thẻ mới (B).', 'error'); return }
    if ((Number(giaThe) || 0) <= 0) { notify('Nhập giá thẻ mới.', 'error'); return }
    if (Math.round(Number(soBuoiMua) || 0) < 1) { notify('Số buổi mua phải ≥ 1.', 'error'); return }
    if (!sellerId) { notify('Chọn NV bán thẻ mới (bắt buộc).', 'error'); return }
    setSaving(true)
    try {
      const payments = bu > 0 ? [{ hinh_thuc: hinhThuc, so_tien: bu }] : []
      const res = await posService.convertCard(card.id, {
        giaTriQuyDoi: Number(quyDoi) || 0,
        tenDichVu: tenB.trim(),
        dichVuId: svc?.id || card.dich_vu_id || null,
        soBuoiMua: Number(soBuoiMua) || 1,
        soBuoiTang: Number(soBuoiTang) || 0,
        giaTriThe: Number(giaThe) || 0,
        ngayHetHan: ngayHH || null,
        nhanVienBanId: sellerId || null,
        payments,
        nguoi: user?.ho_ten || 'Admin',
        nguoiId: user?.id || null,
      })
      notify('Đã chuyển đổi thẻ. Đơn ' + (res?.ma_don || '') + (bu > 0 ? ' · bù ' + fmtVND(bu) + 'đ' : ''))
      onDone?.()
      onClose?.()
    } catch (err) {
      notify('Lỗi chuyển đổi: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open onClose={onClose}
      size="lg"
      icon="🔄"
      title="Chuyển đổi thẻ liệu trình"
      subtitle={`Từ: ${card.ten_dich_vu}`}
      footer={<>
        <button className="btn ghost" onClick={onClose} disabled={saving}>Huỷ</button>
        <button className="btn gold" onClick={run} disabled={saving}>{saving ? 'Đang xử lý...' : 'Xác nhận chuyển đổi'}</button>
      </>}
    >
      {/* Quy đổi từ thẻ cũ */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.7 }}>
        <div>Thẻ cũ: giá trị <b>{formatCurrency(quy.giaTri)}</b> · đã dùng <b>{quy.daDung}</b> buổi · giá gốc/buổi <b>{formatCurrency(quy.donGiaGoc)}</b></div>
        <div style={{ color: 'var(--ink3)', fontSize: 11.5 }}>Cách tính: {quy.nguon}</div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Giá trị quy đổi mang sang:</span>
          <input value={quyDoi ? fmtVND(parseVND(String(quyDoi))) : ''} onChange={e => setQuyDoi(parseVND(e.target.value))}
            style={{ ...inputStyle, width: 150, fontWeight: 800, color: 'var(--thu)' }} />
          <span>đ</span>
        </div>
      </div>

      {/* Gói thẻ mới B */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <label style={labelStyle}>Gói thẻ mới (B) <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input value={svcSearch} onChange={e => doSearch(e.target.value)} placeholder="Gõ tên dịch vụ/gói mới..." style={inputStyle} />
        {svcResults.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, background: '#fff', border: '1px solid var(--bord)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: 'var(--sh-2)' }}>
            {svcResults.map(dv => (
              <div key={dv.id} onClick={() => pickSvc(dv)} style={{ padding: '8px 11px', cursor: 'pointer', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{dv.ten}</span>
                <span style={{ fontSize: 11.5, color: 'var(--champagne)', fontWeight: 700 }}>{formatCurrency(dv.gia_co_ban || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 120 }}>
          <label style={labelStyle}>Buổi mua</label>
          <input type="number" min={1} value={soBuoiMua} onChange={e => setSoBuoiMua(Math.max(1, parseInt(e.target.value) || 1))} style={inputStyle} />
        </div>
        <div style={{ width: 120 }}>
          <label style={labelStyle}>Buổi tặng</label>
          <input type="number" min={0} value={soBuoiTang} onChange={e => setSoBuoiTang(Math.max(0, parseInt(e.target.value) || 0))} style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={labelStyle}>Giá thẻ B (tổng)</label>
          <input value={giaThe ? fmtVND(parseVND(String(giaThe))) : ''} onChange={e => setGiaThe(parseVND(e.target.value))} style={{ ...inputStyle, fontWeight: 800, color: 'var(--champagne)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}>Ngày hết hạn thẻ B</label>
          <button type="button" onClick={() => setHhOpen(true)} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', background: '#fff' }}>
            {ngayHH ? ngayHH.split('-').reverse().join('/') : 'Chọn ngày...'}
          </button>
          <DatePicker open={hhOpen} selectedDate={ngayHH || null} onClose={() => setHhOpen(false)} onConfirm={d => { setNgayHH(d); setHhOpen(false) }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}>NV bán thẻ mới <span style={{ color: 'var(--danger)' }}>*</span></label>
          <select value={sellerId} onChange={e => setSellerId(e.target.value)} style={inputStyle}>
            <option value="">— Chọn NV bán —</option>
            {ktvList.map(k => <option key={k.id} value={k.id}>{k.ho_ten}</option>)}
          </select>
        </div>
      </div>

      {/* Bù tiền */}
      <div style={{ background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.3)', borderRadius: 10, padding: 14, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink2)', marginBottom: 6 }}>
          <span>Giá thẻ B</span><b>{formatCurrency(Number(giaThe) || 0)}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink2)', marginBottom: 6 }}>
          <span>− Quy đổi từ thẻ cũ</span><b style={{ color: 'var(--thu)' }}>{formatCurrency(Number(quyDoi) || 0)}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 800, borderTop: '1px dashed var(--bord)', paddingTop: 8 }}>
          <span>Khách bù thêm</span>
          <b style={{ color: 'var(--champagne)', fontFamily: 'var(--serif)', fontSize: 20 }}>{formatCurrency(bu)}</b>
        </div>
        {bu > 0 && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Hình thức thu phần bù</label>
            <select value={hinhThuc} onChange={e => setHinhThuc(e.target.value)} style={inputStyle}>
              {HINH_THUC_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        )}
        {bu === 0 && (Number(quyDoi) || 0) > (Number(giaThe) || 0) && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Gói mới rẻ hơn giá trị quy đổi — theo quy định KHÔNG hoàn phần chênh lệch.</div>
        )}
      </div>
    </Modal>
  )
}
