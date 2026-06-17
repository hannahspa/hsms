import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, todayISO, formatDateInput } from '../../../lib/utils'
import { C, FONT } from '../../../constants/colors'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'

const PTTT = [
  { id: 'tien_mat', label: 'Tiền Mặt', icon: '💵', color: '#2D7A4F' },
  { id: 'chuyen_khoan', label: 'Chuyển Khoản', icon: '🏦', color: '#1A5276' },
  { id: 'quet_the', label: 'Quẹt Thẻ', icon: '💳', color: '#6C3483' },
  { id: 'the_tra_truoc', label: 'Thẻ Trả Trước', icon: '🎫', color: '#8B6914' },
]

export default function NhatKyNgay({ user }) {
  const [ngay, setNgay] = useState(todayISO())
  const [showLich, setShowLich] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rDT, rCP, rDM, rDH, rKho, rChot, rSP] = await Promise.all([
        supabase.from('doanh_thu').select('hinh_thuc, so_tien, nguon').eq('ngay', ngay),
        supabase.from('chi_phi').select('so_tien, danh_muc_id, dien_giai, hinh_thuc_thanh_toan').eq('ngay', ngay),
        supabase.from('danh_muc_chi_phi').select('id, ten'),
        supabase.from('don_hang').select('id, ma_don, thuc_thu, khach_hang_id, created_at').eq('ngay', ngay).eq('is_test', false).neq('trang_thai', 'huy'),
        supabase.from('kho_giao_dich').select('loai, so_luong, gia_don_vi, san_pham_id, khach_hang_id').eq('ngay', ngay),
        supabase.from('so_thu_chi_chot_ngay').select('trang_thai, nguoi_chot, chot_luc').eq('ngay', ngay).maybeSingle(),
        supabase.from('kho_san_pham').select('id, ten, don_vi'),
      ])
      const dt = rDT.data || [], cp = rCP.data || [], dh = rDH.data || [], kho = rKho.data || []
      const dmMap = {}; (rDM.data || []).forEach(d => { dmMap[d.id] = d.ten })
      const spMap = {}; (rSP.data || []).forEach(s => { spMap[s.id] = s })

      // ── Query phụ thuộc đơn trong ngày: thẻ liệu trình bán + tên khách ──
      const dhIds = dh.map(d => d.id)
      const khachIds = [...new Set(dh.map(d => d.khach_hang_id).filter(Boolean))]
      let theBan = [], khachMap = {}
      if (dhIds.length) {
        const rThe = await supabase.from('the_lieu_trinh')
          .select('id, ten_dich_vu, gia_tri_the, so_buoi_tong, khach_hang_id, don_hang_id')
          .in('don_hang_id', dhIds)
        theBan = rThe.data || []
      }
      if (khachIds.length) {
        const rKh = await supabase.from('khach_hang').select('id, ho_ten, so_dien_thoai').in('id', khachIds)
        ;(rKh.data || []).forEach(k => { khachMap[k.id] = k })
      }

      const dtByPttt = {}
      PTTT.forEach(p => { dtByPttt[p.id] = dt.filter(r => r.hinh_thuc === p.id).reduce((s, r) => s + (r.so_tien || 0), 0) })
      const tongDoanhThu = (dtByPttt.tien_mat || 0) + (dtByPttt.chuyen_khoan || 0) + (dtByPttt.quet_the || 0)  // thực thu, trừ thẻ trả trước
      const tongChi = cp.reduce((s, r) => s + (r.so_tien || 0), 0)

      // Chi phí theo danh mục (top)
      const chiByDM = {}
      cp.forEach(r => { const t = dmMap[r.danh_muc_id] || 'Khác'; chiByDM[t] = (chiByDM[t] || 0) + (r.so_tien || 0) })
      const topChi = Object.entries(chiByDM).sort((a, b) => b[1] - a[1]).slice(0, 5)

      // Kho
      const nhapKho = kho.filter(k => k.loai === 'nhap_kho')
      const xuatBan = kho.filter(k => k.loai === 'xuat_ban')               // bán cho khách
      const xuatDung = kho.filter(k => ['xuat_su_dung', 'tra_nha_cc'].includes(k.loai))  // dùng nội bộ / trả NCC
      const xuatKho = [...xuatBan, ...xuatDung]
      const tienNhapKho = nhapKho.reduce((s, k) => s + (Number(k.so_luong) * Number(k.gia_don_vi) || 0), 0)
      const tienBanSP = xuatBan.reduce((s, k) => s + (Number(k.so_luong) * Number(k.gia_don_vi) || 0), 0)

      // Thẻ liệu trình bán
      const theBanList = theBan.map(t => ({
        ...t, khach: khachMap[t.khach_hang_id]?.ho_ten || 'Khách lẻ',
      }))
      const tongGiaTriThe = theBan.reduce((s, t) => s + (Number(t.gia_tri_the) || 0), 0)

      // Khách hàng trong ngày (gom theo khách + chi tiêu)
      const khachByDh = {}
      dh.forEach(d => {
        const key = d.khach_hang_id || '__le'
        if (!khachByDh[key]) khachByDh[key] = { ten: d.khach_hang_id ? (khachMap[d.khach_hang_id]?.ho_ten || 'Khách') : 'Khách lẻ', soDon: 0, chiTieu: 0 }
        khachByDh[key].soDon++
        khachByDh[key].chiTieu += Number(d.thuc_thu) || 0
      })
      const khachList = Object.values(khachByDh).sort((a, b) => b.chiTieu - a.chiTieu)

      setData({
        dtByPttt, tongDoanhThu, tongChi,
        loiNhuan: tongDoanhThu - tongChi,
        soDon: dh.length,
        soKhach: khachIds.length,
        topChi, soKhoanChi: cp.length,
        nhapKho, xuatKho, xuatBan, tienNhapKho, tienBanSP, spMap,
        theBanList, tongGiaTriThe,
        khachList,
        chot: rChot.data || null,
      })
    } catch (e) { console.error('NhatKyNgay:', e) }
    finally { setLoading(false) }
  }, [ngay])

  useEffect(() => { load() }, [load])

  const today = todayISO()
  const shiftDay = (delta) => {
    const d = new Date(ngay + 'T00:00:00'); d.setDate(d.getDate() + delta)
    setNgay(d.toISOString().slice(0, 10))
  }

  return (
    <div style={{ padding: '22px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={d => { setNgay(d); setShowLich(false) }} />

      {/* Header + chọn ngày */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT.serif, fontSize: 24, fontWeight: 700, color: C.text }}>Nhật Ký Ngày</div>
          <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>Toàn cảnh hoạt động trong ngày · {user?.ho_ten}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => shiftDay(-1)} style={navBtn}>‹</button>
          <button onClick={() => setShowLich(true)} style={{ ...navBtn, width: 'auto', padding: '0 16px', gap: 8, fontWeight: 700 }}>
            <I.Calendar style={{ width: 14, height: 14 }} />
            {ngay === today ? 'Hôm nay' : formatDateInput(ngay)}
          </button>
          <button onClick={() => shiftDay(1)} disabled={ngay >= today} style={{ ...navBtn, opacity: ngay >= today ? 0.4 : 1 }}>›</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: C.textMute }}>Đang tổng hợp...</div>
      ) : data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Hero 3 chỉ số */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <HeroStat label="Doanh Thu (thực thu)" value={data.tongDoanhThu} color="#2D7A4F" icon="📈" />
            <HeroStat label="Tổng Chi" value={data.tongChi} color="#C0392B" icon="📉" />
            <HeroStat label="Lợi Nhuận" value={data.loiNhuan} color={data.loiNhuan >= 0 ? '#1A5276' : '#C0392B'} icon="💎" />
          </div>

          {/* Doanh thu theo PTTT */}
          <Card title="Doanh Thu Theo Hình Thức" icon="💰">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {PTTT.map(p => (
                <div key={p.id} style={{ background: C.bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>{p.icon} {p.label}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 16, fontWeight: 800, color: p.color, marginTop: 4 }}>{formatCurrency(data.dtByPttt[p.id] || 0)}</div>
                </div>
              ))}
            </div>
            {data.dtByPttt.the_tra_truoc > 0 && <div style={{ fontSize: 11, color: C.textMute, marginTop: 8, fontStyle: 'italic' }}>* Thẻ trả trước không tính vào thực thu.</div>}
          </Card>

          {/* Đơn hàng + Kho */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Card title="Bán Hàng" icon="🛒">
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <MiniStat label="Số đơn" value={data.soDon} />
                <MiniStat label="Lượt khách" value={data.soKhach} />
                <MiniStat label="Thẻ LT bán" value={data.theBanList.length} />
                <MiniStat label="SP bán" value={data.xuatBan.length} />
              </div>
            </Card>
            <Card title="Kho" icon="📦">
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <MiniStat label="Lần nhập" value={data.nhapKho.length} />
                <MiniStat label="Tiền nhập" value={formatCurrency(data.tienNhapKho)} small />
                <MiniStat label="Lần xuất" value={data.xuatKho.length} />
              </div>
            </Card>
          </div>

          {/* Thẻ liệu trình bán trong ngày */}
          {data.theBanList.length > 0 && (
            <Card title={`Thẻ Liệu Trình Bán (${data.theBanList.length} thẻ · ${formatCurrency(data.tongGiaTriThe)})`} icon="🎫">
              {data.theBanList.map((t, i) => (
                <div key={t.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.ten_dich_vu || 'Liệu trình'}</div>
                    <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 1 }}>👤 {t.khach}{t.so_buoi_tong ? ` · ${t.so_buoi_tong} buổi` : ''}</div>
                  </div>
                  <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: '#6C3483', flexShrink: 0, marginLeft: 12 }}>{formatCurrency(t.gia_tri_the || 0)}</span>
                </div>
              ))}
            </Card>
          )}

          {/* Khách hàng trong ngày */}
          {data.khachList.length > 0 && (
            <Card title={`Khách Hàng Trong Ngày (${data.khachList.length})`} icon="💝">
              {data.khachList.map((k, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                  <span style={{ fontSize: 13, color: C.text }}>👤 {k.ten} <span style={{ color: C.textMute, fontSize: 11.5 }}>· {k.soDon} đơn</span></span>
                  <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: '#2D7A4F', flexShrink: 0 }}>{formatCurrency(k.chiTieu)}</span>
                </div>
              ))}
            </Card>
          )}

          {/* Chi phí chi tiết */}
          <Card title={`Chi Phí (${data.soKhoanChi} khoản)`} icon="🧾">
            {data.topChi.length === 0 ? (
              <div style={{ color: C.textMute, fontSize: 13, padding: '8px 0' }}>Không có khoản chi trong ngày.</div>
            ) : data.topChi.map(([ten, tien]) => (
              <div key={ten} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                <span style={{ fontSize: 13, color: C.text }}>{ten}</span>
                <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: '#C0392B' }}>−{formatCurrency(tien)}</span>
              </div>
            ))}
          </Card>

          {/* Kho chi tiết — nhập/xuất từng SP */}
          {(data.nhapKho.length > 0 || data.xuatKho.length > 0) && (
            <Card title="Chi Tiết Nhập / Xuất Kho" icon="📋">
              {[...data.nhapKho, ...data.xuatKho].map((k, i) => {
                const sp = data.spMap[k.san_pham_id]
                const nhap = k.loai === 'nhap_kho'
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ fontSize: 13, color: C.text }}>{nhap ? '📥' : '📤'} {sp?.ten || '—'}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 12.5, fontWeight: 700, color: nhap ? '#2D7A4F' : '#C0392B' }}>
                      {nhap ? '+' : '−'}{Number(k.so_luong)} {sp?.don_vi || ''}
                    </span>
                  </div>
                )
              })}
            </Card>
          )}

          {/* Trạng thái chốt ngày */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 12, background: data.chot ? '#eef5e8' : '#fdf3e0', border: `1px solid ${data.chot ? '#bcd5a8' : '#e8d5b0'}` }}>
            <span style={{ fontSize: 18 }}>{data.chot ? '✅' : '🕐'}</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: data.chot ? '#3e5a32' : '#8a6a35' }}>
              {data.chot ? `Đã chốt ngày bởi ${data.chot.nguoi_chot || 'Lễ Tân'}` : 'Ngày này chưa chốt sổ'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtn = { width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontFamily: FONT.sans }

function HeroStat({ label, value, color, icon }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '18px 20px', border: `1px solid ${C.border}`, boxShadow: C.shadowSm }}>
      <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{icon} {label}</div>
      <div style={{ fontFamily: FONT.serif, fontSize: 24, fontWeight: 800, color, marginTop: 6 }}>{formatCurrency(value)}</div>
    </div>
  )
}

function MiniStat({ label, value, small }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: small ? FONT.mono : FONT.serif, fontSize: small ? 15 : 22, fontWeight: 800, color: C.text, marginTop: 3 }}>{value}</div>
    </div>
  )
}
