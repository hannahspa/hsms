import { useEffect, useMemo, useState } from 'react'
import AdminChamSocKhachPage from '../cham-soc-khach/AdminChamSocKhachPage'
import { C, FONT } from '../../../constants/colors'
import { supabase } from '../../../lib/supabase'
import { notify } from '../../../components/ui/notify'

const MARKETING_ROUTES = [
  {
    key: 'overview',
    path: '/admin/marketing',
    title: 'Tổng Quan Marketing',
    short: 'Tổng Quan',
    subtitle: 'Bức tranh vận hành khách hàng: từ tin nhắn, đặt hẹn, khách đến spa đến chăm sóc lại.',
    owner: 'Chủ / quản lý',
    status: 'Đang xây nền',
    accent: C.gold,
    metrics: ['Tin nhắn mới', 'Khách cần xử lý', 'Tỷ lệ đặt hẹn'],
  },
  {
    key: 'inbox',
    path: '/admin/marketing/hop-thu',
    title: 'Hộp Thư Khách Hàng',
    short: 'Hộp Thư',
    subtitle: 'Nơi lễ tân nhắn khách, xem lịch sử hội thoại, HSMS tự nhận diện hồ sơ và gợi ý tư vấn.',
    owner: 'Lễ tân / quản lý',
    status: 'Ưu tiên cao',
    accent: '#1A5276',
    metrics: ['Realtime Facebook', 'Gợi ý trả lời', 'Gắn hồ sơ HSMS'],
  },
  {
    key: 'fanpage',
    path: '/admin/marketing/fanpage-noi-dung',
    title: 'Fanpage & Nội Dung',
    short: 'Fanpage',
    subtitle: 'Theo dõi sức khoẻ Fanpage, bài viết hiệu quả, lịch đăng bài và chủ đề nên triển khai.',
    owner: 'Chủ / marketing',
    status: 'Kế tiếp',
    accent: C.rose,
    metrics: ['Bài viết tốt', 'Lịch đăng', 'Chủ đề nên làm'],
  },
  {
    key: 'prospects',
    path: '/admin/marketing/khach-tiem-nang',
    title: 'Khách Hàng Tiềm Năng',
    short: 'Tiềm Năng',
    subtitle: 'Phân loại khách inbox, khách có số điện thoại, khách nóng, khách cần quản lý xem trước.',
    owner: 'Lễ tân / quản lý',
    status: 'Đang nối dữ liệu',
    accent: '#8A6A6E',
    metrics: ['Khách nóng', 'Cần xin SĐT', 'Có thể chốt lịch'],
  },
  {
    key: 'aftercare',
    path: '/admin/marketing/cham-soc-sau-dich-vu',
    title: 'Chăm Sóc Sau Dịch Vụ',
    short: 'Sau Dịch Vụ',
    subtitle: 'Ghi nhận khách đã đến hôm nay, phản hồi dịch vụ, KTV thực hiện và việc cần chăm lại.',
    owner: 'Lễ tân',
    status: 'Sắp triển khai',
    accent: C.sage,
    metrics: ['Khách đã đến', 'Phản hồi', 'Cần gọi lại'],
  },
  {
    key: 'reminders',
    path: '/admin/marketing/nhac-lich-lieu-trinh',
    title: 'Nhắc Lịch Liệu Trình',
    short: 'Nhắc Lịch',
    subtitle: 'Nhắc khách da, triệt lông, thẻ còn buổi, khách lâu không đến và khách cần tái đặt lịch.',
    owner: 'Lễ tân / quản lý',
    status: 'Sắp triển khai',
    accent: '#6C3483',
    metrics: ['Còn buổi', 'Đến chu kỳ', 'Quá hạn'],
  },
  {
    key: 'campaigns',
    path: '/admin/marketing/chien-dich',
    title: 'Chiến Dịch & Remarketing',
    short: 'Chiến Dịch',
    subtitle: 'Quản lý chiến dịch quảng cáo, tệp khách chăm lại, chi phí, doanh thu và hiệu quả.',
    owner: 'Chủ / marketing',
    status: 'Có dữ liệu cũ',
    accent: C.warn,
    metrics: ['Chi phí', 'Khách quay lại', 'Doanh thu'],
  },
  {
    key: 'staff',
    path: '/admin/marketing/bao-cao-nhan-vien',
    title: 'Báo Cáo Nhân Viên',
    short: 'Nhân Viên',
    subtitle: 'Nhân viên đã tư vấn khách nào, kết quả ra sao, phản hồi khách và việc còn bỏ sót.',
    owner: 'Chủ / quản lý',
    status: 'Sắp triển khai',
    accent: '#2D7A4F',
    metrics: ['Đã tư vấn', 'Đã hẹn', 'Bỏ sót'],
  },
  {
    key: 'settings',
    path: '/admin/marketing/cau-hinh-kenh',
    title: 'Cấu Hình Kênh',
    short: 'Cấu Hình',
    subtitle: 'Kết nối Facebook, Zalo, hotline, webhook, phân quyền gửi tin và giới hạn lưu trữ dữ liệu.',
    owner: 'Chủ / kỹ thuật',
    status: 'Cần bảo mật',
    accent: C.primary,
    metrics: ['Facebook', 'Zalo', 'Webhook'],
  },
]

const WORKFLOW = [
  'Tin nhắn mới được đưa vào Hộp Thư Khách Hàng.',
  'HSMS tự tìm số điện thoại, ghép hồ sơ khách, thẻ liệu trình và lịch sử mua.',
  'Hệ thống đưa ra việc cần làm: xin SĐT, chốt lịch, quản lý đọc trước hoặc chăm lại.',
  'Lễ tân nhắn ngay trong HSMS, kết quả được ghi vào báo cáo nhân viên.',
  'Sau khi khách đến spa, hệ thống tạo lịch chăm sóc lại và gợi ý bán thêm phù hợp.',
]

const CONTENT_THEMES = [
  { theme: 'Massage cổ vai gáy', angle: 'Đau mỏi do ngồi làm việc, cần thư giãn nhanh', format: 'Reel ngắn + ảnh feedback', priority: 'Cao' },
  { theme: 'Gội đầu dưỡng sinh', angle: 'Giảm stress, ngủ ngon, phù hợp khách văn phòng', format: 'Album quy trình 5 bước', priority: 'Cao' },
  { theme: 'Triệt lông', angle: 'Nhắc chu kỳ, khách còn buổi, ưu đãi gia hạn', format: 'Bài giải đáp thắc mắc', priority: 'Vừa' },
  { theme: 'Chăm sóc da', angle: 'Da xỉn màu, mụn ẩn, cần soi da trước khi tư vấn', format: 'Before/after có kiểm duyệt', priority: 'Vừa' },
]

const CHANNEL_CONFIG = [
  { name: 'Facebook Messenger', status: 'Đang dùng', purpose: 'Nhận inbox, gửi tin, phân loại khách, ghép HSMS', risk: 'Cần webhook realtime và lịch sử chat nhẹ' },
  { name: 'Facebook Comment', status: 'Đã có nền', purpose: 'Đọc bình luận, lọc khách hỏi giá/đặt lịch', risk: 'Cần quy tắc ẩn thông tin nhạy cảm' },
  { name: 'Zalo Hotline', status: 'Chưa nối sâu', purpose: 'Khách nhắn/gọi ngoài Fanpage, dùng để chăm lại', risk: 'Cần chọn cách tích hợp Zalo OA/ZNS hoặc nhập thủ công có cấu trúc' },
  { name: 'Điện thoại', status: 'Cần quy trình', purpose: 'Ghi cuộc gọi, kết quả tư vấn, lý do khách chưa đến', risk: 'Cần form ghi nhanh trong HSMS' },
]

