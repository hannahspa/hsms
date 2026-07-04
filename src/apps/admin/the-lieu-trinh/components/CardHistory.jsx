import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency } from '../../../../lib/utils'
import StaffAvatar from '../../../../components/shared/StaffAvatar'

// ═══════════════════════════════════════════════════════════════════════════
// LỊCH SỬ THẺ LIỆU TRÌNH — đầy đủ như MySpa edit_card (anh Nam yêu cầu 04/07):
//   1. Lịch sử SỬ DỤNG BUỔI: ngày · mã đơn · KTV làm · tiền tour (=commission)
//   2. THANH TOÁN: đơn mua, các lần trả (PTTT + số tiền), đã trả / còn nợ
//   3. NHÂN VIÊN BÁN + hoa hồng bán thẻ
// Chỉ ĐỌC — mọi hành động sửa vẫn đi qua các nút/luồng sẵn có.
// ═══════════════════════════════════════════════════════════════════════════

const PTTT_LABEL = {
  tien_mat: 'Tiền mặt', chuyen_khoan: 'Chuyển khoản', quet_the: 'Quẹt thẻ',
  the_tra_truoc: 'Ví trả trước', the_lieu_trinh: 'Thẻ liệu trình',
}

const fmtDT = (iso) => {
  if (!iso) return '-'
  const [d, t] = String(iso).split('T')
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}${t ? ' ' + t.slice(0, 5) : ''}`
}
const fmtD = (iso) => {
  if (!iso) return '-'
  const [y, m, day] = String(iso).slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

const box = { border: '1px solid var(--line)', borderRadius: 10, background: '#fff', marginBottom: 18 }
const boxHead = {
  padding: '11px 16px', borderBottom: '1px solid var(--line)', display: 'flex',
  alignItems: 'center', justifyContent: 'space-between',
}
const headTxt = { fontSize: 12, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.05em' }
const th = { textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em', background: 'var(--bg)', whiteSpace: 'nowrap' }
const td = { padding: '9px 12px', fontSize: 12.5, color: 'var(--ink)', borderTop: '1px solid var(--line)', verticalAlign: 'middle' }

export default function CardHistory({ card }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!card?.id) return
    let dead = false
    ;(async () => {
      try {
        // 1. Lượt dùng buổi từ đơn POS (kể cả đơn đã hủy — hiện mờ để truy vết)
        const { data: uses } = await supabase.from('don_hang_chi_tiet')
          .select('id, so_luong, tien_tour, created_at, nhan_vien:nhan_vien_id(id, ho_ten, avatar_url), don_hang:don_hang_id(id, ma_don, ngay, trang_thai)')
          .eq('the_lieu_trinh_id', card.id).eq('loai_item', 'the_lieu_trinh')

        // 1b. Lượt dùng ghi tay (nút "Dùng 1 buổi" admin / đồng bộ lịch sử cũ)
        const { data: manualUses } = await supabase.from('lich_su_dung_the')
          .select('id, ngay, nguoi_thuc_hien, don_hang_id, created_at')
          .eq('the_lieu_trinh_id', card.id)

        // 2. Đơn MUA thẻ + các lần thanh toán
        let buyOrder = null, payments = [], sellerIncome = []
        if (card.don_hang_id) {
          const { data: dh } = await supabase.from('don_hang')
            .select('id, ma_don, ngay, trang_thai, tong_tien_hang, thuc_thu, con_no, giam_gia')
            .eq('id', card.don_hang_id).maybeSingle()
          buyOrder = dh
          if (dh) {
            const { data: tt } = await supabase.from('thanh_toan')
              .select('id, hinh_thuc, so_tien, created_at, ghi_chu')
              .eq('don_hang_id', dh.id).order('created_at')
            payments = tt || []
            const { data: hh } = await supabase.from('nhan_vien_thu_nhap')
              .select('id, loai, so_tien, ti_le, nhan_vien:nhan_vien_id(id, ho_ten, avatar_url)')
              .eq('don_hang_id', dh.id)
            sellerIncome = (hh || []).filter(r => (r.loai || '').includes('hoa_hong'))
          }
        }

        // 3. Người bán trên thẻ (nếu có cột)
        let seller = null
        if (card.nhan_vien_ban_id) {
          const { data: nv } = await supabase.from('nhan_vien')
            .select('id, ho_ten, avatar_url').eq('id', card.nhan_vien_ban_id).maybeSingle()
          seller = nv
        }

        if (!dead) setData({ uses: uses || [], manualUses: manualUses || [], buyOrder, payments, sellerIncome, seller })
      } catch (e) {
        console.warn('Lỗi tải lịch sử thẻ:', e)
        if (!dead) setData({ uses: [], manualUses: [], buyOrder: null, payments: [], sellerIncome: [], seller: null })
      }
    })()
    return () => { dead = true }
  }, [card?.id])

  if (!data) {
    return <div style={{ ...box, padding: 20, textAlign: 'center', color: 'var(--ink3)', fontSize: 12.5 }}>Đang tải lịch sử thẻ…</div>
  }

  const { uses, manualUses, buyOrder, payments, sellerIncome, seller } = data

  // Gộp 2 nguồn lượt dùng, mới nhất trước. Bỏ dòng lich_su_dung_the đã có đơn
  // tương ứng trong uses (tránh đếm đôi cùng 1 buổi).
  const useOrderIds = new Set(uses.map(u => u.don_hang?.id).filter(Boolean))
  const rows = [
    ...uses.map(u => ({
      key: 'dh-' + u.id,
      ngay: u.don_hang?.ngay || (u.created_at || '').slice(0, 10),
      maDon: u.don_hang?.ma_don || '-',
      huy: u.don_hang?.trang_thai === 'huy',
      nv: u.nhan_vien, soBuoi: u.so_luong || 1, tour: u.tien_tour || 0,
    })),
    ...manualUses.filter(m => !m.don_hang_id || !useOrderIds.has(m.don_hang_id)).map(m => ({
      key: 'ls-' + m.id,
      ngay: m.ngay || (m.created_at || '').slice(0, 10),
      maDon: 'Ghi tay', huy: false,
      nv: m.nguoi_thuc_hien ? { ho_ten: m.nguoi_thuc_hien } : null, soBuoi: 1, tour: null,
    })),
  ].sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)))

  const tongDaTra = payments.reduce((s, p) => s + (p.so_tien || 0), 0)
  const conNo = buyOrder ? (buyOrder.con_no || 0) : null
  const tongTour = rows.reduce((s, r) => s + (r.huy ? 0 : (r.tour || 0)), 0)

  return (
    <>
      {/* ── 1. LỊCH SỬ SỬ DỤNG BUỔI ─────────────────────────────────────── */}
      <div style={box}>
        <div style={boxHead}>
          <span style={headTxt}>Lịch sử sử dụng buổi</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink2)' }}>
            {rows.filter(r => !r.huy).length} lượt · tour {formatCurrency(tongTour)}
          </span>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12.5, color: 'var(--ink3)' }}>Chưa có lượt sử dụng nào được ghi nhận trên HSMS.</div>
        ) : (
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>Ngày</th><th style={th}>Mã đơn</th><th style={th}>KTV thực hiện</th>
                <th style={{ ...th, textAlign: 'center' }}>Buổi</th><th style={{ ...th, textAlign: 'right' }}>Tiền tour</th>
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.key} style={{ opacity: r.huy ? 0.45 : 1 }}>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtD(r.ngay)}</td>
                    <td style={{ ...td, fontWeight: 700, color: 'var(--champagne)', whiteSpace: 'nowrap' }}>
                      {r.maDon}{r.huy ? ' (đã hủy)' : ''}
                    </td>
                    <td style={td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        {r.nv?.id && <StaffAvatar nv={r.nv} size={22} />}
                        <span style={{ fontWeight: 600, color: r.nv ? 'var(--ink)' : 'var(--danger)' }}>{r.nv?.ho_ten || '— chưa gán —'}</span>
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{r.soBuoi}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                      {r.tour === null ? '—' : formatCurrency(r.tour)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 2. THANH TOÁN & CÔNG NỢ ─────────────────────────────────────── */}
      <div style={box}>
        <div style={boxHead}>
          <span style={headTxt}>Thanh toán &amp; công nợ</span>
          {buyOrder && (
            <span style={{ fontSize: 12, fontWeight: 800, color: conNo > 0 ? 'var(--danger)' : '#426a2c' }}>
              {conNo > 0 ? `Còn nợ ${formatCurrency(conNo)}` : 'Đã thanh toán đủ'}
            </span>
          )}
        </div>
        {!buyOrder ? (
          <div style={{ padding: 16, fontSize: 12.5, color: 'var(--ink3)' }}>
            Thẻ nhập từ dữ liệu cũ (MySpa) — không có đơn mua trên HSMS.
            {card.da_thanh_toan != null && <> Đã thanh toán ghi nhận: <b>{formatCurrency(card.da_thanh_toan)}</b>.</>}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid var(--line)' }}>
              {[
                ['Đơn mua', buyOrder.ma_don + ' · ' + fmtD(buyOrder.ngay)],
                ['Thực thu đơn', formatCurrency(buyOrder.thuc_thu ?? Math.max(0, (buyOrder.tong_tien_hang || 0) - (buyOrder.giam_gia || 0)))],
                ['Đã thanh toán', formatCurrency(tongDaTra)],
                ['Còn nợ', formatCurrency(conNo || 0)],
              ].map(([l, v], i) => (
                <div key={l} style={{ padding: '10px 14px', borderLeft: i ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 800, textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 3, color: l === 'Còn nợ' && conNo > 0 ? 'var(--danger)' : 'var(--ink)' }}>{v}</div>
                </div>
              ))}
            </div>
            {payments.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Lần</th><th style={th}>Thời gian</th><th style={th}>Hình thức</th>
                  <th style={{ ...th, textAlign: 'right' }}>Số tiền</th><th style={th}>Ghi chú</th>
                </tr></thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id}>
                      <td style={td}>{i + 1}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDT(p.created_at)}</td>
                      <td style={td}>{PTTT_LABEL[p.hinh_thuc] || p.hinh_thuc}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.so_tien || 0)}</td>
                      <td style={{ ...td, color: 'var(--ink3)' }}>{p.ghi_chu || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* ── 3. NHÂN VIÊN BÁN & HOA HỒNG ─────────────────────────────────── */}
      {(seller || sellerIncome.length > 0) && (
        <div style={box}>
          <div style={boxHead}><span style={headTxt}>Nhân viên bán &amp; hoa hồng</span></div>
          <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            {seller && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <StaffAvatar nv={seller} size={26} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{seller.ho_ten}</span>
                <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>(người bán)</span>
              </span>
            )}
            {sellerIncome.map(r => (
              <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,169,110,.1)', border: '1px solid rgba(201,169,110,.3)', borderRadius: 999, padding: '4px 12px' }}>
                <StaffAvatar nv={r.nhan_vien} size={20} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{r.nhan_vien?.ho_ten}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--champagne)' }}>
                  +{formatCurrency(r.so_tien || 0)}{r.ti_le ? ` (${r.ti_le}%)` : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
