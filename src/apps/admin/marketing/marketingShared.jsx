/* eslint-disable react-refresh/only-export-components -- file shared: export cả constants lẫn components */
// ═══════════════════════════════════════════════════════════════════════════
// Marketing — shared constants, helpers, UI primitives
// Tách từ MarketingModulePage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { C, FONT } from '../../../constants/colors'
import { supabase } from '../../../lib/supabase'

export const MARKETING_ROUTES = [
  // KHUNG 5 MỤC (15/07): mục hidden:true = bỏ khỏi menu/Overview nhưng GIỮ route
  // (URL cũ sống, Header các trang cũ vẫn tìm được route object).
  {
    key: 'overview',
    path: '/admin/marketing',
    title: 'Báo Cáo Marketing',
    short: 'Báo Cáo',
    subtitle: 'Sáu con số ĐỘNG của hôm nay — mỗi số bấm vào là tới đúng việc cần làm.',
    owner: 'Chủ / quản lý',
    status: 'Báo cáo',
    accent: C.gold,
    metrics: ['Tin chưa trả lời', 'ZNS hôm nay', 'Khách quay lại'],
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
    key: 'tu-dong',
    path: '/admin/marketing/tu-dong',
    title: 'Máy Chăm Khách',
    short: 'Máy Chăm Khách',
    subtitle: '4 luồng tự chạy mỗi sáng: chăm sau dịch vụ · nhắc thẻ còn buổi (9h) · win-back voucher (9h15) · mời khách lẻ (9h30). Vào xem hàng đợi, kết quả, ai quay lại.',
    owner: 'Tự động + theo dõi',
    status: 'Đang chạy hằng ngày',
    accent: '#16A085',
    metrics: ['4 luồng ZNS', 'Tự gửi mỗi sáng', 'Đo khách quay lại'],
  },
  {
    hidden: true,
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
    hidden: true,
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
    title: 'Máy Đăng Bài',
    short: 'Máy Đăng Bài',
    subtitle: 'AI tự soạn bài từ dữ liệu thật (2 ngày/bài, giờ vàng) — anh duyệt tại đây hoặc trên Telegram, đến giờ máy tự đăng lên Fanpage.',
    owner: 'Chủ / marketing',
    status: 'Đang chạy',
    accent: C.rose,
    metrics: ['Bài chờ duyệt', 'Đã đăng + reach', 'Lịch giờ vàng'],
  },
  {
    hidden: true,
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
    hidden: true,
    key: 'cham-soc-lai',
    path: '/admin/marketing/cham-soc-lai',
    title: 'Chăm Sóc Lại (Thẻ Liệu Trình)',
    short: 'Chăm Sóc Lại',
    subtitle: 'Khách còn buổi thẻ nhưng lâu chưa quay lại — hàng đợi gửi ZNS 40 khách/ngày (9h sáng), chốt lịch 20h30, theo dõi đã gửi/đã xem/quan tâm OA.',
    owner: 'Chủ / lễ tân',
    status: 'Giữ chân khách',
    accent: '#C0392B',
    metrics: ['40 khách/ngày', 'Đã xem / Quan tâm', 'Cũ – Mới'],
  },
  {
    hidden: true,
    key: 'winback',
    path: '/admin/marketing/win-back',
    title: 'Win-back Khách Lạnh (Voucher)',
    short: 'Win-back Khách Lạnh',
    subtitle: 'Khách đã mua thẻ nhưng >90 ngày chưa đến — gửi voucher mã riêng theo sở thích (Da 50% / Thư Giãn 40% / Triệt 70%), 50 khách/ngày, ưu tiên 2026→2023.',
    owner: 'Chủ / marketing',
    status: 'Khai thác mỏ vàng',
    accent: '#8E44AD',
    metrics: ['462 khách lạnh', 'Voucher mã riêng', 'Đo ai đến nhờ mã'],
  },
  {
    hidden: true,
    key: 'khach-le',
    path: '/admin/marketing/khach-le',
    title: 'Mời Khách Lẻ Quay Lại',
    short: 'Khách Lẻ Quay Lại',
    subtitle: 'Khách từng đến nhưng chưa mua gói, >30 ngày chưa quay lại — mời quay lại dùng dịch vụ họ yêu thích. Ưu tiên khách đến nhiều lần, 50 khách/ngày.',
    owner: 'Chủ / marketing',
    status: 'Kéo khách lẻ về',
    accent: '#16A085',
    metrics: ['3.079 khách lẻ', 'Ưu tiên trung thành', 'Mời quay lại'],
  },
  {
    key: 'settings',
    path: '/admin/marketing/cau-hinh-kenh',
    title: 'Cấu Hình & Dạy AI',
    short: 'Cấu Hình & Dạy AI',
    subtitle: 'Kết nối Facebook/Zalo, webhook, token, đồng bộ thủ công. Huấn luyện AI tư vấn nằm trong này.',
    owner: 'Chủ / kỹ thuật',
    status: 'Admin',
    accent: C.primary,
    metrics: ['Facebook', 'Zalo', 'Huấn luyện AI'],
  },
]

export const WORKFLOW = [
  'Tin nhắn mới được đưa vào Hộp Thư Khách Hàng.',
  'HSMS tự tìm số điện thoại, ghép hồ sơ khách, thẻ liệu trình và lịch sử mua.',
  'Hệ thống đưa ra việc cần làm: xin SĐT, chốt lịch, quản lý đọc trước hoặc chăm lại.',
  'Lễ tân nhắn ngay trong HSMS, kết quả được ghi vào báo cáo nhân viên.',
  'Sau khi khách đến spa, hệ thống tạo lịch chăm sóc lại và gợi ý bán thêm phù hợp.',
]

