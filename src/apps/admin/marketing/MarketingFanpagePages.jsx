// ═══════════════════════════════════════════════════════════════════════════
// Marketing — Fanpage & Nội Dung, Chiến Dịch & ROI, Cấu Hình Kênh
// Tách từ MarketingModulePage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { C, FONT } from '../../../constants/colors'
import { supabase } from '../../../lib/supabase'
import { notify } from '../../../components/ui/notify'
import { CampaignOpsPanel } from './MarketingOps'
import {
  AUTOMATION_MODES, ActionList, AutomationRunCard, CHANNEL_CONFIG, CONTENT_THEMES,
  EmptyBox, Header, MetricGrid, Panel, SegmentRow, Shell, SmallBadge, StateNotice,
  Td, Th, channelLabel, fanpageSegmentLabel, fmtCompactMoney, fmtDate, fmtMoney,
  fmtNumber, go, minutesSince, reactivationLabel, statusLabel, sumRows, tableStyle,
  useMarketingOpsData,
} from './marketingShared'

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

// ── MÁY ĐĂNG BÀI: duyệt bài AI soạn ngay trên web (song song nút trên Telegram) ──
const TT_BAI = {
  cho_duyet: { label: 'Chờ duyệt', color: '#a8741a', bg: '#fdf3e0' },
  da_duyet: { label: 'Đã duyệt — chờ giờ đăng', color: '#1A5276', bg: 'rgba(26,82,118,.08)' },
  da_dang: { label: 'Đã đăng', color: '#2D7A4F', bg: 'rgba(45,122,79,.08)' },
}

