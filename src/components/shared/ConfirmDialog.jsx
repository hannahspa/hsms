import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { C, FONT } from '../../constants/colors'

/**
 * ConfirmDialog — hộp xác nhận chuẩn HSMS (dựng trên Modal + Button).
 * Props: open, title, message, note, confirmLabel, cancelLabel, onConfirm, onCancel, danger
 */
export default function ConfirmDialog({ open, title, message, note, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  if (!open) return null
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      icon={danger ? '⚠️' : '💰'}
      title={title}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel || 'Huỷ'}</Button>
          <Button variant={danger ? 'danger' : 'success'} onClick={onConfirm}>{confirmLabel || 'Xác Nhận'}</Button>
        </>
      )}
    >
      <div style={{ fontFamily: FONT.sans, fontSize: 13.5, color: C.textSub, lineHeight: 1.6 }}>
        {message}
      </div>
      {note && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 12, fontFamily: FONT.sans, fontSize: 11.5, color: C.textMute, fontStyle: 'italic', lineHeight: 1.5 }}>
          <span style={{ fontStyle: 'normal' }}>💡</span>
          <span>{note}</span>
        </div>
      )}
    </Modal>
  )
}