const AUTOMATION_MODES = [
  { mode: 'triage_fanpage', label: 'Quét tin mới', cadence: 'Mỗi 2 phút', healthyMinutes: 8 },
  { mode: 'resolve_conversation_phones', label: 'Quét số điện thoại', cadence: 'Mỗi 15 phút', healthyMinutes: 35 },
  { mode: 'resolve_identities', label: 'Nối định danh', cadence: 'Mỗi giờ', healthyMinutes: 100 },
]

function fmtNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function fmtMoney(value) {
  return `${fmtNumber(value)}đ`
}

function fmtCompactMoney(value) {
  const n = Number(value || 0)
  if (n >= 1000000000) return `${(n / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`
  if (n >= 1000000) return `${Math.round(n / 1000000).toLocaleString('vi-VN')} triệu`
  return fmtMoney(n)
}

function fmtDate(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (!y || !m || !d) return raw
  return `${d}/${m}/${y}`
}

function fmtDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

function minutesSince(value) {
  if (!value) return null
  const diff = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(diff)) return null
  return Math.max(0, Math.round(diff / 60000))
}

function automationModeLabel(mode) {
  const labels = {
    triage_fanpage: 'Quét tin mới',
    resolve_conversation_phones: 'Quét số điện thoại',
    resolve_identities: 'Nối định danh',
  }
  return labels[mode] || mode || 'Tự động'
}

function channelLabel(value) {
  const labels = {
    facebook: 'Facebook',
    zalo: 'Zalo',
    tiktok: 'TikTok',
    google: 'Google',
    website: 'Website',
    in_an: 'In ấn',
    khac: 'Khác',
  }
  return labels[value] || value || 'Khác'
}

function statusLabel(value) {
  const labels = {
    draft: 'Nháp',
    active: 'Đang chạy',
    ended: 'Đã kết thúc',
    y_tuong: 'Ý tưởng',
    nhap: 'Nháp',
    cho_duyet: 'Chờ duyệt',
    da_duyet: 'Đã duyệt',
    da_dang: 'Đã đăng',
    that_bai: 'Thất bại',
    huy: 'Hủy',
  }
  return labels[value] || value || 'Chưa rõ'
}

function sumRows(rows, field) {
  return rows.reduce((total, row) => total + Number(row?.[field] || 0), 0)
}

function getRoute() {
  const path = window.location.pathname
  return MARKETING_ROUTES
    .filter(route => path === route.path || path.startsWith(`${route.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0] || MARKETING_ROUTES[0]
}

function go(path) {
  window.location.href = path
}

function useMarketingOpsData() {
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState({
    loading: true,
    error: '',
    fanpageOverview: [],
    posts: [],
    content: [],
    campaigns: [],
    campaignPerformance: [],
    reactivation: [],
    sourceQuality: [],
    segmentSummary: [],
    automationRuns: [],
  })

  useEffect(() => {
    let alive = true
    load()
    return () => { alive = false }

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: '' }))
      try {
        const [
          fanpageOverview,
          posts,
          content,
          campaigns,
          campaignPerformance,
          reactivation,
          sourceQuality,
          segmentSummary,
          automationRuns,
        ] = await Promise.all([
          supabase.from('v_marketing_fanpage_overview').select('*').limit(10),
          supabase.from('marketing_page_posts').select('*').order('created_time', { ascending: false }).limit(12),
          supabase.from('marketing_content_calendar').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('chien_dich_marketing').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('v_marketing_campaign_performance').select('*').order('ngay_bat_dau', { ascending: false }).limit(20),
          supabase.from('v_marketing_reactivation_customers').select('*').limit(120),
          supabase.from('v_marketing_source_quality').select('*').order('revenue', { ascending: false }).limit(20),
          supabase.from('v_marketing_fanpage_segment_summary').select('*').order('customers', { ascending: false }).limit(20),
          supabase.from('marketing_automation_runs')
            .select('id,mode,status,created_at,result_payload,error_message')
            .in('mode', ['triage_fanpage', 'resolve_conversation_phones', 'resolve_identities'])
            .order('created_at', { ascending: false })
            .limit(18),
        ])

        const responses = [fanpageOverview, posts, content, campaigns, campaignPerformance, reactivation, sourceQuality, segmentSummary, automationRuns]
        const failed = responses.find(res => res.error)
        if (failed?.error) throw failed.error
        if (!alive) return
        setState({
          loading: false,
          error: '',
          fanpageOverview: fanpageOverview.data || [],
          posts: posts.data || [],
          content: content.data || [],
          campaigns: campaigns.data || [],
          campaignPerformance: campaignPerformance.data || [],
          reactivation: reactivation.data || [],
          sourceQuality: sourceQuality.data || [],
          segmentSummary: segmentSummary.data || [],
          automationRuns: automationRuns.data || [],
        })
      } catch (error) {
        if (!alive) return
        setState(prev => ({ ...prev, loading: false, error: error.message || 'Không tải được dữ liệu Marketing.' }))
      }
    }
  }, [nonce])

  return { ...state, reload: () => setNonce(n => n + 1) }
}

function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${C.bg} 0%, #F6EFE6 100%)`,
      padding: '22px clamp(16px, 2vw, 28px) 36px',
      fontFamily: FONT.sans,
      color: C.text,
    }}>
      <style>{`
        @keyframes marketingRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .mkt-hover { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .mkt-hover:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(139,94,60,.13); border-color: rgba(201,169,110,.34); }
        .mkt-soft { animation: marketingRise .28s ease both; }
      `}</style>
      {children}
    </div>
  )
}

function MetricGrid({ items }) {
  return (
    <div className="mkt-soft" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
      {items.map(item => <KpiCard key={item.label} {...item} />)}
    </div>
  )
}

function Panel({ title, eyebrow, children, action }) {
  return (
    <div style={{
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      background: 'rgba(255,255,255,.82)',
      boxShadow: C.shadowSm,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          {eyebrow && <div style={{ fontSize: 10.5, fontWeight: 850, letterSpacing: '.14em', textTransform: 'uppercase', color: C.textMute }}>{eyebrow}</div>}
          <div style={{ marginTop: eyebrow ? 4 : 0, fontFamily: FONT.serif, fontSize: 22, fontWeight: 900, color: C.text }}>{title}</div>
        </div>
        {action}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

function StateNotice({ data }) {
  if (data.loading) {
    return <div style={noticeStyle(C.taiSan)}>Đang tải dữ liệu Marketing...</div>
  }
  if (data.error) {
    return <div style={noticeStyle(C.chi)}>{data.error}</div>
  }
  return null
}

function noticeStyle(color) {
  return {
    border: `1px solid ${color}22`,
    background: `${color}10`,
    color,
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 14,
    fontWeight: 800,
    fontSize: 13,
  }
}

function Header({ route }) {
  return (
    <div className="mkt-soft" style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      gap: 18,
      alignItems: 'end',
      marginBottom: 18,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: C.textSub }}>
          Marketing / {route.short}
        </div>
        <h1 style={{
          margin: '6px 0 8px',
          fontFamily: FONT.serif,
          fontSize: 'clamp(28px, 3vw, 42px)',
          lineHeight: 1,
          color: C.text,
        }}>
          {route.title}
        </h1>
        <div style={{ maxWidth: 820, color: C.textSub, fontSize: 15, lineHeight: 1.65 }}>
          {route.subtitle}
        </div>
      </div>
      <div style={{
        border: `1px solid ${C.border}`,
        background: 'rgba(255,255,255,.72)',
        borderRadius: 14,
        padding: '12px 14px',
        minWidth: 210,
        boxShadow: C.shadowSm,
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: C.textMute }}>
          Trạng thái
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: route.accent, boxShadow: `0 0 0 5px ${route.accent}18` }} />
          <strong style={{ fontSize: 14 }}>{route.status}</strong>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: C.textSub }}>{route.owner}</div>
        <a
          href="/admin/marketing/ban-cu"
          style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: C.primary, textDecoration: 'none', borderTop: `1px dashed ${C.border}`, paddingTop: 8 }}
        >
          ⚙️ Bản đầy đủ (sync Fanpage · chiến dịch · duyệt AI)
        </a>
      </div>
    </div>
  )
}

