// ═══════════════════════════════════════════════════════════════════════════
// Marketing Module — Tổng Quan + Router (các trang tách file riêng)
// Tách từ MarketingModulePage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { C, FONT } from '../../../constants/colors'
import { supabase } from '../../../lib/supabase'
import { LeadOpsPage } from './MarketingOps'
import {
  Header, MARKETING_ROUTES, ModuleCard, Shell,
  fmtNumber, getRoute, go,
} from './marketingShared'
import { CampaignsPage, ChannelSettingsPage, FanpageContentPage } from './MarketingFanpagePages'
import { InboxPage, RemarketingPage } from './MarketingInboxPages'
import { AutoCampaignsPage, TrainingPage } from './MarketingCarePages'

// ── BÁO CÁO 6 SỐ ĐỘNG (15/07 — thay funnel/segment tĩnh "vô nghĩa") ──
// Mỗi số trả lời 1 câu hỏi vận hành HÔM NAY và bấm vào là tới đúng việc.
function useSixNumbers() {
  const [n, setN] = useState(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // "Hôm nay" theo giờ VN (anh Nam xem từ Mỹ vẫn thấy đúng ngày spa chạy máy)
        const todayVN = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
        const d7 = new Date(Date.now() - 7 * 864e5).toISOString()
        const d14 = new Date(Date.now() - 14 * 864e5).toISOString()

        const [msgs, wbGui, wbLoi, leGui, leLoi, wbDen, leDen, baiCho, baiDang, sdtMoi] = await Promise.all([
          supabase.from('marketing_messages')
            .select('conversation_id, from_platform_user_id, direction, sender_type, noi_dung, created_at')
            .in('kenh', ['facebook', 'zalo']).gte('created_at', d7)
            .order('created_at', { ascending: false }).limit(400),
          // đếm theo ngay_du_kien: tin LỖI không được ghi gui_luc nên lọc theo gui_luc sẽ sót
          supabase.from('winback_hang_doi').select('id', { count: 'exact', head: true }).eq('trang_thai', 'da_gui').eq('ngay_du_kien', todayVN),
          supabase.from('winback_hang_doi').select('id', { count: 'exact', head: true }).eq('trang_thai', 'gui_loi').eq('ngay_du_kien', todayVN),
          supabase.from('le_hang_doi').select('id', { count: 'exact', head: true }).eq('trang_thai', 'da_gui').eq('ngay_du_kien', todayVN),
          supabase.from('le_hang_doi').select('id', { count: 'exact', head: true }).eq('trang_thai', 'gui_loi').eq('ngay_du_kien', todayVN),
          supabase.from('winback_hang_doi').select('id', { count: 'exact', head: true }).eq('da_den', true).gte('gui_luc', d14),
          supabase.from('le_hang_doi').select('id', { count: 'exact', head: true }).eq('da_den', true).gte('gui_luc', d14),
          supabase.from('marketing_content_calendar').select('id', { count: 'exact', head: true }).eq('trang_thai', 'cho_duyet'),
          supabase.from('marketing_content_calendar').select('id', { count: 'exact', head: true }).eq('trang_thai', 'da_dang').gte('published_at', d7),
          supabase.from('marketing_customer_identities').select('id', { count: 'exact', head: true }).gte('created_at', d7).not('phone_norm', 'is', null),
        ])

        // Hội thoại chưa trả lời — cùng logic chuông POS: tin cuối của hội thoại là inbound
        const junk = (m) => m.sender_type === 'system'
          || /unexpected error|meta sync|an error occurred|\(#\d+\)|graph api error|invalid oauth|token.*expired/.test(String(m.noi_dung || '').toLowerCase())
        const last = new Map()
        for (const m of (msgs.data || [])) {
          if (junk(m)) continue
          const cid = m.conversation_id || m.from_platform_user_id
          if (!cid || last.has(cid)) continue
          last.set(cid, m.direction)
        }
        if (!alive) return
        setN({
          tinCho: [...last.values()].filter(d => d === 'inbound').length,
          znsGui: (wbGui.count || 0) + (leGui.count || 0),
          znsLoi: (wbLoi.count || 0) + (leLoi.count || 0),
          quayLai: (wbDen.count || 0) + (leDen.count || 0),
          baiCho: baiCho.count || 0,
          baiDang: baiDang.count || 0,
          sdtMoi: sdtMoi.count || 0,
        })
      } catch { if (alive) setN({}) }
    })()
    return () => { alive = false }
  }, [])
  return n
}

