import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../lib/utils'
import I from '../../../components/shared/Icons'

const SEG = {
  vip: { l: 'VIP', cls: 'vip' },
  reg: { l: 'THƯỜNG XUYÊN', cls: 'reg' },
  new: { l: 'MỚI', cls: 'new' },
  slp: { l: 'NGỦ ĐÔNG', cls: 'slp' },
}

const AVT_GRAD = {
  vip: 'linear-gradient(135deg,#C9A96E 0%,#A0714F 100%)',
  reg: 'linear-gradient(135deg,#7D9EC0 0%,#5A7A9A 100%)',
  new: 'linear-gradient(135deg,#7BB88F 0%,#4E9467 100%)',
  slp: 'linear-gradient(135deg,#B8A898 0%,#8B7355 100%)',
}

function getSegment(chiTieu) {
  if (chiTieu >= 30000000) return 'vip'
  if (chiTieu >= 10000000) return 'reg'
  if (chiTieu >= 1000000) return 'new'
  return 'slp'
}

function getInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return (p[p.length - 1][0] || '').toUpperCase()
}

function fmtCompact(n) {
  if (!n) return '0đ'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ'
  if (n >= 1e6) return Math.round(n / 1e6) + ' tr'
  return Math.round(n / 1e3) + 'k'
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = getNowVN()
  return Math.floor((now - d) / 86400000)
}

function DayLabel({ dateStr }) {
  const d = daysSince(dateStr)
  if (d === null) return <span style={{ color: 'var(--ink3)' }}>—</span>
  if (d === 0) return <span style={{ color: 'var(--thu)', fontWeight: 600 }}>Hôm nay</span>
  if (d === 1) return <span style={{ color: 'var(--thu)' }}>Hôm qua</span>
  if (d <= 7) return <span style={{ color: 'var(--ink2)' }}>{d} ngày trước</span>
  if (d <= 30) return <span style={{ color: 'var(--ink3)' }}>{d} ngày trước</span>
  return <span style={{ color: 'var(--ink3)', opacity: .7 }}>{Math.floor(d / 30)} tháng trước</span>
}

function VisitCount({ chiTieu }) {
  const est = Math.max(1, Math.round((chiTieu || 0) / 500000))
  return (
    <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
      {est}
      <span style={{ fontSize: 10, fontFamily: 'var(--sans)', fontWeight: 400, color: 'var(--ink3)', marginLeft: 3 }}>lượt</span>
    </div>
  )
}