// Công cụ kỹ thuật Fanpage (đồng bộ/backfill/kết nối/phân loại tay) — đặt trong Cấu Hình Kênh.
// Vận hành thường ngày đã TỰ ĐỘNG qua webhook (tin mới) + worker cron (phân loại); các nút này chỉ chạy tay khi cần.
function FanpageActions({ reload = () => {} }) {
  const [running, setRunning] = useState('')
  const [showConnect, setShowConnect] = useState(false)
  const [connectForm, setConnectForm] = useState({ page_id: '', page_access_token: '' })
  const [connectErr, setConnectErr] = useState('')

  const syncFanpage = async () => {
    setRunning('sync')
    try {
      const { data: res, error } = await supabase.functions.invoke('marketing-meta-page-sync', { body: { source: 'manual' } })
      if (error) throw error
      notify(`Đã đồng bộ ${res?.synced || 0} Fanpage`, 'success')
      reload()
    } catch (e) {
      notify(`Lỗi đồng bộ Fanpage: ${e.message || e}`, 'error')
    } finally {
      setRunning('')
    }
  }

  const backfillFanpage = async () => {
    setRunning('backfill')
    try {
      const { data: res, error } = await supabase.functions.invoke('marketing-meta-page-sync', {
        body: {
          mode: 'backfill_facebook',
          source: 'manual',
          since_date: '2025-11-26',
          conversation_limit: 100,
          message_limit: 50,
          message_pages_per_conversation: 5,
          max_messages_per_conversation: 500,
          max_pages: 3,
          max_rows: 1000,
          post_limit: 100,
          post_pages: 3,
          post_page_limit: 50,
          comment_limit: 50,
          comment_pages_per_post: 2,
          comment_post_limit: 100,
          max_comment_rows: 1000,
        },
      })
      if (error) throw error
      const first = res?.results?.[0] || {}
      notify(`Đã backfill từ 26/11: ${first.posts || 0} bài, ${first.comments || 0} bình luận, ${first.messages || 0} tin nhắn`, 'success')
      reload()
    } catch (e) {
      notify(`Lỗi backfill Fanpage: ${e.message || e}`, 'error')
    } finally {
      setRunning('')
    }
  }

  const connectFanpage = async () => {
    if (!connectForm.page_id.trim()) return setConnectErr('Nhập Page ID')
    if (!connectForm.page_access_token.trim()) return setConnectErr('Nhập Page Access Token')
    setRunning('connect'); setConnectErr('')
    try {
      const { data: res, error } = await supabase.functions.invoke('marketing-meta-page-sync', {
        body: {
          mode: 'connect_page',
          page_id: connectForm.page_id.trim(),
          page_access_token: connectForm.page_access_token.trim(),
        },
      })
      if (error) throw error
      setShowConnect(false)
      setConnectForm({ page_id: '', page_access_token: '' })
      notify(`Đã kết nối ${res?.page?.name || 'Fanpage'}`, 'success')
      reload()
    } catch (e) {
      setConnectErr(e.message || String(e))
    } finally {
      setRunning('')
    }
  }

  const runPipeline = async () => {
    setRunning('pipeline')
    try {
      const steps = [
        { mode: 'triage_fanpage', message_limit: 25, comment_limit: 25, source: 'manual_ui' },
        { mode: 'resolve_conversation_phones', limit: 300, source: 'manual_ui' },
        { mode: 'resolve_identities', source: 'manual_ui' },
      ]
      for (const body of steps) {
        const { error } = await supabase.functions.invoke('marketing-ai', { body })
        if (error) throw error
      }
      notify('Đã chạy phân loại AI: phân nhóm khách, tìm SĐT, nối định danh HSMS', 'success')
      reload()
    } catch (e) {
      notify(`Lỗi phân loại AI: ${e.message || e}`, 'error')
    } finally {
      setRunning('')
    }
  }
  const busy = !!running
  const actionBtn = (extra = {}) => ({
    border: `1px solid ${C.border}`, background: '#FFF', color: C.text,
    borderRadius: 9, padding: '9px 14px', fontWeight: 800, fontSize: 13,
    cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, ...extra,
  })

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button disabled={busy} onClick={() => setShowConnect(v => !v)} style={actionBtn()}>Kết Nối Fanpage</button>
        <button disabled={busy} onClick={backfillFanpage} style={actionBtn()}>
          {running === 'backfill' ? 'Đang lấy dữ liệu…' : 'Backfill 26/11 → nay'}
        </button>
        <button disabled={busy} onClick={runPipeline} style={actionBtn()}>
          {running === 'pipeline' ? 'Đang phân loại…' : 'Phân Loại AI Ngay'}
        </button>
        <button disabled={busy} onClick={syncFanpage} style={actionBtn({ background: C.grad, color: '#fff', border: 'none' })}>
          {running === 'sync' ? 'Đang đồng bộ…' : 'Đồng Bộ Fanpage'}
        </button>
      </div>
      {showConnect && (
        <div style={{
          marginTop: 12, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.78)', borderRadius: 12,
          padding: 14, display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: 10, alignItems: 'end',
        }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: '.08em' }}>Page ID</label>
            <input
              value={connectForm.page_id}
              onChange={e => setConnectForm(f => ({ ...f, page_id: e.target.value }))}
              placeholder="VD: 123456789"
              style={{ width: '100%', marginTop: 5, padding: '9px 11px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: '.08em' }}>Page Access Token</label>
            <input
              type="password"
              value={connectForm.page_access_token}
              onChange={e => setConnectForm(f => ({ ...f, page_access_token: e.target.value }))}
              placeholder="Token chỉ gửi vào backend, không lưu ở frontend"
              style={{ width: '100%', marginTop: 5, padding: '9px 11px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
            />
          </div>
          <button disabled={busy} onClick={connectFanpage} style={actionBtn({ background: C.grad, color: '#fff', border: 'none' })}>
            {running === 'connect' ? 'Đang kết nối…' : 'Kết Nối'}
          </button>
          {connectErr && <div style={{ gridColumn: '1 / -1', color: C.chi, fontSize: 12, fontWeight: 700 }}>{connectErr}</div>}
        </div>
      )}
    </>
  )
}

function FanpageContentPage({ route }) {
  const data = useMarketingOpsData()
  const overview = data.fanpageOverview[0] || {}

  const bestPosts = useMemo(() => (
    [...data.posts].sort((a, b) => (
      Number(b.ai_quality_score || 0) - Number(a.ai_quality_score || 0)
      || Number(b.reactions_count || 0) + Number(b.comments_count || 0) - Number(a.reactions_count || 0) - Number(a.comments_count || 0)
    )).slice(0, 6)
  ), [data.posts])

  const planned = data.content.filter(item => !['da_dang', 'huy'].includes(item.trang_thai)).slice(0, 8)
  const totalReachHint = Number(overview.fan_count || 0) + Number(overview.followers_count || 0)

  return (
    <Shell>
      <Header route={route} />
      <StateNotice data={data} />

      <div className="mkt-soft" style={{
        border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10,
        padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: C.textSub, lineHeight: 1.5,
      }}>
        ⚡ Tin nhắn mới tự động về realtime qua webhook; AI nền tự phân loại theo lịch. Công cụ đồng bộ / kết nối Fanpage thủ công nằm ở{' '}
        <a href="/admin/marketing/cau-hinh-kenh" style={{ color: C.primary, fontWeight: 700, textDecoration: 'none' }}>Cấu Hình Kênh</a>.
      </div>

      <MetricGrid items={[
        { label: 'Người theo dõi', value: fmtNumber(overview.followers_count || overview.fan_count), sub: 'Từ Fanpage đã kết nối', tone: C.taiSan },
        { label: 'Bài đã lưu', value: fmtNumber(overview.so_bai_viet), sub: `Bài mới nhất ${fmtDate(overview.bai_moi_nhat_at)}`, tone: C.gold },
        { label: 'Tương tác', value: fmtNumber(overview.tong_tuong_tac), sub: `${fmtNumber(overview.tong_comment)} bình luận đã kéo`, tone: C.thu },
        { label: 'Sức khỏe', value: overview.webhook_enabled ? 'Realtime' : 'Cần nối', sub: overview.sync_enabled ? 'Đồng bộ đang bật' : 'Đồng bộ chưa bật', tone: overview.webhook_enabled ? C.thu : C.chi },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, .9fr)', gap: 14, marginBottom: 14 }}>
        <Panel title="Bài viết đang có tín hiệu tốt" eyebrow="Fanpage">
          <div style={{ display: 'grid', gap: 10 }}>
            {(bestPosts.length ? bestPosts : data.posts).slice(0, 6).map(post => (
              <div key={post.id} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: 12, background: '#FFFDF8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: C.text, lineHeight: 1.35 }}>{post.ai_summary || post.message || post.story || 'Bài viết Fanpage'}</div>
                    <div style={{ marginTop: 5, fontSize: 12, color: C.textSub }}>{fmtDate(post.created_time)} · {post.post_type || post.status_type || 'bài viết'}</div>
                  </div>
                  <div style={{ textAlign: 'right', color: C.gold, fontWeight: 900, whiteSpace: 'nowrap' }}>
                    {fmtNumber(Number(post.reactions_count || 0) + Number(post.comments_count || 0))}
                  </div>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <SmallBadge color={C.thu}>{fmtNumber(post.reactions_count)} cảm xúc</SmallBadge>
                  <SmallBadge color={C.taiSan}>{fmtNumber(post.comments_count)} bình luận</SmallBadge>
                  <SmallBadge color={C.primary}>Điểm AI {post.ai_quality_score || 0}</SmallBadge>
                </div>
                {post.ai_next_action && <div style={{ marginTop: 8, fontSize: 12.5, color: C.textSub, lineHeight: 1.45 }}>{post.ai_next_action}</div>}
              </div>
            ))}
            {!data.loading && data.posts.length === 0 && <EmptyBox text="Chưa có bài viết Fanpage trong kho dữ liệu. Khi đồng bộ Meta chạy lại, bảng này sẽ tự có dữ liệu." />}
          </div>
        </Panel>

        <Panel title="Lịch nội dung cần làm" eyebrow="Kế hoạch đăng bài">
          <div style={{ display: 'grid', gap: 10 }}>
            {planned.map(item => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, color: C.text }}>{item.tieu_de}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: C.textSub }}>{channelLabel(item.kenh)} · {item.chu_de || item.loai_noi_dung} · {fmtDate(item.scheduled_at || item.created_at)}</div>
                </div>
                <SmallBadge color={item.trang_thai === 'da_duyet' ? C.thu : C.gold}>{statusLabel(item.trang_thai)}</SmallBadge>
              </div>
            ))}
            {!data.loading && planned.length === 0 && <EmptyBox text="Chưa có lịch nội dung đang chờ làm. HSMS vẫn gợi ý chủ đề bên dưới để đội marketing triển khai." />}
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, .7fr)', gap: 14 }}>
        <Panel title="Chủ đề nên đăng trong 7 ngày tới" eyebrow="Gợi ý nội dung">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {CONTENT_THEMES.map(item => (
              <div key={item.theme} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: 13, background: '#FFFDF8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{item.theme}</strong>
                  <SmallBadge color={item.priority === 'Cao' ? C.chi : C.gold}>{item.priority}</SmallBadge>
                </div>
                <div style={{ marginTop: 8, color: C.textSub, fontSize: 12.5, lineHeight: 1.5 }}>{item.angle}</div>
                <div style={{ marginTop: 8, color: C.primary, fontSize: 12, fontWeight: 850 }}>{item.format}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Việc cần ưu tiên" eyebrow="Quản trị Fanpage">
          <ActionList items={[
            totalReachHint ? `Duy trì lịch đăng ổn định cho nhóm ${fmtNumber(totalReachHint)} người theo dõi/thích trang.` : 'Kết nối lại chỉ số người theo dõi để đo sức khỏe Fanpage.',
            overview.webhook_enabled ? 'Webhook đang bật: bước kế tiếp là tối ưu lịch sử chat để nhân viên mở hội thoại nhanh hơn.' : 'Bật webhook để tin nhắn mới vào HSMS ngay, không cần tải tay.',
            'Mỗi bài nên có mục tiêu rõ: kéo inbox, chốt lịch, chăm lại khách cũ hoặc nhắc liệu trình.',
            'Bài có nhiều bình luận cần chuyển thành danh sách khách cần xử lý, không chỉ xem tương tác cho vui.',
          ]} />
        </Panel>
      </div>
    </Shell>
  )
}

function CampaignsPage({ route }) {
  const data = useMarketingOpsData()
  const performance = data.campaignPerformance.length ? data.campaignPerformance : data.campaigns
  const activeCampaigns = performance.filter(c => c.trang_thai === 'active').length
  const totalSpend = sumRows(performance, 'chi_phi_thuc_te')
  const totalRevenue = sumRows(performance, 'revenue') || sumRows(performance, 'doanh_thu_uoc_tinh')
  const totalMessages = sumRows(performance, 'messages')
  const highValueReactivation = data.reactivation.filter(c => Number(c.total_revenue || 0) >= 5000000).length
  const remainingCard = data.reactivation.filter(c => Number(c.remaining_sessions || 0) > 0).length

  return (
    <Shell>
      <Header route={route} />
      <StateNotice data={data} />
      <MetricGrid items={[
        { label: 'Chiến dịch chạy', value: activeCampaigns, sub: `${performance.length} chiến dịch trong hệ thống`, tone: C.warn },
        { label: 'Chi phí ghi nhận', value: fmtCompactMoney(totalSpend), sub: 'Theo thống kê chiến dịch', tone: C.chi },
        { label: 'Doanh thu nối được', value: fmtCompactMoney(totalRevenue), sub: `${fmtNumber(totalMessages)} tin nhắn quy đổi`, tone: C.thu },
        { label: 'Khách nên gọi lại', value: fmtNumber(data.reactivation.length), sub: `${remainingCard} khách còn buổi`, tone: C.taiSan },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, .9fr)', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Hiệu quả chiến dịch"
          eyebrow="ROI & chuyển đổi"
          action={(
            <a href="/admin/marketing/ban-cu" style={{
              fontSize: 12, fontWeight: 800, color: C.primary, textDecoration: 'none',
              border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 11px',
            }}>＋ Tạo / Quản lý chiến dịch</a>
          )}
        >
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Chiến dịch</Th>
                <Th>Kênh</Th>
                <Th right>Chi phí</Th>
                <Th right>Tin/khách</Th>
                <Th right>Doanh thu</Th>
                <Th right>ROI</Th>
              </tr>
            </thead>
            <tbody>
              {performance.slice(0, 8).map(row => (
                <tr key={row.id}>
                  <Td strong>{row.ten}</Td>
                  <Td>{channelLabel(row.kenh)}</Td>
                  <Td right>{fmtMoney(row.chi_phi_thuc_te || 0)}</Td>
                  <Td right>{fmtNumber(row.messages || row.leads || row.so_kh_moi)}</Td>
                  <Td right>{fmtMoney(row.revenue || row.doanh_thu_uoc_tinh || 0)}</Td>
                  <Td right tone={Number(row.roi || 0) >= 0 ? C.thu : C.chi}>{row.roi == null ? '—' : `${row.roi}%`}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.loading && performance.length === 0 && <EmptyBox text="Chưa có chiến dịch trong hệ thống. Khi kết nối quảng cáo hoặc nhập chiến dịch, bảng ROI sẽ tự hiện." />}
        </Panel>

        <Panel title="Tệp remarketing nên dùng" eyebrow="Khách cũ">
          <div style={{ display: 'grid', gap: 10 }}>
            <SegmentRow label="Khách còn buổi" value={remainingCard} note="Nhắc lịch dùng tiếp trước khi bán thêm." color={C.ck} />
            <SegmentRow label="Khách giá trị cao" value={highValueReactivation} note="Nên chăm bởi quản lý hoặc lễ tân giỏi." color={C.gold} />
            <SegmentRow label="Vắng trên 90 ngày" value={data.reactivation.filter(c => Number(c.so_ngay_chua_den || 0) >= 90).length} note="Mời quay lại bằng ưu đãi khách cũ." color={C.chi} />
            <SegmentRow label="Nguồn có doanh thu" value={data.sourceQuality.filter(s => Number(s.revenue || 0) > 0).length} note="Ưu tiên ngân sách cho nguồn đã chứng minh hiệu quả." color={C.thu} />
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, .8fr)', gap: 14 }}>
        <Panel title="Khách cũ ưu tiên mời quay lại" eyebrow="Danh sách hành động">
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Khách</Th>
                <Th>Nhóm</Th>
                <Th right>Vắng</Th>
                <Th right>Còn buổi</Th>
                <Th right>Chi tiêu</Th>
              </tr>
            </thead>
            <tbody>
              {data.reactivation.slice(0, 10).map(row => (
                <tr key={row.khach_hang_id}>
                  <Td strong>{row.ho_ten || 'Khách'}</Td>
                  <Td>{reactivationLabel(row.nhom)}</Td>
                  <Td right>{fmtNumber(row.so_ngay_chua_den)} ngày</Td>
                  <Td right>{fmtNumber(row.remaining_sessions)}</Td>
                  <Td right>{fmtMoney(row.total_revenue)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.loading && data.reactivation.length === 0 && <EmptyBox text="Chưa có tệp khách cũ từ POS/thẻ liệu trình. Khi dữ liệu POS đủ hơn, tệp này sẽ là kho remarketing chính." />}
        </Panel>

        <Panel title="Nguyên tắc chạy lại" eyebrow="Không đốt ngân sách">
          <ActionList items={[
            'Không chạy quảng cáo rộng trước khi phân nhóm khách cũ: còn buổi, lâu không đến, từng hỏi giá, từng đặt hẹn.',
            'Khách còn thẻ phải nhắc dùng tiếp trước; chỉ tư vấn gia hạn khi khách còn 1-2 buổi hoặc phản hồi tốt.',
            'Khách từ Fanpage có SĐT cần được ghép HSMS trước khi đưa vào tệp remarketing.',
            'Mỗi chiến dịch phải đo được: tin nhắn, đặt hẹn, khách đến, đơn hàng và doanh thu.',
          ]} />
        </Panel>
      </div>
    </Shell>
  )
}

function ChannelSettingsPage({ route }) {
  const data = useMarketingOpsData()
  const overview = data.fanpageOverview[0] || {}
  const totalSegments = data.segmentSummary.reduce((sum, row) => sum + Number(row.customers || 0), 0)
  const totalPending = data.segmentSummary.reduce((sum, row) => sum + Number(row.pending_customers || 0), 0)
  const automationByMode = useMemo(() => {
    const byMode = {}
    for (const run of data.automationRuns || []) {
      if (!byMode[run.mode]) byMode[run.mode] = run
    }
    return byMode
  }, [data.automationRuns])
  const triageAge = minutesSince(automationByMode.triage_fanpage?.created_at)
  const workerHealthy = automationByMode.triage_fanpage?.status === 'success' && triageAge != null && triageAge <= 8

  return (
    <Shell>
      <Header route={route} />
      <StateNotice data={data} />
      <MetricGrid items={[
        { label: 'Facebook', value: overview.page_name ? 'Đã nối' : 'Chờ nối', sub: overview.page_name || 'Hannah Spa', tone: overview.page_name ? C.thu : C.chi },
        { label: 'Webhook', value: overview.webhook_enabled ? 'Bật' : 'Chưa bật', sub: 'Nhận tin mới realtime', tone: overview.webhook_enabled ? C.thu : C.warn },
        { label: 'Tệp khách', value: fmtNumber(totalSegments), sub: `${fmtNumber(totalPending)} khách còn chờ xử lý`, tone: C.taiSan },
        { label: 'AI nền', value: workerHealthy ? 'Đang chạy' : 'Cần xem', sub: triageAge == null ? 'Chưa có log worker' : `Lần cuối ${triageAge} phút trước`, tone: workerHealthy ? C.thu : C.warn },
      ]} />

      <div style={{ marginBottom: 14 }}>
        <Panel
          title="Công cụ kết nối & đồng bộ (admin)"
          eyebrow="Chạy tay khi cần"
        >
          <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 12, lineHeight: 1.5 }}>
            Vận hành thường ngày đã tự động (webhook nhận tin + worker phân loại). Các nút dưới chỉ dùng khi cần: kết nối Fanpage lần đầu, kéo lại dữ liệu cũ, hoặc phân loại ngay.
          </div>
          <FanpageActions reload={data.reload} />
        </Panel>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Panel title="Nền tự động trên VPS" eyebrow="Realtime sau webhook">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {AUTOMATION_MODES.map(item => (
              <AutomationRunCard
                key={item.mode}
                item={item}
                run={automationByMode[item.mode]}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, .85fr)', gap: 14 }}>
        <Panel title="Trạng thái kênh" eyebrow="Kết nối">
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Kênh</Th>
                <Th>Trạng thái</Th>
                <Th>Mục đích</Th>
                <Th>Việc cần chú ý</Th>
              </tr>
            </thead>
            <tbody>
              {CHANNEL_CONFIG.map(row => (
                <tr key={row.name}>
                  <Td strong>{row.name}</Td>
                  <Td><SmallBadge color={row.status === 'Đang dùng' || row.status === 'Đã có nền' ? C.thu : C.warn}>{row.status}</SmallBadge></Td>
                  <Td>{row.purpose}</Td>
                  <Td>{row.risk}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Quy tắc dữ liệu" eyebrow="Để không làm nặng HSMS">
          <ActionList items={[
            'Tin realtime: chỉ lưu tin mới, người gửi, thời gian, trạng thái và khóa hội thoại.',
            'Lịch sử quá dài: giữ bản tóm tắt, dịch vụ quan tâm, SĐT, kết quả chăm sóc và đường dẫn hội thoại.',
            'Dữ liệu thô cũ: chỉ kéo theo lô, phục vụ phân tích ban đầu; không tải lại mỗi lần nhân viên mở chat.',
            'Tất cả kênh ngoài Fanpage như Zalo/hotline phải quy về một nhật ký chăm sóc chung trong HSMS.',
          ]} />
        </Panel>
      </div>

      <div style={{ marginTop: 14 }}>
        <Panel title="Nhóm Fanpage đang được HSMS quản lý" eyebrow="Phân loại khách">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {data.segmentSummary.slice(0, 8).map(row => (
              <div key={row.segment} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: 13, background: '#FFFDF8' }}>
                <div style={{ fontWeight: 900 }}>{fanpageSegmentLabel(row.segment)}</div>
                <div style={{ marginTop: 8, fontFamily: FONT.serif, fontSize: 28, fontWeight: 900, color: C.taiSan }}>{fmtNumber(row.customers)}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: C.textSub }}>{fmtNumber(row.customers_with_phone)} có SĐT · {fmtNumber(row.pending_customers)} còn chờ</div>
              </div>
            ))}
            {!data.loading && data.segmentSummary.length === 0 && <EmptyBox text="Chưa có phân nhóm Fanpage. Cần chạy lại bộ phân loại khách Fanpage khi Supabase ổn định." />}
          </div>
        </Panel>
      </div>
    </Shell>
  )
}

function ModuleCard({ route, index }) {
  return (
    <button
      onClick={() => go(route.path)}
      className="mkt-hover"
      style={{
        border: `1px solid ${C.border}`,
        background: 'rgba(255,255,255,.78)',
        borderRadius: 10,
        padding: 18,
        textAlign: 'left',
        cursor: 'pointer',
        minHeight: 184,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        animation: `marketingRise .28s ease ${index * 30}ms both`,
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: `${route.accent}18`,
            border: `1px solid ${route.accent}28`,
            color: route.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 13,
          }}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <span style={{
            fontSize: 11,
            color: C.textSub,
            background: '#F8F1E7',
            border: `1px solid ${C.border}`,
            borderRadius: 999,
            padding: '5px 9px',
            whiteSpace: 'nowrap',
          }}>
            {route.status}
          </span>
        </div>
        <div style={{ marginTop: 16, fontFamily: FONT.serif, fontSize: 22, fontWeight: 800, lineHeight: 1.05 }}>
          {route.short}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>
          {route.subtitle}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
        {route.metrics.map(metric => (
          <span key={metric} style={{
            fontSize: 11,
            fontWeight: 700,
            color: route.accent,
            background: `${route.accent}12`,
            border: `1px solid ${route.accent}18`,
            borderRadius: 999,
            padding: '5px 8px',
          }}>
            {metric}
          </span>
        ))}
      </div>
    </button>
  )
}

function SmallBadge({ children, color = C.primary }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      width: 'fit-content',
      borderRadius: 999,
      padding: '4px 8px',
      background: `${color}12`,
      border: `1px solid ${color}22`,
      color,
      fontSize: 11,
      fontWeight: 850,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function AutomationRunCard({ item, run }) {
  const age = minutesSince(run?.created_at)
  const healthy = run?.status === 'success' && age != null && age <= item.healthyMinutes
  const result = run?.result_payload || {}
  const details = {
    triage_fanpage: `${fmtNumber(result.messages)} tin · ${fmtNumber(result.ignored_comments)} bình luận bỏ qua`,
    resolve_conversation_phones: `${fmtNumber(result.conversations_with_phone)} hội thoại có SĐT · ${fmtNumber(result.leads_updated)} hồ sơ cập nhật`,
    resolve_identities: `${fmtNumber(result.linked_leads || result.identities?.linked_leads)} lead nối · ${fmtNumber(result.updated_customers || result.identities?.updated_customers)} khách cập nhật`,
  }

  return (
    <div style={{
      border: `1px solid ${healthy ? 'rgba(45,122,79,.18)' : C.border}`,
      background: healthy ? 'rgba(45,122,79,.045)' : '#FFFDF8',
      borderRadius: 9,
      padding: 13,
      minHeight: 132,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
          <div style={{ fontWeight: 900 }}>{item.label}</div>
          <SmallBadge color={healthy ? C.thu : C.warn}>{healthy ? 'Đang sống' : 'Cần xem'}</SmallBadge>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: C.textSub }}>{item.cadence}</div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontFamily: FONT.serif, fontSize: 22, fontWeight: 900, color: healthy ? C.thu : C.text }}>
          {run ? fmtDateTime(run.created_at) : 'Chưa chạy'}
        </div>
        <div style={{ marginTop: 5, fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>
          {run?.status === 'error'
            ? (run.error_message || 'Lần chạy gần nhất bị lỗi.')
            : (details[item.mode] || 'Đang chờ dữ liệu worker.')}
        </div>
      </div>
    </div>
  )
}

function EmptyBox({ text }) {
  return (
    <div style={{
      border: `1px dashed ${C.line2}`,
      borderRadius: 9,
      padding: 18,
      color: C.textSub,
      background: '#FFFDF8',
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 1.5,
    }}>
      {text}
    </div>
  )
}

function ActionList({ items }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item, index) => (
        <div key={item} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
          <span style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(201,169,110,.16)',
            color: C.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 900,
          }}>
            {index + 1}
          </span>
          <span style={{ color: C.textSub, lineHeight: 1.55, fontSize: 13 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

function SegmentRow({ label, value, note, color }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: 13, background: '#FFFDF8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <strong>{label}</strong>
        <span style={{ fontWeight: 900, color }}>{fmtNumber(value)}</span>
      </div>
      <div style={{ marginTop: 6, color: C.textSub, fontSize: 12.5, lineHeight: 1.45 }}>{note}</div>
    </div>
  )
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12.5,
}

function Th({ children, right = false }) {
  return (
    <th style={{
      textAlign: right ? 'right' : 'left',
      padding: '9px 10px',
      fontSize: 10.5,
      textTransform: 'uppercase',
      letterSpacing: '.1em',
      color: C.textMute,
      borderBottom: `1px solid ${C.border}`,
      background: '#F8F1E7',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  )
}

function Td({ children, right = false, strong = false, tone = '' }) {
  return (
    <td style={{
      padding: '10px',
      textAlign: right ? 'right' : 'left',
      borderBottom: `1px solid ${C.borderLight}`,
      color: tone || (strong ? C.text : C.textSub),
      fontWeight: strong ? 850 : 600,
      verticalAlign: 'top',
      lineHeight: 1.45,
    }}>
      {children}
    </td>
  )
}

function reactivationLabel(value) {
  const labels = {
    tren_365_ngay: 'Vắng trên 1 năm',
    '180_365_ngay': 'Vắng 6-12 tháng',
    '90_180_ngay': 'Vắng 3-6 tháng',
    '45_90_ngay': 'Vắng 45-90 ngày',
    dang_hoat_dong: 'Đang hoạt động',
  }
  return labels[value] || value || 'Khác'
}

function fanpageSegmentLabel(value) {
  const labels = {
    can_xu_ly_rieng: 'Cần quản lý xem',
    khach_dat_hen_co_sdt: 'Có thể chốt lịch',
    khach_nong_co_sdt: 'Khách nóng có SĐT',
    khach_cu_co_sdt_can_goi_lai: 'Khách cũ cần gọi',
    co_sdt_can_cham_soc: 'Có SĐT cần chăm',
    tiem_nang_chua_co_sdt: 'Tiềm năng chưa có SĐT',
    tuong_tac_thap: 'Tương tác thấp',
  }
  return labels[value] || value || 'Khác'
}

function KpiCard({ label, value, sub, tone }) {
  return (
    <div className="mkt-hover" style={{
      border: `1px solid ${C.border}`,
      background: 'rgba(255,255,255,.82)',
      borderRadius: 10,
      padding: 18,
      boxShadow: C.shadowSm,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: C.textMute }}>
        {label}
      </div>
      <div style={{ marginTop: 10, fontFamily: FONT.serif, fontSize: 32, fontWeight: 900, color: tone }}>
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: C.textSub }}>{sub}</div>
    </div>
  )
}

function Funnel({ stages = [], loading = false }) {
  const hasData = stages.some(s => Number(s.value) > 0)
  return (
    <div style={{
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      background: 'rgba(255,255,255,.75)',
      padding: 18,
      boxShadow: C.shadowSm,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: C.textMute }}>
            Luồng chuyển đổi · số thật
          </div>
          <div style={{ marginTop: 5, fontFamily: FONT.serif, fontSize: 23, fontWeight: 800 }}>
            Từ inbox đến khách được chăm
          </div>
        </div>
      </div>
      {!hasData
        ? <EmptyBox text={loading ? 'Đang tải dữ liệu phân nhóm khách Fanpage…' : 'Chưa có dữ liệu phân nhóm khách Fanpage. Khi worker phân nhóm chạy, phễu này sẽ tự hiển thị số thật.'} />
        : (
          <div style={{ display: 'grid', gap: 12 }}>
            {stages.map((item, index) => (
              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 78px', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{item.note}</div>
                </div>
                <div style={{ height: 12, borderRadius: 99, background: '#EFE4D3', overflow: 'hidden' }}>
                  <div style={{
                    width: `${item.pct}%`,
                    height: '100%',
                    borderRadius: 99,
                    background: index === 0 ? C.grad : `linear-gradient(90deg, ${C.gold}, ${C.primary})`,
                    transition: 'width .35s ease',
                  }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, color: C.text, fontSize: 14 }}>{fmtNumber(item.value)}</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{item.pct}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// Tin nhắn khách gửi vào Fanpage — hiển thị realtime (Supabase realtime trên marketing_messages).
function RealtimeInbox() {
  const [msgs, setMsgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase.from('marketing_messages')
          .select('id, sender_name, noi_dung, created_at, ai_intent, ai_suggested_reply')
          .eq('kenh', 'facebook').eq('direction', 'inbound')
          .order('created_at', { ascending: false }).limit(12)
        if (alive) { setMsgs(data || []); setLoading(false) }
      } catch { if (alive) setLoading(false) }
    })()
    const ch = supabase.channel('mkt-realtime-inbox-overview')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketing_messages' }, payload => {
        const m = payload.new
        if (m && m.kenh === 'facebook' && m.direction === 'inbound') {
          setMsgs(prev => [m, ...prev.filter(x => x.id !== m.id)].slice(0, 12))
        }
      })
      .subscribe(status => { if (status === 'SUBSCRIBED') setLive(true) })
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [])

  return (
    <div style={{ marginBottom: 16 }}>
      <Panel
        title="Tin nhắn mới về"
        eyebrow="Realtime từ Fanpage"
        action={(
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: live ? C.thu : C.textMute }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: live ? C.thu : C.textMute, boxShadow: live ? `0 0 0 4px ${C.thu}22` : 'none' }} />
            {live ? 'Đang kết nối realtime' : 'Đang kết nối…'}
          </span>
        )}
      >
        {loading
          ? <EmptyBox text="Đang tải tin mới…" />
          : msgs.length === 0
            ? <EmptyBox text="Chưa có tin khách gửi vào. Khi khách nhắn Fanpage, tin sẽ hiện ngay tại đây (không cần tải lại trang)." />
            : (
              <div style={{ display: 'grid', gap: 10 }}>
                {msgs.map(m => (
                  <div key={m.id} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 12px', background: '#FFFDF8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                      <strong style={{ color: C.text, fontSize: 13 }}>{m.sender_name || 'Khách Fanpage'}</strong>
                      <span style={{ fontSize: 11, color: C.textSub, whiteSpace: 'nowrap' }}>{fmtDateTime(m.created_at)}</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: C.text, lineHeight: 1.45 }}>{(m.noi_dung || '').slice(0, 220) || '(đính kèm/hình ảnh)'}</div>
                    {m.ai_suggested_reply && <div style={{ marginTop: 5, fontSize: 12, color: C.textSub, lineHeight: 1.4 }}>💬 Gợi ý trả lời: {String(m.ai_suggested_reply).slice(0, 160)}</div>}
                  </div>
                ))}
              </div>
            )}
      </Panel>
    </div>
  )
}

function Overview() {
  const routes = MARKETING_ROUTES.filter(route => route.key !== 'overview')
  const data = useMarketingOpsData()
  const sum = data.segmentSummary || []

  const total = sumRows(sum, 'customers')
  const withPhone = sumRows(sum, 'customers_with_phone')
  const pending = sumRows(sum, 'pending_customers')
  const bookingReady = sum
    .filter(r => ['khach_dat_hen_co_sdt', 'khach_nong_co_sdt'].includes(r.segment))
    .reduce((s, r) => s + Number(r.customers || 0), 0)
  const touched = Math.max(0, total - pending)
  const pctOf = v => (total > 0 ? Math.round((Number(v) / total) * 100) : 0)

  const funnelStages = [
    { label: 'Khách nhắn tin', value: total, note: 'Tổng khách Fanpage đã phân nhóm' },
    { label: 'HSMS nhận diện', value: withPhone, note: 'Đã có số điện thoại' },
    { label: 'Sẵn sàng chốt lịch', value: bookingReady, note: 'Khách đặt hẹn / khách nóng' },
    { label: 'Đã chạm chăm sóc', value: touched, note: 'Đã có lễ tân xử lý' },
  ].map(s => ({ ...s, pct: pctOf(s.value) }))

  return (
    <Shell>
      <Header route={MARKETING_ROUTES[0]} />
      <StateNotice data={data} />

      <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: '.16em', textTransform: 'uppercase', color: C.chi, marginBottom: 10 }}>
        ● Việc cần làm hôm nay
      </div>
      <div className="mkt-soft" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 18 }}>
        {[
          { icon: '💬', label: 'Trả lời tin khách', value: pending, desc: 'Khách chưa được chăm — vào Hộp Thư trả lời ngay', path: '/admin/marketing/hop-thu', tone: C.taiSan },
          { icon: '📅', label: 'Khách chốt lịch', value: bookingReady, desc: 'Khách đặt hẹn / khách nóng — mời chốt giờ đến', path: '/admin/marketing/khach-tiem-nang', tone: C.thu },
          { icon: '🎫', label: 'Nhắc thẻ & khách cũ', value: null, desc: 'Khách còn buổi / lâu chưa đến — mời quay lại', path: '/admin/marketing/nhac-lich-lieu-trinh', tone: C.gold },
        ].map(t => (
          <button key={t.label} onClick={() => go(t.path)} style={{
            textAlign: 'left', cursor: 'pointer', border: `1px solid ${t.tone}33`, background: `${t.tone}0C`,
            borderRadius: 12, padding: 16, display: 'grid', gap: 6, boxShadow: C.shadowSm,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 22 }}>{t.icon}</span>
              {t.value != null && <span style={{ fontFamily: FONT.serif, fontSize: 30, fontWeight: 900, color: t.tone, lineHeight: 1 }}>{fmtNumber(t.value)}</span>}
            </div>
            <div style={{ fontWeight: 900, color: C.text, fontSize: 15 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>{t.desc}</div>
            <div style={{ marginTop: 2, fontSize: 12, fontWeight: 800, color: t.tone }}>Mở ngay →</div>
          </button>
        ))}
      </div>

      <RealtimeInbox />

      {[
        { title: 'Chăm khách hằng ngày', desc: 'Việc lễ tân làm mỗi ngày', keys: ['inbox', 'prospects', 'aftercare', 'reminders'] },
        { title: 'Quản lý & Phân tích', desc: 'Dành cho chủ / quản lý', keys: ['fanpage', 'campaigns', 'staff'] },
        { title: 'Cấu hình kênh', desc: 'Kết nối kỹ thuật (admin)', keys: ['settings'] },
      ].map(g => (
        <div key={g.title} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: FONT.serif, fontSize: 19, fontWeight: 900, color: C.text }}>{g.title}</span>
            <span style={{ fontSize: 12, color: C.textSub }}>{g.desc}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {g.keys.map((k, i) => {
              const r = routes.find(x => x.key === k)
              return r ? <ModuleCard key={k} route={r} index={i} /> : null
            })}
          </div>
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, .65fr)', gap: 14, marginTop: 4 }}>
        <Funnel stages={funnelStages} loading={data.loading} />
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          background: `linear-gradient(150deg, ${C.espresso} 0%, ${C.primaryDark} 100%)`,
          padding: 20,
          color: C.textInverse,
          boxShadow: C.shadow,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', opacity: .62 }}>
            Cách hệ thống hoạt động
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            {WORKFLOW.map((line, index) => (
              <div key={line} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(201,169,110,.16)', color: '#F5DFAF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 900,
                }}>
                  {index + 1}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, opacity: .9 }}>{line}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}

