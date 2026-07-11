import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, todayISO } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import RightPanel from '../../../components/shared/RightPanel'
import I from '../../../components/shared/Icons'
import { useAuth } from '../../../context/AuthContext'

const PAGE_SIZE = 35

// Đổi nhãn 11/07: 'Hộp thư Fanpage' → 'Cần chăm từ Fanpage' — tránh trùng tên với
// Hộp Thư (chat FB+Zalo) bên Marketing. Tab này là HÀNG ĐỢI chăm sóc, không phải chat.
const CARE_TABS = [
  { key: 'fanpage', label: 'Cần chăm từ Fanpage' },
  { key: 'today', label: 'Khách đã đến' },
  { key: 'pos', label: 'Khách cần gọi lại' },
  { key: 'report', label: 'Hiệu quả nhân viên' },
]

const FANPAGE_FILTERS = [
  { key: 'due', label: 'Cần làm hôm nay' },
  { key: 'overdue', label: 'Trễ chăm sóc' },
  { key: 'urgent', label: 'Quản lý xem trước' },
  { key: 'booking', label: 'Có thể chốt lịch' },
  { key: 'need_phone', label: 'Cần xin SĐT' },
  { key: 'linked', label: 'Đã nhận diện khách' },
  { key: 'done', label: 'Đã xử lý xong' },
  { key: 'all', label: 'Tất cả ưu tiên' },
]

const STATUS_LABEL = {
  chua_cham_soc: 'Chưa chăm',
  dang_cham_soc: 'Đang chăm',
  da_cham_soc: 'Đã chăm sóc',
  da_hen_lai: 'Đã hẹn lại',
  khong_lien_he_duoc: 'Không liên hệ được',
  tam_ngung: 'Tạm ngưng',
}

const SEGMENT_LABEL = {
  can_xu_ly_rieng: 'Cần xử lý riêng',
  khach_dat_hen_co_sdt: 'Đã/chuẩn bị đặt hẹn',
  khach_nong_co_sdt: 'Khách nóng có SĐT',
  khach_cu_co_sdt_can_goi_lai: 'Khách cũ cần gọi lại',
  co_sdt_can_cham_soc: 'Có SĐT cần chăm',
  tiem_nang_chua_co_sdt: 'Có nhu cầu chưa có SĐT',
  tuong_tac_thap: 'Tương tác thấp',
}

const VISIT_RESULT = [
  { key: 'hai_long', label: 'Hài lòng' },
  { key: 'tam_duoc', label: 'Tạm được' },
  { key: 'chua_hai_long', label: 'Chưa hài lòng' },
  { key: 'da_mua_them', label: 'Đã mua thêm' },
  { key: 'can_cham_lai', label: 'Cần chăm lại' },
]

const OPEN_FANPAGE_STATUSES = ['chua_cham_soc', 'dang_cham_soc', 'khong_lien_he_duoc']
const DONE_FANPAGE_STATUSES = ['da_cham_soc', 'da_hen_lai', 'tam_ngung']

function fmtDate(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (!y || !m || !d) return raw
  return `${d}/${m}/${y}`
}

function fmtMoney(value) {
  return formatCurrency(Number(value || 0))
}

function fmtCompactMoney(value) {
  const n = Number(value || 0)
  if (n >= 1000000000) {
    return `${(n / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`
  }
  if (n >= 1000000) {
    return `${Math.round(n / 1000000).toLocaleString('vi-VN')} triệu`
  }
  return fmtMoney(n)
}

function phoneDigits(phone = '') {
  return String(phone).replace(/\D/g, '')
}

function normalizePhone(phone = '') {
  let digits = phoneDigits(phone)
  if (digits.startsWith('84')) digits = `0${digits.slice(2)}`
  return digits
}

function validPhone(phone = '') {
  return /^0[3-9]\d{8}$/.test(normalizePhone(phone))
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const today = todayISO()
  const d1 = new Date(`${today}T00:00:00`)
  const d2 = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d2.getTime())) return null
  return Math.max(0, Math.round((d1 - d2) / 86400000))
}