export default function AdminCRMPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSeg, setActiveSeg] = useState('all')
  const [sortBy, setSortBy] = useState('chi_tieu')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ ho_ten: '', so_dien_thoai: '', ngay_sinh: '', ghi_chu_da_lieu: '' })
  const [saving, setSaving] = useState(false)
  const [cards, setCards] = useState([])
  const [loadingCards, setLoadingCards] = useState(false)

  useEffect(() => { loadCustomers() }, [])

  useEffect(() => {
    if (!selected?.id) { setCards([]); return }
    setLoadingCards(true)
    supabase.from('the_lieu_trinh')
      .select('*')
      .eq('khach_hang_id', selected.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCards(data || []); setLoadingCards(false) })
  }, [selected?.id])

  const handleCreate = async () => {
    if (!newForm.ho_ten.trim() || !newForm.so_dien_thoai.trim()) return
    setSaving(true)
    const { error } = await supabase.from('khach_hang').insert({
      ho_ten: newForm.ho_ten.trim(),
      so_dien_thoai: newForm.so_dien_thoai.trim(),
      ngay_sinh: newForm.ngay_sinh || null,
      ghi_chu_da_lieu: newForm.ghi_chu_da_lieu || null,
    })
    setSaving(false)
    if (!error) {
      setShowNew(false)
      setNewForm({ ho_ten: '', so_dien_thoai: '', ngay_sinh: '', ghi_chu_da_lieu: '' })
      loadCustomers()
    }
  }

  const loadCustomers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('khach_hang')
      .select('*')
      .order('tong_chi_tieu', { ascending: false })
      .limit(200)
    setCustomers(data || [])
    setLoading(false)
  }

  // Stats
  const total = customers.length
  const vipN = customers.filter(c => getSegment(c.tong_chi_tieu) === 'vip').length
  const regN = customers.filter(c => getSegment(c.tong_chi_tieu) === 'reg').length
  const newN = customers.filter(c => getSegment(c.tong_chi_tieu) === 'new').length
  const slpN = customers.filter(c => getSegment(c.tong_chi_tieu) === 'slp').length
  const totalRev = customers.reduce((s, c) => s + (c.tong_chi_tieu || 0), 0)
  const avgLTV = total > 0 ? Math.round(totalRev / total) : 0
  const activeN = customers.filter(c => {
    const d = daysSince(c.lan_cuoi_den)
    return d !== null && d <= 30
  }).length
  const returnRate = total > 0 ? Math.round(activeN / total * 100) : 0
  const maxSpend = customers[0]?.tong_chi_tieu || 1

  // Filter + sort
  const filtered = customers
    .filter(c => {
      if (activeSeg !== 'all' && getSegment(c.tong_chi_tieu) !== activeSeg) return false
      if (search) {
        const q = search.toLowerCase()
        if (!c.ho_ten?.toLowerCase().includes(q) && !c.so_dien_thoai?.includes(search)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'recency') {
        if (!a.lan_cuoi_den) return 1
        if (!b.lan_cuoi_den) return -1
        return new Date(b.lan_cuoi_den) - new Date(a.lan_cuoi_den)
      }
      if (sortBy === 'name') return (a.ho_ten || '').localeCompare(b.ho_ten || '', 'vi')
      return (b.tong_chi_tieu || 0) - (a.tong_chi_tieu || 0)
    })

  const chips = [
    { k: 'all', l: 'Tất cả', n: total },
    { k: 'vip', l: 'VIP', n: vipN },
    { k: 'reg', l: 'Thường xuyên', n: regN },
    { k: 'new', l: 'Mới', n: newN },
    { k: 'slp', l: 'Ngủ đông', n: slpN },
  ]

  const INP = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--bord)', fontSize: 14,
    background: 'var(--surface)', color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
    {/* ── Modal Khách Mới ── */}
    {showNew && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={() => setShowNew(false)}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, width: '100%', maxWidth: 420, boxShadow: 'var(--sh-3)', animation: 'viewIn .25s var(--ease-out) both' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Thêm Khách Hàng</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 22 }}>Nhập thông tin để tạo hồ sơ mới</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Họ Tên *</div>
              <input style={INP} placeholder="Nguyễn Thị Lan" value={newForm.ho_ten}
                onChange={e => setNewForm(s => ({ ...s, ho_ten: e.target.value }))} autoFocus />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Số Điện Thoại *</div>
              <input style={INP} placeholder="0901234567" value={newForm.so_dien_thoai}
                onChange={e => setNewForm(s => ({ ...s, so_dien_thoai: e.target.value }))} inputMode="tel" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Ngày Sinh</div>
                <input type="date" style={INP} value={newForm.ngay_sinh}
                  onChange={e => setNewForm(s => ({ ...s, ngay_sinh: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Ghi Chú Da</div>
                <input style={INP} placeholder="Nhạy cảm, mụn..." value={newForm.ghi_chu_da_lieu}
                  onChange={e => setNewForm(s => ({ ...s, ghi_chu_da_lieu: e.target.value }))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={() => setShowNew(false)} className="btn ghost" style={{ flex: 1, justifyContent: 'center' }}>Hủy</button>
            <button onClick={handleCreate} disabled={saving || !newForm.ho_ten.trim() || !newForm.so_dien_thoai.trim()}
              className="btn gold" style={{ flex: 2, justifyContent: 'center', opacity: saving ? .7 : 1 }}>
              {saving ? 'Đang lưu...' : 'Tạo Hồ Sơ'}
            </button>
          </div>
        </div>
      </div>
    )}

    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* mod-head */}
        <div className="mod-head" style={{ marginBottom: 20 }}>
          <div>
            <div className="ttl">CRM Khách Hàng</div>
            <div className="sub">
              {total.toLocaleString('vi-VN')} hồ sơ · {vipN} VIP · {activeN} hoạt động 30 ngày
            </div>
          </div>
          <div className="acts">
            <button className="btn">
              <I.Speaker style={{ width: 13, height: 13 }} /> Gửi Chiến Dịch
            </button>
            <button className="btn ghost">
              <I.Filter style={{ width: 13, height: 13 }} /> Lọc Nâng Cao
            </button>
            <button className="btn gold" onClick={() => setShowNew(true)}>
              <I.Plus style={{ width: 13, height: 13 }} /> Khách Mới
            </button>
          </div>
        </div>

        {/* Strip KPIs */}
        <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="it">
            <div className="l">Tổng Hồ Sơ</div>
            <div className="v">{total.toLocaleString('vi-VN')}<span className="cur"> KH</span></div>
          </div>
          <div className="it">
            <div className="l">Khách VIP</div>
            <div className="v">
              {vipN}
              <span className="cur"> · {total > 0 ? Math.round(vipN / total * 100) : 0}%</span>
            </div>
          </div>
          <div className="it">
            <div className="l">Hoạt Động 30 Ngày</div>
            <div className="v">{returnRate}<span className="cur">%</span></div>
          </div>
          <div className="it">
            <div className="l">LTV Trung Bình</div>
            <div className="v">{fmtCompact(avgLTV)}</div>
          </div>
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          {chips.map(x => (
            <button
              key={x.k}
              className={`chip${x.k === activeSeg ? ' active' : ''}`}
              onClick={() => setActiveSeg(x.k)}
              style={{ padding: '7px 14px', fontSize: '12.5px' }}>
              {x.l}
              <span style={{ opacity: .6, marginLeft: 5 }}>{x.n}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div className="search" style={{ maxWidth: 280, margin: 0 }}>
            <I.Search />
            <input
              placeholder="Tìm tên, SĐT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              border: '1px solid var(--bord)', borderRadius: 8, padding: '8px 12px',
              fontSize: 13, background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer',
            }}>
            <option value="chi_tieu">Chi tiêu ↓</option>
            <option value="recency">Gần nhất</option>
            <option value="name">Tên A-Z</option>
          </select>
        </div>

        {/* CRM Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
            <div style={{
              width: 44, height: 72, margin: '0 auto 16px',
              background: 'var(--grad-arch)', borderRadius: '999px 999px 12px 12px', opacity: .3,
              animation: 'floatGlow 3s ease-in-out infinite alternate',
            }} />
            Đang tải danh sách khách hàng...
          </div>
        ) : (
          <div className="crm-list">
            <div className="crm-row h">
              <div className="av" />
              <div>Khách Hàng</div>
              <div>Liên Hệ</div>
              <div>Phân Loại</div>
              <div>Lượt Ghé</div>
              <div>Lần Cuối</div>
              <div>Tổng Chi Tiêu</div>
              <div />
            </div>

            {filtered.slice(0, 50).map(c => {
              const seg = getSegment(c.tong_chi_tieu)
              const isActive = selected?.id === c.id
              const barPct = Math.min(100, ((c.tong_chi_tieu || 0) / maxSpend) * 100)
              return (
                <div
                  className="crm-row"
                  key={c.id}
                  style={{
                    cursor: 'pointer',
                    ...(isActive ? {
                      background: 'rgba(201,169,110,.07)',
                      borderLeft: '3px solid var(--champagne)',
                    } : {}),
                  }}
                  onClick={() => setSelected(isActive ? null : c)}>
                  <div className="av" style={{ background: AVT_GRAD[seg] }}>
                    {getInitials(c.ho_ten)}
                  </div>

                  <div className="nm">
                    {c.ho_ten}
                    {c.ghi_chu_da_lieu && <small>{c.ghi_chu_da_lieu}</small>}
                  </div>

                  <div style={{ fontSize: 12 }}>
                    <div style={{ color: 'var(--ink2)', fontWeight: 500 }}>{c.so_dien_thoai || '—'}</div>
                    {c.ngay_sinh && (
                      <div style={{ color: 'var(--ink3)', marginTop: 2 }}>
                        {new Date(c.ngay_sinh).getFullYear()}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className={`seg ${seg}`}>{SEG[seg].l}</span>
                  </div>

                  <div>
                    <VisitCount chiTieu={c.tong_chi_tieu} />
                  </div>

                  <div style={{ fontSize: 12 }}>
                    <DayLabel dateStr={c.lan_cuoi_den} />
                  </div>

                  <div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                      {formatCurrency(c.tong_chi_tieu || 0)}
                    </div>
                    <div className="bar-h" style={{ marginTop: 4 }}>
                      <i style={{
                        width: barPct + '%',
                        background: seg === 'vip' ? 'var(--grad-gold)' : seg === 'slp' ? 'var(--ink3)' : 'var(--primary)',
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="icon-btn"
                      style={{ width: 28, height: 28 }}
                      onClick={e => { e.stopPropagation(); window.open(`tel:${c.so_dien_thoai}`) }}>
                      <I.Phone style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink3)', fontSize: 13 }}>
                Không tìm thấy khách hàng phù hợp
              </div>
            )}
            {filtered.length > 50 && (
              <div style={{ textAlign: 'center', padding: '14px', color: 'var(--ink3)', fontSize: 12, borderTop: '1px solid var(--line)' }}>
                Đang hiển thị 50 / {filtered.length} kết quả — dùng bộ lọc hoặc tìm kiếm để thu hẹp
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CUSTOMER DETAIL PANEL ── */}
      {selected && (() => {
        const seg = getSegment(selected.tong_chi_tieu)
        const d = daysSince(selected.lan_cuoi_den)
        const barPct = Math.min(100, ((selected.tong_chi_tieu || 0) / maxSpend) * 100)
        return (
          <aside style={{
            width: 296, flexShrink: 0,
            background: 'var(--surface)',
            border: '1px solid var(--bord)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--sh-2)',
            padding: 20,
            animation: 'viewIn .3s var(--ease-out) both',
            position: 'sticky', top: 24,
          }}>
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                className="icon-btn"
                style={{ width: 26, height: 26, fontSize: 14 }}
                onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            {/* Avatar + Name */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: AVT_GRAD[seg],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontFamily: 'var(--serif)', fontWeight: 700, color: '#fff',
                margin: '0 auto 10px',
                boxShadow: '0 6px 20px rgba(160,113,79,.35)',
              }}>
                {getInitials(selected.ho_ten)}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                {selected.ho_ten}
              </div>
              <div style={{ marginTop: 6 }}>
                <span className={`seg ${seg}`}>{SEG[seg].l}</span>
              </div>
            </div>

            {/* Info rows */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: 'var(--r)',
              padding: '12px 14px',
              marginBottom: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {[
                { l: 'SĐT', v: selected.so_dien_thoai || '—' },
                {
                  l: 'Ngày sinh',
                  v: selected.ngay_sinh
                    ? new Date(selected.ngay_sinh).toLocaleDateString('vi-VN')
                    : '—',
                },
                {
                  l: 'Lần cuối đến',
                  v: d === null ? '—' : d === 0 ? 'Hôm nay' : d === 1 ? 'Hôm qua' : `${d} ngày trước`,
                },
                { l: 'Da liễu', v: selected.ghi_chu_da_lieu || '—' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', flexShrink: 0 }}>
                    {row.l}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>
                    {row.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Tổng chi tiêu card */}
            <div style={{
              background: seg === 'vip'
                ? 'linear-gradient(135deg,rgba(201,169,110,.15),rgba(160,113,79,.1))'
                : 'var(--bg)',
              border: seg === 'vip' ? '1px solid rgba(201,169,110,.3)' : '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '14px',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Tổng Chi Tiêu
              </div>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700,
                color: seg === 'vip' ? 'var(--champagne)' : 'var(--ink)',
              }}>
                {formatCurrency(selected.tong_chi_tieu || 0)}
              </div>
              <div className="bar-h" style={{ marginTop: 10, height: 6, borderRadius: 3 }}>
                <i style={{
                  width: barPct + '%',
                  background: seg === 'vip' ? 'var(--grad-gold)' : 'var(--primary)',
                  borderRadius: 3,
                }} />
              </div>
            </div>

            {/* Thẻ Liệu Trình */}
            {loadingCards ? (
              <div style={{ textAlign: 'center', padding: '12px', fontSize: 12, color: 'var(--ink3)', marginBottom: 14 }}>Đang tải thẻ...</div>
            ) : cards.length > 0 ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                  Thẻ Liệu Trình ({cards.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cards.map(card => {
                    const pct = card.so_buoi_tong > 0 ? Math.round((card.so_buoi_da_dung / card.so_buoi_tong) * 100) : 0
                    const con = (card.so_buoi_tong || 0) - (card.so_buoi_da_dung || 0)
                    const expired = card.ngay_het_han && new Date(card.ngay_het_han) < new Date()
                    return (
                      <div key={card.id} style={{
                        background: expired ? 'var(--bg)' : 'linear-gradient(135deg,rgba(201,169,110,.08),rgba(160,113,79,.04))',
                        border: `1px solid ${expired ? 'var(--line)' : 'rgba(201,169,110,.25)'}`,
                        borderRadius: 10, padding: '10px 12px',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: expired ? 'var(--ink3)' : 'var(--ink)', marginBottom: 4 }}>
                          {card.ten_dich_vu}
                        </div>
                        <div className="bar-h" style={{ height: 4, marginBottom: 5 }}>
                          <i style={{ width: pct + '%', background: expired ? 'var(--ink3)' : 'var(--grad-gold)', borderRadius: 2 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink3)' }}>
                          <span style={{ color: expired ? 'var(--danger)' : 'var(--thu)', fontWeight: 600 }}>
                            {expired ? 'Hết hạn' : `Còn ${con} buổi`}
                          </span>
                          <span>{card.so_buoi_da_dung}/{card.so_buoi_tong}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn gold"
                style={{ justifyContent: 'center', width: '100%' }}
                onClick={() => window.open(`tel:${selected.so_dien_thoai}`)}>
                <I.Phone style={{ width: 13, height: 13 }} /> Gọi Điện
              </button>
              <button className="btn ghost" style={{ justifyContent: 'center', width: '100%' }}>
                <I.Calendar style={{ width: 13, height: 13 }} /> Đặt Lịch Hẹn
              </button>
              <button className="btn ghost" style={{ justifyContent: 'center', width: '100%' }}>
                <I.Speaker style={{ width: 13, height: 13 }} /> Gửi Tin Nhắn
              </button>
            </div>
          </aside>
        )
      })()}
    </div>
    </>
  )
}