function BaiChoDuyetPanel() {
  const [items, setItems] = useState(null)
  const [busy, setBusy] = useState('')
  const [nonce, setNonce] = useState(0)
  const [expand, setExpand] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.from('marketing_content_calendar')
        .select('id, tieu_de, noi_dung, hashtags, asset_urls, scheduled_at, trang_thai, published_at, metadata')
        .in('trang_thai', ['cho_duyet', 'da_duyet', 'da_dang'])
        .order('created_at', { ascending: false })
        .limit(12)
      if (alive) setItems(data || [])
    })()
    return () => { alive = false }
  }, [nonce])

  const act = async (item, action) => {
    setBusy(item.id + action)
    try {
      if (action === 'duyet') {
        // Giữ lịch nếu còn ở tương lai — quá hạn/trống thì hẹn 19:30 ngày mai (giờ vàng)
        const sched = item.scheduled_at && new Date(item.scheduled_at) > new Date()
          ? item.scheduled_at
          : new Date(Date.now() + 864e5).toISOString().slice(0, 10) + 'T19:30:00+07:00'
        const { error } = await supabase.from('marketing_content_calendar')
          .update({ trang_thai: 'da_duyet', scheduled_at: sched }).eq('id', item.id)
        if (error) throw error
        notify('✓ Đã duyệt — máy sẽ tự đăng theo lịch', 'success')
      } else if (action === 'bo') {
        const { error } = await supabase.from('marketing_content_calendar')
          .update({ trang_thai: 'huy' }).eq('id', item.id)
        if (error) throw error
        notify('Đã bỏ bài này', 'success')
      } else if (action === 'dang') {
        const { error: e1 } = await supabase.from('marketing_content_calendar')
          .update({ trang_thai: 'da_duyet' }).eq('id', item.id)
        if (e1) throw e1
        const { data, error } = await supabase.functions.invoke('marketing-meta-page-sync', {
          body: { mode: 'publish_post', content_id: item.id, source: 'web_dang_ngay' },
        })
        if (error) throw error
        const res = (data?.results || [])[0] || {}
        if (res.error) throw new Error(res.error)
        notify('🚀 Đã đăng lên Fanpage', 'success')
      }
      setNonce(v => v + 1)
    } catch (e) { notify('Lỗi: ' + (e.message || e), 'error') }
    finally { setBusy('') }
  }

  const btn = (bg, color, border = 'none') => ({
    border, background: bg, color, borderRadius: 7, padding: '6px 12px',
    fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: FONT.sans, whiteSpace: 'nowrap',
  })

  return (
    <Panel title="Bài chờ duyệt & đã đăng" eyebrow="Máy Đăng Bài — duyệt tại đây hoặc trên Telegram">
      <div style={{ display: 'grid', gap: 10 }}>
        {items === null ? <EmptyBox text="Đang tải bài…" />
          : items.length === 0 ? <EmptyBox text="Chưa có bài nào. Máy tự lên bài mới sáng Thứ 2 & Thứ 5 (hoặc chạy tay từ Cấu Hình Kênh)." />
            : items.map(item => {
              const tt = TT_BAI[item.trang_thai] || TT_BAI.cho_duyet
              const anh = (item.asset_urls || [])[0]
              const link = item.metadata?.publish_result?.permalink
              const open = expand === item.id
              return (
                <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: 12, background: '#FFFDF8' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {anh && <img src={anh} alt="" style={{ width: 86, height: 46, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ color: C.text, fontSize: 13.5 }}>{item.tieu_de}</strong>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: tt.color, background: tt.bg, borderRadius: 99, padding: '2px 8px' }}>{tt.label}</span>
                      </div>
                      <div style={{ marginTop: 3, fontSize: 12, color: C.textSub }}>
                        {item.trang_thai === 'da_dang'
                          ? `Đăng lúc ${fmtDate(item.published_at)}`
                          : `Lịch đăng: ${item.scheduled_at ? new Date(item.scheduled_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'duyệt xong tự xếp giờ vàng'}`}
                      </div>
                      <div onClick={() => setExpand(open ? null : item.id)} style={{ marginTop: 5, fontSize: 12.5, color: C.text, lineHeight: 1.5, cursor: 'pointer', whiteSpace: 'pre-wrap' }}>
                        {open ? item.noi_dung : String(item.noi_dung || '').slice(0, 140) + (String(item.noi_dung || '').length > 140 ? '… (bấm xem hết)' : '')}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 9, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {link && <a href={link} target="_blank" rel="noreferrer" style={{ ...btn('#fff', C.taiSan, `1px solid ${C.border}`), textDecoration: 'none' }}>Xem bài trên Fanpage ↗</a>}
                    {item.trang_thai !== 'da_dang' && (
                      <>
                        <button disabled={!!busy} onClick={() => act(item, 'bo')} style={btn('#fff', C.chi, `1px solid ${C.border}`)}>❌ Bỏ</button>
                        {item.trang_thai === 'cho_duyet' && (
                          <button disabled={!!busy} onClick={() => act(item, 'duyet')} style={btn('rgba(45,122,79,.1)', '#2D7A4F', '1.5px solid rgba(45,122,79,.4)')}>
                            {busy === item.id + 'duyet' ? 'Đang lưu…' : '✅ Duyệt (đăng theo lịch)'}
                          </button>
                        )}
                        <button disabled={!!busy} onClick={() => act(item, 'dang')} style={btn(C.grad, '#fff')}>
                          {busy === item.id + 'dang' ? 'Đang đăng…' : '🚀 Đăng ngay'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
      </div>
    </Panel>
  )
}

export function FanpageContentPage({ route }) {
  const data = useMarketingOpsData()
  const overview = data.fanpageOverview[0] || {}

  const bestPosts = useMemo(() => (
    [...data.posts].sort((a, b) => (
      Number(b.ai_quality_score || 0) - Number(a.ai_quality_score || 0)
      || Number(b.reactions_count || 0) + Number(b.comments_count || 0) - Number(a.reactions_count || 0) - Number(a.comments_count || 0)
    )).slice(0, 6)
  ), [data.posts])

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

      {/* Nút "Chiến Dịch & ROI" đã bỏ khỏi màn hình chính (0 chiến dịch từ trước tới nay —
          review 14/07). URL /admin/marketing/chien-dich vẫn sống khi thật sự chạy ads. */}

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

        <BaiChoDuyetPanel />
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

export function CampaignsPage({ route }) {
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

      {/* CRUD chiến dịch + ý tưởng nội dung — port từ bản cũ (03/07) */}
      <CampaignOpsPanel />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, .9fr)', gap: 14, marginBottom: 14, marginTop: 14 }}>
        <Panel
          title="Hiệu quả chiến dịch"
          eyebrow="ROI & chuyển đổi"
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

export function ChannelSettingsPage({ route }) {
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

      {/* Menu gộp "Cấu Hình & Dạy AI" (15/07) — Huấn Luyện AI vào từ đây */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span style={{ padding: '8px 14px', borderRadius: 9, fontWeight: 800, fontSize: 13, background: C.grad, color: '#fff' }}>Cấu Hình Kênh</span>
        <button onClick={() => go('/admin/marketing/huan-luyen')} style={{ padding: '8px 14px', borderRadius: 9, fontWeight: 800, fontSize: 13, border: `1px solid ${C.border}`, background: '#fff', color: C.text, cursor: 'pointer' }}>🎓 Huấn Luyện AI →</button>
      </div>

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
