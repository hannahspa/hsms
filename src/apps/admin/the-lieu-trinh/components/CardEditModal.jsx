import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { getNowVN } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'
import RightPanel from '../../../../components/shared/RightPanel'
import { moneyInput, parseMoney } from '../theLieuTrinhUtils'

function fmtDate(iso) {
  if (!iso) return 'Chưa chọn'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function CardEditModal({ card, onClose, onSaved }) {
  const [form, setForm] = useState({
    ma_the: card?.ma_the || '',
    ten_dich_vu: card?.ten_dich_vu || '',
    loai_the: card?.loai_the || (card?.combo_id ? 'combo_lieu_trinh' : 'lieu_trinh'),
    so_buoi_tong: card?.so_buoi_tong || 1,
    so_buoi_da_dung: card?.so_buoi_da_dung || 0,
    gia_tri_the: card?.gia_tri_the || 0,
    ngay_mua: card?.ngay_mua || '',
    ngay_het_han: card?.ngay_het_han || '',
    trang_thai: card?.trang_thai || 'active',
    is_khong_gioi_han: !!card?.is_khong_gioi_han,
    ghi_chu: card?.ghi_chu || '',
    reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [showNgayMua, setShowNgayMua] = useState(false)
  const [showNgayHetHan, setShowNgayHetHan] = useState(false)
  const remain = form.is_khong_gioi_han ? null : Math.max(0, Number(form.so_buoi_tong || 0) - Number(form.so_buoi_da_dung || 0))

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!form.ma_the.trim()) { setErr('Mã thẻ không được để trống.'); return }
    if (!form.ten_dich_vu.trim()) { setErr('Tên dịch vụ/combo không được để trống.'); return }
    if (!form.reason.trim()) { setErr('Cần nhập lý do sửa thẻ.'); return }
    if (!form.is_khong_gioi_han && Number(form.so_buoi_tong) <= 0) { setErr('Tổng buổi phải lớn hơn 0.'); return }
    if (!form.is_khong_gioi_han && Number(form.so_buoi_da_dung) < 0) { setErr('Số buổi đã dùng không hợp lệ.'); return }

    setSaving(true)
    setErr('')
    try {
      const before = {
        ma_the: card.ma_the,
        ten_dich_vu: card.ten_dich_vu,
        loai_the: card.loai_the,
        so_buoi_tong: card.so_buoi_tong,
        so_buoi_da_dung: card.so_buoi_da_dung,
        gia_tri_the: card.gia_tri_the,
        ngay_mua: card.ngay_mua,
        ngay_het_han: card.ngay_het_han,
        trang_thai: card.trang_thai,
        is_khong_gioi_han: card.is_khong_gioi_han,
        ghi_chu: card.ghi_chu,
      }
      const after = {
        ma_the: form.ma_the.trim(),
        ten_dich_vu: form.ten_dich_vu.trim(),
        loai_the: form.loai_the,
        so_buoi_tong: form.is_khong_gioi_han ? 0 : Number(form.so_buoi_tong || 0),
        so_buoi_da_dung: form.is_khong_gioi_han ? 0 : Number(form.so_buoi_da_dung || 0),
        gia_tri_the: Number(form.gia_tri_the || 0),
        ngay_mua: form.ngay_mua || null,
        ngay_het_han: form.ngay_het_han || null,
        trang_thai: form.trang_thai,
        is_khong_gioi_han: !!form.is_khong_gioi_han,
        ghi_chu: form.ghi_chu || null,
      }
      const editEntry = {
        action: 'admin_edit_card',
        reason: form.reason.trim(),
        edited_at: getNowVN().toISOString(),
        before,
        after,
      }
      const meta = {
        ...(card.meta || {}),
        last_admin_edit_reason: form.reason.trim(),
        last_admin_edit_at: editEntry.edited_at,
        admin_edit_history: [...(Array.isArray(card.meta?.admin_edit_history) ? card.meta.admin_edit_history : []), editEntry].slice(-20),
      }

      const { data, error } = await supabase
        .from('the_lieu_trinh')
        .update({ ...after, meta })
        .eq('id', card.id)
        .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai), combo:combo_id(ten_combo, ma_combo)')
        .single()

      if (error) throw error
      await onSaved(data)
      onClose()
    } catch (e) {
      setErr(e.message || 'Không lưu được thông tin thẻ.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <RightPanel open onClose={onClose} zIndex={931}
        title="Sửa thẻ liệu trình"
        subtitle={`${card.khach_hang?.ho_ten || 'Khách hàng'} · ${card.khach_hang?.so_dien_thoai || '-'}`}
        bodyStyle={{ background: '#fff' }}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={onClose}>Đóng</button>
            <button className="btn gold" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>
        }>
        <div>
          {err && (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.2)', color: '#C0392B', fontSize: 13, fontWeight: 800 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Mã thẻ</span>
              <input value={form.ma_the} onChange={e => set('ma_the', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', outline: 'none', fontWeight: 800 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Tên dịch vụ / combo</span>
              <input value={form.ten_dich_vu} onChange={e => set('ten_dich_vu', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', outline: 'none', fontWeight: 700 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Ngày mua</span>
              <button type="button" onClick={() => setShowNgayMua(true)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff', textAlign: 'left', cursor: 'pointer' }}>
                {fmtDate(form.ngay_mua)}
              </button>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Hết hạn</span>
              <button type="button" onClick={() => setShowNgayHetHan(true)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff', textAlign: 'left', cursor: 'pointer' }}>
                {fmtDate(form.ngay_het_han)}
              </button>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Loại thẻ</span>
              <select value={form.loai_the} onChange={e => set('loai_the', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff' }}>
                <option value="lieu_trinh">Thẻ liệu trình</option>
                <option value="combo_lieu_trinh">Combo liệu trình</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Trạng thái</span>
              <select value={form.trang_thai} onChange={e => set('trang_thai', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff' }}>
                <option value="active">Đang dùng</option>
                <option value="het_buoi">Hết buổi</option>
                <option value="het_han">Hết hạn</option>
                <option value="dong_the">Đóng thẻ</option>
                <option value="chuyen_doi">Chuyển đổi</option>
                <option value="hoan_tien">Hoàn tiền</option>
                <option value="da_huy">Đã huỷ</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Tổng buổi</span>
              <input type="number" min={0} disabled={form.is_khong_gioi_han} value={form.so_buoi_tong}
                onChange={e => set('so_buoi_tong', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', fontWeight: 800, background: form.is_khong_gioi_han ? 'var(--bg)' : '#fff' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Đã dùng</span>
              <input type="number" min={0} disabled={form.is_khong_gioi_han} value={form.so_buoi_da_dung}
                onChange={e => set('so_buoi_da_dung', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', fontWeight: 800, background: form.is_khong_gioi_han ? 'var(--bg)' : '#fff' }} />
            </label>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Còn lại</span>
              <div style={{ height: 38, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--champagne)' }}>
                {form.is_khong_gioi_han ? 'Không giới hạn' : `${remain} buổi`}
              </div>
            </div>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Giá trị thẻ</span>
              <input value={moneyInput(form.gia_tri_the)} onChange={e => set('gia_tri_the', parseMoney(e.target.value))}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'right', fontWeight: 800 }} />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', marginBottom: 14, fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
            <input type="checkbox" checked={form.is_khong_gioi_han} onChange={e => set('is_khong_gioi_han', e.target.checked)} style={{ accentColor: '#C9A96E' }} />
            Không giới hạn số lần
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Ghi chú</span>
              <textarea value={form.ghi_chu || ''} onChange={e => set('ghi_chu', e.target.value)} rows={4}
                style={{ border: '1px solid var(--bord)', borderRadius: 8, padding: 12, outline: 'none', resize: 'vertical', fontFamily: 'var(--sans)' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }}>Lý do sửa</span>
              <textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={4}
                placeholder="Ví dụ: Đối soát lại với MySpa / sửa ngày hết hạn / sửa số buổi theo admin..."
                style={{ border: '1px solid var(--bord)', borderRadius: 8, padding: 12, outline: 'none', resize: 'vertical', fontFamily: 'var(--sans)' }} />
            </label>
          </div>
        </div>
      </RightPanel>
      <DatePicker
        open={showNgayMua}
        selectedDate={form.ngay_mua || ''}
        onClose={() => setShowNgayMua(false)}
        onConfirm={(value) => {
          set('ngay_mua', value)
          setShowNgayMua(false)
        }}
      />
      <DatePicker
        open={showNgayHetHan}
        selectedDate={form.ngay_het_han || ''}
        onClose={() => setShowNgayHetHan(false)}
        onConfirm={(value) => {
          set('ngay_het_han', value)
          setShowNgayHetHan(false)
        }}
      />
    </>
  )
}
