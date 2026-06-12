import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../lib/utils'
import I from '../../../components/shared/Icons'

const PAGE_SIZE = 40

// ── Nguong & phan loai ─────────────────────────────────────────────────────────
const WINBACK_DAYS = 45   // anh Nam chot 11/06/2026
const CARD_SLEEP_DAYS = 30
const BIRTHDAY_WINDOW = 7
const VIP_CHI_TIEU = 30_000_000

const HANG_LABEL = {
  vip: 'VIP', kim_cuong: 'Kim Cương', vang: 'Vàng', bac: 'Bạc', thuong: 'Thường',
}

function fmtCompact(n) {
  if (!n) return '0đ'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ'
  if (n >= 1e6) return Math.round(n / 1e6) + ' tr'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return n + 'đ'
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

function lastName(name = '') {
  const p = String(name).trim().split(/\s+/)
  return (p[p.length - 1]?.[0] || '?').toUpperCase()
}

// So ngay toi sinh nhat ke tiep (0 = hom nay), null neu khong co ngay sinh
function daysToBirthday(ngaySinh) {
  if (!ngaySinh) return null
  const d = new Date(ngaySinh)
  if (Number.isNaN(d.getTime())) return null
  const now = getNowVN()
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), d.getMonth(), d.getDate())
  if (next < todayMid) next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate())
  return Math.round((next - todayMid) / 86400000)
}

// Chi giu chu so SDT de tao link tel:/zalo.me
function phoneDigits(phone = '') {
  return String(phone).replace(/\D/g, '')
}

function isValidPhone(phone) {
  const d = phoneDigits(phone)
  return d.length >= 9 && d.length <= 12
}

// Gan ly do + do uu tien cho moi khach
function classify(row) {
  const reasons = []
  let priority = 0
  const days = row.so_ngay_vang
  const isVip = (row.tong_chi_tieu || 0) >= VIP_CHI_TIEU
  const bday = daysToBirthday(row.ngay_sinh)

  // VIP roi bo — uu tien cao nhat
  if (isVip && days != null && days >= WINBACK_DAYS) {
    reasons.push({ tag: 'vip', label: `VIP vắng ${days} ngày`, color: '#A0714F' })
    priority = Math.max(priority, 100)
  }
  // The con buoi nhung ngu quen
  if ((row.so_the_con_buoi || 0) > 0 && days != null && days >= CARD_SLEEP_DAYS) {
    reasons.push({ tag: 'card', label: `Còn ${row.tong_buoi_con} buổi · vắng ${days} ngày`, color: '#6c3483' })
    priority = Math.max(priority, 90)
  }
  // Sinh nhat trong tuan
  if (bday != null && bday <= BIRTHDAY_WINDOW) {
    reasons.push({ tag: 'bday', label: bday === 0 ? 'Sinh nhật hôm nay' : `Sinh nhật sau ${bday} ngày`, color: '#c0392b' })
    priority = Math.max(priority, 80)
  }
  // Roi bo thong thuong (phan cap theo do nguoi lanh)
  if (days != null && days >= WINBACK_DAYS && !isVip) {
    let label, p
    if (days >= 365) { label = `Khách cũ · vắng ${Math.floor(days / 30)} tháng`; p = 40 }
    else if (days >= 180) { label = `Vắng ${Math.floor(days / 30)} tháng`; p = 50 }
    else if (days >= 90) { label = `Vắng ${Math.floor(days / 30)} tháng`; p = 60 }
    else { label = `Vắng ${days} ngày`; p = 70 }
    reasons.push({ tag: 'winback', label, color: '#1a6b8a' })
    priority = Math.max(priority, p)
  }
  return { reasons, priority, isVip, bday, days }
}

const TABS = [
  { key: 'all', label: 'Cần gọi hôm nay' },
  { key: 'winback', label: 'Rời bỏ' },
  { key: 'card', label: 'Thẻ ngủ quên' },
  { key: 'bday', label: 'Sinh nhật' },
]