function DetailPage({ route }) {
  const routeIndex = MARKETING_ROUTES.findIndex(item => item.key === route.key)
  return (
    <Shell>
      <Header route={route} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .95fr) minmax(360px, .65fr)', gap: 16 }}>
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          background: 'rgba(255,255,255,.82)',
          padding: 22,
          boxShadow: C.shadowSm,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: C.textMute }}>
            Màn hình vận hành
          </div>
          <div style={{ marginTop: 8, fontFamily: FONT.serif, fontSize: 28, fontWeight: 900 }}>
            {route.title}
          </div>
          <div style={{ marginTop: 8, color: C.textSub, lineHeight: 1.65, maxWidth: 760 }}>
            {route.subtitle}
          </div>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {route.metrics.map((metric, index) => (
              <div key={metric} style={{
                border: `1px solid ${route.accent}20`,
                background: `${route.accent}0F`,
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: route.accent, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                  Chỉ số {index + 1}
                </div>
                <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16 }}>{metric}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 20,
            border: `1px dashed ${C.line2}`,
            borderRadius: 10,
            padding: 18,
            background: '#FFFDF8',
          }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Việc hệ thống sẽ xử lý trong màn hình này</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                'Hiển thị danh sách cần làm theo mức ưu tiên thật sự, không để nhân viên tự đoán.',
                'Ghép dữ liệu Fanpage với hồ sơ khách hàng, thẻ liệu trình, lịch sử mua và ghi chú chăm sóc.',
                'Đưa ra gợi ý tư vấn, gợi ý bán thêm và bước tiếp theo cho từng khách.',
                'Ghi lại kết quả để chủ/quản lý xem được nhân viên đã làm gì trong ngày.',
              ].map((item, index) => (
                <div key={item} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, alignItems: 'start' }}>
                  <span style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: `${route.accent}18`,
                    color: route.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 900,
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ color: C.textSub, lineHeight: 1.55 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            background: 'rgba(255,255,255,.78)',
            padding: 18,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: C.textMute }}>
              Vị trí trong lộ trình
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {MARKETING_ROUTES.filter(item => item.key !== 'overview').map((item, index) => {
                const active = item.key === route.key
                return (
                  <button key={item.key} onClick={() => go(item.path)} style={{
                    border: `1px solid ${active ? item.accent : C.border}`,
                    background: active ? `${item.accent}12` : '#fff',
                    borderRadius: 9,
                    padding: '11px 12px',
                    cursor: 'pointer',
                    display: 'grid',
                    gridTemplateColumns: '30px 1fr',
                    gap: 10,
                    textAlign: 'left',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: active ? item.accent : '#F4EBDD',
                      color: active ? '#fff' : C.textSub,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 900,
                    }}>
                      {index + 1}
                    </span>
                    <span>
                      <strong style={{ display: 'block', fontSize: 13 }}>{item.short}</strong>
                      <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: C.textSub }}>{item.status}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            background: `linear-gradient(150deg, #FFF9EF 0%, #F3E7D7 100%)`,
            padding: 18,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: C.textMute }}>
              Gợi ý triển khai
            </div>
            <div style={{ marginTop: 10, fontFamily: FONT.serif, fontSize: 24, fontWeight: 900 }}>
              Bước {Math.max(routeIndex, 1)} trong hệ thống Marketing
            </div>
            <p style={{ margin: '8px 0 0', color: C.textSub, lineHeight: 1.6, fontSize: 13 }}>
              Màn hình này đã được đặt đúng chỗ trong menu. Bước tiếp theo là cắm dữ liệu thật, webhook realtime và các bảng phân tích tương ứng.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default function MarketingModulePage() {
  const route = getRoute()

  if (route.key === 'overview') return <Overview />
  if (route.key === 'inbox') return <AdminChamSocKhachPage embeddedInMarketing fixedTab="fanpage" />
  if (route.key === 'fanpage') return <FanpageContentPage route={route} />
  if (route.key === 'prospects') {
    return (
      <AdminChamSocKhachPage
        embeddedInMarketing
        fixedTab="fanpage"
        initialFanpageFilter="all"
        title="Khách Hàng Tiềm Năng"
        subtitle="Tất cả khách Fanpage đang có tín hiệu cần phân loại: khách nóng, cần xin SĐT, đã nhận diện HSMS hoặc cần quản lý xem trước."
      />
    )
  }
  if (route.key === 'aftercare') {
    return (
      <AdminChamSocKhachPage
        embeddedInMarketing
        fixedTab="today"
        showVisitButton
        title="Chăm Sóc Sau Dịch Vụ"
        subtitle="Nhập khách đã đến spa, phản hồi dịch vụ, KTV phụ trách và cơ hội chăm sóc lại."
      />
    )
  }
  if (route.key === 'reminders') {
    return (
      <AdminChamSocKhachPage
        embeddedInMarketing
        fixedTab="pos"
        title="Nhắc Lịch Liệu Trình"
        subtitle="Ưu tiên khách còn buổi, khách lâu không đến và khách cần được mời quay lại đúng chu kỳ."
      />
    )
  }
  if (route.key === 'campaigns') return <CampaignsPage route={route} />
  if (route.key === 'staff') {
    return (
      <AdminChamSocKhachPage
        embeddedInMarketing
        fixedTab="report"
        title="Báo Cáo Nhân Viên"
        subtitle="Xem nhân viên đã chăm khách nào, kết quả ra sao và nhóm khách nào còn bị bỏ sót."
      />
    )
  }
  if (route.key === 'settings') return <ChannelSettingsPage route={route} />

  return <DetailPage route={route} />
}
