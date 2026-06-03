import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency } from '../../../lib/utils'
import { C, FONT } from '../../../constants/colors'

const METRIC_LABELS = {
  old_orders: { title: 'Đơn myspa cũ', note: 'Đến 30/04/2026' },
  old_lines: { title: 'Dòng dịch vụ', note: 'Lịch sử dùng dịch vụ' },
  synced_staff_lines: { title: 'Dòng đã đồng bộ', note: 'Có dấu nhân viên myspa' },
  matched_active_staff: { title: 'Khớp NV hiện tại', note: 'Có hồ sơ trong HSMS' },
  legacy_resigned_staff: { title: 'NV nghỉ việc', note: 'Giữ tên gốc để tra cứu' },
  missing_staff_name: { title: 'Thiếu tên NV', note: 'File myspa không có tên' },
  old_orders_without_payment_rows: { title: 'Thiếu dòng thanh toán', note: 'Không ghi vào Sổ Thu Chi' },
  old_orders_without_pos_revenue: { title: 'Thiếu doanh thu POS', note: 'Đã giữ nguyên Sổ Thu Chi' },
}

const STATUS_LABELS = {
  dang_lam: 'Nhân viên hiện tại',
  nghi_viec: 'Nhân viên nghỉ việc',
  chua_co_ten: 'Chưa có tên nhân viên',
}

const CARD_STATUS = {
  ok: 'Đang ổn',
  active_but_expired: 'Active nhưng hết hạn',
  active_but_no_sessions: 'Active nhưng hết buổi',
  finished_but_has_sessions: 'Hết buổi nhưng còn buổi',
  used_more_than_total: 'Dùng vượt số buổi',
}

const CARD_ACTION = {
  active_but_expired: 'Đề xuất: chuyển trạng thái hết hạn sau khi xác nhận với khách.',
  active_but_no_sessions: 'Đề xuất: chuyển hết buổi nếu lịch sử dùng thẻ đã đúng.',
  finished_but_has_sessions: 'Đề xuất: rà lại số buổi đã dùng hoặc trạng thái thẻ.',
  used_more_than_total: 'Đề xuất: kiểm tra lịch sử import, đây là nhóm cần ưu tiên.',
  ok: 'Không cần xử lý.',
}

const READY_LABELS = {
  customers_locked: { title: 'Khách hàng', good: 'Đủ khách MySpa' },
  orders_locked: { title: 'Đơn hàng', good: 'Đủ đơn MySpa' },
  order_lines_locked: { title: 'Dòng đơn', good: 'Đủ chi tiết đơn' },
  cards_locked: { title: 'Thẻ liệu trình', good: 'Đủ thẻ MySpa' },
  commission_diff: { title: 'Tour/Hoa hồng', good: 'Lệch 0đ' },
  crm_history_rows: { title: 'Lịch sử CRM', good: 'Đủ lịch sử' },
  card_review_needed: { title: 'Thẻ cần rà', good: 'Không còn thẻ cần rà' },
  active_expired_cards: { title: 'Active hết hạn', good: 'Không còn hết hạn' },
  overused_cards: { title: 'Dùng vượt buổi', good: 'Không còn vượt buổi' },
}

function normText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a, b) {
  const aa = new Set(normText(a).split(' ').filter(Boolean))
  const bb = new Set(normText(b).split(' ').filter(Boolean))
  if (!aa.size || !bb.size) return 0
  let same = 0
  aa.forEach(x => { if (bb.has(x)) same += 1 })
  return same / new Set([...aa, ...bb]).size
}

const DEFAULT_READINESS = [
  { metric: 'customers_locked', value: 5965, expected: 5965, diff: 0, note: 'Khách hàng MySpa đã có trong HSMS' },
  { metric: 'orders_locked', value: 43864, expected: 43864, diff: 0, note: 'Đơn hàng MySpa đến 30/04/2026' },
  { metric: 'order_lines_locked', value: 68956, expected: 68956, diff: 0, note: 'Dòng dịch vụ/sản phẩm trong đơn MySpa' },
  { metric: 'cards_locked', value: 4684, expected: 4684, diff: 0, note: 'Thẻ liệu trình MySpa đến 30/04/2026' },
  { metric: 'commission_diff', value: 0, expected: 0, diff: 0, note: 'Chênh lệch Tour/Hoa hồng MySpa vs HSMS' },
  { metric: 'crm_history_rows', value: 68956, expected: 68956, diff: 0, note: 'Lịch sử CRM từ chi tiết đơn hàng' },
  { metric: 'card_review_needed', value: 88, expected: 0, diff: 88, note: 'Thẻ cần rà tay trước go-live' },
  { metric: 'active_expired_cards', value: 84, expected: 0, diff: 84, note: 'Thẻ active nhưng đã hết hạn' },
  { metric: 'overused_cards', value: 4, expected: 0, diff: 4, note: 'Thẻ dùng vượt số buổi' },
]

