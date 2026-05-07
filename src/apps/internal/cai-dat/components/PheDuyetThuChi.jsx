import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, formatDateInput } from '../../../../lib/utils'

const BANG_LABEL = {
  doanh_thu: 'Doanh Thu',
  chi_phi: 'Chi Phí',
  chuyen_khoan_noi_bo: 'Chuyển Khoản',
}

// Dual-access: Component này cho Admin duyệt nhanh từ TongQuan (InternalApp).
// TabXetDuyet trong AdminApp xử lý tương tự — cả hai cùng filter 'cho_duyet',
// nên duyệt ở chỗ nào thì chỗ kia tự mất. Không có conflict.
export default function PheDuyetThuChi({ onClose, onUpdated }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null) // { id, defaultReason }
  const [lyDoTuChoi, setLyDoTuChoi] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('yeu_cau_chinh_sua')
      .select('*')
      .in('loai_yeu_cau', ['sua', 'xoa'])
      .eq('trang_thai', 'cho_duyet')
      .order('created_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  const handleDuyet = async (ycId) => {
    const yc = list.find(d => d.id === ycId)
    if (!yc) return
    if (!yc.ban_ghi_id) { console.error('Thiếu ban_ghi_id'); return }

    try {
      let result
      if (yc.loai_yeu_cau === 'sua') {
        if (!yc.du_lieu_moi || Object.keys(yc.du_lieu_moi).length === 0) {
          console.error('du_lieu_moi rỗng'); return
        }
        result = await supabase.from(yc.loai_bang).update(yc.du_lieu_moi).eq('id', yc.ban_ghi_id)
      } else if (yc.loai_yeu_cau === 'xoa') {
        result = await supabase.from(yc.loai_bang).delete().eq('id', yc.ban_ghi_id)
      } else {
        return
      }

      if (result.error) {
        console.error('Lỗi cập nhật dữ liệu:', result.error)
        return
      }

      // Chỉ đánh dấu đã duyệt khi update/delete THÀNH CÔNG
      const { error: updateErr } = await supabase.from('yeu_cau_chinh_sua').update({
        trang_thai: 'da_duyet', nguoi_duyet: 'Admin',
      }).eq('id', ycId)
      if (updateErr) { console.error('Lỗi cập nhật trạng thái:', updateErr); return }

      fetchData()
      onUpdated?.()
    } catch (e) { console.error('Duyệt thất bại:', e) }
  }

  const handleTuChoi = async () => {
    if (!lyDoTuChoi.trim()) return
    await supabase.from('yeu_cau_chinh_sua').update({
      trang_thai: 'tu_choi', nguoi_duyet: 'Admin', ghi_chu_duyet: lyDoTuChoi,
    }).eq('id', rejectModal.id)
    setRejectModal(null)
    setLyDoTuChoi('')
    fetchData()
    onUpdated?.()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: LUX.bg, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ background: LUX.heroGrad, padding: '44px 20px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button onClick={onClose}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ←
          </button>
          <div style={{ color: 'white', fontWeight: '700', fontSize: '20px', fontFamily: LUX.fontSerif }}>Phê Duyệt Thu Chi</div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontFamily: LUX.fontSans }}>
          {list.length} yêu cầu sửa/xóa đang chờ duyệt
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: LUX.ink, fontFamily: LUX.fontSerif }}>Không có yêu cầu nào</div>
            <div style={{ fontSize: '13px', color: LUX.ink3, marginTop: '4px', fontFamily: LUX.fontSans }}>Tất cả yêu cầu sửa/xóa đã được xử lý</div>
          </div>
        ) : (
          list.map((yc, i) => (
            <div key={yc.id} style={{ background: LUX.surface2, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: `1px solid ${LUX.line}`, boxShadow: LUX.shadowSm }}>
              {/* Type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ background: yc.loai_yeu_cau === 'sua' ? '#FFF3E0' : '#FEF2F2', color: yc.loai_yeu_cau === 'sua' ? '#E67E22' : '#C0392B', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', fontFamily: LUX.fontSans }}>
                  {yc.loai_yeu_cau === 'sua' ? '✏️ Sửa' : '🗑️ Xóa'}
                </span>
                <span style={{ background: '#F5F3FF', color: '#6C3483', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', fontFamily: LUX.fontSans }}>
                  {BANG_LABEL[yc.loai_bang] || yc.loai_bang}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                  {yc.nguoi_yeu_cau || '—'}
                </span>
              </div>

              {/* Comparison for sửa */}
              {yc.loai_yeu_cau === 'sua' && yc.du_lieu_cu && yc.du_lieu_moi && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ background: '#FEF2F2', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#C0392B', marginBottom: '4px', fontWeight: '600', fontFamily: LUX.fontSans }}>CŨ</div>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: '#C0392B', fontFamily: LUX.fontMono }}>{formatCurrency(yc.du_lieu_cu.so_tien)}</div>
                    {yc.du_lieu_cu.dien_giai ? <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '2px', fontFamily: LUX.fontSans }}>{yc.du_lieu_cu.dien_giai}</div> : null}
                  </div>
                  <span style={{ fontSize: '20px', color: LUX.ink3 }}>→</span>
                  <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#2D7A4F', marginBottom: '4px', fontWeight: '600', fontFamily: LUX.fontSans }}>MỚI</div>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: '#2D7A4F', fontFamily: LUX.fontMono }}>{formatCurrency(yc.du_lieu_moi.so_tien)}</div>
                    {yc.du_lieu_moi.dien_giai ? <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '2px', fontFamily: LUX.fontSans }}>{yc.du_lieu_moi.dien_giai}</div> : null}
                  </div>
                </div>
              )}

              {/* For xóa - show what's being deleted */}
              {yc.loai_yeu_cau === 'xoa' && yc.du_lieu_cu && (
                <div style={{ background: '#FEF2F2', borderRadius: '10px', padding: '10px', marginBottom: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#C0392B', marginBottom: '4px', fontWeight: '600', fontFamily: LUX.fontSans }}>YÊU CẦU XÓA GIAO DỊCH NÀY</div>
                  <div style={{ fontWeight: '800', fontSize: '18px', color: '#C0392B', fontFamily: LUX.fontMono }}>{formatCurrency(yc.du_lieu_cu.so_tien)}</div>
                  {yc.du_lieu_cu.dien_giai ? <div style={{ fontSize: '12px', color: LUX.ink3, marginTop: '2px', fontFamily: LUX.fontSans }}>{yc.du_lieu_cu.dien_giai}</div> : null}
                </div>
              )}

              {/* Lý do */}
              <div style={{ background: '#FFF9F0', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px', fontFamily: LUX.fontSans }}>
                <span style={{ fontSize: '11px', color: '#8B6914', fontWeight: '600' }}>Lý do: </span>
                <span style={{ fontSize: '12px', color: LUX.ink, fontStyle: 'italic' }}>{yc.ly_do || '—'}</span>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setRejectModal({ id: yc.id, defaultReason: 'Không đủ thông tin hoặc sai số liệu' }); setLyDoTuChoi('Không đủ thông tin hoặc sai số liệu') }}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#C0392B', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                  ✕ Từ Chối
                </button>
                <button onClick={() => handleDuyet(yc.id)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: LUX.heroGrad, border: 'none', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                  ✓ Duyệt
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 999 }}
          onClick={() => setRejectModal(null)}>
          <div style={{ background: LUX.bg, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: LUX.ink, marginBottom: '16px', fontFamily: LUX.fontSerif }}>Lý do từ chối</h3>
            <textarea value={lyDoTuChoi} onChange={e => setLyDoTuChoi(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${LUX.line}`, fontSize: '14px', resize: 'none', height: '90px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setRejectModal(null)}
                style={{ flex: 1, padding: '14px', borderRadius: '14px', background: LUX.surface2, border: `1px solid ${LUX.line}`, fontWeight: '700', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Hủy
              </button>
              <button onClick={handleTuChoi}
                style={{ flex: 1, padding: '14px', borderRadius: '14px', background: '#C0392B', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
