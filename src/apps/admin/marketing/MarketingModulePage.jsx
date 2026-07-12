// ═══════════════════════════════════════════════════════════════════════════
// Marketing Module — Tổng Quan + Router (các trang tách file riêng)
// Tách từ MarketingModulePage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { C, FONT } from '../../../constants/colors'
import { LeadOpsPage } from './MarketingOps'
import {
  Funnel, Header, MARKETING_ROUTES, ModuleCard, Shell, StateNotice, WORKFLOW,
  fmtNumber, getRoute, go, sumRows, useMarketingOpsData,
} from './marketingShared'
import { CampaignsPage, ChannelSettingsPage, FanpageContentPage } from './MarketingFanpagePages'
import { InboxPage, RemarketingPage } from './MarketingInboxPages'
import { AutoCampaignsPage, TrainingPage } from './MarketingCarePages'

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

      {/* GỘP 11/07: 3 cụm rõ ràng thay 2 nhóm cũ thiếu mục — thêm card cho các
          trang ngoài MARKETING_ROUTES (Cần Chạm, Chiến Dịch Tự Động, Soạn Tay AI) */}
      {[
        { title: '📥 Khách nhắn đến', desc: 'Trả lời & chốt lịch hằng ngày', items: [
          routes.find(x => x.key === 'inbox'),
        ]},
        { title: '📤 Mình chủ động chăm', desc: 'Gọi/nhắn giữ chân khách — tự động mỗi sáng + thủ công', items: [
          { key: 'can-cham', path: '/admin/cham-soc-khach', title: 'Hôm Nay Cần Chạm', short: 'Hôm Nay Cần Chạm', subtitle: 'Danh sách khách cần gọi/nhắn thủ công hôm nay: hàng đợi Fanpage, khách đã đến, khách cần gọi lại, hiệu quả nhân viên.', owner: 'Lễ tân', status: 'Việc hằng ngày', accent: '#d6336c', metrics: ['Cần chạm hôm nay', 'Khách đã đến', 'Cần gọi lại'] },
          { key: 'tu-dong', path: '/admin/marketing/tu-dong', title: 'Chiến Dịch Tự Động (4 luồng)', short: 'Chiến Dịch Tự Động', subtitle: 'Sau Dịch Vụ · Chăm Sóc Lại thẻ (9h) · Win-back voucher (9h15) · Mời khách lẻ (9h30) — tự chạy mỗi sáng, vào xem kết quả & hàng đợi.', owner: 'Tự động + theo dõi', status: 'Đang chạy hằng ngày', accent: '#16A085', metrics: ['4 luồng ZNS', 'Tự gửi mỗi sáng', 'Theo dõi đã gửi/đã xem'] },
          { key: 'soan-tay', path: '/admin/nhac-lieu-trinh', title: 'Soạn Tay AI (Nhắc Thẻ)', short: 'Soạn Tay AI (Nhắc Thẻ)', subtitle: 'AI soạn tin nhắc thẻ liệu trình cho từng khách — duyệt từng tin rồi gửi, kiểm soát 100% nội dung.', owner: 'Chủ / lễ tân', status: 'Thủ công', accent: '#b08968', metrics: ['AI soạn', 'Duyệt từng tin', 'Gửi lẻ/loạt'] },
        ]},
        { title: '📊 Phân tích & Cấu hình', desc: 'Dành cho chủ / admin', items: [
          routes.find(x => x.key === 'remarketing'),
          routes.find(x => x.key === 'fanpage'),
          routes.find(x => x.key === 'training'),
          routes.find(x => x.key === 'settings'),
        ]},
      ].map(g => (
        <div key={g.title} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: FONT.serif, fontSize: 19, fontWeight: 900, color: C.text }}>{g.title}</span>
            <span style={{ fontSize: 12, color: C.textSub }}>{g.desc}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {g.items.filter(Boolean).map((r, i) => <ModuleCard key={r.key} route={r} index={i} />)}
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
export default function MarketingModulePage() {
  const path = window.location.pathname
  // Khách tiềm năng (lead + đặt hẹn) — port từ bản cũ (03/07), Lễ tân vào được
  if (path.startsWith('/admin/marketing/khach-tiem-nang')) return <LeadOpsPage />
  if (
    path.startsWith('/admin/marketing/nhac-lich-lieu-trinh') ||
    path.startsWith('/admin/marketing/bao-cao-nhan-vien')
  ) { go('/admin/cham-soc-khach'); return null }

  // Chiến dịch: PHẢI check TRƯỚC overview — /chien-dich không nằm trong MARKETING_ROUTES
  // nên getRoute() trả overview và nuốt mất trang này (bug cũ, fix 03/07)
  if (path.startsWith('/admin/marketing/chien-dich')) {
    return <CampaignsPage route={MARKETING_ROUTES.find(r => r.key === 'fanpage')} />
  }

  // Trang gộp Chiến Dịch Tự Động (?tab= để mở thẳng 1 tab)
  if (path.startsWith('/admin/marketing/tu-dong')) {
    const qTab = new URLSearchParams(window.location.search).get('tab')
    return <AutoCampaignsPage initialTab={qTab || 'aftercare'} />
  }

  const route = getRoute()

  if (route.key === 'overview') return <Overview />
  if (route.key === 'inbox') return <InboxPage />
  if (route.key === 'remarketing') return <RemarketingPage />
  // 4 chiến dịch chủ động → trang gộp (URL cũ giữ nguyên, mở đúng tab)
  if (route.key === 'aftercare') return <AutoCampaignsPage initialTab="aftercare" />
  if (route.key === 'cham-soc-lai') return <AutoCampaignsPage initialTab="cham-soc-lai" />
  if (route.key === 'winback') return <AutoCampaignsPage initialTab="winback" />
  if (route.key === 'khach-le') return <AutoCampaignsPage initialTab="khach-le" />
  if (route.key === 'fanpage') return <FanpageContentPage route={route} />
  if (route.key === 'training') return <TrainingPage />
  if (route.key === 'settings') return <ChannelSettingsPage route={route} />

  return <Overview />
}
