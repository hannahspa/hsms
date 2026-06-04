import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../../lib/utils'
import { moneyInput, parseMoney } from '../theLieuTrinhUtils'

export default function ComboEditModal({ combo, onClose, onSaved }) {
  const primary = combo?.dich_vu?.[0] || {}
  const [form, setForm] = useState({
    ten_combo: combo?.ten_combo || '',
    menh_gia: combo?.menh_gia || 0,
    gia_ban: combo?.gia_ban || 0,
    thoi_han_so: combo?.thoi_han_so || 1,
    thoi_han_don_vi: combo?.thoi_han_don_vi || 'year',
    ti_le_commission: combo?.ti_le_commission || 0,
    tien_hoa_hong: combo?.tien_hoa_hong || 0,
    trang_thai: combo?.trang_thai || 'active',
    ghi_chu: combo?.ghi_chu || '',
    so_lan: primary?.so_lan || 1,
    khong_gioi_han: !!primary?.khong_gioi_han,
    don_gia: primary?.don_gia || combo?.gia_ban || 0,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const autoCommission = Math.round((form.gia_ban || 0) * (Number(form.ti_le_commission) || 0) / 100)
  const commissionValue = form.tien_hoa_hong > 0 ? form.tien_hoa_hong : autoCommission

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!form.ten_combo.trim()) { setErr('Tên combo không được để trống.'); return }
    if ((form.gia_ban || 0) <= 0) { setErr('Giá bán phải lớn hơn 0.'); return }
    if ((form.thoi_han_so || 0) <= 0) { setErr('Thời hạn phải lớn hơn 0.'); return }
    if (!form.khong_gioi_han && (form.so_lan || 0) <= 0) { setErr('Số lần phải lớn hơn 0.'); return }

    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase
        .from('combo_lieu_trinh')
        .update({
          ten_combo: form.ten_combo.trim(),
          menh_gia: form.menh_gia || 0,
          gia_ban: form.gia_ban || 0,
          thoi_han_so: form.thoi_han_so || 1,
          thoi_han_don_vi: form.thoi_han_don_vi,
          ti_le_commission: Number(form.ti_le_commission) || 0,
          tien_hoa_hong: form.tien_hoa_hong || 0,
          trang_thai: form.trang_thai,
          ghi_chu: form.ghi_chu || null,
          updated_at: getNowVN().toISOString(),
        })
        .eq('id', combo.id)
      if (error) throw error

      if (primary?.id) {
        const { error: svcErr } = await supabase
          .from('combo_lieu_trinh_dich_vu')
          .update({
            so_lan: form.khong_gioi_han ? null : (form.so_lan || 1),
            khong_gioi_han: !!form.khong_gioi_han,
            don_gia: form.don_gia || form.gia_ban || 0,
          })
          .eq('id', primary.id)
        if (svcErr) throw svcErr
      }

      await onSaved()
      onClose()
    } catch (e) {
      setErr(e.message || 'Không thể lưu cấu hình combo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.36)', zIndex: 900 }} />
      <div style={{
        position: 'fixed',
        zIndex: 901,
        top: 0,
        right: 0,
        bottom: 0,
        width: 'calc(100vw - var(--side-w, 248px))',
        maxWidth: '100vw',
        overflow: 'hidden',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--bord)',
        boxShadow: '-6px 0 40px rgba(0,0,0,.28)',
        animation: 'rpSlideIn .22s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>Cấu hình combo liệu trình</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{combo.ma_combo}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto' }}>
          {err && (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.2)', color: '#C0392B', fontSize: 13, fontWeight: 700 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Tên combo</span>
              <input value={form.ten_combo} onChange={e => set('ten_combo', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', outline: 'none', fontFamily: 'var(--sans)' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Trạng thái</span>
              <select value={form.trang_thai} onChange={e => set('trang_thai', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff', fontFamily: 'var(--sans)' }}>
                <option value="active">Đang bán</option>
                <option value="paused">Tạm ngưng</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Mệnh giá</span>
              <input value={moneyInput(form.menh_gia)} onChange={e => set('menh_gia', parseMoney(e.target.value))}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'right', outline: 'none', fontWeight: 700 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Giá bán</span>
              <input value={moneyInput(form.gia_ban)} onChange={e => set('gia_ban', parseMoney(e.target.value))}
                style={{ height: 38, border: '1.5px solid var(--champagne)', borderRadius: 8, padding: '0 12px', textAlign: 'right', outline: 'none', fontWeight: 800 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Số lần</span>
              <input type="number" min={1} disabled={form.khong_gioi_han} value={form.so_lan}
                onChange={e => set('so_lan', parseInt(e.target.value, 10) || 1)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', outline: 'none', fontWeight: 700, background: form.khong_gioi_han ? 'var(--bg)' : '#fff' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Đơn giá/buổi</span>
              <input value={moneyInput(form.don_gia)} onChange={e => set('don_gia', parseMoney(e.target.value))}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'right', outline: 'none', fontWeight: 700 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Thời hạn</span>
              <input type="number" min={1} value={form.thoi_han_so}
                onChange={e => set('thoi_han_so', parseInt(e.target.value, 10) || 1)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', outline: 'none', fontWeight: 700 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Đơn vị hạn</span>
              <select value={form.thoi_han_don_vi} onChange={e => set('thoi_han_don_vi', e.target.value)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 10px', outline: 'none', background: '#fff', fontFamily: 'var(--sans)' }}>
                <option value="day">Ngày</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Hoa hồng %</span>
              <input type="number" min={0} step="0.5" value={form.ti_le_commission}
                onChange={e => set('ti_le_commission', parseFloat(e.target.value) || 0)}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'center', outline: 'none', fontWeight: 700 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>HH cố định</span>
              <input value={moneyInput(form.tien_hoa_hong)} onChange={e => set('tien_hoa_hong', parseMoney(e.target.value))}
                style={{ height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', textAlign: 'right', outline: 'none', fontWeight: 700 }} />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              <input type="checkbox" checked={form.khong_gioi_han} onChange={e => set('khong_gioi_han', e.target.checked)} style={{ accentColor: '#C9A96E' }} />
              Không giới hạn số lần
            </label>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 800, textTransform: 'uppercase' }}>Hoa hồng POS sẽ tự tính</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 900, color: 'var(--champagne)' }}>{formatCurrency(commissionValue)}</div>
            </div>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>Ghi chú</span>
            <textarea value={form.ghi_chu || ''} onChange={e => set('ghi_chu', e.target.value)} rows={3}
              style={{ border: '1px solid var(--bord)', borderRadius: 8, padding: 12, outline: 'none', resize: 'vertical', fontFamily: 'var(--sans)' }} />
          </label>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'var(--bg)' }}>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
          <button className="btn gold" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
        </div>
      </div>
    </>
  )
}