function Overview() {
  const n = useSixNumbers()
  const zbsNghiHetTien = n && n.znsLoi > 0 && n.znsGui === 0

  const cards = n ? [
    { icon: '💬', label: 'Tin khách chưa trả lời', value: n.tinCho, desc: 'Hội thoại FB/Zalo đang chờ — vào Hộp Thư trả lời ngay', path: '/admin/marketing/hop-thu', tone: n.tinCho > 0 ? C.chi : C.thu },
    { icon: '📨', label: 'ZNS gửi sáng nay', value: n.znsGui, desc: zbsNghiHetTien ? '⚠ Toàn bộ tin LỖI — nghi hết tiền ZBS, cần nạp ngay!' : `${n.znsLoi} tin lỗi · 3 máy chăm khách chạy 9h-9h30`, path: '/admin/marketing/tu-dong', tone: zbsNghiHetTien ? C.chi : C.thu },
    { icon: '🔁', label: 'Khách quay lại (14 ngày)', value: n.quayLai, desc: 'Khách ĐÃ ĐẾN spa sau khi nhận tin chăm sóc — tiền thật từ marketing', path: '/admin/marketing/tu-dong', tone: '#16A085' },
    { icon: '📝', label: 'Bài fanpage chờ duyệt', value: n.baiCho, desc: 'AI đã soạn sẵn — duyệt tại Máy Đăng Bài hoặc trên Telegram', path: '/admin/marketing/fanpage-noi-dung', tone: n.baiCho > 0 ? C.gold : C.textMute },
    { icon: '📣', label: 'Bài đã đăng (7 ngày)', value: n.baiDang, desc: 'Máy đăng bài giữ nhịp 2 ngày/bài giờ vàng', path: '/admin/marketing/fanpage-noi-dung', tone: C.taiSan },
    { icon: '📞', label: 'SĐT mới nhận diện (7 ngày)', value: n.sdtMoi, desc: 'Khách chat được ghép số điện thoại — thành khách CRM chăm được', path: '/admin/marketing/khach-remarketing', tone: '#8E44AD' },
  ] : []

  return (
    <Shell>
      <Header route={MARKETING_ROUTES[0]} />

      <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: '.16em', textTransform: 'uppercase', color: C.chi, marginBottom: 10 }}>
        ● Hôm nay — số ĐỘNG, bấm vào là tới việc
      </div>
      {!n ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.textMute }}>Đang đếm số liệu hôm nay…</div>
      ) : (
        <div className="mkt-soft" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 22 }}>
          {cards.map(t => (
            <button key={t.label} onClick={() => go(t.path)} style={{
              textAlign: 'left', cursor: 'pointer', border: `1px solid ${t.tone}33`, background: `${t.tone}0C`,
              borderRadius: 12, padding: 16, display: 'grid', gap: 6, boxShadow: C.shadowSm,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <span style={{ fontFamily: FONT.serif, fontSize: 30, fontWeight: 900, color: t.tone, lineHeight: 1 }}>{fmtNumber(t.value)}</span>
              </div>
              <div style={{ fontWeight: 900, color: C.text, fontSize: 14.5 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: FONT.serif, fontSize: 19, fontWeight: 900, color: C.text }}>🧭 5 khu vực làm việc</span>
        <span style={{ fontSize: 12, color: C.textSub }}>mỗi khu 1 vai trò — không trùng nhau</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {[
          MARKETING_ROUTES.find(x => x.key === 'inbox'),
          { key: 'can-cham', path: '/admin/cham-soc-khach', title: 'Hôm Nay Cần Chạm', short: 'Hôm Nay Cần Chạm', subtitle: 'Khách cần gọi/nhắn thủ công hôm nay + phiếu tư vấn khách đã đến (ghi ngay tại POS sau thanh toán).', owner: 'Lễ tân', status: 'Việc hằng ngày', accent: '#d6336c', metrics: ['Cần chạm hôm nay', 'Khách đã đến', 'Phiếu tư vấn'] },
          MARKETING_ROUTES.find(x => x.key === 'tu-dong'),
          MARKETING_ROUTES.find(x => x.key === 'fanpage'),
          MARKETING_ROUTES.find(x => x.key === 'settings'),
        ].filter(Boolean).map((r, i) => <ModuleCard key={r.key} route={r} index={i} />)}
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
