// ═══════════════════════════════════════════════════════════════════════════
// Kho Hàng — Tab Báo Cáo
// Tách từ AdminKhoHangPage.jsx (11/07/2026) — TabChietRot cũ là dead code, đã xóa
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { getNowVN } from '../../../lib/utils'
import { LOAI_GD, LOAI_SP, fmt, fmtSL, monthRange } from './khoShared'

// TAB 5: BÁO CÁO TIÊU THỤ
// ══════════════════════════════════════════════════════════════════════════════
export function TabBaoCao({ products }) {
  const nowVN = getNowVN()
  const [month, setMonth] = useState(nowVN.getMonth() + 1)
  const [year,  setYear]  = useState(nowVN.getFullYear())
  const [data,  setData]  = useState([])
  const [nguoiMap, setNguoiMap] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { from, to } = monthRange(year, month)
    const { data: gds } = await supabase.from('kho_giao_dich')
      .select('*, nhan_vien_nhan:nhan_vien_nhan_id(ho_ten)')
      .gte('ngay', from).lte('ngay', to)
      .order('ngay', { ascending: false }).order('created_at', { ascending: false })
    setData(gds || [])
    const { data: profs } = await supabase.from('profiles').select('id, ho_ten')
    setNguoiMap(Object.fromEntries((profs || []).map(p => [p.id, p.ho_ten])))
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const spMap = Object.fromEntries(products.map(p => [p.id, p]))

  // Aggregate by product
  const byProduct = {}
  data.forEach(gd => {
    if (!byProduct[gd.san_pham_id]) byProduct[gd.san_pham_id] = { nhap: 0, xuat_dung: 0, xuat_ban: 0, chiet: 0, gtNhap: 0 }
    const r = byProduct[gd.san_pham_id]
    if (gd.loai === 'nhap_kho')     { r.nhap += gd.so_luong; r.gtNhap += gd.so_luong * (gd.gia_don_vi || 0) }
    if (gd.loai === 'xuat_su_dung') r.xuat_dung += gd.so_luong
    if (gd.loai === 'xuat_ban')     r.xuat_ban  += gd.so_luong
    if (gd.loai === 'chiet_ra')     r.chiet     += gd.so_luong
  })

  const rows = Object.entries(byProduct)
    .map(([id, r]) => ({ sp: spMap[id], ...r, tongXuat: r.xuat_dung + r.xuat_ban + r.chiet }))
    .filter(r => r.sp)
    .sort((a, b) => b.tongXuat - a.tongXuat)

  const totNhap  = rows.reduce((s, r) => s + r.nhap, 0)
  const totXuat  = rows.reduce((s, r) => s + r.tongXuat, 0)
  const totGTNhap = rows.reduce((s, r) => s + r.gtNhap, 0)

  // Giá trị từng giao dịch (lồng giá): đơn giá GD nếu có, không thì giá nhập SP
  const giaTriGD = (gd) => {
    const sp = spMap[gd.san_pham_id]
    const dg = Number(gd.gia_don_vi) || Number(sp?.gia_nhap) || 0
    return Number(gd.so_luong) * dg
  }
  const totGTXuatDung = data.filter(g => g.loai === 'xuat_su_dung').reduce((s, g) => s + giaTriGD(g), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
        <button onClick={prevMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`,
            background: 'white', cursor: 'pointer', fontSize: '16px', color: COLORS.textSub }}>
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '800', fontSize: '18px', color: COLORS.text }}>
            Tháng {month}/{year}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.textMute }}>
            {monthRange(year, month).from} → {monthRange(year, month).to}
          </div>
        </div>
        <button onClick={nextMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`,
            background: 'white', cursor: 'pointer', fontSize: '16px', color: COLORS.textSub }}>
          ›
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {[
          { label: 'Tổng nhập', val: `${totNhap.toFixed(1)} đv`, icon: '📥', color: '#2D7A4F' },
          { label: 'Tổng xuất', val: `${totXuat.toFixed(1)} đv`, icon: '📤', color: '#C0392B' },
          { label: 'GT nhập hàng', val: fmt(totGTNhap), icon: '💰', color: '#1A5276' },
          { label: 'GT xuất dùng', val: fmt(totGTXuatDung), icon: '🔧', color: '#E67E22' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '14px 10px',
            border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '10px', color: COLORS.textMute, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>Đang tải...</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
          <div>Không có giao dịch trong tháng {month}/{year}</div>
        </div>
      ) : (
        <>
          <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text }}>
            Chi tiết theo sản phẩm ({rows.length} SP có giao dịch)
          </div>
          {rows.map(r => {
            const loai = LOAI_SP[r.sp.loai] || {}
            const maxXuat = Math.max(...rows.map(x => x.tongXuat), 1)
            const pct = (r.tongXuat / maxXuat) * 100
            return (
              <div key={r.sp.id} style={{ background: 'white', borderRadius: '14px', padding: '14px 16px',
                border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{loai.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text }}>{r.sp.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>{loai.label}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#C0392B' }}>
                      -{fmtSL(r.tongXuat, r.sp.don_vi)}
                    </div>
                    {r.nhap > 0 && (
                      <div style={{ fontSize: '11px', color: '#2D7A4F' }}>+{fmtSL(r.nhap, r.sp.don_vi)}</div>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div style={{ height: '4px', background: '#F0E9E0', borderRadius: '2px', marginBottom: '10px' }}>
                  <div style={{ height: '100%', borderRadius: '2px', background: '#C0392B', width: `${pct}%` }} />
                </div>

                {/* Breakdown */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {r.xuat_dung > 0 && (
                    <span style={{ fontSize: '11px', background: '#FDF3E9', color: '#E67E22',
                      padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      🔧 Dùng nội bộ: {fmtSL(r.xuat_dung, r.sp.don_vi)}
                    </span>
                  )}
                  {r.xuat_ban > 0 && (
                    <span style={{ fontSize: '11px', background: '#FDF3E9', color: '#A0714F',
                      padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      💸 Bán khách: {fmtSL(r.xuat_ban, r.sp.don_vi)}
                    </span>
                  )}
                  {r.chiet > 0 && (
                    <span style={{ fontSize: '11px', background: '#F5F0FF', color: '#8E44AD',
                      padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      🧪 Chiết rót: {fmtSL(r.chiet, r.sp.don_vi)}
                    </span>
                  )}
                  {r.gtNhap > 0 && (
                    <span style={{ fontSize: '11px', background: '#E8F5E9', color: '#2D7A4F',
                      padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      💰 GT nhập: {fmt(r.gtNhap)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* NHẬT KÝ CHI TIẾT — thời gian · ai xuất · KTV nhận · SP · SL · giá trị */}
          <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text, marginTop: '6px' }}>
            Nhật ký chi tiết ({data.length} giao dịch)
          </div>
          <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.shadow, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  <tr style={{ background: COLORS.bg }}>
                    {['Ngày', 'Loại', 'Sản phẩm', 'Số lượng', 'Người xuất', 'KTV nhận', 'Đơn giá', 'Thành tiền'].map((h, i) => (
                      <th key={h} style={{ padding: '10px', textAlign: i >= 3 ? 'right' : 'left',
                        fontSize: 11, color: COLORS.textSub, textTransform: 'uppercase',
                        letterSpacing: '.03em', borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map(gd => {
                    const sp = spMap[gd.san_pham_id]
                    const lg = LOAI_GD[gd.loai] || {}
                    const dg = Number(gd.gia_don_vi) || Number(sp?.gia_nhap) || 0
                    const nguoiXuat = nguoiMap[gd.nguoi_thuc_hien] || (gd.nguoi_thuc_hien && !/^[0-9a-f-]{30,}$/i.test(gd.nguoi_thuc_hien) ? gd.nguoi_thuc_hien : '—')
                    return (
                      <tr key={gd.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <td style={{ padding: '10px', fontSize: 12, color: COLORS.textSub, whiteSpace: 'nowrap' }}>{gd.ngay}</td>
                        <td style={{ padding: '10px', fontSize: 12, color: lg.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{lg.icon} {lg.label}</td>
                        <td style={{ padding: '10px', fontSize: 12, color: COLORS.text, fontWeight: 700, minWidth: 160 }}>{sp?.ten || '—'}</td>
                        <td style={{ padding: '10px', fontSize: 12, fontWeight: 800, textAlign: 'right', whiteSpace: 'nowrap',
                          color: lg.sign > 0 ? '#2D7A4F' : lg.sign < 0 ? '#C0392B' : '#1A5276' }}>
                          {lg.sign > 0 ? '+' : lg.sign < 0 ? '-' : '±'}{fmtSL(gd.so_luong, sp?.don_vi)}
                        </td>
                        <td style={{ padding: '10px', fontSize: 12, color: COLORS.textSub, textAlign: 'right', whiteSpace: 'nowrap' }}>{nguoiXuat}</td>
                        <td style={{ padding: '10px', fontSize: 12, color: gd.nhan_vien_nhan ? COLORS.primary : COLORS.textMute, fontWeight: gd.nhan_vien_nhan ? 700 : 400, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {gd.nhan_vien_nhan?.ho_ten || '—'}
                        </td>
                        <td style={{ padding: '10px', fontSize: 12, color: COLORS.textSub, textAlign: 'right', whiteSpace: 'nowrap' }}>{dg ? fmt(dg) : '—'}</td>
                        <td style={{ padding: '10px', fontSize: 12, fontWeight: 800, color: COLORS.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(Number(gd.so_luong) * dg)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
