import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  bg: '#FAF7F4', card: '#FFFFFF',
  border: 'rgba(160,113,79,0.12)',
  shadow: '0 2px 12px rgba(139,94,60,0.07)',
  text: '#1A1209', sub: '#8B7355', mute: '#B8A898',
  thu: '#2D7A4F', chi: '#C0392B', taiSan: '#1A5276',
  gold: '#C9A96E', primary: '#A0714F',
  warn: '#E67E22', danger: '#E74C3C', purple: '#8E44AD',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}
function fmtFull(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}
function getNowVN() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
}
function todayISO() { return getNowVN().toISOString().slice(0, 10) }
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}
function monthRange(y, m) {
  const days = new Date(y, m, 0).getDate()
  const mm = String(m).padStart(2, '0')
  return { first: `${y}-${mm}-01`, last: `${y}-${mm}-${String(days).padStart(2,'0')}`, days }
}
function pctChange(now, prev) {
  if (!prev) return null
  return Math.round(((now - prev) / Math.abs(prev)) * 100)
}
function daysUntil(iso) {
  if (!iso) return null
  const today = getNowVN(); today.setHours(0,0,0,0)
  const d = new Date(iso + 'T00:00:00')
  return Math.round((d - today) / 86400000)
}
function daysAgo(iso) {
  if (!iso) return null
  const today = getNowVN(); today.setHours(0,0,0,0)
  const d = new Date(iso + 'T00:00:00')
  return Math.round((today - d) / 86400000)
}
function viTriLabel(v) {
  return v === 'ktv' ? 'KTV' : v === 'le_tan' ? 'Lễ Tân' : v === 'tap_vu' ? 'Tạp Vụ' : v || ''
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color, change }) {
  const up = change > 0, down = change < 0
  return (
    <div style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '16px', boxShadow: C.shadow }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        {change !== null && change !== undefined && (
          <span style={{
            fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '999px',
            background: up ? '#E8F5EE' : down ? '#FDEDEC' : '#F5F2EF',
            color: up ? C.thu : down ? C.chi : C.mute,
          }}>
            {up ? '↑' : down ? '↓' : ''}{Math.abs(change)}%
          </span>
        )}
      </div>
      <div style={{ color, fontWeight: '800', fontSize: '19px', marginTop: '10px', lineHeight: 1 }}>{value}</div>
      <div style={{ color: C.sub, fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>{label}</div>
    </div>
  )
}

// ── Stat Chip ──────────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, color }) {
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <div>
        <div style={{ fontWeight: '800', fontSize: '14px', color: color || C.text }}>{value}</div>
        <div style={{ fontSize: '11px', color: C.mute }}>{label}</div>
      </div>
    </div>
  )
}

// ── Bar Chart (Thu vs Chi) ─────────────────────────────────────────────────────
function BarChart({ data, height = 110 }) {
  const maxV = Math.max(...data.flatMap(d => [d.thu || 0, d.chi || 0]), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: `${height}px` }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '1px', width: '100%' }}>
            <div style={{ flex: 1, background: C.thu + 'BB', height: `${Math.max(2, Math.round((d.thu || 0) / maxV * 100))}%`, borderRadius: '3px 3px 0 0' }} />
            <div style={{ flex: 1, background: C.chi + 'BB', height: `${Math.max(2, Math.round((d.chi || 0) / maxV * 100))}%`, borderRadius: '3px 3px 0 0' }} />
          </div>
          <div style={{ fontSize: '9px', color: C.mute, lineHeight: 1, marginTop: '2px' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Progress Row ───────────────────────────────────────────────────────────────
function ProgressRow({ label, value, max, color }) {
  const p = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: C.sub }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: C.text }}>{fmtFull(value)}</span>
      </div>
      <div style={{ height: '5px', background: '#F0EAE3', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color || C.primary, borderRadius: '999px' }} />
      </div>
    </div>
  )
}