const DEFAULT_READINESS_STATUS = {
  core_status: 'core_locked',
  card_review_needed: 88,
  active_expired_cards: 84,
  overused_cards: 4,
}

function num(v) {
  return Number(v || 0)
}

function fmtNumber(v) {
  return new Intl.NumberFormat('vi-VN').format(num(v))
}

function shortDate(s) {
  if (!s) return '-'
  const [y, m, d] = String(s).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function Card({ children, style, ...props }) {
  return (
    <div {...props} style={{
      background: C.surface2,
      border: `1px solid ${C.line}`,
      borderRadius: 8,
      boxShadow: C.shadowSm,
      ...style,
    }}>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = status === 'dang_lam'
    ? { bg: 'rgba(45,122,79,.1)', color: C.thu }
    : status === 'nghi_viec'
      ? { bg: 'rgba(192,57,43,.08)', color: C.chi }
      : { bg: 'rgba(230,126,34,.1)', color: C.warn }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: 999,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function AdminDoiSoatDataPage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState([])
  const [staffAudit, setStaffAudit] = useState([])
  const [cardAudit, setCardAudit] = useState([])
  const [commissionLock, setCommissionLock] = useState([])
  const [commissionApply, setCommissionApply] = useState([])
  const [readiness, setReadiness] = useState(DEFAULT_READINESS)
  const [readinessStatus, setReadinessStatus] = useState(DEFAULT_READINESS_STATUS)
  const [samples, setSamples] = useState([])
  const [cardSamples, setCardSamples] = useState([])
  const [legacyServiceIssues, setLegacyServiceIssues] = useState([])
  const [legacyServices, setLegacyServices] = useState([])
  const [legacyServiceLoading, setLegacyServiceLoading] = useState(false)
  const [legacyServiceSearch, setLegacyServiceSearch] = useState('')
  const [legacyServiceKind, setLegacyServiceKind] = useState('dv')
  const [mappingBusy, setMappingBusy] = useState('')
  const [status, setStatus] = useState('nghi_viec')
  const [search, setSearch] = useState('')
  const [cardStatus, setCardStatus] = useState('active_but_expired')
  const [cardSearch, setCardSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError('')
      const [ov, st, ca, cl, ap, rd, rs] = await Promise.all([
        supabase.from('v_myspa_legacy_overview').select('*'),
        supabase.from('v_myspa_legacy_staff_audit').select('*').limit(80),
        supabase.from('v_myspa_legacy_card_audit').select('*'),
        supabase.from('v_myspa_commission_lock_summary').select('*'),
        supabase.from('v_myspa_commission_apply_summary').select('*'),
        supabase.from('v_hsms_parallel_readiness_summary').select('*'),
        supabase.from('v_hsms_parallel_readiness_status').select('*').maybeSingle(),
      ])
      if (!alive) return
      if (ov.error || st.error || ca.error || cl.error || ap.error || rd.error || rs.error) {
        setError(ov.error?.message || st.error?.message || ca.error?.message || cl.error?.message || ap.error?.message || rd.error?.message || rs.error?.message || 'Không tải được dữ liệu đối soát')
      } else {
        setOverview(ov.data || [])
        setStaffAudit(st.data || [])
        setCardAudit(ca.data || [])
        setCommissionLock(cl.data || [])
        setCommissionApply(ap.data || [])
        setReadiness(rd.data || [])
        setReadinessStatus(rs.data || null)
      }
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    loadLegacyServiceIssues()
  }, [])

  const loadLegacyServiceIssues = async () => {
    setLegacyServiceLoading(true)
    const lineRows = []
    let lineError = null
    for (let from = 0; from < 10000; from += 1000) {
      const res = await supabase
        .from('don_hang_chi_tiet')
        .select('id,meta,thanh_tien,tien_tour,tien_hoa_hong')
        .eq('loai_item', 'dich_vu')
        .is('dich_vu_id', null)
        .range(from, from + 999)
      if (res.error) {
        lineError = res.error
        break
      }
      lineRows.push(...(res.data || []))
      if (!res.data || res.data.length < 1000) break
    }

    const servicesRes = await supabase
      .from('dich_vu')
      .select('id,ma_dv,ten,danh_muc,is_active,hien_tren_menu')
      .order('ten', { ascending: true })
    if (lineError || servicesRes.error) {
      setLegacyServiceIssues([])
      setLegacyServices([])
      setLegacyServiceLoading(false)
      return
    }

    const services = servicesRes.data || []
    const byName = {}
    services.forEach(s => {
      const key = normText(s.ten)
      if (!byName[key]) byName[key] = []
      byName[key].push(s)
    })

    const groups = {}
    lineRows.forEach(line => {
      const meta = line.meta || {}
      const code = meta.myspaItemCode || '-'
      const name = meta.tenDichVu || '-'
      const kind = code.startsWith('SP-') ? 'sp' : code.startsWith('THE-') ? 'the' : 'dv'
      const key = `${kind}|${code}|${name}`
      if (!groups[key]) {
        groups[key] = {
          key,
          kind,
          code,
          name,
          count: 0,
          amount: 0,
          tour: 0,
          lineIds: [],
          candidates: [],
          selectedServiceId: '',
        }
      }
      groups[key].count += 1
      groups[key].amount += Number(line.thanh_tien || 0)
      groups[key].tour += Number(line.tien_tour || 0)
      groups[key].lineIds.push(line.id)
    })

    const rows = Object.values(groups).map(row => {
      if (row.kind !== 'dv') return row
      let candidates = byName[normText(row.name)] || []
      if (!candidates.length) {
        candidates = services
          .map(s => ({ ...s, score: similarity(row.name, s.ten) }))
          .filter(s => s.score >= 0.55)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      } else {
        candidates = candidates.slice(0, 5).map(s => ({ ...s, score: 1 }))
      }
      return {
        ...row,
        candidates,
        selectedServiceId: candidates[0]?.id || '',
      }
    }).sort((a, b) => b.count - a.count)

    setLegacyServices(services)
    setLegacyServiceIssues(rows)
    setLegacyServiceLoading(false)
  }

  const updateLegacyIssueChoice = (key, serviceId) => {
    setLegacyServiceIssues(prev => prev.map(row => row.key === key ? { ...row, selectedServiceId: serviceId } : row))
  }

  const applyLegacyServiceMapping = async (row) => {
    if (!row.selectedServiceId || !row.lineIds?.length) return
    const service = legacyServices.find(s => s.id === row.selectedServiceId)
    const ok = window.confirm(`Gắn ${row.count} dòng "${row.code} - ${row.name}" vào dịch vụ "${service?.ma_dv || ''} ${service?.ten || ''}"?`)
    if (!ok) return
    setMappingBusy(row.key)
    try {
      for (let i = 0; i < row.lineIds.length; i += 200) {
        const ids = row.lineIds.slice(i, i + 200)
        const { error } = await supabase
          .from('don_hang_chi_tiet')
          .update({ dich_vu_id: row.selectedServiceId })
          .in('id', ids)
        if (error) throw error
      }
      await loadLegacyServiceIssues()
    } catch (e) {
      alert(e.message || 'Không gắn được dịch vụ cũ.')
    } finally {
      setMappingBusy('')
    }
  }

  useEffect(() => {
    let alive = true
    async function loadSamples() {
      let q = supabase
        .from('v_myspa_legacy_staff_samples')
        .select('*')
        .eq('staff_status', status)
        .order('ngay', { ascending: false })
        .limit(80)

      const term = search.trim()
      if (term) {
        q = q.or(`staff_display.ilike.%${term}%,ten_khach_hang.ilike.%${term}%,so_dien_thoai.ilike.%${term}%,ma_don.ilike.%${term}%,ten_dich_vu.ilike.%${term}%`)
      }
      const res = await q
      if (!alive) return
      setSamples(res.data || [])
    }
    loadSamples()
    return () => { alive = false }
  }, [status, search])

  useEffect(() => {
    let alive = true
    async function loadCardSamples() {
      let q = supabase
        .from('v_myspa_legacy_card_samples')
        .select('*')
        .eq('audit_status', cardStatus)
        .order('ngay_het_han', { ascending: true, nullsFirst: false })
        .limit(120)

      const term = cardSearch.trim()
      if (term) {
        q = q.or(`ten_khach_hang.ilike.%${term}%,so_dien_thoai.ilike.%${term}%,ma_the.ilike.%${term}%,ten_dich_vu.ilike.%${term}%`)
      }
      const res = await q
      if (!alive) return
      setCardSamples(res.data || [])
    }
    loadCardSamples()
    return () => { alive = false }
  }, [cardStatus, cardSearch])

  const metricMap = useMemo(() => {
    const map = {}
    overview.forEach(r => { map[r.metric] = r })
    return map
  }, [overview])

  const commissionLockMap = useMemo(() => {
    const map = {}
    commissionLock.forEach(r => { map[r.metric] = r })
    return map
  }, [commissionLock])

  const commissionApplyMap = useMemo(() => {
    const map = {}
    commissionApply.forEach(r => { map[r.metric] = r })
    return map
  }, [commissionApply])

  const cardsNeedingReview = cardAudit
    .filter(r => r.audit_status !== 'ok')
    .reduce((s, r) => s + num(r.so_the), 0)

  const metricKeys = [
    'old_orders',
    'old_lines',
    'synced_staff_lines',
    'matched_active_staff',
    'legacy_resigned_staff',
    'missing_staff_name',
    'old_orders_without_payment_rows',
    'old_orders_without_pos_revenue',
  ]

  const readinessCore = readiness.filter(r => ['customers_locked', 'orders_locked', 'order_lines_locked', 'cards_locked', 'commission_diff', 'crm_history_rows'].includes(r.metric))
  const readinessIssues = readiness.filter(r => ['card_review_needed', 'active_expired_cards', 'overused_cards'].includes(r.metric))
  const filteredLegacyIssues = legacyServiceIssues.filter(row => {
    if (legacyServiceKind !== 'all' && row.kind !== legacyServiceKind) return false
    const term = normText(legacyServiceSearch)
    if (!term) return true
    return normText(`${row.code} ${row.name}`).includes(term)
  })
  const legacyTotals = legacyServiceIssues.reduce((acc, row) => {
    acc.lines += row.count
    acc.amount += row.amount
    acc.tour += row.tour
    if (row.candidates?.length) acc.withCandidate += 1
    acc[row.kind] = (acc[row.kind] || 0) + row.count
    return acc
  }, { lines: 0, amount: 0, tour: 0, withCandidate: 0, dv: 0, sp: 0, the: 0 })

  return (
    <div style={{ paddingBottom: 32 }}>
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Đối Soát Dữ Liệu Cũ</div>
          <div className="sub">Nguồn myspa đến 30/04/2026 · chỉ chuẩn hóa vận hành, không ghi vào Sổ Thu Chi</div>
        </div>
        <div className="acts">
          <button className="btn" onClick={() => { window.location.href = '/pos/danh-sach' }}>Danh sách POS</button>
          <button className="btn primary" onClick={() => { window.location.href = '/admin/crm' }}>CRM khách hàng</button>
        </div>
      </div>

      {error && (
        <Card style={{ padding: 14, marginBottom: 14, borderColor: 'rgba(192,57,43,.25)', color: C.chi }}>
          {error}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
        {metricKeys.map(key => {
          const data = metricMap[key] || {}
          const meta = METRIC_LABELS[key]
          const isMoneyMetric = key.includes('revenue') || key.includes('payment')
          return (
            <Card key={key} style={{ padding: 14, minHeight: 96 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {meta.title}
              </div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: C.ink, fontFamily: FONT.serif }}>
                {loading ? '...' : fmtNumber(data.value)}
              </div>
              <div style={{ marginTop: 3, fontSize: 11, color: C.ink3 }}>{meta.note}</div>
              {data.amount !== null && data.amount !== undefined && (
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: isMoneyMetric ? C.warn : C.primary }}>
                  {formatCurrency(num(data.amount))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Card style={{ padding: 16, marginBottom: 14, borderColor: 'rgba(201,169,110,.28)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.ink, fontFamily: FONT.serif }}>
              Commission MySpa Đã Khóa Đến 30/04/2026
            </div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              Dữ liệu tour/hoa hồng đã đối soát theo file chi tiết nhân viên và ghi vào ledger nhân sự, không đụng Sổ Thu Chi.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.ink3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tổng thu nhập MySpa</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.primary, fontFamily: FONT.serif }}>
              {formatCurrency(num(commissionLockMap.commission_rows?.amount))}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
          {[
            { label: 'Dòng commission', value: fmtNumber(commissionLockMap.commission_rows?.value), amount: commissionLockMap.commission_rows?.amount, color: C.primary },
            { label: 'Khớp đơn hàng', value: fmtNumber(commissionLockMap.matched_orders?.value), amount: commissionLockMap.unmatched_orders?.amount, color: C.thu },
            { label: 'Khớp nhân viên', value: fmtNumber(commissionLockMap.matched_staff?.value), amount: commissionLockMap.unmatched_staff?.amount, color: C.thu },
            { label: 'Tiền Tour', value: fmtNumber(commissionApplyMap.applied_tour?.value), amount: commissionApplyMap.applied_tour?.amount, color: C.thu },
            { label: 'Hoa hồng', value: fmtNumber(commissionApplyMap.applied_commission?.value), amount: commissionApplyMap.applied_commission?.amount, color: C.warn },
          ].map(item => (
            <div key={item.label} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, background: C.bg }}>
              <div style={{ fontSize: 11, color: C.ink3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
              <div style={{ marginTop: 6, fontSize: 20, color: C.ink, fontWeight: 900, fontFamily: FONT.serif }}>{loading ? '...' : item.value}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: item.color, fontWeight: 800 }}>
                {formatCurrency(num(item.amount))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.ink3 }}>
          Backup ledger cũ: {fmtNumber(commissionApplyMap.backup_rows?.value)} dòng · {formatCurrency(num(commissionApplyMap.backup_rows?.amount))}
        </div>
      </Card>

      <Card style={{ padding: 16, marginBottom: 14, borderColor: readinessStatus?.core_status === 'core_locked' ? 'rgba(45,122,79,.28)' : 'rgba(192,57,43,.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.ink, fontFamily: FONT.serif }}>
              Sẵn Sàng Chạy Song Song MySpa / HSMS
            </div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              Các trục dữ liệu lõi đã khóa đến 30/04/2026; nhóm thẻ cần rà là nghiệp vụ kiểm tra tay trước go-live.
            </div>
          </div>
          <div style={{
            padding: '8px 12px',
            borderRadius: 999,
            background: readinessStatus?.core_status === 'core_locked' ? 'rgba(45,122,79,.1)' : 'rgba(192,57,43,.1)',
            color: readinessStatus?.core_status === 'core_locked' ? C.thu : C.chi,
            fontSize: 12,
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}>
            {readinessStatus?.core_status === 'core_locked' ? 'Dữ liệu lõi đã khóa' : 'Còn lệch dữ liệu lõi'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
          {readinessCore.map(row => {
            const ok = num(row.diff) === 0
            const meta = READY_LABELS[row.metric] || { title: row.metric }
            return (
              <div key={row.metric} style={{ border: `1px solid ${ok ? 'rgba(45,122,79,.2)' : 'rgba(192,57,43,.25)'}`, borderRadius: 8, padding: 10, background: ok ? 'rgba(45,122,79,.045)' : 'rgba(192,57,43,.045)' }}>
                <div style={{ fontSize: 10.5, color: C.ink3, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.05em' }}>{meta.title}</div>
                <div style={{ marginTop: 5, fontSize: 18, color: C.ink, fontWeight: 900, fontFamily: FONT.serif }}>{fmtNumber(row.value)}</div>
                <div style={{ marginTop: 3, fontSize: 11, color: ok ? C.thu : C.chi, fontWeight: 800 }}>
                  {ok ? meta.good : `Lệch ${fmtNumber(row.diff)}`}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {readinessIssues.map(row => {
            const meta = READY_LABELS[row.metric] || { title: row.metric }
            const hasIssue = num(row.value) > 0
            return (
              <button
                key={row.metric}
                onClick={() => {
                  if (row.metric === 'active_expired_cards') setCardStatus('active_but_expired')
                  if (row.metric === 'overused_cards') setCardStatus('used_more_than_total')
                  document.getElementById('legacy-card-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                style={{
                  border: `1px solid ${hasIssue ? 'rgba(230,126,34,.25)' : 'rgba(45,122,79,.2)'}`,
                  borderRadius: 8,
                  padding: 10,
                  background: hasIssue ? 'rgba(230,126,34,.06)' : 'rgba(45,122,79,.045)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: FONT.sans,
                }}
              >
                <div style={{ fontSize: 10.5, color: C.ink3, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.05em' }}>{meta.title}</div>
                <div style={{ marginTop: 5, fontSize: 18, color: hasIssue ? C.warn : C.thu, fontWeight: 900, fontFamily: FONT.serif }}>{fmtNumber(row.value)}</div>
                <div style={{ marginTop: 3, fontSize: 11, color: C.ink3, fontWeight: 700 }}>{row.note}</div>
              </button>
            )
          })}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr .75fr', gap: 14, marginBottom: 14 }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontFamily: FONT.serif }}>Nhân Viên Từ Myspa</div>
              <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Tên nhân viên cũ được giữ để tra cứu lịch sử khách hàng</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.keys(STATUS_LABELS).map(k => (
                <button
                  key={k}
                  onClick={() => setStatus(k)}
                  style={{
                    border: status === k ? 'none' : `1px solid ${C.line2}`,
                    background: status === k ? C.grad : C.surface2,
                    color: status === k ? '#2a1d14' : C.ink2,
                    borderRadius: 999,
                    padding: '7px 11px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: FONT.sans,
                  }}
                >
                  {STATUS_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 12, borderBottom: `1px solid ${C.line}` }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên nhân viên, khách hàng, SĐT, mã đơn, dịch vụ..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: `1px solid ${C.line2}`,
                borderRadius: 8,
                padding: '9px 12px',
                outline: 'none',
                fontSize: 13,
                fontFamily: FONT.sans,
              }}
            />
          </div>

          <div style={{ maxHeight: 460, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <Th>Ngày</Th>
                  <Th>Đơn hàng</Th>
                  <Th>Khách hàng</Th>
                  <Th>Dịch vụ</Th>
                  <Th>Nhân viên</Th>
                  <Th align="right">Tour/HH</Th>
                </tr>
              </thead>
              <tbody>
                {samples.map((r, idx) => (
                  <tr key={`${r.ma_don}-${r.line_no}-${idx}`}>
                    <Td>{shortDate(r.ngay)}</Td>
                    <Td>
                      <span style={{ fontWeight: 700, color: C.ink }}>{r.ma_don}</span>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 700, color: C.ink }}>{r.ten_khach_hang || 'Khách lẻ'}</div>
                      <div style={{ fontSize: 11, color: C.ink3 }}>{r.so_dien_thoai || '-'}</div>
                    </Td>
                    <Td>
                      <div style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.ten_dich_vu || '-'}</div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <span style={{ fontWeight: 700 }}>{r.staff_display || 'Chưa có tên'}</span>
                        <StatusBadge status={r.staff_status} />
                      </div>
                    </Td>
                    <Td align="right" style={{ fontWeight: 800, color: C.primary }}>
                      {formatCurrency(num(r.commission_amount))}
                    </Td>
                  </tr>
                ))}
                {!samples.length && (
                  <tr>
                    <Td colSpan={6}>
                      <div style={{ padding: 24, textAlign: 'center', color: C.ink3 }}>Không có dữ liệu phù hợp</div>
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontFamily: FONT.serif }}>Tổng Hợp Theo Nhân Viên</div>
            <div style={{ marginTop: 10, maxHeight: 260, overflow: 'auto' }}>
              {staffAudit.slice(0, 18).map((row, idx) => (
                <div key={`${row.staff_status}-${row.staff_display}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '9px 0', borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.staff_display}</div>
                    <div style={{ marginTop: 3 }}><StatusBadge status={row.staff_status} /></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>{formatCurrency(num(row.tong_tien))}</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{fmtNumber(row.so_dong)} dòng</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontFamily: FONT.serif }}>Thẻ Liệu Trình Cần Rà</div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Không tự đổi trạng thái, chỉ đưa vào danh sách kiểm tra</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: cardsNeedingReview ? C.chi : C.thu, fontFamily: FONT.serif }}>
                {fmtNumber(cardsNeedingReview)}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {cardAudit.map(row => (
                <button
                  key={row.audit_status}
                  onClick={() => setCardStatus(row.audit_status)}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 10,
                    padding: '8px 0',
                    border: 'none',
                    borderBottom: `1px solid ${C.line}`,
                    background: cardStatus === row.audit_status ? 'rgba(201,169,110,.08)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: FONT.sans,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: row.audit_status === 'ok' ? C.thu : C.warn }}>
                      {CARD_STATUS[row.audit_status] || row.audit_status}
                    </div>
                    <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
                      {fmtNumber(row.buoi_da_dung)} / {fmtNumber(row.buoi_tong)} buổi
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{fmtNumber(row.so_the)} thẻ</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{formatCurrency(num(row.gia_tri))}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card id="legacy-service-map" style={{ overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontFamily: FONT.serif }}>
              Dịch Vụ Cũ Chưa Khớp
            </div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              Mã MySpa cũ còn nằm trong lịch sử POS/CRM. Chỉ gắn mã khi chắc chắn đúng dịch vụ, không đổi doanh thu hay tiền tour.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" onClick={loadLegacyServiceIssues} disabled={legacyServiceLoading}>
              {legacyServiceLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
            <button className="btn primary" onClick={() => { window.location.href = '/admin/dich-vu' }}>Danh mục dịch vụ</button>
          </div>
        </div>

        <div style={{ padding: 12, borderBottom: `1px solid ${C.line}`, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          {[
            { label: 'Dòng chưa khớp', value: fmtNumber(legacyTotals.lines), note: `${fmtNumber(legacyServiceIssues.length)} nhóm mã`, color: C.warn },
            { label: 'Có gợi ý khớp', value: fmtNumber(legacyTotals.withCandidate), note: 'nhóm có thể rà nhanh', color: C.thu },
            { label: 'Mã dịch vụ DV', value: fmtNumber(legacyTotals.dv), note: 'ưu tiên xử lý trước', color: C.primary },
            { label: 'Mã sản phẩm SP', value: fmtNumber(legacyTotals.sp), note: 'đưa qua Kho/Sản phẩm', color: C.taiSan },
          ].map(item => (
            <div key={item.label} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, background: C.bg }}>
              <div style={{ fontSize: 10.5, color: C.ink3, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
              <div style={{ marginTop: 5, fontSize: 20, color: item.color, fontWeight: 900, fontFamily: FONT.serif }}>{item.value}</div>
              <div style={{ marginTop: 3, fontSize: 11, color: C.ink3, fontWeight: 700 }}>{item.note}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: 12, borderBottom: `1px solid ${C.line}`, display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10 }}>
          <input
            value={legacyServiceSearch}
            onChange={e => setLegacyServiceSearch(e.target.value)}
            placeholder="Tìm mã MySpa hoặc tên dịch vụ cũ..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${C.line2}`,
              borderRadius: 8,
              padding: '9px 12px',
              outline: 'none',
              fontSize: 13,
              fontFamily: FONT.sans,
            }}
          />
          <select
            value={legacyServiceKind}
            onChange={e => setLegacyServiceKind(e.target.value)}
            style={{
              border: `1px solid ${C.line2}`,
              borderRadius: 8,
              padding: '0 10px',
              background: C.surface2,
              color: C.ink,
              fontWeight: 700,
              fontFamily: FONT.sans,
            }}
          >
            <option value="dv">Chỉ mã DV</option>
            <option value="sp">Chỉ mã SP</option>
            <option value="the">Thẻ/khác</option>
            <option value="all">Tất cả</option>
          </select>
        </div>

        <div style={{ maxHeight: 520, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                <Th>Mã MySpa</Th>
                <Th>Dịch vụ cũ</Th>
                <Th align="right">Dòng</Th>
                <Th align="right">Doanh số</Th>
                <Th align="right">Tour/HH</Th>
                <Th>Gợi ý gắn vào HSMS</Th>
                <Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {filteredLegacyIssues.slice(0, 120).map(row => (
                <tr key={row.key}>
                  <Td>
                    <div style={{ fontWeight: 900, color: row.kind === 'sp' ? C.taiSan : row.kind === 'the' ? C.warn : C.primary }}>{row.code}</div>
                    <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
                      {row.kind === 'sp' ? 'Sản phẩm cũ' : row.kind === 'the' ? 'Thẻ/khác' : 'Dịch vụ'}
                    </div>
                  </Td>
                  <Td>
                    <div style={{ fontWeight: 750, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                  </Td>
                  <Td align="right" style={{ fontWeight: 900 }}>{fmtNumber(row.count)}</Td>
                  <Td align="right" style={{ fontWeight: 800, color: C.primary }}>{formatCurrency(num(row.amount))}</Td>
                  <Td align="right" style={{ fontWeight: 800, color: C.warn }}>{formatCurrency(num(row.tour))}</Td>
                  <Td>
                    {row.kind === 'dv' ? (
                      <select
                        value={row.selectedServiceId}
                        onChange={e => updateLegacyIssueChoice(row.key, e.target.value)}
                        style={{
                          width: '100%',
                          border: `1px solid ${C.line2}`,
                          borderRadius: 8,
                          padding: '7px 9px',
                          background: C.surface2,
                          color: C.ink,
                          fontSize: 12,
                          fontFamily: FONT.sans,
                        }}
                      >
                        <option value="">Chưa chọn dịch vụ</option>
                        {row.candidates.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.ma_dv} · {s.ten} {s.score ? `(${Math.round(s.score * 100)}%)` : ''}
                          </option>
                        ))}
                        <option value="" disabled>──────────</option>
                        {legacyServices.map(s => (
                          <option key={`all-${s.id}`} value={s.id}>{s.ma_dv} · {s.ten}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: C.ink3, fontSize: 12 }}>
                        {row.kind === 'sp' ? 'Cần module Sản phẩm/Kho để gắn đúng.' : 'Không tự gắn vào dịch vụ.'}
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    <button
                      className="btn"
                      disabled={row.kind !== 'dv' || !row.selectedServiceId || mappingBusy === row.key}
                      onClick={() => applyLegacyServiceMapping(row)}
                      style={{ padding: '7px 10px', fontSize: 12 }}
                    >
                      {mappingBusy === row.key ? 'Đang gắn...' : 'Gắn'}
                    </button>
                  </Td>
                </tr>
              ))}
              {!filteredLegacyIssues.length && (
                <tr>
                  <Td colSpan={7}>
                    <div style={{ padding: 24, textAlign: 'center', color: C.ink3 }}>
                      Không còn nhóm mã phù hợp bộ lọc.
                    </div>
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredLegacyIssues.length > 120 && (
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.ink3, fontWeight: 700 }}>
            Đang hiển thị 120 nhóm đầu tiên theo số dòng nhiều nhất. Dùng ô tìm kiếm để rà nhóm nhỏ hơn.
          </div>
        )}
      </Card>

      <Card id="legacy-card-review" style={{ overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontFamily: FONT.serif }}>
              Chi Tiết Thẻ Cần Rà
            </div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {CARD_STATUS[cardStatus] || cardStatus} · {CARD_ACTION[cardStatus] || ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={cardSearch}
              onChange={e => setCardSearch(e.target.value)}
              placeholder="Tìm khách, SĐT, mã thẻ, tên thẻ..."
              style={{
                width: 320,
                border: `1px solid ${C.line2}`,
                borderRadius: 8,
                padding: '8px 11px',
                outline: 'none',
                fontSize: 13,
                fontFamily: FONT.sans,
              }}
            />
            <button className="btn" onClick={() => setCardSearch('')}>Xóa lọc</button>
          </div>
        </div>
        <div style={{ maxHeight: 430, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                <Th>Khách hàng</Th>
                <Th>Mã thẻ</Th>
                <Th>Thẻ/Dịch vụ</Th>
                <Th align="right">Buổi</Th>
                <Th>Ngày mua</Th>
                <Th>Hết hạn</Th>
                <Th>Trạng thái</Th>
                <Th align="right">Giá trị</Th>
                <Th>CRM</Th>
              </tr>
            </thead>
            <tbody>
              {cardSamples.map(card => {
                const issueColor = card.audit_status === 'used_more_than_total' ? C.chi : card.audit_status === 'ok' ? C.thu : C.warn
                return (
                  <tr key={card.id}>
                    <Td>
                      <div style={{ fontWeight: 800, color: C.ink }}>{card.ten_khach_hang || 'Khách lẻ'}</div>
                      <div style={{ fontSize: 11, color: C.ink3 }}>{card.so_dien_thoai || '-'}</div>
                    </Td>
                    <Td>
                      <span style={{ fontWeight: 800, color: C.ink }}>{card.ma_the || '-'}</span>
                      {card.loai_the === 'combo_lieu_trinh' && (
                        <div style={{ fontSize: 10.5, color: C.primary, fontWeight: 700, marginTop: 3 }}>Combo</div>
                      )}
                    </Td>
                    <Td>
                      <div style={{ maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700, color: C.ink }}>
                        {card.ten_dich_vu || '-'}
                      </div>
                      {card.ghi_chu && <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{card.ghi_chu}</div>}
                    </Td>
                    <Td align="right">
                      <div style={{ fontWeight: 900, color: issueColor }}>
                        {fmtNumber(card.so_buoi_da_dung)} / {fmtNumber(card.so_buoi_tong)}
                      </div>
                      <div style={{ fontSize: 11, color: C.ink3 }}>
                        Còn {fmtNumber(card.so_buoi_con_lai)}
                      </div>
                    </Td>
                    <Td>{shortDate(card.ngay_mua)}</Td>
                    <Td>
                      <span style={{ fontWeight: card.audit_status === 'active_but_expired' ? 800 : 500, color: card.audit_status === 'active_but_expired' ? C.chi : C.ink2 }}>
                        {shortDate(card.ngay_het_han)}
                      </span>
                    </Td>
                    <Td>
                      <span style={{
                        display: 'inline-flex',
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: card.trang_thai === 'active' ? 'rgba(45,122,79,.1)' : 'rgba(160,113,79,.1)',
                        color: card.trang_thai === 'active' ? C.thu : C.primary,
                        fontSize: 11,
                        fontWeight: 800,
                      }}>
                        {card.trang_thai || '-'}
                      </span>
                    </Td>
                    <Td align="right" style={{ fontWeight: 800, color: C.primary }}>
                      {formatCurrency(num(card.gia_tri_the))}
                    </Td>
                    <Td>
                      {card.khach_hang_id ? (
                        <button
                          className="btn"
                          onClick={() => { window.location.href = `/admin/crm/khach-hang/${card.khach_hang_id}` }}
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                          Mở CRM
                        </button>
                      ) : '-'}
                    </Td>
                  </tr>
                )
              })}
              {!cardSamples.length && (
                <tr>
                  <Td colSpan={9}>
                    <div style={{ padding: 24, textAlign: 'center', color: C.ink3 }}>Không có thẻ phù hợp bộ lọc</div>
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card style={{ padding: 16, background: '#fffaf3' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 8 }}>Nguyên tắc an toàn dữ liệu</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, color: C.ink2, fontSize: 13, lineHeight: 1.55 }}>
          <div>Sổ Thu Chi hiện tại vẫn là số đã chốt tay từ báo cáo myspa, không cộng lại doanh thu theo từng đơn cũ.</div>
          <div>Dữ liệu cũ dùng cho CRM, thẻ liệu trình, lịch sử dịch vụ và truy vết nhân viên đã làm cho khách.</div>
          <div>Khi HSMS POS go-live, dữ liệu mới sẽ tự nối tiếp vào doanh thu, tour, hoa hồng và CRM theo luồng chuẩn.</div>
        </div>
      </Card>
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{
      padding: '10px 12px',
      textAlign: align,
      fontSize: 10,
      fontWeight: 800,
      color: C.ink3,
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      borderBottom: `1px solid ${C.line}`,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  )
}

function Td({ children, align = 'left', colSpan }) {
  return (
    <td colSpan={colSpan} style={{
      padding: '10px 12px',
      textAlign: align,
      fontSize: 12.5,
      color: C.ink2,
      borderBottom: `1px solid ${C.borderLight}`,
      verticalAlign: 'middle',
    }}>
      {children}
    </td>
  )
}
