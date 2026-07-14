import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import { supabase } from '../../../lib/supabase'
import { todayISO } from '../../../lib/utils'
import { C, FONT } from '../../../constants/colors'

// ── PHIẾU TƯ VẤN NHANH sau khi thanh toán (khép kín vòng CRM — anh Nam 15/07) ──
// Thay bảng Excel rời của NV: tên/SĐT/dịch vụ/KTV đã điền sẵn từ đơn vừa chốt,
// NV chỉ gõ 20 giây phần tư vấn → đổ vào nhat_ky_khach_den → hiện lại ở
// CRM (tab Nhật Ký Tư Vấn) + khối "Gợi ý tư vấn" của POS lần khách đến sau.

const KET_QUA = [
  { v: 'hai_long', label: '😊 Hài lòng' },
  { v: 'da_mua_them', label: '💰 Mua thêm' },
  { v: 'tam_duoc', label: '🙂 Tạm được' },
  { v: 'chua_hai_long', label: '😕 Chưa hài lòng' },
  { v: 'can_cham_lai', label: '📌 Cần chăm lại' },
]

const chuanSdt = (s) => {
  const d = String(s || '').replace(/\D/g, '')
  if (d.startsWith('84') && d.length > 9) return '0' + d.slice(2)
  return d
}

export default function VisitQuickForm({ prompt, onClose, user, notify }) {
  const [tuVan, setTuVan]     = useState('')
  const [phanHoi, setPhanHoi] = useState('')
  const [ketQua, setKetQua]   = useState('hai_long')
  const [henSau, setHenSau]   = useState('')
  const [saving, setSaving]   = useState(false)

  if (!prompt) return null
  const { khach, dichVu, ktv } = prompt

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('nhat_ky_khach_den').insert({
        ngay: todayISO(),
        khach_hang_id: khach.id || null,
        ho_ten: khach.ho_ten || null,
        so_dien_thoai: khach.so_dien_thoai || null,
        phone_norm: chuanSdt(khach.so_dien_thoai) || null,
        dich_vu_su_dung: dichVu || null,
        ktv_phu_trach: ktv || null,
        co_hoi_upsell: tuVan.trim() || null,
        phan_hoi: phanHoi.trim() || null,
        ket_qua: ketQua,
        goi_y_tiep_theo: henSau.trim() || null,
        nguon: 'pos_checkout',
        created_by: user?.id || null,
      })
      if (error) throw error
      notify('✓ Đã lưu phiếu tư vấn vào hồ sơ khách')
      onClose()
    } catch (e) {
      notify('Lỗi lưu phiếu: ' + e.message)
    } finally { setSaving(false) }
  }

  const field = { width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 11px', fontSize: 13, outline: 'none', fontFamily: FONT.sans, background: '#fff', color: C.text, resize: 'vertical' }
  const lbl = { fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4, display: 'block' }

  return (
    <Modal
      open onClose={onClose} size="sm" icon="📝"
      title="Phiếu tư vấn 20 giây"
      subtitle={`${khach.ho_ten || 'Khách'}${khach.so_dien_thoai ? ' · ' + khach.so_dien_thoai : ''}${dichVu ? ' · ' + dichVu : ''}`}
      footer={
        <>
          <button onClick={onClose} style={{ border: `1px solid ${C.border}`, background: '#fff', color: C.textSub, borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT.sans }}>
            Bỏ qua
          </button>
          <button onClick={save} disabled={saving} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', fontFamily: FONT.sans }}>
            {saving ? 'Đang lưu…' : 'Lưu phiếu'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <span style={lbl}>Hôm nay đã tư vấn thêm gì cho khách?</span>
          <textarea value={tuVan} onChange={e => setTuVan(e.target.value)} rows={2} style={field}
            placeholder="VD: tư vấn gói triệt bikini, khách quan tâm nhưng chờ lương…" />
        </div>
        <div>
          <span style={lbl}>Khách phản hồi thế nào?</span>
          <textarea value={phanHoi} onChange={e => setPhanHoi(e.target.value)} rows={2} style={field}
            placeholder="VD: khen thư giãn, ngủ được; da còn hơi đỏ nhẹ…" />
        </div>
        <div>
          <span style={lbl}>Kết quả buổi hôm nay</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {KET_QUA.map(k => (
              <button key={k.v} onClick={() => setKetQua(k.v)} style={{
                border: `1.5px solid ${ketQua === k.v ? C.primary : C.border}`,
                background: ketQua === k.v ? 'rgba(160,113,79,.1)' : '#fff',
                color: ketQua === k.v ? C.primary : C.textSub,
                borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT.sans,
              }}>{k.label}</button>
            ))}
          </div>
        </div>
        <div>
          <span style={lbl}>Hẹn / gợi ý lần sau (hiện lại khi khách quay lại)</span>
          <input value={henSau} onChange={e => setHenSau(e.target.value)} style={field}
            placeholder="VD: lần sau mời trải nghiệm điện di vitamin C" />
        </div>
      </div>
    </Modal>
  )
}