function ReasonChip({ r }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
      padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 800,
      color: r.color, background: r.color + '14', border: `1px solid ${r.color}28`,
    }}>{r.label}</span>
  )
}

function Avatar({ name, vip }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)',
      fontWeight: 700, fontSize: 15, color: '#fff',
      background: vip
        ? 'linear-gradient(135deg,#C9A96E 0%,#A0714F 100%)'
        : 'linear-gradient(135deg,#B8A898 0%,#8B7355 100%)',
    }}>{name}</div>
  )
}

export default function AdminChamSocKhachPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [copied, setCopied] = useState('')

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [tab, search])

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const { data, error } = await supabase
        .from('v_cham_soc_khach')
        .select('*')
        .order('tong_chi_tieu', { ascending: false })
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setErr(e.message || 'Không tải được danh sách chăm sóc.')
    } finally {
      setLoading(false)
    }
  }

  // Gan phan loai cho tat ca, chi giu khach co it nhat 1 ly do
  const enriched = useMemo(() => {
    return rows
      .map(r => ({ ...r, ...classify(r) }))
      .filter(r => r.reasons.length > 0)
  }, [rows])

  const counts = useMemo(() => ({
    all: enriched.length,
    winback: enriched.filter(r => r.days != null && r.days >= WINBACK_DAYS).length,
    card: enriched.filter(r => r.reasons.some(x => x.tag === 'card')).length,
    bday: enriched.filter(r => r.bday != null && r.bday <= BIRTHDAY_WINDOW).length,
  }), [enriched])

  const filtered = useMemo(() => {
    let list = enriched
    if (tab === 'winback') list = list.filter(r => r.days != null && r.days >= WINBACK_DAYS)
    else if (tab === 'card') list = list.filter(r => r.reasons.some(x => x.tag === 'card'))
    else if (tab === 'bday') list = list.filter(r => r.bday != null && r.bday <= BIRTHDAY_WINDOW)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        String(r.ho_ten || '').toLowerCase().includes(q) ||
        phoneDigits(r.so_dien_thoai).includes(phoneDigits(q))
      )
    }
    // Tab sinh nhat sap theo ngay toi gan nhat; con lai sap theo uu tien
    const sorted = [...list]
    if (tab === 'bday') sorted.sort((a, b) => (a.bday ?? 999) - (b.bday ?? 999))
    else sorted.sort((a, b) => b.priority - a.priority || (b.days ?? 0) - (a.days ?? 0))
    return sorted
  }, [enriched, tab, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const copyPhone = (phone) => {
    navigator.clipboard?.writeText(phoneDigits(phone))
    setCopied(phone)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div>
      <div className="mod-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="ttl">Chăm Sóc Khách</div>
          <div className="sub">Danh sách cần gọi hôm nay · phát hiện từ {rows.length.toLocaleString('vi-VN')} khách · ngưỡng rời bỏ {WINBACK_DAYS} ngày</div>
        </div>
        <div className="acts">
          <button className="btn ghost" onClick={load} disabled={loading}>{loading ? 'Đang tải...' : 'Làm mới'}</button>
        </div>
      </div>

      {err && (
        <div className="card" style={{ padding: 16, marginBottom: 16, color: 'var(--danger)', fontWeight: 700, fontSize: 13 }}>
          {err}
          <div style={{ marginTop: 6, fontWeight: 500, color: 'var(--ink3)' }}>
            Nếu lỗi "relation v_cham_soc_khach does not exist": cần chạy migration 099 trên Supabase.
          </div>
        </div>
      )}

      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
        <div className="it"><div className="l">Cần gọi hôm nay</div><div className="v" style={{ color: 'var(--champagne)' }}>{counts.all}</div><div className="d">khách có lý do chăm sóc</div></div>
        <div className="it"><div className="l">Khách rời bỏ</div><div className="v" style={{ color: '#1a6b8a' }}>{counts.winback}</div><div className="d">vắng ≥ {WINBACK_DAYS} ngày</div></div>
        <div className="it"><div className="l">Thẻ ngủ quên</div><div className="v" style={{ color: '#6c3483' }}>{counts.card}</div><div className="d">còn buổi · lâu không tới</div></div>
        <div className="it"><div className="l">Sinh nhật tuần</div><div className="v" style={{ color: '#c0392b' }}>{counts.bday}</div><div className="d">trong {BIRTHDAY_WINDOW} ngày tới</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '8px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'var(--sans)',
                border: `1px solid ${tab === t.key ? 'transparent' : 'var(--line2)'}`,
                background: tab === t.key ? 'var(--ink)' : 'var(--bg2)',
                color: tab === t.key ? '#fff' : 'var(--ink2)',
              }}>
              {t.label} <span style={{ opacity: .7 }}>· {counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="search" style={{ flex: 1, minWidth: 200, margin: 0 }}>
          <I.Search />
          <input placeholder="Tên khách hoặc số điện thoại" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 10 }}>
        <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: 18, width: '26%' }}>Khách hàng</th>
              <th style={{ width: 130 }}>Điện thoại</th>
              <th>Lý do chăm sóc</th>
              <th style={{ width: 110 }}>Lần cuối đến</th>
              <th className="amount" style={{ width: 110 }}>Tổng chi tiêu</th>
              <th style={{ width: 168, textAlign: 'right', paddingRight: 18 }}>Liên hệ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải danh sách...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)' }}>Không có khách nào trong nhóm này.</td></tr>
            ) : paged.map(r => {
              const validPhone = isValidPhone(r.so_dien_thoai)
              const digits = phoneDigits(r.so_dien_thoai)
              return (
                <tr key={r.id}>
                  <td style={{ paddingLeft: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={lastName(r.ho_ten)} vip={r.isVip} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 850, color: 'var(--ink)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ho_ten || 'Khách lẻ'}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                          {HANG_LABEL[r.hang] || (r.isVip ? 'VIP' : 'Thường')} · {r.so_don} đơn
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--ink2)', fontWeight: 700 }}>{r.so_dien_thoai || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {r.reasons.map((x, i) => <ReasonChip key={i} r={x} />)}
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--ink2)' }}>
                    {fmtDate(r.lan_cuoi_den)}
                    {r.days != null && <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{r.days} ngày trước</div>}
                  </td>
                  <td className="amount" style={{ fontWeight: 850, color: 'var(--ink)' }}>{fmtCompact(r.tong_chi_tieu)}</td>
                  <td style={{ textAlign: 'right', paddingRight: 18 }}>
                    <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                      {validPhone ? (
                        <>
                          <a href={`tel:${digits}`} className="btn ghost" style={{ padding: '5px 10px', fontSize: 12, textDecoration: 'none' }} title="Gọi điện">Gọi</a>
                          <a href={`https://zalo.me/${digits}`} target="_blank" rel="noreferrer" className="btn ghost" style={{ padding: '5px 10px', fontSize: 12, textDecoration: 'none', color: '#1a6b8a' }} title="Mở Zalo">Zalo</a>
                          <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => copyPhone(r.so_dien_thoai)} title="Sao chép số">
                            {copied === r.so_dien_thoai ? '✓' : 'Chép'}
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Thiếu SĐT</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink3)' }}>
            <span>{filtered.length.toLocaleString('vi-VN')} khách · trang {safePage}/{totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" style={{ padding: '5px 12px' }} disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹ Trước</button>
              <button className="btn ghost" style={{ padding: '5px 12px' }} disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Sau ›</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink4)', lineHeight: 1.6 }}>
        "Lần cuối đến" tính từ đơn hàng POS thật (không dùng cột nhập tay). Giai đoạn 2 sẽ nối gửi Zalo ZNS tự động.
      </div>
    </div>
  )
}