// ── Alert Item ─────────────────────────────────────────────────────────────────
function AlertItem({ icon, text, badge, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '15px' }}>{icon}</span>
      <div style={{ flex: 1, fontSize: '12px', color: C.text, lineHeight: 1.4 }}>{text}</div>
      {badge && (
        <span style={{ background: `${color || C.warn}18`, color: color || C.warn, fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '999px', border: `1px solid ${(color || C.warn)}30`, whiteSpace: 'nowrap' }}>
          {badge}
        </span>
      )}
    </div>
  )
}

// ── Section Box ────────────────────────────────────────────────────────────────
function SectionBox({ title, color, children, link, linkLabel }) {
  return (
    <div style={{ background: C.card, borderRadius: '16px', border: `1.5px solid ${color}28`, padding: '16px', marginBottom: '14px' }}>
      <div style={{ fontWeight: '800', fontSize: '13px', color, marginBottom: '8px' }}>{title}</div>
      {children}
      {link && (
        <div style={{ marginTop: '8px' }}>
          <a href={link} style={{ fontSize: '12px', color: C.primary, fontWeight: '700', textDecoration: 'none' }}>→ {linkLabel}</a>
        </div>
      )}
    </div>
  )
}

// ── Tab: Tổng Quan ─────────────────────────────────────────────────────────────
function TabTongQuan({ kpi, trend6 }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px', marginBottom: '14px' }}>
        <KpiCard icon="💵" label="Thực Thu Tháng"  value={fmtFull(kpi.thucThu)}  color={C.thu}     change={kpi.pctDT} />
        <KpiCard icon="💸" label="Tổng Chi Tháng"  value={fmtFull(kpi.tongChi)}  color={C.chi}     change={kpi.pctChi} />
        <KpiCard icon="📈" label="Lợi Nhuận"       value={fmtFull(kpi.loiNhuan)} color={kpi.loiNhuan >= 0 ? C.thu : C.chi} change={kpi.pctLN} />
        <KpiCard icon="📊" label="Tỷ Lệ LN"        value={`${kpi.tyLe}%`}        color={C.taiSan} />
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1A5276, #2980B9)', borderRadius: '16px', padding: '16px 20px', marginBottom: '14px', color: 'white' }}>
        <div style={{ fontSize: '11px', opacity: .65, marginBottom: '4px' }}>Tổng Tài Sản (3 ví)</div>
        <div style={{ fontWeight: '800', fontSize: '26px' }}>{fmtFull(kpi.tongTS)}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '14px' }}>
        <StatChip icon="👥" label="Check-in hôm nay"    value={`${kpi.checkinHom} người`}    color={C.thu} />
        <StatChip icon="📋" label="OFF chờ duyệt"       value={`${kpi.offPend} yêu cầu`}     color={kpi.offPend > 0 ? C.warn : C.mute} />
        <StatChip icon="👤" label="KH mới tháng này"    value={`${kpi.khMoi} người`}          color={C.primary} />
        <StatChip icon="🏷️" label="KM đang chạy"        value={`${kpi.kmActive} đợt`}        color={C.danger} />
      </div>

      <div style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '16px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: C.text, marginBottom: '12px' }}>📊 Xu hướng 6 tháng</div>
        <BarChart data={trend6} height={110} />
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', justifyContent: 'center' }}>
          {[{ l: 'Thực Thu', c: C.thu }, { l: 'Chi Phí', c: C.chi }].map(x => (
            <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.sub }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: x.c + 'BB' }} />
              {x.l}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Tài Chính ─────────────────────────────────────────────────────────────