export const CONTENT_THEMES = [
  { theme: 'Massage cổ vai gáy', angle: 'Đau mỏi do ngồi làm việc, cần thư giãn nhanh', format: 'Reel ngắn + ảnh feedback', priority: 'Cao' },
  { theme: 'Gội đầu dưỡng sinh', angle: 'Giảm stress, ngủ ngon, phù hợp khách văn phòng', format: 'Album quy trình 5 bước', priority: 'Cao' },
  { theme: 'Triệt lông', angle: 'Nhắc chu kỳ, khách còn buổi, ưu đãi gia hạn', format: 'Bài giải đáp thắc mắc', priority: 'Vừa' },
  { theme: 'Chăm sóc da', angle: 'Da xỉn màu, mụn ẩn, cần soi da trước khi tư vấn', format: 'Before/after có kiểm duyệt', priority: 'Vừa' },
]

export const CHANNEL_CONFIG = [
  { name: 'Facebook Messenger', status: 'Đang dùng', purpose: 'Nhận inbox, gửi tin, phân loại khách, ghép HSMS', risk: 'Cần webhook realtime và lịch sử chat nhẹ' },
  { name: 'Facebook Comment', status: 'Đã có nền', purpose: 'Đọc bình luận, lọc khách hỏi giá/đặt lịch', risk: 'Cần quy tắc ẩn thông tin nhạy cảm' },
  { name: 'Zalo Hotline', status: 'Chưa nối sâu', purpose: 'Khách nhắn/gọi ngoài Fanpage, dùng để chăm lại', risk: 'Cần chọn cách tích hợp Zalo OA/ZNS hoặc nhập thủ công có cấu trúc' },
  { name: 'Điện thoại', status: 'Cần quy trình', purpose: 'Ghi cuộc gọi, kết quả tư vấn, lý do khách chưa đến', risk: 'Cần form ghi nhanh trong HSMS' },
]

export const AUTOMATION_MODES = [
  { mode: 'triage_fanpage', label: 'Quét tin mới', cadence: 'Mỗi 2 phút', healthyMinutes: 8 },
  { mode: 'resolve_conversation_phones', label: 'Quét số điện thoại', cadence: 'Mỗi 15 phút', healthyMinutes: 35 },
  { mode: 'resolve_identities', label: 'Nối định danh', cadence: 'Mỗi giờ', healthyMinutes: 100 },
]

export function fmtNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

export function fmtMoney(value) {
  return `${fmtNumber(value)}₫`
}

export function fmtCompactMoney(value) {
  const n = Number(value || 0)
  if (n >= 1000000000) return `${(n / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`
  if (n >= 1000000) return `${Math.round(n / 1000000).toLocaleString('vi-VN')} triệu`
  return fmtMoney(n)
}

export function fmtDate(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (!y || !m || !d) return raw
  return `${d}/${m}/${y}`
}

export function fmtDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

export function minutesSince(value) {
  if (!value) return null
  const diff = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(diff)) return null
  return Math.max(0, Math.round(diff / 60000))
}
export function channelLabel(value) {
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

export function statusLabel(value) {
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

export function sumRows(rows, field) {
  return rows.reduce((total, row) => total + Number(row?.[field] || 0), 0)
}

export function getRoute() {
  const path = window.location.pathname
  return MARKETING_ROUTES
    .filter(route => path === route.path || path.startsWith(`${route.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0] || MARKETING_ROUTES[0]
}

export function go(path) {
  window.location.href = path
}

export function useMarketingOpsData() {
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

export function Shell({ children }) {
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

export function MetricGrid({ items }) {
  return (
    <div className="mkt-soft" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
      {items.map(item => <KpiCard key={item.label} {...item} />)}
    </div>
  )
}

export function Panel({ title, eyebrow, children, action }) {
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

export function StateNotice({ data }) {
  if (data.loading) {
    return <div style={noticeStyle(C.taiSan)}>Đang tải dữ liệu Marketing...</div>
  }
  if (data.error) {
    return <div style={noticeStyle(C.chi)}>{data.error}</div>
  }
  return null
}

export function noticeStyle(color) {
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

export function Header({ route }) {
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
          href="/admin/marketing/khach-tiem-nang"
          style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: C.primary, textDecoration: 'none', borderTop: `1px dashed ${C.border}`, paddingTop: 8 }}
        >
          👥 Khách tiềm năng · đặt hẹn từ lead
        </a>
      </div>
    </div>
  )
}
export function ModuleCard({ route, index }) {
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

export function SmallBadge({ children, color = C.primary }) {
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

export function AutomationRunCard({ item, run }) {
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

export function EmptyBox({ text }) {
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

export function ActionList({ items }) {
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

export function SegmentRow({ label, value, note, color }) {
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

export const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12.5,
}

export function Th({ children, right = false }) {
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

export function Td({ children, right = false, strong = false, tone = '' }) {
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

export function reactivationLabel(value) {
  const labels = {
    tren_365_ngay: 'Vắng trên 1 năm',
    '180_365_ngay': 'Vắng 6-12 tháng',
    '90_180_ngay': 'Vắng 3-6 tháng',
    '45_90_ngay': 'Vắng 45-90 ngày',
    dang_hoat_dong: 'Đang hoạt động',
  }
  return labels[value] || value || 'Khác'
}

export function fanpageSegmentLabel(value) {
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

export function KpiCard({ label, value, sub, tone }) {
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

export function Funnel({ stages = [], loading = false }) {
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
