import { formatDateInput } from '../../../../lib/utils'

export default function EditTransactionModal({
  item,
  isAdmin,
  lyDo,
  nhomList,
  hangMucList,
  onChangeItem,
  onChangeLyDo,
  onClose,
  onSave,
}) {
  if (!item) return null

  const updateField = (key, value) => onChangeItem({ ...item, [key]: value })
  const currentGroupId = item._nhomId || hangMucList.find(h => h.id === item.danh_muc_id)?.parent_id

  const handleDateChange = (value) => {
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const [dd, mm, yyyy] = value.split('/')
      updateField('ngay', `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`)
      return
    }
    updateField('ngay', value)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r-lg)', padding: 24, maxWidth: 440, width: '100%', boxShadow: 'var(--sh-3)' }} onClick={event => event.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700 }}>{isAdmin ? 'Sửa Giao Dịch' : 'Yêu Cầu Sửa'}</h3>
          <button onClick={onClose} className="icon-btn" style={{ width: 32, height: 32 }}>x</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Ngày">
            <input
              value={item.ngay ? formatDateInput(item.ngay) : ''}
              onChange={event => handleDateChange(event.target.value)}
              placeholder="DD/MM/YYYY"
              style={inputStyle}
            />
          </Field>

          <Field label="Nguồn Tiền">
            <select
              value={item.hinh_thuc || item.hinh_thuc_thanh_toan || 'tien_mat'}
              onChange={event => {
                const key = item._t === 'thu' ? 'hinh_thuc' : 'hinh_thuc_thanh_toan'
                updateField(key, event.target.value)
              }}
              style={{ ...inputStyle, background: 'var(--surface2)' }}
            >
              {item._t === 'thu' ? (
                <>
                  <option value="tien_mat">💵 Tiền Mặt</option>
                  <option value="chuyen_khoan">🏦 Chuyển Khoản</option>
                  <option value="quet_the">💳 Quẹt Thẻ</option>
                  <option value="the_tra_truoc">🎫 Thẻ Trả Trước</option>
                </>
              ) : (
                <>
                  <option value="tien_mat">💵 Tiền Mặt</option>
                  <option value="chuyen_khoan">🏦 Chuyển Khoản</option>
                  <option value="quet_the">💳 Quẹt Thẻ</option>
                </>
              )}
            </select>
          </Field>

          {item._t === 'chi' && (
            <>
              <Field label="Nhóm Chi">
                <select
                  value={currentGroupId || ''}
                  onChange={event => onChangeItem({ ...item, danh_muc_id: '', _nhomId: event.target.value })}
                  style={{ ...inputStyle, background: 'var(--surface2)' }}
                >
                  <option value="">-- Chọn nhóm --</option>
                  {nhomList.map(group => <option key={group.id} value={group.id}>{group.icon} {group.ten}</option>)}
                </select>
              </Field>

              <Field label="Hạng Mục Chi">
                <select
                  value={item.danh_muc_id || ''}
                  onChange={event => updateField('danh_muc_id', event.target.value)}
                  style={{ ...inputStyle, background: 'var(--surface2)' }}
                >
                  <option value="">-- Chọn hạng mục --</option>
                  {hangMucList
                    .filter(hm => hm.parent_id === currentGroupId)
                    .map(hm => <option key={hm.id} value={hm.id}>{hm.icon} {hm.ten}</option>)}
                </select>
              </Field>
            </>
          )}

          <Field label="Số Tiền">
            <input
              type="number"
              value={item.so_tien || ''}
              onChange={event => updateField('so_tien', event.target.value)}
              style={{ ...inputStyle, fontSize: 20, fontWeight: 700, fontFamily: 'var(--serif)' }}
            />
          </Field>

          <Field label="Diễn Giải">
            <input
              value={item.dien_giai || ''}
              onChange={event => updateField('dien_giai', event.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label={`Lý do ${!isAdmin ? '(bắt buộc)' : ''}`}>
            <textarea
              value={lyDo}
              onChange={event => onChangeLyDo(event.target.value)}
              placeholder="Nhập lý do..."
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={onClose} className="btn" style={{ flex: 1, justifyContent: 'center' }}>Hủy</button>
            <button onClick={onSave} className="btn gold" style={{ flex: 1, justifyContent: 'center' }}>{isAdmin ? 'Lưu Ngay' : 'Gửi Yêu Cầu'}</button>
          </div>

          {!isAdmin && <div style={{ fontSize: 10, color: 'var(--ink3)', textAlign: 'center' }}>Admin sẽ duyệt trước khi có hiệu lực</div>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'var(--sans)',
}