function TabTaiChinh({ kpi, trend6, chiNhom }) {
  const maxChi = chiNhom[0]?.total || 1
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '14px' }}>
        {[
          { l: 'Doanh Thu', v: kpi.doanhThu, c: '#27AE60' },
          { l: 'Thực Thu', v: kpi.thucThu, c: C.thu },
          { l: 'Lợi Nhuận', v: kpi.loiNhuan, c: kpi.loiNhuan >= 0 ? C.thu : C.chi },
        ].map(s => (
          <div key={s.l} style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: s.c }}>{fmt(s.v)}đ</div>
            <div style={{ fontSize: '10px', color: C.mute, marginTop: '2px' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '16px', marginBottom: '14px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: C.text, marginBottom: '12px' }}>📈 Thu vs Chi — 6 tháng</div>
        <BarChart data={trend6} height={120} />
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', justifyContent: 'center' }}>
          {[{ l: 'Thực Thu', c: C.thu }, { l: 'Chi Phí', c: C.chi }].map(x => (
            <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.sub }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: x.c + 'BB' }} />
              {x.l}
            </div>
          ))}
        </div>
      </div>

      {chiNhom.length > 0 && (
        <div style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '16px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: C.text, marginBottom: '14px' }}>💸 Chi phí theo nhóm</div>
          {chiNhom.map(n => (
            <ProgressRow key={n.ten} label={n.ten} value={n.total} max={maxChi} color={C.chi} />
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>Tổng chi</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: C.chi }}>{fmtFull(kpi.tongChi)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Nhân Sự ───────────────────────────────────────────────────────────────
function TabNhanSu({ hrRows, mDays, selMonth, selYear }) {
  const tongLuong = hrRows.reduce((s, r) => s + Math.max(0, r.duTinh), 0)
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#2C1810,#A0714F)', borderRadius: '16px', padding: '16px 20px', marginBottom: '14px', color: 'white' }}>
        <div style={{ fontSize: '11px', opacity: .65, marginBottom: '4px' }}>Dự tính quỹ lương cứng — T{selMonth}/{selYear}</div>
        <div style={{ fontWeight: '800', fontSize: '22px' }}>{fmtFull(tongLuong)}</div>
        <div style={{ fontSize: '11px', opacity: .55, marginTop: '4px' }}>Chưa gồm lương kinh doanh · {hrRows.length} nhân viên</div>
      </div>

      {hrRows.map(nv => (
        <div key={nv.id} style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '14px', color: C.text }}>{nv.ho_ten}</div>
              <div style={{ fontSize: '11px', color: C.mute }}>{viTriLabel(nv.vi_tri)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: C.primary }}>{fmtFull(Math.max(0, nv.duTinh))}</div>
              <div style={{ fontSize: '10px', color: C.mute }}>Dự tính</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
            {[
              { l: 'Ngày công', v: nv.ngayCong },
              { l: 'Số OFF', v: nv.offCount },
              { l: 'Tăng ca', v: `${nv.tangCaH}h` },
            ].map(s => (
              <div key={s.l} style={{ background: '#FAF7F4', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: C.text }}>{s.v}</div>
                <div style={{ fontSize: '10px', color: C.mute }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {hrRows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: C.mute }}>Chưa có dữ liệu chấm công tháng này</div>
      )}
    </div>
  )
}

// ── Tab: Cảnh Báo ──────────────────────────────────────────────────────────────
function TabCanhBao({ alerts }) {
  const { san_pham, the_lt, kh_lau, off_pend } = alerts
  const total = san_pham.length + the_lt.length + kh_lau.length + off_pend.length

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
        <div style={{ fontWeight: '800', fontSize: '16px', color: C.text }}>Không có cảnh báo</div>
        <div style={{ color: C.mute, fontSize: '13px', marginTop: '4px' }}>Mọi thứ đang vận hành tốt</div>
      </div>
    )
  }

  return (
    <div>
      {off_pend.length > 0 && (
        <SectionBox title={`📋 OFF chờ duyệt (${off_pend.length})`} color={C.warn} link="/admin/nhan-su" linkLabel="Vào Nhân Sự để duyệt">
          {off_pend.slice(0, 8).map(o => (
            <AlertItem key={o.id} icon="👤"
              text={`${o.nhan_vien?.ho_ten || '?'} — ${o.ngay_off}${o.ly_do ? ' (' + o.ly_do + ')' : ''}`}
              badge="Chờ duyệt" color={C.warn}
            />
          ))}
        </SectionBox>
      )}

      {san_pham.length > 0 && (
        <SectionBox title={`📦 Kho sắp hết hàng (${san_pham.length})`} color={C.danger} link="/admin/kho-hang" linkLabel="Vào Kho Hàng nhập thêm">
          {san_pham.slice(0, 8).map(p => (
            <AlertItem key={p.id} icon="⚠️"
              text={`${p.ten} — còn ${p.ton_kho_hien_tai} ${p.don_vi} (ngưỡng: ${p.canh_bao_het_hang})`}
              badge={p.ton_kho_hien_tai === 0 ? 'Hết hàng' : 'Sắp hết'}
              color={p.ton_kho_hien_tai === 0 ? C.danger : C.warn}
            />
          ))}
        </SectionBox>
      )}

      {the_lt.length > 0 && (
        <SectionBox title={`🎟️ Thẻ liệu trình sắp hết hạn (${the_lt.length})`} color={C.purple} link="/admin/crm" linkLabel="Vào CRM nhắc lịch">
          {the_lt.slice(0, 8).map(t => (
            <AlertItem key={t.id} icon="🎟️"
              text={`${t.khach_hang?.ho_ten || '?'} — ${t.ten_dich_vu} (còn ${t.so_buoi_con_lai} buổi, hết ${t.ngay_het_han})`}
              badge={`${daysUntil(t.ngay_het_han)} ngày`}
              color={C.purple}
            />
          ))}
        </SectionBox>
      )}

      {kh_lau.length > 0 && (
        <SectionBox title={`👤 Khách chưa ghé > 60 ngày (${kh_lau.length})`} color={C.sub} link="/admin/crm" linkLabel="Vào CRM xem chi tiết">
          {kh_lau.slice(0, 8).map(k => (
            <AlertItem key={k.id} icon="🔔"
              text={`${k.ho_ten} — ${k.so_dien_thoai} (lần cuối: ${k.lan_cuoi_den})`}
              badge={`${daysAgo(k.lan_cuoi_den)} ngày trước`}
              color={C.sub}
            />
          ))}
        </SectionBox>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const nowVN = getNowVN()
  const [tab, setTab] = useState(0)
  const [selYear, setSelYear] = useState(nowVN.getFullYear())
  const [selMonth, setSelMonth] = useState(nowVN.getMonth() + 1)
  const [loading, setLoading] = useState(true)

  const [kpi, setKpi] = useState({})
  const [trend6, setTrend6] = useState([])
  const [chiNhom, setChiNhom] = useState([])
  const [hrRows, setHrRows] = useState([])
  const [alerts, setAlerts] = useState({ san_pham: [], the_lt: [], kh_lau: [], off_pend: [] })

  const load = useCallback(async () => {
    setLoading(true)
    const today = todayISO()
    const { first: m1, last: mN, days: mDays } = monthRange(selYear, selMonth)

    let py = selYear, pm = selMonth - 1
    if (pm < 1) { pm = 12; py-- }
    const { first: pm1, last: pmN } = monthRange(py, pm)

    // 6-month windows (m-5 → m)
    const months6 = []
    for (let i = 5; i >= 0; i--) {
      let y = selYear, m = selMonth - i
      while (m < 1) { m += 12; y-- }
      months6.push({ ...monthRange(y, m), label: `T${m}` })
    }
    const r6s = months6[0].first
    const r6e = months6[5].last

    const [
      rDT, rDTprev, rChi, rChiPrev,
      rVi, rCC, rKHMoi, rKMActive,
      rDM, rDT6, rChi6,
      rNV, rCCMonth,
      rSP, rTheLT, rKHLau, rOff,
    ] = await Promise.all([
      supabase.from('doanh_thu').select('so_tien,hinh_thuc').gte('ngay', m1).lte('ngay', mN),
      supabase.from('doanh_thu').select('so_tien,hinh_thuc').gte('ngay', pm1).lte('ngay', pmN),
      supabase.from('chi_phi').select('so_tien,danh_muc_id').gte('ngay', m1).lte('ngay', mN),
      supabase.from('chi_phi').select('so_tien').gte('ngay', pm1).lte('ngay', pmN),
      supabase.from('so_du_vi_thuc_te').select('so_du_hien_tai'),
      supabase.from('cham_cong').select('id').eq('ngay', today).not('gio_vao', 'is', null),
      supabase.from('khach_hang').select('id').gte('created_at', m1 + 'T00:00:00+07:00').lte('created_at', mN + 'T23:59:59+07:00'),
      supabase.from('khuyen_mai').select('id').eq('trang_thai', 'active').lte('ngay_bat_dau', today).gte('ngay_ket_thuc', today),
      supabase.from('danh_muc_chi_phi').select('id,ten,parent_id'),
      supabase.from('doanh_thu').select('ngay,so_tien,hinh_thuc').gte('ngay', r6s).lte('ngay', r6e),
      supabase.from('chi_phi').select('ngay,so_tien').gte('ngay', r6s).lte('ngay', r6e),
      supabase.from('nhan_vien').select('id,ho_ten,vi_tri,luong_cung').eq('trang_thai', 'active'),
      supabase.from('cham_cong').select('nhan_vien_id,he_so,tang_ca_gio,loai').gte('ngay', m1).lte('ngay', mN),
      supabase.from('san_pham').select('id,ten,ton_kho_hien_tai,canh_bao_het_hang,don_vi').eq('is_active', true),
      supabase.from('the_lieu_trinh')
        .select('id,ten_dich_vu,ngay_het_han,so_buoi_con_lai,khach_hang:khach_hang_id(ho_ten)')
        .eq('trang_thai', 'active')
        .not('ngay_het_han', 'is', null)
        .gte('ngay_het_han', today)
        .lte('ngay_het_han', addDays(today, 30)),
      supabase.from('khach_hang').select('id,ho_ten,so_dien_thoai,lan_cuoi_den')
        .eq('is_active', true)
        .not('lan_cuoi_den', 'is', null)
        .lte('lan_cuoi_den', addDays(today, -60)),
      supabase.from('dang_ky_off')
        .select('id,ngay_off,ly_do,nhan_vien:nhan_vien_id(ho_ten)')
        .eq('trang_thai', 'cho_duyet'),
    ])

    // ── KPI ──
    const dtArr  = rDT.data   || []
    const chiArr = rChi.data  || []
    const dtPArr = rDTprev.data || []
    const chPArr = rChiPrev.data || []

    const doanhThu = dtArr.reduce((s, r) => s + (r.so_tien || 0), 0)
    const thucThu  = dtArr.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
    const tongChi  = chiArr.reduce((s, r) => s + (r.so_tien || 0), 0)
    const loiNhuan = thucThu - tongChi
    const tyLe     = thucThu > 0 ? Math.round((loiNhuan / thucThu) * 100) : 0
    const tongTS   = (rVi.data || []).reduce((s, r) => s + (r.so_du_hien_tai || 0), 0)

    const dtPrev  = dtPArr.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
    const chiPrev = chPArr.reduce((s, r) => s + (r.so_tien || 0), 0)
    const lnPrev  = dtPrev - chiPrev

    const offPendArr = rOff.data || []

    setKpi({
      doanhThu, thucThu, tongChi, loiNhuan, tyLe, tongTS,
      checkinHom: rCC.data?.length  || 0,
      offPend:    offPendArr.length,
      khMoi:      rKHMoi.data?.length || 0,
      kmActive:   rKMActive.data?.length || 0,
      pctDT:  pctChange(thucThu, dtPrev),
      pctChi: pctChange(tongChi, chiPrev),
      pctLN:  pctChange(loiNhuan, lnPrev),
    })

    // ── 6-month trend ──
    const dt6  = rDT6.data  || []
    const chi6 = rChi6.data || []
    setTrend6(months6.map(({ first, last, label }) => ({
      label,
      thu: dt6.filter(r => r.ngay >= first && r.ngay <= last && r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0),
      chi: chi6.filter(r => r.ngay >= first && r.ngay <= last).reduce((s, r) => s + (r.so_tien || 0), 0),
    })))

    // ── Chi breakdown by nhóm ──
    const dm = rDM.data || []
    const parents  = dm.filter(d => !d.parent_id)
    const childMap = {}
    dm.filter(d => d.parent_id).forEach(d => {
      if (!childMap[d.parent_id]) childMap[d.parent_id] = []
      childMap[d.parent_id].push(d.id)
    })
    setChiNhom(
      parents.map(p => ({
        ten: p.ten,
        total: chiArr.filter(c => (childMap[p.id] || []).includes(c.danh_muc_id)).reduce((s, r) => s + (r.so_tien || 0), 0),
      })).filter(n => n.total > 0).sort((a, b) => b.total - a.total)
    )

    // ── HR ──
    const nvArr = rNV.data  || []
    const ccArr = rCCMonth.data || []
    setHrRows(nvArr.map(nv => {
      const rows = ccArr.filter(r => r.nhan_vien_id === nv.id)
      const ngayCong = Math.round(rows.filter(r => r.loai === 'di_lam').reduce((s, r) => s + (r.he_so || 1), 0) * 10) / 10
      const offCount = rows.filter(r => r.loai && r.loai.startsWith('off')).length
      const tangCaH  = Math.round(rows.reduce((s, r) => s + (r.tang_ca_gio || 0), 0) * 10) / 10
      const duTinh   = Math.round((nv.luong_cung / mDays) * ngayCong) + Math.round(tangCaH * 25000) - 500000
      return { ...nv, ngayCong, offCount, tangCaH, duTinh }
    }).sort((a, b) => b.duTinh - a.duTinh))

    // ── Alerts ──
    const spAll = rSP.data || []
    setAlerts({
      san_pham: spAll.filter(p => p.ton_kho_hien_tai != null && p.canh_bao_het_hang != null && p.ton_kho_hien_tai <= p.canh_bao_het_hang),
      the_lt:   (rTheLT.data || []).sort((a, b) => (a.ngay_het_han || '').localeCompare(b.ngay_het_han || '')),
      kh_lau:   (rKHLau.data || []).sort((a, b) => (a.lan_cuoi_den || '').localeCompare(b.lan_cuoi_den || '')),
      off_pend: offPendArr,
    })

    setLoading(false)
  }, [selYear, selMonth])

  useEffect(() => { load() }, [load])

  const alertCount = alerts.san_pham.length + alerts.the_lt.length + alerts.kh_lau.length + alerts.off_pend.length
  const { days: mDays } = monthRange(selYear, selMonth)

  const TABS = [
    { label: 'Tổng Quan', icon: '📊' },
    { label: 'Tài Chính',  icon: '💰' },
    { label: 'Nhân Sự',    icon: '👥' },
    { label: `Cảnh Báo${alertCount > 0 ? ` (${alertCount})` : ''}`, icon: '⚠️' },
  ]

  const prevMonth = () => {
    let m = selMonth - 1, y = selYear
    if (m < 1) { m = 12; y-- }
    setSelMonth(m); setSelYear(y)
  }
  const nextMonth = () => {
    let m = selMonth + 1, y = selYear
    if (m > 12) { m = 1; y++ }
    setSelMonth(m); setSelYear(y)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: '48px' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#1A3A2A 0%,#2D7A4F 60%,#5AB47E 100%)', padding: '48px 24px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(90,180,126,0.1)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <button onClick={() => window.location.href = '/admin'}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '6px 12px', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px' }}>
            ← Trở về Admin
          </button>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Hannah Spa · Dashboard
          </div>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '22px', marginBottom: '16px' }}>
            📊 Dashboard Tổng Hợp
          </div>

          {/* Month picker */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '6px 10px' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}>‹</button>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '14px', minWidth: '100px', textAlign: 'center' }}>
              Tháng {selMonth}/{selYear}
            </span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}>›</button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: 'white', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: '360px' }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              style={{
                flex: 1, padding: '12px 8px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: tab === i ? '800' : '600',
                color: tab === i ? C.primary : C.mute,
                borderBottom: tab === i ? `2.5px solid ${C.primary}` : '2.5px solid transparent',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: C.mute }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            Đang tải dữ liệu...
          </div>
        ) : tab === 0 ? <TabTongQuan kpi={kpi} trend6={trend6} />
          : tab === 1 ? <TabTaiChinh kpi={kpi} trend6={trend6} chiNhom={chiNhom} />
          : tab === 2 ? <TabNhanSu hrRows={hrRows} mDays={mDays} selMonth={selMonth} selYear={selYear} />
          : <TabCanhBao alerts={alerts} />
        }
      </div>
    </div>
  )
}
