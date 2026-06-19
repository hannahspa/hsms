import { useCallback, useEffect, useMemo, useState } from 'react'
import ModalDatHen from '../../internal/lich-hen/ModalDatHen'
import { C, FONT } from '../../../constants/colors'
import { supabase } from '../../../lib/supabase'
import { todayISO } from '../../../lib/utils'
import { notify } from '../../../components/ui/notify'

const MARKETING_ROUTES = [
  {
    key: 'overview',
    path: '/admin/marketing',
    title: 'Tổng Quan Marketing',
    short: 'Tổng Quan',
    subtitle: 'Trung tâm báo cáo toàn hệ thống Marketing — nhìn vào là biết hôm nay cần làm gì.',
    owner: 'Chủ / quản lý',
    status: 'Báo cáo',
    accent: C.gold,
    metrics: ['Tin mới hôm nay', 'Cần trả lời', 'Khách chốt lịch'],
  },
  {
    key: 'inbox',
    path: '/admin/marketing/hop-thu',
    title: 'Hộp Thư',
    short: 'Hộp Thư',
    subtitle: 'Tất cả chat Facebook + Zalo đổ về một nơi. AI nhận diện khách (mã KH), gợi ý câu trả lời cho lễ tân.',
    owner: 'Lễ tân',
    status: 'Việc hằng ngày',
    accent: '#1A5276',
    metrics: ['Đa kênh FB+Zalo', 'Nhận diện khách', 'Gợi ý trả lời'],
  },
  {
    key: 'remarketing',
    path: '/admin/marketing/khach-remarketing',
    title: 'Khách & Remarketing',
    short: 'Khách & Remarketing',
    subtitle: 'Kho khách từ dữ liệu đã quét, gán vào hồ sơ HSMS theo mã KH, phân nhóm để mời quay lại.',
    owner: 'Chủ / lễ tân',
    status: 'Khai thác dữ liệu',
    accent: '#8A6A6E',
    metrics: ['Đã nối HSMS', 'Còn thẻ / buổi', 'Vắng lâu'],
  },
  {
    key: 'aftercare',
    path: '/admin/marketing/cham-soc-sau-dich-vu',
    title: 'Chăm Sóc Sau Dịch Vụ',
    short: 'Chăm Sóc Sau DV',
    subtitle: 'Khách vừa đến làm dịch vụ — hệ thống nhắc chăm sóc lại, AI soạn sẵn tin hỏi thăm + mời đặt buổi tiếp + bán thêm.',
    owner: 'Lễ tân',
    status: 'Giữ chân khách',
    accent: '#2D7A4F',
    metrics: ['Khách đến hôm qua', 'AI soạn tin', 'Chưa quên ai'],
  },
  {
    key: 'fanpage',
    path: '/admin/marketing/fanpage-noi-dung',
    title: 'Fanpage & Chiến Dịch',
    short: 'Fanpage & Chiến Dịch',
    subtitle: 'Sức khoẻ Fanpage, bài viết hiệu quả, gợi ý nội dung; quản lý chiến dịch quảng cáo và ROI.',
    owner: 'Chủ / marketing',
    status: 'Phân tích',
    accent: C.rose,
    metrics: ['Bài viết tốt', 'Chiến dịch', 'ROI'],
  },
  {
    key: 'training',
    path: '/admin/marketing/huan-luyen',
    title: 'Huấn Luyện AI',
    short: 'Huấn Luyện AI',
    subtitle: 'Dạy AI tư vấn: sửa hiến pháp/giọng nói, duyệt mẫu vàng học từ lễ tân giỏi để AI ngày càng chuyên nghiệp.',
    owner: 'Chủ / quản lý',
    status: 'Training',
    accent: '#6C3483',
    metrics: ['Hiến pháp', 'Mẫu vàng', 'Khuyến mãi'],
  },
  {
    key: 'settings',
    path: '/admin/marketing/cau-hinh-kenh',
    title: 'Cấu Hình Kênh',
    short: 'Cấu Hình',
    subtitle: 'Kết nối Facebook/Zalo, webhook, token, đồng bộ thủ công và phân công nhân viên.',
    owner: 'Chủ / kỹ thuật',
    status: 'Admin',
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span style={{ padding: '8px 14px', borderRadius: 9, fontWeight: 800, fontSize: 13, background: C.grad, color: '#fff' }}>Fanpage &amp; Nội Dung</span>
        <button onClick={() => go('/admin/marketing/chien-dich')} style={{ padding: '8px 14px', borderRadius: 9, fontWeight: 800, fontSize: 13, border: `1px solid ${C.border}`, background: '#fff', color: C.text, cursor: 'pointer' }}>Chiến Dịch &amp; ROI →</button>
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => go('/admin/marketing/fanpage-noi-dung')} style={{ padding: '8px 14px', borderRadius: 9, fontWeight: 800, fontSize: 13, border: `1px solid ${C.border}`, background: '#fff', color: C.text, cursor: 'pointer' }}>← Fanpage &amp; Nội Dung</button>
        <span style={{ padding: '8px 14px', borderRadius: 9, fontWeight: 800, fontSize: 13, background: C.grad, color: '#fff' }}>Chiến Dịch &amp; ROI</span>
      </div>
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
          { icon: '💬', label: 'Trả lời tin khách', value: pending, desc: 'Khách đang nhắn chưa được trả lời — vào Hộp Thư ngay', path: '/admin/marketing/hop-thu', tone: C.taiSan },
          { icon: '📅', label: 'Khách chốt lịch', value: bookingReady, desc: 'Khách đặt hẹn / khách nóng — mời chốt giờ đến', path: '/admin/marketing/hop-thu', tone: C.thu },
          { icon: '🎯', label: 'Khách mời quay lại', value: null, desc: 'Kho khách cũ còn thẻ / vắng lâu — chăm lại (remarketing)', path: '/admin/marketing/khach-remarketing', tone: C.gold },
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

      {[
        { title: 'Chăm khách', desc: 'Hộp thư hằng ngày & remarketing', keys: ['inbox', 'remarketing'] },
        { title: 'Phân tích & Cấu hình', desc: 'Dành cho chủ / admin', keys: ['fanpage', 'settings'] },
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

// ── B2: HỘP THƯ — hội thoại đang hoạt động (30 ngày), đa kênh, AI nhận diện + gợi ý ──
function extractPhoneLite(t) {
  const m = String(t || '').match(/(?:\+?84|0)(?:[\s.-]?\d){8,10}/)
  if (!m) return null
  const d = m[0].replace(/\D/g, '')
  const p = d.startsWith('84') && d.length === 11 ? '0' + d.slice(2) : d
  return /^0\d{9}$/.test(p) ? p : null
}

const INBOX_DAYS = 30

// Tin rác do quá trình đồng bộ tạo ra (lỗi Meta Sync, thông báo hệ thống) — KHÔNG hiện trong Hộp Thư.
function isJunkMsg(m) {
  if (!m) return true
  if (m.sender_type === 'system') return true
  const t = String(m.noi_dung || '').toLowerCase()
  if (!t.trim()) return false // tin đính kèm/ảnh vẫn giữ
  return /unexpected error|meta sync|an error occurred|\(#\d+\)|graph api error|invalid oauth|token.*expired/.test(t)
       || /^meta\b/.test(String(m.sender_name || '').toLowerCase())
}

function InboxPage() {
  const [convos, setConvos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [ai, setAi] = useState({ loading: false, reply: '', note: '', error: null })
  const [datHen, setDatHen] = useState(null)   // initial cho ModalDatHen (null = đóng)
  const [ktvList, setKtvList] = useState([])

  // Mở đặt hẹn ngay trong Hộp Thư — điền sẵn tên/SĐT/mã KH từ hồ sơ đã nhận diện.
  async function openDatHen() {
    if (!ktvList.length) {
      const { data } = await supabase.from('nhan_vien')
        .select('id, ho_ten, vi_tri, avatar_url').eq('trang_thai', 'dang_lam').eq('vi_tri', 'ktv').order('ho_ten')
      setKtvList(data || [])
    }
    const k = profile?.intel
    setDatHen({
      ten_khach: k?.ho_ten || selected?.name || '',
      sdt_khach: profile?.phone || '',
      khach_hang_id: k?.khach_hang_id || null,
      ten_dich_vu: '', dich_vu_id: null, the_lieu_trinh_id: null, nhan_vien_id: null,
      thoi_luong_phut: 60, ngay_hen: todayISO(), gio_hen: '10:00', ghi_chu: 'Khách đặt qua Hộp Thư', dich_vu_list: [],
    })
  }

  // Tải hội thoại có tin trong INBOX_DAYS ngày gần đây, gom theo conversation, ưu tiên chưa trả lời.
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const since = new Date(Date.now() - INBOX_DAYS * 864e5).toISOString()
        const { data } = await supabase.from('marketing_messages')
          .select('id, kenh, conversation_id, from_platform_user_id, recipient_id, sender_name, sender_type, direction, noi_dung, created_at, metadata')
          .in('kenh', ['facebook', 'zalo'])
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(600)
        if (!alive) return
        const map = new Map()
        for (const m of (data || [])) {
          if (isJunkMsg(m)) continue // lọc rác trước khi gom
          const cid = m.conversation_id || m.from_platform_user_id || m.id
          if (!map.has(cid)) map.set(cid, [])
          map.get(cid).push(m)
        }
        const list = [...map.entries()].map(([cid, msgs]) => {
          const sorted = msgs.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          const last = sorted[sorted.length - 1]
          const firstInbound = sorted.find(x => x.direction === 'inbound')
          const psid = firstInbound?.from_platform_user_id || msgs[0].from_platform_user_id || msgs[0].metadata?.customer_id || null
          return {
            cid, kenh: last.kenh, msgs: sorted, last,
            unreplied: last.direction === 'inbound',
            name: firstInbound?.sender_name || last.sender_name || 'Khách',
            psid, lastAt: last.created_at,
          }
        })
          .filter(c => c.msgs.length > 0)
          .sort((a, b) => (b.unreplied ? 1 : 0) - (a.unreplied ? 1 : 0) || new Date(b.lastAt) - new Date(a.lastAt))
        setConvos(list); setLoading(false)
        setSelId(prev => prev || (list[0] && list[0].cid) || null)
      } catch { if (alive) setLoading(false) }
    })()
    const ch = supabase.channel('inbox-page-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketing_messages' }, () => { if (alive) setNonce(n => n + 1) })
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [nonce])

  const selected = convos.find(c => c.cid === selId) || null

  // ── NHẬN DIỆN KHÁCH (nền identity map) ──
  // 1) bản đồ nhận diện đã chốt (marketing_customer_identities theo PSID) → bắt khách cũ inbox lại (vd Minh Khải)
  // 2) SĐT lấy từ tin · 3) SĐT suy ra từ segment. Có khach_hang_id → đọc hồ sơ giàu từ v_customer_pos_intelligence.
  useEffect(() => {
    let alive = true
    setProfile(null)
    if (!selected) return
    ;(async () => {
      let khId = null, phone = null
      if (selected.psid) {
        const { data: ident } = await supabase.from('marketing_customer_identities')
          .select('khach_hang_id, phone_norm, confidence')
          .eq('platform_user_id', selected.psid).not('khach_hang_id', 'is', null)
          .order('confidence', { ascending: false }).limit(1).maybeSingle()
        if (ident?.khach_hang_id) khId = ident.khach_hang_id
        if (ident?.phone_norm) phone = ident.phone_norm
      }
      if (!phone) { for (const m of selected.msgs) { const p = extractPhoneLite(m.noi_dung); if (p) { phone = p; break } } }
      if (!phone && !khId && selected.psid) {
        const { data: seg } = await supabase.from('marketing_fanpage_customer_segments')
          .select('phone_norm').eq('platform_user_id', selected.psid).not('phone_norm', 'is', null).limit(1).maybeSingle()
        if (seg?.phone_norm) phone = seg.phone_norm
      }
      // Đọc hồ sơ giàu: thẻ đang có, dịch vụ đã dùng, lần cuối ghé, gợi ý upsell
      let intel = null
      if (khId) {
        const { data } = await supabase.from('v_customer_pos_intelligence').select('*').eq('khach_hang_id', khId).limit(1).maybeSingle()
        intel = data
      }
      if (!intel && phone) {
        const { data } = await supabase.from('v_customer_pos_intelligence').select('*').eq('phone_norm', phone).limit(1).maybeSingle()
        intel = data
      }
      if (!alive) return
      if (intel) setProfile({ is_new: false, phone: intel.so_dien_thoai || phone, intel })
      else setProfile({ is_new: true, phone })
    })()
    return () => { alive = false }
  }, [selId, convos])

  // ── GỢI Ý AI BÁM CẢ HỘI THOẠI ── gọi edge function suggest_reply mỗi khi mở khách mới.
  const loadAI = useCallback(async (conv) => {
    if (!conv) { setAi({ loading: false, reply: '', note: '', error: null }); return }
    setAi({ loading: true, reply: '', note: '', error: null })
    try {
      const msgs = conv.msgs.map(m => ({ direction: m.direction, sender_type: m.sender_type, noi_dung: m.noi_dung }))
      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { mode: 'suggest_reply', messages: msgs, platform_user_id: conv.psid || null },
      })
      if (error) throw error
      setAi({ loading: false, reply: data?.reply || '', note: data?.note || '', error: data?.error || null })
      setDraft(prev => prev && prev.trim() ? prev : (data?.reply || ''))
    } catch (e) {
      setAi({ loading: false, reply: '', note: '', error: e.message || String(e) })
    }
  }, [])

  useEffect(() => { setDraft(''); loadAI(selected) }, [selId, selected, loadAI])

  async function sendReply() {
    if (!draft.trim()) { notify('Chưa có nội dung tin nhắn', 'error'); return }
    if (!selected?.psid) { notify('Chưa xác định được người nhận — hãy Chép tin để gửi tay', 'error'); return }
    setSending(true)
    try {
      const fnName = selected.kenh === 'zalo' ? 'zalo-webhook' : 'marketing-meta-page-sync'
      const body = selected.kenh === 'zalo'
        ? { mode: 'send_message', user_id: selected.psid, text: draft.trim() }
        : { mode: 'send_message', recipient_id: selected.psid, message: draft.trim(), kenh: selected.kenh }
      const { error } = await supabase.functions.invoke(fnName, { body })
      if (error) throw error
      notify('Đã gửi tin cho khách', 'success')
      setNonce(n => n + 1)
    } catch (e) {
      notify(`Chưa gửi được qua HSMS (${e.message || e}). Hãy bấm Chép để gửi tay.`, 'error')
    } finally { setSending(false) }
  }

  const copy = (t) => { navigator.clipboard?.writeText(t || ''); notify('Đã chép', 'success') }

  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'inbox')} />
      <div className="mkt-soft" style={{
        border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10,
        padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: C.textSub, lineHeight: 1.5,
      }}>
        💬 Hội thoại có tin trong {INBOX_DAYS} ngày gần đây (khách cũ hơn nằm ở mục Khách & Remarketing). Khách đang chờ trả lời được đẩy lên đầu.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,.8fr) minmax(0,1.4fr) minmax(260px,.9fr)', gap: 14, minHeight: 560 }}>
        {/* Cột trái: danh sách hội thoại */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 900, color: C.text }}>
            Cần trả lời {convos.filter(c => c.unreplied).length > 0 && <span style={{ color: C.chi }}>· {convos.filter(c => c.unreplied).length}</span>}
          </div>
          <div style={{ overflow: 'auto', maxHeight: 560 }}>
            {loading ? <EmptyBox text="Đang tải hội thoại…" />
              : convos.length === 0 ? <EmptyBox text={`Chưa có hội thoại trong ${INBOX_DAYS} ngày. Khi khách nhắn Fanpage/Zalo, hội thoại sẽ hiện ở đây.`} />
                : convos.map(c => {
                  const active = c.cid === selId
                  return (
                    <button key={c.cid} onClick={() => setSelId(c.cid)} style={{
                      width: '100%', textAlign: 'left', cursor: 'pointer', padding: '11px 13px',
                      border: 'none', borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${active ? C.primary : 'transparent'}`,
                      background: active ? `${C.primary}0C` : '#fff',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <strong style={{ color: C.text, fontSize: 13 }}>{c.name}</strong>
                        {c.unreplied && <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: C.chi, borderRadius: 99, padding: '2px 7px' }}>Chờ</span>}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 12, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.last.direction === 'outbound' ? 'Bạn: ' : ''}{(c.last.noi_dung || '(đính kèm)').slice(0, 50)}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 10.5, color: C.textMute }}>{c.kenh === 'zalo' ? 'Zalo' : 'Facebook'} · {fmtDateTime(c.lastAt)}</div>
                    </button>
                  )
                })}
          </div>
        </div>

        {/* Cột giữa: hội thoại + soạn tin */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? <EmptyBox text="Chọn một khách bên trái để xem hội thoại." />
            : (
              <>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 900, color: C.text }}>
                  {selected.name} <span style={{ fontWeight: 600, fontSize: 12, color: C.textSub }}>· {selected.kenh === 'zalo' ? 'Zalo' : 'Facebook'}</span>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380 }}>
                  {selected.msgs.map(m => (
                    <div key={m.id} style={{ alignSelf: m.direction === 'outbound' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                      <div style={{
                        background: m.direction === 'outbound' ? C.primary : '#F1ECE4', color: m.direction === 'outbound' ? '#fff' : C.text,
                        borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.45,
                      }}>{m.noi_dung || '(đính kèm/hình ảnh)'}</div>
                      <div style={{ fontSize: 10, color: C.textMute, marginTop: 2, textAlign: m.direction === 'outbound' ? 'right' : 'left' }}>{fmtDateTime(m.created_at)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, padding: 12 }}>
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Soạn tin trả lời khách… (gợi ý AI đã điền sẵn nếu có)"
                    style={{ width: '100%', minHeight: 70, borderRadius: 8, border: `1px solid ${C.border}`, padding: 10, fontSize: 13, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => copy(draft)} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Chép</button>
                    <button onClick={sendReply} disabled={sending} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '8px 16px', fontWeight: 800, fontSize: 13, cursor: sending ? 'wait' : 'pointer' }}>
                      {sending ? 'Đang gửi…' : 'Gửi từ HSMS'}
                    </button>
                  </div>
                </div>
              </>
            )}
        </div>

        {/* Cột phải: hồ sơ khách + gợi ý AI */}
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <Panel title="Khách này là ai" eyebrow="Nhận diện HSMS">
            {!selected ? <span style={{ color: C.textSub, fontSize: 13 }}>—</span>
              : !profile ? <span style={{ color: C.textSub, fontSize: 13 }}>Đang tra hồ sơ…</span>
                : profile.is_new
                  ? <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                      <b style={{ color: C.text }}>{profile.phone ? 'Có SĐT, chưa có hồ sơ HSMS' : 'Khách mới — chưa rõ SĐT'}</b><br />
                      {profile.phone ? `SĐT: ${profile.phone}. Nên tạo hồ sơ trước khi tư vấn sâu.` : 'Mục tiêu đầu tiên: xin SĐT / mời Quan Tâm Zalo.'}
                    </div>
                  : (() => {
                      const k = profile.intel
                      const Row = ({ label, value }) => value ? (
                        <div style={{ marginTop: 7 }}>
                          <div style={{ fontWeight: 800, fontSize: 11, color: C.textMute, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
                          <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{value}</div>
                        </div>
                      ) : null
                      return (
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                          <b style={{ fontSize: 14 }}>{k.ho_ten || 'Khách'}</b> · <span style={{ color: C.thu, fontWeight: 800 }}>Khách cũ</span><br />
                          <span style={{ color: C.textSub }}>SĐT {k.so_dien_thoai || profile.phone || '—'} · {Number(k.so_don || 0)} đơn · {fmtMoney(k.tong_chi_tieu)}</span><br />
                          <span style={{ color: C.textSub }}>Lần cuối ghé: {k.lan_cuoi_den ? fmtDate(k.lan_cuoi_den) : '—'}</span>
                          {Number(k.so_the_active || 0) > 0 && (
                            <div style={{ marginTop: 7, background: `${C.thu}10`, border: `1px solid ${C.thu}30`, borderRadius: 8, padding: '7px 10px' }}>
                              <div style={{ fontWeight: 800, fontSize: 11, color: C.thu, textTransform: 'uppercase', letterSpacing: '.06em' }}>🎫 Thẻ đang có ({k.so_the_active}) · còn {Number(k.tong_buoi_con || 0)} buổi</div>
                              {k.the_dang_co && <div style={{ fontSize: 12.5, color: C.text, marginTop: 3, lineHeight: 1.5 }}>{k.the_dang_co}</div>}
                            </div>
                          )}
                          <Row label="Thói quen — dịch vụ hay dùng" value={k.dich_vu_da_dung} />
                          <Row label="Dịch vụ gần nhất" value={k.dich_vu_gan_nhat} />
                          <Row label="Nên tư vấn / upsell" value={k.goi_y_upsell || k.muc_tieu_tu_van} />
                          <Row label="Ghi chú da liễu" value={k.ghi_chu_da_lieu} />
                        </div>
                      )
                    })()}
          </Panel>
          <Panel title="Gợi ý trả lời (AI)" eyebrow="DeepSeek · bám hội thoại">
            {ai.loading
              ? <span style={{ color: C.textSub, fontSize: 13 }}>🤖 AI đang đọc cả hội thoại để gợi ý…</span>
              : ai.reply
                ? <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, background: '#FFFDF8', border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>{ai.reply}</div>
                    {ai.note && <div style={{ fontSize: 11.5, color: C.textMute, fontStyle: 'italic', lineHeight: 1.4 }}>Vì sao: {ai.note}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDraft(ai.reply)} style={{ flex: 1, border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>Dùng gợi ý</button>
                      <button onClick={() => loadAI(selected)} title="Tạo lại gợi ý" style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>↻</button>
                    </div>
                  </div>
                : <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                    {ai.error ? `Chưa tạo được gợi ý (${ai.error}).` : 'Chưa có gợi ý.'}
                    <button onClick={() => loadAI(selected)} style={{ display: 'block', marginTop: 8, border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>Thử tạo gợi ý</button>
                  </div>}
          </Panel>
          {selected && (
            <button onClick={openDatHen} style={{
              border: 'none', background: C.grad, color: '#fff', borderRadius: 10, padding: '12px 16px',
              fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: C.shadowSm,
            }}>📅 Đặt lịch cho khách này</button>
          )}
        </div>
      </div>
      {datHen && (
        <ModalDatHen
          initial={datHen}
          ktvList={ktvList}
          onSave={() => { setDatHen(null); notify('Đã đặt lịch hẹn cho khách', 'success') }}
          onClose={() => setDatHen(null)}
          user={null}
        />
      )}
    </Shell>
  )
}

// ── KHÁCH & REMARKETING ── danh sách khách tiềm năng (AI đọc tin thật), ưu tiên 2026, lọc rác, mời quay lại.
function RemarketingPage() {
  const [nam, setNam] = useState('2026')
  const [nhom, setNhom] = useState('tat_ca')   // tat_ca | tiem_nang | da_den
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ analyzed: 0, total: 0 })
  const [mining, setMining] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const applyNam = (q) => nam === 'tat_ca' ? q : (nam === 'older' ? q.lt('nam_tin_cuoi', 2025) : q.eq('nam_tin_cuoi', Number(nam)))
        let q = supabase.from('marketing_fanpage_customer_segments')
          .select('id, display_name, phone_norm, priority_score, services_interest, suggested_action, suggested_script, ai_tom_tat, da_den_spa, care_status, last_message_at')
          .not('ai_reanalyzed_at', 'is', null).neq('care_status', 'tam_ngung')
          .order('priority_score', { ascending: false }).order('last_message_at', { ascending: false }).limit(150)
        q = applyNam(q)
        if (nhom === 'da_den') q = q.eq('da_den_spa', true)
        else if (nhom === 'tiem_nang') q = q.gte('priority_score', 60)
        const { data } = await q
        // tiến độ: đã phân tích vs tổng có SĐT theo năm đang lọc
        let ct = supabase.from('marketing_fanpage_customer_segments').select('id', { count: 'exact', head: true }).eq('has_phone', true)
        ct = applyNam(ct)
        const { count: total } = await ct
        let ca = supabase.from('marketing_fanpage_customer_segments').select('id', { count: 'exact', head: true }).eq('has_phone', true).not('ai_reanalyzed_at', 'is', null)
        ca = applyNam(ca)
        const { count: analyzed } = await ca
        if (alive) { setRows(data || []); setProgress({ analyzed: analyzed || 0, total: total || 0 }); setLoading(false) }
      } catch (e) { if (alive) { setLoading(false); notify(`Lỗi tải: ${e.message || e}`, 'error') } }
    })()
    return () => { alive = false }
  }, [nam, nhom, nonce])

  async function phanTichThem() {
    setMining(true)
    try {
      const { data, error } = await supabase.functions.invoke('marketing-ai', { body: { mode: 'reclassify_leads', limit: 3, since: nam === 'tat_ca' ? '2019-01-01' : (nam === 'older' ? '2019-01-01' : `${nam}-01-01`) } })
      if (error) throw error
      notify(`Đã phân tích thêm ${data?.analyzed || 0} khách`, 'success')
      setNonce(n => n + 1)
    } catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') } finally { setMining(false) }
  }

  async function loaiBo(r) {
    try {
      await supabase.from('marketing_fanpage_customer_segments').update({ care_status: 'tam_ngung' }).eq('id', r.id)
      setRows(rs => rs.filter(x => x.id !== r.id))
      notify('Đã loại khỏi danh sách', 'success')
    } catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') }
  }

  const namTabs = [['2026', '2026'], ['2025', '2025'], ['Cũ hơn', 'older'], ['Tất cả', 'tat_ca']]
  const nhomTabs = [['Tất cả', 'tat_ca'], ['Tiềm năng cao', 'tiem_nang'], ['Đã đến Hannah', 'da_den']]
  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'remarketing')} />
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        💎 AI đọc tin thật của từng khách để chấm điểm tiềm năng + soạn sẵn tin mời quay lại. Ưu tiên 2026 (khách gần đây = nóng nhất). Khách rác/không nhu cầu đã tự lọc bỏ. Bấm <b>Chép</b> để gửi qua Zalo/SĐT.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.textMute }}>Thời gian:</span>
        {namTabs.map(([label, v]) => (
          <button key={v} onClick={() => setNam(v)} style={{ border: `1px solid ${nam === v ? C.primary : C.border}`, background: nam === v ? C.primary : '#fff', color: nam === v ? '#fff' : C.text, borderRadius: 8, padding: '6px 13px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.textMute }}>Nhóm:</span>
        {nhomTabs.map(([label, v]) => (
          <button key={v} onClick={() => setNhom(v)} style={{ border: `1px solid ${nhom === v ? '#8A6A6E' : C.border}`, background: nhom === v ? '#8A6A6E' : '#fff', color: nhom === v ? '#fff' : C.text, borderRadius: 99, padding: '6px 13px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>{label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.textSub }}>Đã phân tích {progress.analyzed}/{progress.total} khách (tự chạy nền)</span>
          <button onClick={phanTichThem} disabled={mining} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 12.5, cursor: mining ? 'wait' : 'pointer' }}>{mining ? 'Đang phân tích…' : '⚡ Phân tích thêm'}</button>
        </div>
      </div>

      {loading ? <EmptyBox text="Đang tải danh sách…" />
        : rows.length === 0 ? <EmptyBox text={progress.analyzed === 0 ? 'Chưa có khách nào được phân tích cho bộ lọc này. Bấm "Phân tích thêm" hoặc chờ hệ thống tự chạy.' : 'Không có khách tiềm năng trong bộ lọc này (rác đã bị loại).'} />
          : <div style={{ display: 'grid', gap: 12 }}>
              {rows.map(r => {
                const dv = Array.isArray(r.services_interest) ? r.services_interest.join(', ') : ''
                const diem = Number(r.priority_score || 0)
                const mau = diem >= 60 ? C.thu : diem >= 40 ? C.gold : C.textMute
                return (
                  <div key={r.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: '#fff', padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: C.text, fontFamily: FONT.serif }}>
                          {r.display_name || 'Khách'}
                          {r.phone_norm && <span style={{ fontWeight: 600, fontSize: 12.5, color: C.textSub }}> · {r.phone_norm}</span>}
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: '#fff', background: mau, borderRadius: 99, padding: '2px 9px' }}>điểm {diem}</span>
                          {r.da_den_spa && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: '#fff', background: '#1A5276', borderRadius: 99, padding: '2px 9px' }}>Đã đến Hannah</span>}
                        </div>
                        {dv && <div style={{ fontSize: 12.5, color: C.primary, marginTop: 3, fontWeight: 700 }}>Quan tâm: {dv}</div>}
                        {r.ai_tom_tat && <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 3, lineHeight: 1.5 }}>{r.ai_tom_tat}</div>}
                      </div>
                      <button onClick={() => loaiBo(r)} title="Loại khỏi danh sách (rác/không nhu cầu)" style={{ border: `1px solid ${C.chi}40`, background: '#fff', color: C.chi, borderRadius: 7, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Loại bỏ</button>
                    </div>
                    {r.suggested_action && <div style={{ marginTop: 8, fontSize: 12.5, color: C.text }}><b style={{ color: C.textMute }}>Việc cần làm:</b> {r.suggested_action}</div>}
                    {r.suggested_script && (
                      <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55, background: '#FFFDF8', border: `1px solid ${C.border}`, borderRadius: 8, padding: 11 }}>{r.suggested_script}</div>
                        <button onClick={() => { navigator.clipboard?.writeText(r.suggested_script); notify('Đã chép tin mời — dán vào Zalo/SMS gửi khách', 'success') }} style={{ justifySelf: 'start', border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '7px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>📋 Chép tin mời quay lại</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>}
    </Shell>
  )
}

// ── VIỆC B: CHĂM SÓC SAU DỊCH VỤ (giai đoạn 1) ── khách đến hôm qua → AI soạn tin → lễ tân gửi tay.
const LIEU_TRINH_DM = ['Triệt Lông', 'Chăm Sóc Da Mặt', 'PEEL DA SINH HỌC', 'Tắm Trắng Toàn Thân', 'Công Nghệ Cao - Laser', 'Phun Xăm']

function ymdVN(offsetDays = 0) {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function AfterCarePage() {
  const [ngay, setNgay] = useState(ymdVN(-1))   // mặc định hôm qua
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiById, setAiById] = useState({})       // don_hang_id -> { loading, reply, note }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const { data: dons } = await supabase.from('don_hang')
          .select('id, ma_don, ngay, khach_hang_id, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
          .eq('ngay', ngay).eq('is_test', false).neq('trang_thai', 'huy')
          .not('khach_hang_id', 'is', null).order('created_at', { ascending: false }).limit(120)
        const ids = (dons || []).map(d => d.id)
        let ctMap = {}, logSet = new Set()
        if (ids.length) {
          const { data: cts } = await supabase.from('don_hang_chi_tiet')
            .select('don_hang_id, the_lieu_trinh_id, dich_vu:dich_vu_id(ten, danh_muc)').in('don_hang_id', ids)
          for (const c of (cts || [])) {
            if (!ctMap[c.don_hang_id]) ctMap[c.don_hang_id] = []
            ctMap[c.don_hang_id].push(c)
          }
          const { data: logs } = await supabase.from('marketing_aftercare_log').select('don_hang_id').in('don_hang_id', ids)
          for (const l of (logs || [])) logSet.add(l.don_hang_id)
        }
        const list = (dons || []).map(d => {
          const cts = ctMap[d.id] || []
          const dvNames = [...new Set(cts.map(c => c.dich_vu?.ten).filter(Boolean))]
          const laLieuTrinh = cts.some(c => c.the_lieu_trinh_id || LIEU_TRINH_DM.includes(c.dich_vu?.danh_muc))
          return {
            id: d.id, ma_don: d.ma_don, khach_hang_id: d.khach_hang_id,
            ten: d.khach_hang?.ho_ten || 'Khách lẻ', sdt: d.khach_hang?.so_dien_thoai || '',
            dichVu: dvNames.join(', ') || '(không rõ dịch vụ)', laLieuTrinh, daCham: logSet.has(d.id),
          }
        }).filter(r => r.sdt) // chỉ khách có SĐT để nhắn được
        if (alive) { setRows(list); setLoading(false) }
      } catch (e) { if (alive) { setLoading(false); notify(`Lỗi tải: ${e.message || e}`, 'error') } }
    })()
    return () => { alive = false }
  }, [ngay])

  async function soanTin(r) {
    setAiById(s => ({ ...s, [r.id]: { loading: true } }))
    try {
      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { mode: 'care_message', khach_hang_id: r.khach_hang_id, ten_khach: r.ten, dich_vu_da_lam: r.dichVu, la_lieu_trinh: r.laLieuTrinh },
      })
      if (error) throw error
      setAiById(s => ({ ...s, [r.id]: { loading: false, reply: data?.reply || '', note: data?.note || '' } }))
    } catch (e) {
      setAiById(s => ({ ...s, [r.id]: { loading: false, error: e.message || String(e) } }))
    }
  }

  async function danhDauCham(r) {
    const ai = aiById[r.id]
    try {
      await supabase.from('marketing_aftercare_log').upsert({
        don_hang_id: r.id, khach_hang_id: r.khach_hang_id, ngay_den: ngay, da_cham: true,
        kenh: 'zalo', noi_dung: ai?.reply || null,
      }, { onConflict: 'don_hang_id' })
      setRows(rs => rs.map(x => x.id === r.id ? { ...x, daCham: true } : x))
      notify('Đã đánh dấu chăm sóc', 'success')
    } catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') }
  }

  const chuaCham = rows.filter(r => !r.daCham)
  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'aftercare')} />
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        💚 Khách đến làm dịch vụ ngày đã chọn. Bấm <b>AI soạn tin</b> → kiểm tra → <b>Chép</b> gửi qua Zalo/SĐT của khách → <b>Đánh dấu đã chăm</b>. Hệ thống ghi nhớ để không chăm trùng/bỏ sót.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['Hôm qua', ymdVN(-1)], ['Hôm nay', ymdVN(0)], ['Hôm kia', ymdVN(-2)]].map(([label, v]) => (
          <button key={v} onClick={() => setNgay(v)} style={{
            border: `1px solid ${ngay === v ? C.primary : C.border}`, background: ngay === v ? C.primary : '#fff',
            color: ngay === v ? '#fff' : C.text, borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}>{label}</button>
        ))}
        <span style={{ fontSize: 12.5, color: C.textSub, marginLeft: 4 }}>{fmtDate(ngay)} · {chuaCham.length} khách chưa chăm / {rows.length} tổng</span>
      </div>

      {loading ? <EmptyBox text="Đang tải danh sách khách…" />
        : rows.length === 0 ? <EmptyBox text="Không có khách (có SĐT) đến trong ngày này." />
          : <div style={{ display: 'grid', gap: 12 }}>
              {rows.map(r => {
                const ai = aiById[r.id]
                return (
                  <div key={r.id} style={{ border: `1px solid ${r.daCham ? C.thu + '40' : C.border}`, borderRadius: 12, background: r.daCham ? `${C.thu}08` : '#fff', padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: C.text, fontFamily: FONT.serif }}>
                          {r.ten} <span style={{ fontWeight: 600, fontSize: 12.5, color: C.textSub }}>· {r.sdt}</span>
                          {r.laLieuTrinh && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, color: C.primary, background: `${C.primary}14`, borderRadius: 99, padding: '2px 9px' }}>Liệu trình</span>}
                          {r.daCham && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: '#fff', background: C.thu, borderRadius: 99, padding: '2px 9px' }}>Đã chăm</span>}
                        </div>
                        <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 3 }}>Đã làm: {r.dichVu}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => soanTin(r)} disabled={ai?.loading} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12.5, cursor: ai?.loading ? 'wait' : 'pointer' }}>
                          {ai?.loading ? 'AI đang soạn…' : ai?.reply ? '↻ Soạn lại' : '✨ AI soạn tin'}
                        </button>
                      </div>
                    </div>
                    {ai?.reply && (
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55, background: '#FFFDF8', border: `1px solid ${C.border}`, borderRadius: 8, padding: 11 }}>{ai.reply}</div>
                        {ai.note && <div style={{ fontSize: 11.5, color: C.textMute, fontStyle: 'italic' }}>Vì sao: {ai.note}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { navigator.clipboard?.writeText(ai.reply); notify('Đã chép — dán vào Zalo/SMS gửi khách', 'success') }} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>📋 Chép tin</button>
                          {!r.daCham && <button onClick={() => danhDauCham(r)} style={{ border: 'none', background: C.thu, color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>✓ Đánh dấu đã chăm</button>}
                        </div>
                      </div>
                    )}
                    {ai?.error && <div style={{ marginTop: 8, fontSize: 12.5, color: C.chi }}>Lỗi soạn tin: {ai.error}</div>}
                  </div>
                )
              })}
            </div>}
    </Shell>
  )
}

// ── B/Chặng 3: TRANG HUẤN LUYỆN AI ── sửa hiến pháp tư vấn + duyệt mẫu vàng học từ lễ tân.
const TOPIC_LABEL = {
  triet_long: 'Triệt lông', da_mat: 'Da mặt / mụn / nám', massage: 'Massage', goi: 'Gội dưỡng sinh',
  tam_trang: 'Tắm trắng', phun_xam: 'Phun xăm', gia: 'Hỏi giá', dat_lich: 'Đặt lịch', khac: 'Khác',
}

function TrainingPage() {
  const [tab, setTab] = useState('playbook')
  return (
    <Shell>
      <Header route={MARKETING_ROUTES.find(r => r.key === 'training')} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['playbook', '📜 Hiến pháp tư vấn'], ['examples', '🏅 Mẫu vàng (AI học)'], ['promo', '🏷️ Khuyến mãi']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            border: `1px solid ${tab === k ? C.primary : C.border}`, background: tab === k ? C.primary : '#fff',
            color: tab === k ? '#fff' : C.text, borderRadius: 9, padding: '9px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>
      {tab === 'playbook' && <PlaybookEditor />}
      {tab === 'examples' && <GoldExamples />}
      {tab === 'promo' && <PromoLink />}
    </Shell>
  )
}

function PlaybookEditor() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exists, setExists] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase.from('marketing_ai_config').select('value').eq('key', 'sales_playbook').maybeSingle()
        if (!alive) return
        if (data?.value) { setText(data.value); setExists(true) }
      } catch { /* ignore */ }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  async function save() {
    if (text.trim().length < 50) { notify('Hiến pháp quá ngắn — cần ít nhất vài dòng', 'error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('marketing_ai_config')
        .upsert({ key: 'sales_playbook', value: text, mo_ta: 'Hiến pháp tư vấn AI Marketing', updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
      setExists(true)
      notify('Đã lưu — AI áp dụng trong vòng 5 phút', 'success')
    } catch (e) { notify(`Lưu lỗi: ${e.message || e}`, 'error') } finally { setSaving(false) }
  }

  return (
    <Panel title="Hiến pháp tư vấn" eyebrow="AI đọc mỗi lần gợi ý"
      action={<button onClick={save} disabled={saving || loading} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '9px 18px', fontWeight: 800, fontSize: 13, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Đang lưu…' : 'Lưu'}</button>}>
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        Đây là "bộ não" tư vấn: thương hiệu, giọng nói, nguyên tắc bán, giá, kịch bản. Sửa ở đây xong bấm Lưu — AI tự áp dụng (không cần lập trình viên). {!exists && 'Hiện chưa có bản tùy chỉnh — AI đang dùng bản mặc định cài sẵn; lưu lần đầu để ghi đè.'}
        <br /><b style={{ color: C.primary }}>Gợi ý cần điền:</b> hotline/Zalo chính thức để AI đưa khách; ưu đãi đang chạy; cập nhật giá khi đổi.
      </div>
      {loading ? <EmptyBox text="Đang tải hiến pháp…" />
        : <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Nhập hiến pháp tư vấn (để trống = AI dùng bản mặc định)…"
            style={{ width: '100%', minHeight: 460, borderRadius: 8, border: `1px solid ${C.border}`, padding: 14, fontSize: 13, lineHeight: 1.6, resize: 'vertical', fontFamily: FONT.sans }} />}
    </Panel>
  )
}

function GoldExamples() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState('all')
  const [mining, setMining] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        let q = supabase.from('marketing_ai_examples')
          .select('id, chu_de, khach_hoi, le_tan_tra_loi, diem, da_duyet')
          .order('da_duyet', { ascending: false }).order('diem', { ascending: false }).limit(150)
        if (topic !== 'all') q = q.eq('chu_de', topic)
        const { data } = await q
        if (alive) { setRows(data || []); setLoading(false) }
      } catch { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [topic, nonce])

  async function mine() {
    setMining(true)
    try {
      const { data, error } = await supabase.functions.invoke('marketing-ai', { body: { mode: 'mine_examples', days: 180 } })
      if (error) throw error
      notify(`Đã quét: ${data?.saved_new || 0} mẫu mới (xét ${data?.candidates || 0} ứng viên)`, 'success')
      setNonce(n => n + 1)
    } catch (e) { notify(`Quét lỗi: ${e.message || e}`, 'error') } finally { setMining(false) }
  }

  async function setDuyet(id, val) {
    try {
      await supabase.from('marketing_ai_examples').update({ da_duyet: val }).eq('id', id)
      setRows(rs => rs.map(r => r.id === id ? { ...r, da_duyet: val } : r))
    } catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') }
  }
  async function del(id) {
    try { await supabase.from('marketing_ai_examples').delete().eq('id', id); setRows(rs => rs.filter(r => r.id !== id)) }
    catch (e) { notify(`Lỗi: ${e.message || e}`, 'error') }
  }

  const duyetCount = rows.filter(r => r.da_duyet).length
  return (
    <Panel title="Mẫu vàng — AI học từ lễ tân giỏi" eyebrow={`${rows.length} mẫu · ${duyetCount} đã duyệt`}
      action={<button onClick={mine} disabled={mining} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '9px 16px', fontWeight: 800, fontSize: 13, cursor: mining ? 'wait' : 'pointer' }}>{mining ? 'Đang quét…' : '↻ Quét mẫu mới'}</button>}>
      <div className="mkt-soft" style={{ border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.6)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
        Đây là các đoạn lễ tân thật trả lời tốt (tự quét mỗi 6 giờ). AI dùng làm ví dụ để bắt chước cách bán của Hannah. <b style={{ color: C.thu }}>Duyệt</b> mẫu hay để ưu tiên cho AI học; <b style={{ color: C.chi }}>Xóa</b> mẫu dở.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['all', ...Object.keys(TOPIC_LABEL)].map(t => (
          <button key={t} onClick={() => setTopic(t)} style={{
            border: `1px solid ${topic === t ? C.primary : C.border}`, background: topic === t ? `${C.primary}12` : '#fff',
            color: topic === t ? C.primary : C.textSub, borderRadius: 99, padding: '5px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>{t === 'all' ? 'Tất cả' : TOPIC_LABEL[t]}</button>
        ))}
      </div>
      {loading ? <EmptyBox text="Đang tải mẫu…" />
        : rows.length === 0 ? <EmptyBox text="Chưa có mẫu. Bấm “Quét mẫu mới” để AI học từ hội thoại thật." />
          : <div style={{ display: 'grid', gap: 10 }}>
              {rows.map(r => (
                <div key={r.id} style={{ border: `1px solid ${r.da_duyet ? C.thu + '40' : C.border}`, borderRadius: 10, background: r.da_duyet ? `${C.thu}08` : '#fff', padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: C.primary, background: `${C.primary}12`, borderRadius: 99, padding: '2px 9px' }}>{TOPIC_LABEL[r.chu_de] || r.chu_de}</span>
                      <span style={{ fontSize: 11, color: C.textMute }}>điểm {r.diem}</span>
                      {r.da_duyet && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: C.thu, borderRadius: 99, padding: '2px 9px' }}>Đã duyệt</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setDuyet(r.id, !r.da_duyet)} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 7, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{r.da_duyet ? 'Bỏ duyệt' : 'Duyệt'}</button>
                      <button onClick={() => del(r.id)} style={{ border: `1px solid ${C.chi}40`, background: '#fff', color: C.chi, borderRadius: 7, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Xóa</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}><b style={{ color: C.text }}>Khách:</b> {r.khach_hoi}</div>
                  <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginTop: 4 }}><b style={{ color: C.thu }}>Lễ tân:</b> {r.le_tan_tra_loi}</div>
                </div>
              ))}
            </div>}
    </Panel>
  )
}

function PromoLink() {
  return (
    <Panel title="Khuyến mãi đang chạy" eyebrow="AI báo đúng giá KM">
      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.7 }}>
        AI tự đọc các chương trình khuyến mãi <b>đang chạy</b> để báo đúng giá cho khách (vd Massage cổ vai gáy 99k thay vì 159k).
        <br /><br />
        Anh quản lý khuyến mãi ở trang <b>Khuyến Mãi</b> — thêm chương trình, đặt giá gốc / giá KM, thời gian và trạng thái “Đang chạy”. AI cập nhật trong vòng 5 phút.
        <div style={{ marginTop: 14 }}>
          <button onClick={() => go('/admin/khuyen-mai')} style={{ border: 'none', background: C.grad, color: '#fff', borderRadius: 8, padding: '10px 20px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>Mở trang Khuyến Mãi →</button>
        </div>
      </div>
    </Panel>
  )
}

export default function MarketingModulePage() {
  const path = window.location.pathname
  // URL cũ đã gỡ khỏi menu → điều hướng về đúng chỗ
  if (path.startsWith('/admin/marketing/khach-tiem-nang')) { go('/admin/marketing/khach-remarketing'); return null }
  if (
    path.startsWith('/admin/marketing/nhac-lich-lieu-trinh') ||
    path.startsWith('/admin/marketing/bao-cao-nhan-vien')
  ) { go('/admin/cham-soc-khach'); return null }

  const route = getRoute()

  if (route.key === 'overview') return <Overview />
  if (route.key === 'inbox') return <InboxPage />
  if (route.key === 'remarketing') return <RemarketingPage />
  if (route.key === 'aftercare') return <AfterCarePage />
  if (route.key === 'fanpage') return <FanpageContentPage route={route} />
  if (route.key === 'training') return <TrainingPage />
  if (route.key === 'settings') return <ChannelSettingsPage route={route} />
  // Chiến dịch: truy cập trực tiếp (gộp trong Fanpage & Chiến Dịch)
  if (path.startsWith('/admin/marketing/chien-dich')) {
    return <CampaignsPage route={MARKETING_ROUTES.find(r => r.key === 'fanpage')} />
  }

  return <Overview />
}