function addDaysISO(days) {
  const d = new Date(`${todayISO()}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function joinList(value, fallback = 'Chưa rõ') {
  if (!Array.isArray(value) || value.length === 0) return fallback
  return value.filter(Boolean).slice(0, 4).join(', ')
}

function fanpageStatusAfterVisit(result) {
  if (result === 'da_mua_them') return 'da_hen_lai'
  if (result === 'can_cham_lai' || result === 'chua_hai_long') return 'dang_cham_soc'
  return 'da_cham_soc'
}

function nextContactAfterVisit(result) {
  if (result === 'chua_hai_long') return addDaysISO(1)
  if (result === 'can_cham_lai') return addDaysISO(2)
  return null
}

function isOpenFanpageCare(row) {
  return OPEN_FANPAGE_STATUSES.includes(row.care_status || 'chua_cham_soc')
}

function isDoneFanpageCare(row) {
  return DONE_FANPAGE_STATUSES.includes(row.care_status || '')
}

function isDueToday(row) {
  const next = row.next_contact_at ? String(row.next_contact_at).slice(0, 10) : ''
  return isOpenFanpageCare(row) && (!next || next <= todayISO())
}

function isOverdue(row) {
  const next = row.next_contact_at ? String(row.next_contact_at).slice(0, 10) : ''
  return isOpenFanpageCare(row) && next && next < todayISO()
}

function fanpageStatusTone(status) {
  if (status === 'da_hen_lai' || status === 'da_cham_soc') return 'good'
  if (status === 'khong_lien_he_duoc' || status === 'can_xu_ly_rieng') return 'danger'
  if (status === 'dang_cham_soc') return 'blue'
  if (status === 'tam_ngung') return 'neutral'
  return 'gold'
}

function Badge({ children, tone = 'neutral' }) {
  const colors = {
    danger: ['#b85a4a', '#b85a4a16'],
    good: ['#6e8a5e', '#6e8a5e16'],
    gold: ['var(--champagne)', 'rgba(201,169,110,.16)'],
    blue: ['#1a6b8a', '#1a6b8a14'],
    purple: ['#6c3483', '#6c348314'],
    neutral: ['var(--ink3)', 'var(--bg2)'],
  }
  const [color, bg] = colors[tone] || colors.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 800,
      color, background: bg, border: `1px solid ${color}24`,
    }}>
      {children}
    </span>
  )
}

function ActionButton({ children, onClick, tone = 'ghost', disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={tone === 'gold' ? 'btn gold' : 'btn ghost'}
      style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
    >
      {children}
    </button>
  )
}

function EmptyRow({ colSpan, text }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 36, textAlign: 'center', color: 'var(--ink3)' }}>
        {text}
      </td>
    </tr>
  )
}

function CareSummaryStrip({ effectiveTab, counts, visitRows, smartPosRows, fanpageRows }) {
  const weekStart = addDaysISO(-6)
  const todayVisits = visitRows.filter(r => r.ngay === todayISO())
  const weekVisits = visitRows.filter(r => String(r.ngay || '').slice(0, 10) >= weekStart)
  const ktvCount = new Set(todayVisits.map(r => r.ktv_phu_trach).filter(Boolean)).size
  const cardSleep = smartPosRows.filter(r => Number(r.tong_buoi_con || 0) > 0).length
  const winback = smartPosRows.filter(r => Number(r.tong_buoi_con || 0) <= 0).length
  const urgent = fanpageRows.filter(r => r.segment === 'can_xu_ly_rieng').length
  const booking = fanpageRows.filter(r => r.segment === 'khach_dat_hen_co_sdt').length
  const totalSpend = smartPosRows.reduce((sum, row) => sum + Number(row.tong_chi_tieu || 0), 0)
  const moneyShort = fmtCompactMoney(totalSpend)

  const byTab = {
    fanpage: [
      { label: 'Cần làm hôm nay', value: counts.fanpage, desc: 'Tin nhắn đang mở cần nhân viên xử lý', tone: 'var(--champagne)' },
      { label: 'Cần xin SĐT', value: counts.needPhone, desc: 'Chưa đủ dữ liệu để ghép hồ sơ HSMS', tone: '#b85a4a' },
      { label: 'Đã nhận diện', value: counts.linked, desc: 'Có hồ sơ hoặc SĐT khớp hệ thống', tone: '#1a6b8a' },
      { label: 'Đã xử lý', value: counts.done, desc: 'Đã chăm, đã hẹn hoặc tạm ngưng', tone: '#6e8a5e' },
    ],
    today: [
      { label: 'Khách hôm nay', value: counts.today, desc: 'Số khách đã được nhập vào nhật ký', tone: '#6e8a5e' },
      { label: 'Bảy ngày gần đây', value: weekVisits.length, desc: 'Dữ liệu dùng để xem chất lượng tư vấn', tone: 'var(--champagne)' },
      { label: 'KTV được ghi nhận', value: ktvCount, desc: 'KTV có tên trong báo cáo hôm nay', tone: '#6c3483' },
      { label: 'Chờ chăm lại', value: visitRows.filter(r => r.ket_qua === 'can_cham_lai').length, desc: 'Khách cần gọi lại hoặc theo dõi thêm', tone: '#b85a4a' },
    ],
    pos: [
      { label: 'Cần gọi lại', value: counts.pos, desc: 'Ưu tiên từ thẻ còn buổi và khách lâu không đến', tone: '#6c3483' },
      { label: 'Còn buổi', value: cardSleep, desc: 'Khách còn liệu trình nhưng đang ngủ quên', tone: '#1a6b8a' },
      { label: 'Mời quay lại', value: winback, desc: 'Khách cũ cần chăm sóc lại', tone: '#b85a4a' },
      { label: 'Giá trị nhóm', value: moneyShort, desc: 'Tổng chi tiêu của nhóm đang ưu tiên', tone: 'var(--champagne)' },
    ],
    report: [
      { label: 'Nhật ký đã nhập', value: visitRows.length, desc: 'Tất cả khách đã được nhân viên ghi nhận', tone: '#1a6b8a' },
      { label: 'Hôm nay', value: counts.today, desc: 'Khách được nhập trong ngày hiện tại', tone: '#6e8a5e' },
      { label: 'Đã chốt/chăm', value: counts.done, desc: 'Tin Fanpage đã có kết quả xử lý', tone: 'var(--champagne)' },
      { label: 'Cần quản lý xem', value: urgent + booking, desc: 'Khách nóng hoặc cần đọc kỹ trước khi nhắn', tone: '#b85a4a' },
    ],
  }

  const items = byTab[effectiveTab] || byTab.fanpage
  return (
    <div className="strip" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 18 }}>
      {items.map(item => (
        <div key={item.label} className="it" style={{ minHeight: 108 }}>
          <div className="l">{item.label}</div>
          <div className="v" style={{ color: item.tone }}>{item.value}</div>
          <div className="d">{item.desc}</div>
        </div>
      ))}
    </div>
  )
}

function VisitForm({ open, initialDate, initialData, currentUser, onClose, onSaved }) {
  const [showDate, setShowDate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({
    ngay: initialDate || todayISO(),
    ho_ten: '',
    so_dien_thoai: '',
    dich_vu_su_dung: '',
    ktv_phu_trach: '',
    phan_hoi: '',
    co_hoi_upsell: '',
    ket_qua: 'can_cham_lai',
    ghi_chu: '',
  })

  useEffect(() => {
    if (open) {
      setErr('')
      setForm({
        ngay: initialData?.ngay || initialDate || todayISO(),
        ho_ten: initialData?.ho_ten || '',
        so_dien_thoai: initialData?.so_dien_thoai || '',
        dich_vu_su_dung: initialData?.dich_vu_su_dung || '',
        ktv_phu_trach: initialData?.ktv_phu_trach || '',
        phan_hoi: initialData?.phan_hoi || '',
        co_hoi_upsell: initialData?.co_hoi_upsell || '',
        ket_qua: initialData?.ket_qua || 'can_cham_lai',
        ghi_chu: initialData?.ghi_chu || '',
      })
    }
  }, [open, initialDate, initialData])

  if (!open) return null

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const isFanpageSource = initialData?.nguon === 'fanpage'

  async function ensureCustomer() {
    const phone = normalizePhone(form.so_dien_thoai)
    if (!validPhone(phone)) return null

    const { data: existing, error: findError } = await supabase
      .from('khach_hang')
      .select('id')
      .eq('so_dien_thoai', phone)
      .maybeSingle()
    if (findError) throw findError
    if (existing?.id) return existing.id

    const { data: created, error: createError } = await supabase
      .from('khach_hang')
      .insert({
        ho_ten: form.ho_ten.trim() || `Khách ${phone}`,
        so_dien_thoai: phone,
        nguon: 'Bao cao nhan vien',
      })
      .select('id')
      .single()
    if (createError && !String(createError.message || '').includes('duplicate')) throw createError
    return created?.id || null
  }

  async function save() {
    setSaving(true)
    setErr('')
    try {
      if (!form.ho_ten.trim() && !validPhone(form.so_dien_thoai)) {
        throw new Error('Nhập tên khách hoặc số điện thoại để lưu báo cáo.')
      }
      const khachHangId = await ensureCustomer()
      const payload = {
        ngay: form.ngay,
        khach_hang_id: khachHangId,
        ho_ten: form.ho_ten.trim() || null,
        so_dien_thoai: normalizePhone(form.so_dien_thoai) || null,
        fanpage_segment_id: initialData?.segment_id || null,
        platform_user_id: initialData?.platform_user_id || null,
        dich_vu_su_dung: form.dich_vu_su_dung.trim() || null,
        ktv_phu_trach: form.ktv_phu_trach.trim() || null,
        phan_hoi: form.phan_hoi.trim() || null,
        co_hoi_upsell: form.co_hoi_upsell.trim() || null,
        ket_qua: form.ket_qua,
        nguon: initialData?.nguon || 'bao_cao_nhan_vien',
        ghi_chu: form.ghi_chu.trim() || null,
        created_by: currentUser?.id || null,
      }
      const { error } = await supabase.from('nhat_ky_khach_den').insert(payload)
      if (error) throw error
      await onSaved?.({ payload, form, initialData, khachHangId })
      onClose()
    } catch (e) {
      setErr(e.message || 'Không lưu được báo cáo khách đến.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <RightPanel open onClose={onClose} zIndex={500}
      title="Nhật ký khách đến"
      subtitle="Thay form báo cáo rời rạc, dùng làm dữ liệu tư vấn/upsell."
      bodyStyle={{ background: 'var(--surface2)' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Hủy</button>
          <button className="btn gold" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu báo cáo'}</button>
        </div>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {isFanpageSource && (
            <div style={S.formContext}>
              <div>
                <div style={S.label}>Đang ghi kết quả cho khách Fanpage</div>
                <div style={{ marginTop: 6, fontWeight: 900, color: 'var(--ink)', fontSize: 15 }}>{form.ho_ten || 'Khách Fanpage'}</div>
                <div style={{ marginTop: 4, color: 'var(--ink3)', fontSize: 12.5 }}>{form.so_dien_thoai || 'Chưa có SĐT'} · {form.dich_vu_su_dung || 'Chưa rõ dịch vụ quan tâm'}</div>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {VISIT_RESULT.map(result => (
                  <button
                    key={result.key}
                    type="button"
                    onClick={() => set('ket_qua', result.key)}
                    style={quickResultButton(form.ket_qua === result.key)}
                  >
                    {result.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label style={S.field}>
            <span style={S.label}>Ngày</span>
            <button type="button" onClick={() => setShowDate(true)} style={S.inputBtn}>{fmtDate(form.ngay)}</button>
          </label>
          <label style={S.field}>
            <span style={S.label}>Kết quả</span>
            <select value={form.ket_qua} onChange={e => set('ket_qua', e.target.value)} style={S.input}>
              {VISIT_RESULT.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </label>
          <label style={S.field}>
            <span style={S.label}>Tên khách</span>
            <input value={form.ho_ten} onChange={e => set('ho_ten', e.target.value)} style={S.input} placeholder="Ví dụ: Chị Vy Vy" />
          </label>
          <label style={S.field}>
            <span style={S.label}>Số điện thoại</span>
            <input value={form.so_dien_thoai} onChange={e => set('so_dien_thoai', e.target.value)} style={S.input} placeholder="Ví dụ: 0912345678" />
          </label>
          <label style={{ ...S.field, gridColumn: '1 / -1' }}>
            <span style={S.label}>Dịch vụ đã dùng</span>
            <input value={form.dich_vu_su_dung} onChange={e => set('dich_vu_su_dung', e.target.value)} style={S.input} placeholder="Gội dưỡng sinh, massage body, triệt lông..." />
          </label>
          <label style={S.field}>
            <span style={S.label}>KTV / nhân viên phụ trách</span>
            <input value={form.ktv_phu_trach} onChange={e => set('ktv_phu_trach', e.target.value)} style={S.input} placeholder="Đào, Thư, Oanh..." />
          </label>
          <label style={S.field}>
            <span style={S.label}>Cơ hội bán thêm</span>
            <input value={form.co_hoi_upsell} onChange={e => set('co_hoi_upsell', e.target.value)} style={S.input} placeholder="Chốt gói 10 lần, gia hạn thẻ..." />
          </label>
          <label style={{ ...S.field, gridColumn: '1 / -1' }}>
            <span style={S.label}>Phản hồi khách</span>
            <textarea value={form.phan_hoi} onChange={e => set('phan_hoi', e.target.value)} style={S.textarea} placeholder="Khách hài lòng, khách vội, khách muốn gội nhanh..." />
          </label>
          <label style={{ ...S.field, gridColumn: '1 / -1' }}>
            <span style={S.label}>Ghi chú quản lý</span>
            <textarea value={form.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} style={S.textarea} placeholder="Điều cần nhắc lại lần sau..." />
          </label>

          {err && <div style={{ gridColumn: '1 / -1', color: 'var(--danger)', fontWeight: 800, fontSize: 13 }}>{err}</div>}
        </div>

        <DatePicker open={showDate} selectedDate={form.ngay} onClose={() => setShowDate(false)} onConfirm={(d) => { set('ngay', d); setShowDate(false) }} />
    </RightPanel>
  )
}

const PAGE_META = {
  fanpage: {
    title: 'Hộp Thư Thông Minh',
    subtitle: 'Fanpage · hồ sơ HSMS · lịch sử POS · đề xuất tư vấn trong một màn hình',
    note: 'Lễ tân làm việc trong HSMS: xem hồ sơ, lấy kịch bản, gửi/chép tin, ghi kết quả. Fanpage/Zalo là kênh giao tiếp; HSMS là nơi quản lý và đo hiệu quả.',
  },
  today: {
    title: 'Chăm Sóc Sau Dịch Vụ',
    subtitle: 'Ghi nhận khách đã đến, phản hồi dịch vụ, KTV phụ trách và việc cần chăm lại',
    note: 'Màn hình này thay cho form báo cáo rời rạc hằng ngày: mỗi khách đến spa sẽ trở thành dữ liệu để chăm sóc, nhắc lịch và tư vấn bán thêm.',
  },
  pos: {
    title: 'Nhắc Lịch Liệu Trình',
    subtitle: 'Khách còn buổi, khách lâu không đến, khách cần được mời quay lại đúng chu kỳ',
    note: 'Ưu tiên nhắc khách còn thẻ và khách đã lâu không quay lại. Lễ tân nên hỏi phản hồi trước, sau đó mới gợi ý gia hạn hoặc dịch vụ phù hợp.',
  },
  report: {
    title: 'Báo Cáo Nhân Viên',
    subtitle: 'Đo nhân viên đã tư vấn khách nào, kết quả ra sao và còn bỏ sót việc gì',
    note: 'Báo cáo này gom dữ liệu từ nhật ký chăm sóc và hàng đợi Fanpage để chủ/quản lý biết nhân viên có đang bám khách hay không.',
  },
}

export default function AdminChamSocKhachPage({
  embeddedInMarketing = false,
  fixedTab = '',
  initialFanpageFilter = 'due',
  title = '',
  subtitle = '',
  showVisitButton = false,
} = {}) {
  const { user } = useAuth()
  const [tab, setTab] = useState('fanpage')
  const effectiveTab = fixedTab || (embeddedInMarketing ? 'fanpage' : tab)
  const lockedMode = embeddedInMarketing || !!fixedTab
  const meta = PAGE_META[effectiveTab] || PAGE_META.fanpage
  const [fanpageFilter, setFanpageFilter] = useState(initialFanpageFilter)
  const [search, setSearch] = useState('')
  const [fanpageRows, setFanpageRows] = useState([])
  const [visitRows, setVisitRows] = useState([])
  const [posRows, setPosRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [realtimeNotice, setRealtimeNotice] = useState('')
  const [page, setPage] = useState(1)
  const [visitOpen, setVisitOpen] = useState(false)
  const [visitInitial, setVisitInitial] = useState(null)
  const refreshTimerRef = useRef(null)

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [effectiveTab, fanpageFilter, search])
  useEffect(() => {
    const channel = supabase
      .channel('marketing-inbox-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketing_messages', filter: 'kenh=eq.facebook' },
        () => scheduleRealtimeRefresh('Có tin nhắn Fanpage mới, HSMS đang cập nhật hàng đợi.')
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'marketing_fanpage_customer_segments' },
        () => scheduleRealtimeRefresh('Hồ sơ chăm sóc vừa thay đổi, HSMS đang làm mới.')
      )
      .subscribe(status => setRealtimeStatus(status))

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  function scheduleRealtimeRefresh(message) {
    setRealtimeNotice(message)
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => load({ silent: true }), 900)
  }

  async function load(options = {}) {
    const silent = !!options.silent
    if (!silent) setLoading(true)
    setErr('')
    try {
      const [fanpageRes, visitRes, posRes, profileRes] = await Promise.all([
        supabase
          .from('v_cham_soc_fanpage_smart')
          .select('*')
          .order('priority_score', { ascending: false })
          .order('last_message_at', { ascending: false })
          .limit(400),
        supabase
          .from('v_nhat_ky_khach_den_smart')
          .select('*')
          .order('ngay', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('v_cham_soc_khach')
          .select('*')
          .order('tong_chi_tieu', { ascending: false })
          .limit(400),
        supabase
          .from('profiles')
          .select('id, ho_ten, email'),
      ])
      if (fanpageRes.error) throw fanpageRes.error
      if (visitRes.error) throw visitRes.error
      if (posRes.error) throw posRes.error
      const profileMap = new Map((profileRes.data || []).map(p => [p.id, p]))
      setFanpageRows(fanpageRes.data || [])
      setVisitRows((visitRes.data || []).map(row => ({
        ...row,
        created_by_name: row.created_by_name || profileMap.get(row.created_by)?.ho_ten || '',
        created_by_email: row.created_by_email || profileMap.get(row.created_by)?.email || '',
      })))
      setPosRows(posRes.data || [])
    } catch (e) {
      setErr(e.message || 'Không tải được trung tâm chăm sóc khách.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const filteredFanpage = useMemo(() => {
    let list = fanpageRows
    if (fanpageFilter === 'due') list = list.filter(isDueToday)
    if (fanpageFilter === 'overdue') list = list.filter(isOverdue)
    if (fanpageFilter === 'urgent') list = list.filter(r => r.segment === 'can_xu_ly_rieng')
    if (fanpageFilter === 'booking') list = list.filter(r => r.segment === 'khach_dat_hen_co_sdt')
    if (fanpageFilter === 'need_phone') list = list.filter(r => !r.phone_norm)
    if (fanpageFilter === 'linked') list = list.filter(r => r.da_noi_hsms)
    if (fanpageFilter === 'done') list = list.filter(isDoneFanpageCare)
    return applySearch(list, search, ['display_name', 'phone_norm', 'hsms_ho_ten', 'hsms_so_dien_thoai', 'goi_y_upsell', 'muc_tieu_tu_van'])
  }, [fanpageRows, fanpageFilter, search])

  const filteredVisits = useMemo(() => (
    applySearch(visitRows, search, ['ho_ten', 'so_dien_thoai', 'dich_vu_su_dung', 'ktv_phu_trach', 'phan_hoi', 'co_hoi_upsell'])
  ), [visitRows, search])

  const smartPosRows = useMemo(() => {
    const rows = posRows.map(r => {
      const days = daysSince(r.lan_cuoi_den)
      const cardSleep = Number(r.tong_buoi_con || 0) > 0 && days != null && days >= 30
      const winback = days != null && days >= 45
      const priority = (cardSleep ? 95 : 0) + (winback ? 70 : 0) + (Number(r.tong_chi_tieu || 0) >= 30000000 ? 20 : 0)
      const goal = cardSleep
        ? `Còn ${r.tong_buoi_con} buổi, cần mời khách đặt lịch dùng tiếp.`
        : winback
          ? `Vắng ${days} ngày, mời quay lại bằng ưu đãi khách cũ.`
          : 'Chăm sóc định kỳ.'
      const upsell = cardSleep
        ? 'Nhắc dùng thẻ trước, sau đó tư vấn gia hạn khi còn 1-2 buổi.'
        : 'Hỏi nhu cầu hiện tại và gợi ý dịch vụ phù hợp lịch sử mua.'
      return { ...r, days, priority, goal, upsell }
    }).filter(r => r.priority > 0)
    return applySearch(rows, search, ['ho_ten', 'so_dien_thoai', 'goal', 'upsell'])
      .sort((a, b) => b.priority - a.priority || Number(b.tong_chi_tieu || 0) - Number(a.tong_chi_tieu || 0))
  }, [posRows, search])

  const activeRows = effectiveTab === 'fanpage' ? filteredFanpage : effectiveTab === 'today' ? filteredVisits : effectiveTab === 'pos' ? smartPosRows : []
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = activeRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const counts = {
    fanpage: fanpageRows.filter(isDueToday).length,
    fanpageAll: fanpageRows.length,
    overdue: fanpageRows.filter(isOverdue).length,
    done: fanpageRows.filter(isDoneFanpageCare).length,
    today: visitRows.filter(r => r.ngay === todayISO()).length,
    pos: smartPosRows.length,
    report: visitRows.length,
    booking: fanpageRows.filter(r => r.segment === 'khach_dat_hen_co_sdt').length,
    needPhone: fanpageRows.filter(r => !r.phone_norm).length,
    linked: fanpageRows.filter(r => r.da_noi_hsms).length,
  }

  async function copyText(text, label = 'Đã chép nội dung') {
    await navigator.clipboard?.writeText(text || '')
    showToast(label)
  }

  async function markFanpage(row, status) {
    try {
      const payload = { care_status: status }
      if (status === 'khong_lien_he_duoc') payload.next_contact_at = addDaysISO(1)
      if (['da_cham_soc', 'da_hen_lai', 'tam_ngung'].includes(status)) payload.next_contact_at = null
      const { error } = await supabase
        .from('marketing_fanpage_customer_segments')
        .update(payload)
        .eq('id', row.segment_id)
      if (error) throw error
      setFanpageRows(prev => prev.map(x => x.segment_id === row.segment_id ? { ...x, ...payload } : x))
      showToast(`Đã cập nhật: ${STATUS_LABEL[status]}`)
    } catch (e) {
      showToast(e.message || 'Không cập nhật được trạng thái')
    }
  }

  async function sendFanpage(row, customText = '') {
    const text = String(customText || row.suggested_script || row.suggested_action || row.muc_tieu_tu_van || '').trim()
    if (!row.platform_user_id) {
      await copyText(text, 'Khách chưa có mã inbox để gửi trực tiếp, đã chép kịch bản')
      return
    }
    try {
      const { data, error } = await supabase.functions.invoke('marketing-meta-page-sync', {
        body: {
          mode: 'send_message',
          recipient_id: row.platform_user_id,
          text,
          segment_id: row.segment_id,
        },
      })
      if (error || data?.error) throw new Error(error?.message || data?.error || 'Không gửi được tin')
      await markFanpage(row, 'dang_cham_soc')
      showToast('Đã gửi tin từ HSMS')
    } catch (e) {
      await copyText(text, 'Kênh gửi trực tiếp chưa sẵn sàng, đã chép kịch bản để nhắn thủ công')
    }
  }

  function openVisitFromFanpage(row) {
    const customerName = row.hsms_ho_ten || row.display_name || ''
    const script = row.suggested_script || row.suggested_action || row.muc_tieu_tu_van || ''
    setVisitInitial({
      nguon: 'fanpage',
      segment_id: row.segment_id,
      platform_user_id: row.platform_user_id,
      ho_ten: customerName,
      so_dien_thoai: row.hsms_so_dien_thoai || row.phone_norm || '',
      dich_vu_su_dung: joinList(row.services_interest, ''),
      phan_hoi: `Khách từ Fanpage. ${row.muc_tieu_tu_van || row.care_goal || ''}`.trim(),
      co_hoi_upsell: row.goi_y_upsell || '',
      ghi_chu: script,
      ket_qua: 'can_cham_lai',
    })
    setVisitOpen(true)
  }

  function openBlankVisit() {
    setVisitInitial(null)
    setVisitOpen(true)
  }

  async function handleVisitSaved({ form, initialData }) {
    const nextStatus = initialData?.segment_id ? fanpageStatusAfterVisit(form.ket_qua) : null
    let statusUpdated = false
    if (nextStatus) {
      try {
        const nextContactAt = nextContactAfterVisit(form.ket_qua)
        const updatePayload = { care_status: nextStatus, next_contact_at: nextContactAt }
        const { error } = await supabase
          .from('marketing_fanpage_customer_segments')
          .update(updatePayload)
          .eq('id', initialData.segment_id)
        if (error) throw error
        statusUpdated = true
        setFanpageRows(prev => prev.map(row => (
          row.segment_id === initialData.segment_id ? { ...row, ...updatePayload } : row
        )))
      } catch (e) {
        showToast('Đã lưu nhật ký, nhưng chưa đổi được trạng thái Fanpage')
      }
    }
    await load()
    showToast(statusUpdated ? `Đã lưu nhật ký và chuyển Fanpage sang: ${STATUS_LABEL[nextStatus]}` : 'Đã lưu nhật ký khách đến')
  }

  return (
    <div>
      <div className="mod-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="ttl">{title || meta.title}</div>
          <div className="sub">{subtitle || meta.subtitle}</div>
        </div>
        <div className="acts">
          <button className="btn ghost" onClick={load} disabled={loading}>{loading ? 'Đang tải...' : 'Làm mới'}</button>
          {(!lockedMode || showVisitButton) && <button className="btn gold" onClick={openBlankVisit}>+ Nhập khách đến</button>}
        </div>
      </div>

      {err && (
        <div className="card" style={{ padding: 16, marginBottom: 16, color: 'var(--danger)', fontWeight: 800, fontSize: 13 }}>
          {err}
          <div style={{ marginTop: 6, fontWeight: 500, color: 'var(--ink3)' }}>
            Nếu lỗi thiếu bảng/view, cần chạy migration 101 trên Supabase production.
          </div>
        </div>
      )}

      <CareSummaryStrip effectiveTab={effectiveTab} counts={counts} visitRows={visitRows} smartPosRows={smartPosRows} fanpageRows={fanpageRows} />

      {effectiveTab === 'fanpage' ? (
        <div style={S.workflowNote}>
          <div>
            <b>Dữ liệu đang xử lý:</b> kho Fanpage trên VPS có 123.329 tin nhắn. Màn hình này nạp nhóm ưu tiên trước để nhân viên xử lý nhanh, còn dữ liệu gốc vẫn nằm trong database để phân tích sâu.
          </div>
          <div>
            <b>Realtime:</b> hiện tại HSMS đã có gửi tin từ web, còn nhận tin mới đang theo cơ chế đồng bộ. Bước kế tiếp là Meta Webhook để khách vừa inbox thì HSMS nhận ngay, chỉ lưu tin mới và bản tóm tắt, không tải lại toàn bộ.
          </div>
          <div>
            <b>Kết nối trực tiếp:</b> {realtimeStatus === 'SUBSCRIBED' ? 'đang lắng nghe tin mới/cập nhật mới.' : 'đang kết nối kênh realtime.'}
            {realtimeNotice ? ` ${realtimeNotice}` : ''}
          </div>
        </div>
      ) : (
        <div style={S.workflowNote}>
          <div><b>Vai trò màn hình:</b> {meta.note}</div>
          <div><b>Nguyên tắc vận hành:</b> nhân viên xử lý xong phải ghi kết quả để chủ/quản lý thấy được khách nào đã chăm, khách nào còn bỏ sót.</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: lockedMode ? 'flex-end' : 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        {!lockedMode && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CARE_TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={tabButton(effectiveTab === t.key)}>
                {t.label} <span style={{ opacity: .68 }}>· {counts[t.key]}</span>
              </button>
            ))}
          </div>
        )}
        <div className="search" style={{ width: lockedMode ? 520 : 360, maxWidth: '100%', margin: 0 }}>
          <I.Search />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, SĐT, dịch vụ, gợi ý..." />
        </div>
      </div>

      {effectiveTab === 'fanpage' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {FANPAGE_FILTERS.map(f => {
            const filterCounts = {
              due: counts.fanpage,
              overdue: counts.overdue,
              urgent: fanpageRows.filter(r => r.segment === 'can_xu_ly_rieng').length,
              booking: counts.booking,
              need_phone: counts.needPhone,
              linked: counts.linked,
              done: counts.done,
              all: counts.fanpageAll,
            }
            return (
            <button key={f.key} onClick={() => setFanpageFilter(f.key)} style={tabButton(fanpageFilter === f.key, true)}>
              {f.label} <span style={{ opacity: .65 }}>· {filterCounts[f.key] || 0}</span>
            </button>
            )
          })}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 10 }}>
        {effectiveTab === 'fanpage' && (
          <SmartInboxPanel rows={pagedRows} loading={loading} onCopy={copyText} onSend={sendFanpage} onMark={markFanpage} onVisit={openVisitFromFanpage} />
        )}
        {effectiveTab === 'today' && (
          <VisitTable rows={pagedRows} loading={loading} onCopy={copyText} />
        )}
        {effectiveTab === 'pos' && (
          <PosCareTable rows={pagedRows} loading={loading} onCopy={copyText} />
        )}
        {effectiveTab === 'report' && (
          <CareReportPanel visits={visitRows} fanpageRows={fanpageRows} loading={loading} />
        )}
        {effectiveTab !== 'report' && totalPages > 1 && (
          <Pagination total={activeRows.length} page={safePage} totalPages={totalPages} onPage={setPage} />
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink4)', lineHeight: 1.6 }}>
        {meta.note}
      </div>

      <VisitForm open={visitOpen} initialDate={todayISO()} initialData={visitInitial} currentUser={user} onClose={() => setVisitOpen(false)} onSaved={handleVisitSaved} />

      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)',
          background: 'var(--espresso)', color: '#f5ede0', borderRadius: 999,
          padding: '10px 18px', fontWeight: 800, fontSize: 13, zIndex: 700,
          boxShadow: 'var(--sh-3)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function FanpageTable({ rows, loading, onCopy, onSend, onMark, onVisit }) {
  return (
    <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th style={{ paddingLeft: 18, width: '19%' }}>Khách</th>
          <th style={{ width: '13%' }}>Nhóm</th>
          <th style={{ width: '22%' }}>Hồ sơ HSMS</th>
          <th>Gợi ý tư vấn / upsell</th>
          <th style={{ width: 300, textAlign: 'right', paddingRight: 18 }}>Hành động</th>
        </tr>
      </thead>
      <tbody>
        {loading ? <EmptyRow colSpan={5} text="Đang tải khách Fanpage..." /> : rows.length === 0 ? <EmptyRow colSpan={5} text="Không có khách trong nhóm này." /> : rows.map(row => (
          <tr key={row.segment_id}>
            <td style={{ paddingLeft: 18 }}>
              <div style={{ fontWeight: 850, color: 'var(--ink)' }}>{row.display_name || row.hsms_ho_ten || 'Khách Fanpage'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>{row.phone_norm || row.platform_user_id || 'Chưa có SĐT'}</div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 3 }}>{row.inbound_messages || 0} tin · {fmtDate(row.last_message_at)}</div>
              <div style={{ fontSize: 11, color: isOverdue(row) ? '#b85a4a' : 'var(--ink4)', marginTop: 3, fontWeight: isDueToday(row) ? 800 : 600 }}>
                Chăm: {fmtDate(row.next_contact_at || todayISO())}
              </div>
            </td>
            <td>
              <div style={{ display: 'flex', gap: 5, flexDirection: 'column', alignItems: 'flex-start' }}>
                <Badge tone={row.segment === 'can_xu_ly_rieng' ? 'danger' : row.phone_norm ? 'gold' : 'blue'}>{SEGMENT_LABEL[row.segment] || row.segment}</Badge>
                <Badge tone={fanpageStatusTone(row.care_status)}>{STATUS_LABEL[row.care_status] || row.care_status}</Badge>
              </div>
            </td>
            <td>
              {row.da_noi_hsms ? (
                <>
                  <div style={{ fontWeight: 850, color: 'var(--ink)' }}>{row.hsms_ho_ten}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>
                    {row.so_don || 0} đơn · {fmtMoney(row.tong_chi_tieu)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>
                    Còn {row.tong_buoi_con || 0} buổi · lần cuối {fmtDate(row.lan_cuoi_den)}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--ink3)', fontSize: 12.5 }}>Chưa nối hồ sơ, cần xin/gắn SĐT trước.</div>
              )}
            </td>
            <td>
              <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 750, lineHeight: 1.45 }}>{row.muc_tieu_tu_van || row.suggested_action}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 5, lineHeight: 1.45 }}>{row.goi_y_upsell}</div>
              <div style={{ marginTop: 6 }}><Badge tone="purple">{joinList(row.services_interest, 'Chưa rõ dịch vụ')}</Badge></div>
            </td>
            <td style={{ textAlign: 'right', paddingRight: 18 }}>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <ActionButton tone="gold" onClick={() => onSend(row)}>Gửi/chép tin</ActionButton>
                <ActionButton onClick={() => onVisit(row)}>Ghi chăm</ActionButton>
                <ActionButton onClick={() => onCopy(row.suggested_script || row.suggested_action || row.muc_tieu_tu_van || '', 'Đã chép kịch bản')}>Chép</ActionButton>
                <ActionButton onClick={() => onMark(row, 'da_cham_soc')}>Đã chăm</ActionButton>
                <ActionButton onClick={() => onMark(row, 'da_hen_lai')}>Đã hẹn</ActionButton>
                <ActionButton onClick={() => onMark(row, 'khong_lien_he_duoc')}>Không nghe</ActionButton>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SmartInboxPanel({ rows, loading, onCopy, onSend, onMark, onVisit }) {
  const [selectedId, setSelectedId] = useState('')
  const selected = rows.find(r => r.segment_id === selectedId) || rows[0] || null
  const [messages, setMessages] = useState([])
  const [messageLoading, setMessageLoading] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [draft, setDraft] = useState('')
  const digest = useMemo(() => buildThreadDigest(selected, messages), [selected, messages])

  useEffect(() => {
    if (!selected?.segment_id) return
    setSelectedId(selected.segment_id)
    setDraft(buildSuggestedReply(selected))
  }, [selected?.segment_id])

  useEffect(() => {
    let alive = true
    async function loadMessages() {
      if (!selected?.segment_id) {
        setMessages([])
        return
      }
      setMessageLoading(true)
      setMessageError('')
      try {
        const conversationIds = Array.isArray(selected.conversation_ids)
          ? selected.conversation_ids.filter(Boolean).slice(0, 12)
          : []
        let data = []
        let error = null

        if (conversationIds.length > 0) {
          const res = await supabase
            .from('v_marketing_fanpage_message_thread_light')
            .select('*')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false })
            .limit(160)
          data = res.data || []
          error = res.error
        } else if (selected.platform_user_id) {
          const [fromRes, toRes] = await Promise.all([
            supabase
              .from('v_marketing_fanpage_message_thread_light')
              .select('*')
              .eq('from_platform_user_id', selected.platform_user_id)
              .order('created_at', { ascending: false })
              .limit(100),
            supabase
              .from('v_marketing_fanpage_message_thread_light')
              .select('*')
              .eq('recipient_id', selected.platform_user_id)
              .order('created_at', { ascending: false })
              .limit(100),
          ])
          error = fromRes.error || toRes.error
          const byId = new Map([...(fromRes.data || []), ...(toRes.data || [])].map(msg => [msg.id, msg]))
          data = Array.from(byId.values())
        }

        if (error) throw error
        const sorted = data
          .sort((a, b) => new Date(a.created_at || a.sent_at || 0) - new Date(b.created_at || b.sent_at || 0))
          .slice(-160)
        if (alive) setMessages(sorted)
      } catch (e) {
        if (alive) setMessageError(e.message || 'Không tải được lịch sử chat.')
        if (alive) setMessages([])
      } finally {
        if (alive) setMessageLoading(false)
      }
    }
    loadMessages()
    return () => { alive = false }
  }, [selected?.segment_id])

  // Nhận định của Trợ Lý AI (DeepSeek triage) cho khách đang chọn: cũ/mới + tóm tắt + nên làm.
  const [aiInsight, setAiInsight] = useState(null)
  useEffect(() => {
    let alive = true
    async function loadAi() {
      setAiInsight(null)
      const pid = selected?.platform_user_id
      const phone = selected?.phone_norm
      if (!pid && !phone) return
      try {
        let q = supabase.from('marketing_leads')
          .select('ai_intent, ai_summary, ai_next_best_action, diem_tiem_nang, khach_hang_id, trang_thai, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
        q = pid ? q.eq('platform_user_id', pid) : q.eq('so_dien_thoai', phone)
        const { data } = await q.maybeSingle()
        if (alive) setAiInsight(data || null)
      } catch {
        if (alive) setAiInsight(null)
      }
    }
    loadAi()
    return () => { alive = false }
  }, [selected?.segment_id])

  if (loading) return <div style={{ padding: 36, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải hộp thư Fanpage...</div>
  if (!selected) return <div style={{ padding: 36, textAlign: 'center', color: 'var(--ink3)' }}>Không có khách trong nhóm này.</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', minHeight: 640 }}>
      <div style={S.inboxList}>
        <div style={S.panelHead}>
          <div style={S.panelTitle}>Khách cần xử lý</div>
          <div style={S.panelSub}>{rows.length} khách trong trang này</div>
        </div>
        <div style={{ overflow: 'auto', maxHeight: 600 }}>
          {rows.map(row => {
            const active = row.segment_id === selected.segment_id
            return (
              <button key={row.segment_id} type="button" onClick={() => setSelectedId(row.segment_id)} style={customerItem(active)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 900, color: 'var(--ink)', textAlign: 'left' }}>{customerName(row)}</div>
                  <Badge tone={row.segment === 'can_xu_ly_rieng' ? 'danger' : row.phone_norm ? 'gold' : 'blue'}>{shortSegment(row)}</Badge>
                </div>
                <div style={{ marginTop: 5, color: 'var(--ink3)', fontSize: 12, textAlign: 'left' }}>{row.phone_norm || 'Chưa có SĐT'} · {row.inbound_messages || 0} tin</div>
                <div style={{ marginTop: 5, color: isOverdue(row) ? '#b85a4a' : 'var(--ink4)', fontSize: 11.5, fontWeight: 800, textAlign: 'left' }}>
                  Việc cần làm: {nextHumanAction(row)}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={S.chatPanel}>
        <div style={S.panelHead}>
          <div>
            <div style={S.panelTitle}>{customerName(selected)}</div>
            <div style={S.panelSub}>Tin gần nhất {fmtDate(selected.last_message_at)} · trạng thái {STATUS_LABEL[selected.care_status] || 'Chưa chăm'}</div>
          </div>
          <Badge tone={fanpageStatusTone(selected.care_status)}>{STATUS_LABEL[selected.care_status] || 'Chưa chăm'}</Badge>
        </div>

        <ConversationSummary digest={digest} selected={selected} />

        <div style={S.chatBody}>
          {messageLoading ? (
            <div style={S.emptyChat}>Đang tải lịch sử trò chuyện...</div>
          ) : messages.length > 0 ? (
            messages.map(msg => <ChatBubble key={msg.id} message={msg} />)
          ) : messageError ? (
            <div style={S.emptyChat}>
              <b>Chưa mở được lịch sử chat.</b>
              <span>{messageError}</span>
              <span>{threadErrorHint(messageError)}</span>
            </div>
          ) : (
            <div style={S.emptyChat}>
              <b>Chưa có dòng chat chi tiết cho khách này.</b>
              <span>HSMS vẫn đã nhận diện nhóm khách, SĐT, lịch sử mua và mục tiêu tư vấn. Khi Meta Webhook nhận thêm tin mới, hội thoại sẽ tự hiện ở đây.</span>
            </div>
          )}
        </div>

        <div style={S.replyBox}>
          <div style={S.label}>Tin nhắn đề xuất để nhân viên gửi</div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} style={{ ...S.textarea, minHeight: 110 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 10 }}>
            <ActionButton onClick={() => onCopy(draft, 'Đã chép tin nhắn đề xuất')}>Chép tin</ActionButton>
            <ActionButton tone="gold" onClick={() => onSend(selected, draft)}>Gửi từ HSMS</ActionButton>
          </div>
        </div>
      </div>

      <div style={S.assistantPanel}>
        <div style={S.panelHead}>
          <div>
            <div style={S.panelTitle}>Hồ sơ & đề xuất</div>
            <div style={S.panelSub}>HSMS tự ghép Fanpage với POS khi có SĐT</div>
          </div>
        </div>

        <InfoBlock title="Khách này là ai">
          {selected.da_noi_hsms ? (
            <>
              <b>{selected.hsms_ho_ten}</b>
              <span>{selected.so_don || 0} đơn · {fmtMoney(selected.tong_chi_tieu)}</span>
              <span>Còn {selected.tong_buoi_con || 0} buổi · lần cuối {fmtDate(selected.lan_cuoi_den)}</span>
            </>
          ) : (
            <>
              <b>{selected.phone_norm ? 'Có SĐT nhưng chưa nối hồ sơ' : 'Chưa có SĐT'}</b>
              <span>{selected.phone_norm ? 'Nên tạo/gắn hồ sơ HSMS trước khi tư vấn sâu.' : 'Mục tiêu đầu tiên là xin SĐT/Zalo để nhận diện khách.'}</span>
            </>
          )}
        </InfoBlock>

        {aiInsight && (aiInsight.ai_summary || aiInsight.ai_next_best_action) && (
          <InfoBlock title="🤖 Trợ Lý AI (DeepSeek)">
            <Badge tone={(aiInsight.khach_hang_id || selected.da_noi_hsms) ? 'gold' : 'blue'}>
              {(aiInsight.khach_hang_id || selected.da_noi_hsms) ? 'Khách cũ' : 'Khách mới'}
              {aiInsight.diem_tiem_nang != null ? ` · điểm ${aiInsight.diem_tiem_nang}` : ''}
            </Badge>
            {aiInsight.ai_summary && <span style={{ marginTop: 6 }}>{aiInsight.ai_summary}</span>}
            {aiInsight.ai_next_best_action && <span style={{ marginTop: 4 }}><b>Nên làm: </b>{aiInsight.ai_next_best_action}</span>}
          </InfoBlock>
        )}

        <InfoBlock title="Việc nhân viên cần làm ngay">
          <b>{nextHumanAction(selected)}</b>
          <span>{selected.muc_tieu_tu_van || selected.suggested_action || 'Hỏi nhu cầu và chốt lịch gần nhất.'}</span>
        </InfoBlock>

        <InfoBlock title="Gợi ý bán thêm">
          <span>{selected.goi_y_upsell || 'Chưa có gợi ý bán thêm rõ ràng.'}</span>
          <Badge tone="purple">{joinList(selected.services_interest, 'Chưa rõ dịch vụ')}</Badge>
        </InfoBlock>

        <div style={{ display: 'grid', gap: 8 }}>
          <ActionButton tone="gold" onClick={() => onVisit(selected)}>Ghi kết quả chăm sóc</ActionButton>
          <ActionButton onClick={() => onMark(selected, 'da_cham_soc')}>Đánh dấu đã chăm</ActionButton>
          <ActionButton onClick={() => onMark(selected, 'da_hen_lai')}>Khách đã hẹn</ActionButton>
          <ActionButton onClick={() => onMark(selected, 'khong_lien_he_duoc')}>Không liên hệ được</ActionButton>
        </div>
      </div>
    </div>
  )
}

function ConversationSummary({ digest, selected }) {
  const riskTone = !selected?.phone_norm || !selected?.da_noi_hsms ? 'danger' : 'good'
  return (
    <div style={S.conversationSummary}>
      <div style={S.summaryTile}>
        <div style={S.label}>Khách vừa nói gì</div>
        <div style={S.summaryText}>{digest.lastInboundText}</div>
        <div style={S.summaryMeta}>{digest.lastInboundAt}</div>
      </div>
      <div style={S.summaryTile}>
        <div style={S.label}>Hannah đã trả lời</div>
        <div style={S.summaryText}>{digest.lastOutboundText}</div>
        <div style={S.summaryMeta}>{digest.lastOutboundAt}</div>
      </div>
      <div style={S.summaryTile}>
        <div style={S.label}>Mức xử lý</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge tone={riskTone}>{digest.identityText}</Badge>
          <Badge tone={digest.threadCount > 0 ? 'blue' : 'neutral'}>{digest.loadedText}</Badge>
        </div>
        <div style={S.summaryMeta}>{nextHumanAction(selected)}</div>
      </div>
    </div>
  )
}

function threadErrorHint(error = '') {
  const text = String(error).toLowerCase()
  if (text.includes('timeout')) {
    return 'Kho chat cũ đang quá nặng nên HSMS vẫn giữ phần nhận diện khách, hồ sơ HSMS và gợi ý tư vấn trước; phần lịch sử chi tiết sẽ mở nhanh hơn sau khi backfill thread chạy theo lô nhỏ.'
  }
  if (text.includes('v_marketing_fanpage_message_thread_light') || text.includes('schema cache')) {
    return 'Cần đồng bộ schema/migration lịch sử chat trên Supabase production trước khi đọc hội thoại chi tiết.'
  }
  return 'HSMS vẫn giữ phần nhận diện khách, hồ sơ HSMS và gợi ý tư vấn để nhân viên tiếp tục xử lý; lịch sử chat chi tiết sẽ được tải lại khi kênh dữ liệu ổn định.'
}

function buildThreadDigest(row, messages = []) {
  const inbound = [...messages].reverse().find(msg => msg.direction !== 'outbound')
  const outbound = [...messages].reverse().find(msg => msg.direction === 'outbound')
  const threadCount = messages.length
  const identityText = !row?.phone_norm
    ? 'Chưa có SĐT'
    : row?.da_noi_hsms
      ? 'Đã nối HSMS'
      : 'Có SĐT, chưa nối hồ sơ'

  return {
    threadCount,
    loadedText: threadCount > 0 ? `${threadCount} tin đã tải` : 'Chưa có dòng chat',
    identityText,
    lastInboundText: messagePreview(inbound) || row?.last_message_text || row?.muc_tieu_tu_van || 'Chưa có nội dung khách gần nhất.',
    lastInboundAt: inbound ? `Khách · ${fmtDate(inbound.created_at || inbound.sent_at)}` : `Tin gần nhất · ${fmtDate(row?.last_message_at)}`,
    lastOutboundText: messagePreview(outbound) || 'Chưa thấy tin trả lời gần nhất trong luồng đã tải.',
    lastOutboundAt: outbound ? `Hannah Spa · ${fmtDate(outbound.created_at || outbound.sent_at)}` : 'Cần kiểm tra trước khi nhắn tiếp',
  }
}

function messagePreview(message) {
  if (!message) return ''
  const text = String(message.noi_dung || '').replace(/\s+/g, ' ').trim()
  if (!text) return '[Tin có hình/đính kèm]'
  return text.length > 150 ? `${text.slice(0, 150)}...` : text
}

function ChatBubble({ message }) {
  const isOut = message.direction === 'outbound'
  return (
    <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{
        maxWidth: '82%',
        border: '1px solid var(--line)',
        background: isOut ? 'rgba(201,169,110,.18)' : 'var(--surface2)',
        borderRadius: isOut ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
        padding: '9px 11px',
        color: 'var(--ink)',
        fontSize: 12.5,
        lineHeight: 1.5,
      }}>
        <div style={{ fontSize: 10.5, color: 'var(--ink4)', fontWeight: 800, marginBottom: 3 }}>
          {isOut ? 'Hannah Spa' : (message.sender_name || 'Khách')} · {fmtDate(message.created_at || message.sent_at)}
        </div>
        {message.noi_dung || '[Tin có hình/đính kèm]'}
      </div>
    </div>
  )
}

function InfoBlock({ title, children }) {
  return (
    <div style={S.infoBlock}>
      <div style={S.label}>{title}</div>
      <div style={{ display: 'grid', gap: 5, color: 'var(--ink2)', fontSize: 12.5, lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

function customerName(row) {
  return row?.hsms_ho_ten || row?.display_name || 'Khách Fanpage'
}

function fanpageMessageCount(row) {
  return Number(row?.inbound_messages || row?.total_messages || row?.message_count || 0)
}

function buildSuggestedReply(row) {
  return String(row?.suggested_script || row?.suggested_action || row?.muc_tieu_tu_van || '').trim()
}

function shortSegment(row) {
  if (!row?.phone_norm) return 'Xin SĐT'
  if (row?.segment === 'can_xu_ly_rieng') return 'Quản lý'
  if (row?.da_noi_hsms) return 'Đã nối'
  return 'Có SĐT'
}

function nextHumanAction(row) {
  if (!row?.phone_norm) return 'Xin SĐT/Zalo'
  if (row?.segment === 'can_xu_ly_rieng') return 'Quản lý đọc trước khi nhắn'
  if (!row?.da_noi_hsms) return 'Tạo hoặc gắn hồ sơ HSMS'
  if (Number(row?.tong_buoi_con || 0) > 0) return 'Mời khách đặt lịch dùng thẻ còn buổi'
  if (row?.segment === 'khach_dat_hen_co_sdt') return 'Chốt giờ hẹn và dịch vụ'
  return 'Hỏi phản hồi và mời quay lại'
}

function customerItem(active) {
  return {
    width: '100%',
    border: 'none',
    borderBottom: '1px solid var(--line)',
    background: active ? 'rgba(201,169,110,.16)' : 'transparent',
    padding: 13,
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
  }
}

function VisitTable({ rows, loading, onCopy }) {
  return (
    <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th style={{ paddingLeft: 18, width: '18%' }}>Khách</th>
          <th style={{ width: '18%' }}>Dịch vụ / KTV</th>
          <th style={{ width: '18%' }}>Phản hồi</th>
          <th>Hệ thống đề xuất</th>
          <th style={{ width: 150, textAlign: 'right', paddingRight: 18 }}>Hành động</th>
        </tr>
      </thead>
      <tbody>
        {loading ? <EmptyRow colSpan={5} text="Đang tải nhật ký khách đến..." /> : rows.length === 0 ? <EmptyRow colSpan={5} text="Chưa có báo cáo khách đến." /> : rows.map(row => (
          <tr key={row.id}>
            <td style={{ paddingLeft: 18 }}>
              <div style={{ fontWeight: 850, color: 'var(--ink)' }}>{row.hsms_ho_ten || row.ho_ten || 'Khách'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>{row.so_dien_thoai || 'Chưa có SĐT'}</div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 3 }}>{fmtDate(row.ngay)} · {VISIT_RESULT.find(x => x.key === row.ket_qua)?.label || row.ket_qua}</div>
            </td>
            <td>
              <div style={{ fontWeight: 750, color: 'var(--ink)' }}>{row.dich_vu_su_dung || 'Chưa nhập dịch vụ'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4 }}>KTV: {row.ktv_phu_trach || '—'}</div>
              {row.co_hoi_upsell && <div style={{ marginTop: 5 }}><Badge tone="gold">{row.co_hoi_upsell}</Badge></div>}
            </td>
            <td style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.45 }}>{row.phan_hoi || row.ghi_chu || '—'}</td>
            <td>
              <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 750, lineHeight: 1.45 }}>{row.muc_tieu_tu_van || 'Chăm lại sau khi khách dùng dịch vụ.'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 5, lineHeight: 1.45 }}>{row.goi_y_upsell || 'Hỏi phản hồi trước, sau đó gợi ý dịch vụ phù hợp.'}</div>
            </td>
            <td style={{ textAlign: 'right', paddingRight: 18 }}>
              <ActionButton onClick={() => onCopy(`${row.hsms_ho_ten || row.ho_ten || 'Khách'}: ${row.muc_tieu_tu_van || ''} ${row.goi_y_upsell || ''}`, 'Đã chép gợi ý chăm sóc')}>Chép gợi ý</ActionButton>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PosCareTable({ rows, loading, onCopy }) {
  return (
    <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th style={{ paddingLeft: 18, width: '22%' }}>Khách</th>
          <th style={{ width: '16%' }}>Lịch sử</th>
          <th style={{ width: '20%' }}>Lý do chăm</th>
          <th>Gợi ý bán thêm</th>
          <th style={{ width: 160, textAlign: 'right', paddingRight: 18 }}>Liên hệ</th>
        </tr>
      </thead>
      <tbody>
        {loading ? <EmptyRow colSpan={5} text="Đang tải khách cũ/POS..." /> : rows.length === 0 ? <EmptyRow colSpan={5} text="Chưa có khách POS cần chăm theo ngưỡng hiện tại." /> : rows.map(row => {
          const phone = normalizePhone(row.so_dien_thoai)
          return (
            <tr key={row.id}>
              <td style={{ paddingLeft: 18 }}>
                <div style={{ fontWeight: 850, color: 'var(--ink)' }}>{row.ho_ten || 'Khách'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>{row.so_dien_thoai || 'Chưa có SĐT'}</div>
              </td>
              <td>
                <div style={{ fontWeight: 800 }}>{row.so_don || 0} đơn · {fmtMoney(row.tong_chi_tieu)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4 }}>Lần cuối {fmtDate(row.lan_cuoi_den)}</div>
              </td>
              <td>
                <Badge tone={Number(row.tong_buoi_con || 0) > 0 ? 'purple' : 'blue'}>{row.goal}</Badge>
              </td>
              <td style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.45 }}>{row.upsell}</td>
              <td style={{ textAlign: 'right', paddingRight: 18 }}>
                <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {validPhone(phone) && <a href={`tel:${phone}`} className="btn ghost" style={{ padding: '6px 10px', fontSize: 12, textDecoration: 'none' }}>Gọi</a>}
                  {validPhone(phone) && <a href={`https://zalo.me/${phone}`} target="_blank" rel="noreferrer" className="btn ghost" style={{ padding: '6px 10px', fontSize: 12, textDecoration: 'none' }}>Zalo</a>}
                  <ActionButton onClick={() => onCopy(`${row.ho_ten}: ${row.goal} ${row.upsell}`, 'Đã chép gợi ý')}>Chép</ActionButton>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function CareReportPanel({ visits, fanpageRows, loading }) {
  const today = todayISO()
  const weekStart = addDaysISO(-6)
  const todayVisits = visits.filter(r => r.ngay === today)
  const weekVisits = visits.filter(r => String(r.ngay || '').slice(0, 10) >= weekStart)
  const fromFanpageToday = todayVisits.filter(r => r.nguon === 'fanpage' || r.fanpage_segment_id)
  const doneFanpage = fanpageRows.filter(isDoneFanpageCare).length
  const pendingFanpage = fanpageRows.filter(isDueToday).length
  const overdueFanpage = fanpageRows.filter(isOverdue).length
  const needPhoneFanpage = fanpageRows.filter(r => isOpenFanpageCare(r) && !r.phone_norm).length
  const missedFanpage = fanpageRows.filter(r => r.care_status === 'khong_lien_he_duoc').length
  const resultRows = VISIT_RESULT.map(result => ({
    ...result,
    today: todayVisits.filter(r => r.ket_qua === result.key).length,
    week: weekVisits.filter(r => r.ket_qua === result.key).length,
  }))
  const staffRows = groupCareByStaff(weekVisits)
  const openFanpageRows = fanpageRows
    .filter(isDueToday)
    .sort(sortFanpageCarePriority)
    .slice(0, 10)

  return (
    <div style={{ padding: 18 }}>
      {loading ? (
        <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải báo cáo chăm sóc...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(185px,1fr))', gap: 12, marginBottom: 18 }}>
            <ReportCard label="Đã ghi chăm hôm nay" value={todayVisits.length} sub={`${fromFanpageToday.length} từ Fanpage`} tone="gold" />
            <ReportCard label="Đã chăm/đã hẹn Fanpage" value={doneFanpage} sub="trong hàng đợi ưu tiên" tone="good" />
            <ReportCard label="Fanpage còn phải chăm" value={pendingFanpage} sub={`${overdueFanpage} trễ · ${needPhoneFanpage} cần xin SĐT · ${missedFanpage} chưa liên hệ`} tone="danger" />
            <ReportCard label="Nhật ký 7 ngày" value={weekVisits.length} sub={`từ ${fmtDate(weekStart)} đến ${fmtDate(today)}`} tone="blue" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
            <div style={S.reportBox}>
              <div style={S.reportTitle}>Kết quả chăm sóc</div>
              <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th>Kết quả</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Hôm nay</th>
                    <th style={{ width: 120, textAlign: 'right' }}>7 ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows.map(row => (
                    <tr key={row.key}>
                      <td><Badge tone={row.key === 'da_mua_them' ? 'good' : row.key === 'chua_hai_long' ? 'danger' : 'neutral'}>{row.label}</Badge></td>
                      <td style={{ textAlign: 'right', fontWeight: 850 }}>{row.today}</td>
                      <td style={{ textAlign: 'right', fontWeight: 850 }}>{row.week}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={S.reportBox}>
              <div style={S.reportTitle}>Theo nhân viên</div>
              <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th style={{ width: 90, textAlign: 'right' }}>Tổng</th>
                    <th style={{ width: 90, textAlign: 'right' }}>Hẹn/mua</th>
                    <th style={{ width: 90, textAlign: 'right' }}>Cần lại</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.length === 0 ? (
                    <EmptyRow colSpan={4} text="Chưa có nhật ký chăm sóc trong 7 ngày gần đây." />
                  ) : staffRows.map(row => (
                    <tr key={row.name}>
                      <td style={{ fontWeight: 850 }}>{row.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 850 }}>{row.total}</td>
                      <td style={{ textAlign: 'right', color: '#6e8a5e', fontWeight: 850 }}>{row.win}</td>
                      <td style={{ textAlign: 'right', color: '#b85a4a', fontWeight: 850 }}>{row.follow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...S.reportBox, marginTop: 14 }}>
            <div style={{ ...S.reportTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>Khách còn sót cần xử lý</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 850, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Ưu tiên theo trễ hạn, thiếu SĐT, khách nóng
              </span>
            </div>
            <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 18, width: '24%' }}>Khách</th>
                  <th style={{ width: '17%' }}>Nhóm</th>
                  <th style={{ width: '15%' }}>Hạn chăm</th>
                  <th>Việc cần làm</th>
                  <th style={{ width: '15%', textAlign: 'right', paddingRight: 18 }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {openFanpageRows.length === 0 ? (
                  <EmptyRow colSpan={5} text="Không còn khách Fanpage nào đến hạn trong hàng đợi ưu tiên." />
                ) : openFanpageRows.map(row => (
                  <tr key={row.segment_id || row.platform_user_id || row.phone_norm || row.display_name}>
                    <td style={{ paddingLeft: 18 }}>
                      <div style={{ fontWeight: 850, color: 'var(--ink)' }}>{customerName(row)}</div>
                      <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--ink3)' }}>{row.phone_norm || 'Chưa có SĐT'} · {fanpageMessageCount(row).toLocaleString('vi-VN')} tin</div>
                    </td>
                    <td>
                      <Badge tone={fanpageCareTone(row)}>{shortSegment(row)}</Badge>
                    </td>
                    <td style={{ fontSize: 12.5, color: isOverdue(row) ? '#b85a4a' : 'var(--ink2)', fontWeight: 800 }}>
                      {fanpageDueText(row)}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 750, lineHeight: 1.45 }}>
                      {nextHumanAction(row)}
                      <div style={{ marginTop: 3, color: 'var(--ink3)', fontWeight: 500 }}>
                        {row.muc_tieu_tu_van || row.suggested_action || 'Đọc lại hội thoại, xác nhận nhu cầu rồi chốt bước tiếp theo.'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 18 }}>
                      <Badge tone={fanpageStatusTone(row.care_status)}>{STATUS_LABEL[row.care_status] || 'Chưa chăm'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, color: 'var(--ink4)', fontSize: 11.5, lineHeight: 1.6 }}>
            Báo cáo này chỉ tính những lần nhân viên bấm lưu trong “Nhật ký khách đến”. Vì vậy muốn đo hiệu quả thật, lễ tân cần ghi chăm ngay sau khi nhắn/gọi khách.
          </div>
        </>
      )}
    </div>
  )
}

function sortFanpageCarePriority(a, b) {
  return fanpagePriorityScore(b) - fanpagePriorityScore(a)
}

function fanpagePriorityScore(row) {
  let score = 0
  if (isOverdue(row)) score += 100
  if (!row.phone_norm) score += 70
  if (row.segment === 'can_xu_ly_rieng') score += 60
  if (row.segment === 'khach_dat_hen_co_sdt' || row.segment === 'khach_nong_co_sdt') score += 45
  if (row.da_noi_hsms) score += 25
  score += Math.min(fanpageMessageCount(row), 60)
  return score
}

function fanpageCareTone(row) {
  if (!row?.phone_norm || row?.segment === 'can_xu_ly_rieng') return 'danger'
  if (row?.segment === 'khach_dat_hen_co_sdt' || row?.segment === 'khach_nong_co_sdt') return 'gold'
  if (row?.da_noi_hsms) return 'good'
  return 'blue'
}

function fanpageDueText(row) {
  const next = row?.next_contact_at ? String(row.next_contact_at).slice(0, 10) : ''
  if (!next) return 'Cần xử lý ngay'
  if (next < todayISO()) return `Trễ từ ${fmtDate(next)}`
  if (next === todayISO()) return 'Hôm nay'
  return fmtDate(next)
}

function ReportCard({ label, value, sub, tone }) {
  const color = tone === 'good' ? '#6e8a5e' : tone === 'danger' ? '#b85a4a' : tone === 'blue' ? '#1a6b8a' : 'var(--champagne)'
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 14, background: 'var(--surface2)' }}>
      <div style={{ fontSize: 11, fontWeight: 850, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 850, color, marginTop: 5 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function groupCareByStaff(rows) {
  const map = new Map()
  for (const row of rows) {
    const name = row.created_by_name || row.created_by_ho_ten || row.created_by || 'Chưa rõ nhân viên'
    const item = map.get(name) || { name, total: 0, win: 0, follow: 0 }
    item.total += 1
    if (row.ket_qua === 'da_mua_them' || row.ket_qua === 'hai_long') item.win += 1
    if (row.ket_qua === 'can_cham_lai' || row.ket_qua === 'chua_hai_long') item.follow += 1
    map.set(name, item)
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total || b.win - a.win)
}

function Pagination({ total, page, totalPages, onPage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink3)' }}>
      <span>{total.toLocaleString('vi-VN')} dòng · trang {page}/{totalPages}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn ghost" style={{ padding: '5px 12px' }} disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Trước</button>
        <button className="btn ghost" style={{ padding: '5px 12px' }} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Sau ›</button>
      </div>
    </div>
  )
}

function applySearch(rows, search, fields) {
  const q = String(search || '').trim().toLowerCase()
  const qPhone = phoneDigits(q)
  if (!q) return rows
  return rows.filter(row => fields.some(field => {
    const value = row[field]
    const text = Array.isArray(value) ? value.join(' ') : String(value || '')
    return text.toLowerCase().includes(q) || (qPhone && phoneDigits(text).includes(qPhone))
  }))
}

function tabButton(active, small = false) {
  return {
    padding: small ? '7px 12px' : '8px 16px',
    borderRadius: 999,
    fontSize: small ? 12 : 12.5,
    fontWeight: 850,
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    border: `1px solid ${active ? 'transparent' : 'var(--line2)'}`,
    background: active ? 'var(--ink)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--ink2)',
  }
}

function quickResultButton(active) {
  return {
    border: `1px solid ${active ? 'transparent' : 'var(--line2)'}`,
    background: active ? 'var(--ink)' : 'var(--surface2)',
    color: active ? '#fff' : 'var(--ink2)',
    borderRadius: 999,
    padding: '7px 11px',
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: 'nowrap',
  }
}

const S = {
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 850, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' },
  input: {
    width: '100%', boxSizing: 'border-box', border: '1px solid var(--line2)', borderRadius: 8,
    padding: '9px 11px', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)',
    background: 'var(--surface2)', outline: 'none',
  },
  inputBtn: {
    width: '100%', boxSizing: 'border-box', border: '1px solid var(--line2)', borderRadius: 8,
    padding: '9px 11px', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)',
    background: 'var(--surface2)', outline: 'none', cursor: 'pointer', textAlign: 'left',
  },
  textarea: {
    width: '100%', minHeight: 78, boxSizing: 'border-box', border: '1px solid var(--line2)', borderRadius: 8,
    padding: '9px 11px', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)',
    background: 'var(--surface2)', outline: 'none', resize: 'vertical',
  },
  reportBox: {
    border: '1px solid var(--line)',
    borderRadius: 8,
    background: 'var(--surface2)',
    overflow: 'hidden',
  },
  reportTitle: {
    padding: '13px 16px',
    borderBottom: '1px solid var(--line)',
    fontFamily: 'var(--serif)',
    fontSize: 19,
    color: 'var(--ink)',
    fontWeight: 850,
  },
  formContext: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
    border: '1px solid var(--line)',
    borderRadius: 10,
    background: 'rgba(251,247,239,.78)',
    padding: 13,
  },
  workflowNote: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
    gap: 12,
    padding: 14,
    border: '1px solid var(--line)',
    borderRadius: 10,
    background: 'rgba(251,247,239,.72)',
    color: 'var(--ink2)',
    fontSize: 12.5,
    lineHeight: 1.55,
    marginBottom: 14,
  },
  inboxList: {
    borderRight: '1px solid var(--line)',
    background: 'var(--surface2)',
    minWidth: 0,
  },
  chatPanel: {
    borderRight: '1px solid var(--line)',
    background: 'var(--surface)',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  assistantPanel: {
    background: 'var(--surface2)',
    minWidth: 0,
    paddingBottom: 14,
  },
  panelHead: {
    padding: 14,
    borderBottom: '1px solid var(--line)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  panelTitle: {
    fontFamily: 'var(--serif)',
    fontSize: 19,
    fontWeight: 900,
    color: 'var(--ink)',
  },
  panelSub: {
    fontSize: 11.5,
    color: 'var(--ink3)',
    marginTop: 2,
  },
  chatBody: {
    padding: 14,
    minHeight: 310,
    maxHeight: 430,
    overflow: 'auto',
    background: 'linear-gradient(180deg, rgba(243,236,225,.55), rgba(251,247,239,.92))',
  },
  conversationSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
    gap: 10,
    padding: 12,
    borderBottom: '1px solid var(--line)',
    background: 'rgba(251,247,239,.72)',
  },
  summaryTile: {
    minHeight: 104,
    border: '1px solid var(--line)',
    borderRadius: 8,
    background: 'var(--surface2)',
    padding: 11,
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },
  summaryText: {
    color: 'var(--ink)',
    fontSize: 12.5,
    lineHeight: 1.45,
    fontWeight: 700,
  },
  summaryMeta: {
    marginTop: 'auto',
    color: 'var(--ink4)',
    fontSize: 11.5,
    lineHeight: 1.35,
  },
  emptyChat: {
    minHeight: 220,
    border: '1px dashed var(--line2)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    color: 'var(--ink3)',
    textAlign: 'center',
    padding: 18,
    lineHeight: 1.55,
    fontSize: 12.5,
  },
  replyBox: {
    borderTop: '1px solid var(--line)',
    padding: 14,
    background: 'var(--surface2)',
  },
  infoBlock: {
    margin: 14,
    padding: 13,
    border: '1px solid var(--line)',
    borderRadius: 8,
    background: 'var(--surface)',
  },
}
