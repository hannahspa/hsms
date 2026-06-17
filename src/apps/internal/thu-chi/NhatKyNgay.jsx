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
        supabase.from('don_hang').select('id, thuc_thu, khach_hang_id').eq('ngay', ngay).eq('is_test', false).neq('trang_thai', 'huy'),
        supabase.from('kho_giao_dich').select('loai, so_luong, gia_don_vi, san_pham_id').eq('ngay', ngay),
        supabase.from('so_thu_chi_chot_ngay').select('trang_thai, nguoi_chot, chot_luc').eq('ngay', ngay).maybeSingle(),
        supabase.from('kho_san_pham').select('id, ten, don_vi'),
      ])
      const dt = rDT.data || [], cp = rCP.data || [], dh = rDH.data || [], kho = rKho.data || []
      const dmMap = {}; (rDM.data || []).forEach(d => { dmMap[d.id] = d.ten })
      const spMap = {}; (rSP.data || []).forEach(s => { spMap[s.id] = s })

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
      const xuatKho = kho.filter(k => ['xuat_su_dung', 'xuat_ban', 'tra_nha_cc'].includes(k.loai))
      const tienNhapKho = nhapKho.reduce((s, k) => s + (Number(k.so_luong) * Number(k.gia_don_vi) || 0), 0)

      setData({
        dtByPttt, tongDoanhThu, tongChi,
        loiNhuan: tongDoanhThu - tongChi,
        soDon: dh.length,
        soKhach: new Set(dh.map(d => d.khach_hang_id).filter(Boolean)).size,
        topChi, soKhoanChi: cp.length,
        nhapKho, xuatKho, tienNhapKho, spMap,
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

          {/* Đơn hàng + Khách */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Card title="Bán Hàng" icon="🛒">
              <div style={{ display: 'flex', gap: 20 }}>
                <MiniStat label="Số đơn" value={data.soDon} />
                <MiniStat label="Lượt khách" value={data.soKhach} />
              </div>
            </Card>
            <Card title="Kho" icon="📦">
              <div style={{ display: 'flex', gap: 20 }}>
                <MiniStat label="Lần nhập" value={data.nhapKho.length} />
                <MiniStat label="Tiền nhập" value={formatCurrency(data.tienNhapKho)} small />
                <MiniStat label="Lần xuất" value={data.xuatKho.length} />
              </div>
            </Card>
          </div>

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
