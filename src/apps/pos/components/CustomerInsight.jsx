import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, FONT } from '../../../constants/colors'

// ── GỢI Ý TƯ VẤN khi chọn khách trong POS (khép kín vòng CRM — anh Nam 15/07) ──
// Trả lời 3 câu cho lễ tân/KTV ngay lúc khách ngồi xuống:
//   1. Lần trước tư vấn gì, hẹn gì? (từ phiếu tư vấn nhat_ky_khach_den)
//   2. Nên upsale gì? (từ hồ sơ Customer 360 v_customer_pos_intelligence)
//   3. Khách CHƯA trải nghiệm dịch vụ hot nào? (mời trải nghiệm mới)

let _dvHotCache = null // top DV hot toàn spa 60 ngày — dùng chung mọi khách trong phiên

export default function CustomerInsight({ customer }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    setData(null)
    if (!customer?.id) return undefined
    ;(async () => {
      try {
        const [intelRes, phieuRes] = await Promise.all([
          supabase.from('v_customer_pos_intelligence').select('goi_y_upsell, dich_vu_da_dung, dich_vu_gan_nhat, muc_tieu_tu_van, ghi_chu_da_lieu').eq('khach_hang_id', customer.id).limit(1).maybeSingle(),
          supabase.from('nhat_ky_khach_den').select('ngay, ket_qua, co_hoi_upsell, goi_y_tiep_theo, ktv_phu_trach').eq('khach_hang_id', customer.id).order('ngay', { ascending: false }).limit(1).maybeSingle(),
        ])
        if (!_dvHotCache) {
          const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)
          const { data: lines } = await supabase.from('don_hang_chi_tiet')
            .select('dich_vu_id, dich_vu:dich_vu_id(ten), don_hang:don_hang_id!inner(ngay)')
            .gte('don_hang.ngay', since).not('dich_vu_id', 'is', null).limit(2000)
          const cnt = new Map()
          for (const l of (lines || [])) {
            const ten = l.dich_vu?.ten
            if (ten) cnt.set(ten, (cnt.get(ten) || 0) + 1)
          }
          _dvHotCache = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ten]) => ten)
        }
        if (!alive) return
        const intel = intelRes.data || {}
        const daDung = String(intel.dich_vu_da_dung || '').toLowerCase()
        const chuaThu = _dvHotCache.filter(ten => !daDung.includes(ten.toLowerCase())).slice(0, 3)
        setData({ intel, phieu: phieuRes.data || null, chuaThu })
      } catch { if (alive) setData({ intel: {}, phieu: null, chuaThu: [] }) }
    })()
    return () => { alive = false }
  }, [customer?.id])

  if (!customer?.id || !data) return null
  const { intel, phieu, chuaThu } = data
  const upsell = intel.goi_y_upsell || intel.muc_tieu_tu_van
  if (!phieu && !upsell && chuaThu.length === 0 && !intel.ghi_chu_da_lieu) return null

  const KQ = { hai_long: '😊 hài lòng', tam_duoc: '🙂 tạm được', chua_hai_long: '😕 chưa hài lòng', da_mua_them: '💰 đã mua thêm', can_cham_lai: '📌 cần chăm lại' }
  const Row = ({ icon, label, value }) => value ? (
    <div style={{ display: 'flex', gap: 6, fontSize: 11.5, lineHeight: 1.45, marginTop: 4 }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#5a4632' }}><b style={{ color: '#3d2f1f' }}>{label}:</b> {value}</span>
    </div>
  ) : null

  return (
    <div style={{
      marginTop: 8, borderRadius: 8, padding: '8px 12px',
      background: 'rgba(201,169,110,.10)', border: '1.5px solid rgba(201,169,110,.4)',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#8a6a35', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: FONT.sans }}>
        💡 Gợi ý tư vấn hôm nay
      </div>
      {phieu && (
        <Row icon="📝" label={`Lần trước (${String(phieu.ngay).split('-').reverse().join('/')}${phieu.ktv_phu_trach ? ' · ' + phieu.ktv_phu_trach : ''})`}
          value={[KQ[phieu.ket_qua] || phieu.ket_qua, phieu.co_hoi_upsell, phieu.goi_y_tiep_theo ? `→ hẹn: ${phieu.goi_y_tiep_theo}` : null].filter(Boolean).join(' · ')} />
      )}
      <Row icon="✨" label="Nên tư vấn / upsale" value={upsell} />
      {chuaThu.length > 0 && <Row icon="🆕" label="Chưa trải nghiệm (DV hot)" value={chuaThu.join(' · ')} />}
      <Row icon="⚠️" label="Ghi chú da liễu" value={intel.ghi_chu_da_lieu} />
    </div>
  )
}
