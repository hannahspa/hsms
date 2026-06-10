// Thanh Tìm Kiếm Thông Minh — Smart Search
// Nhận diện: SĐT → KH + ĐH | DH-... → Đơn Hàng | THE-LT-... → Thẻ | text → tất cả 6 nhóm
// Dùng trong AdminShell header
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'
import { C } from '../../constants/colors'
import I from './Icons'

// ── CONSTANTS ─────────────────────────────────────────────
const PATTERNS = {
  phone:      /^\d{6,}$/,
  order_code: /^DH-\d{8}-\d{3,}$/i,
  card_code:  /^THE-LT-\d{4,}$/i,
}

const LIMIT = 5 // max kết quả mỗi nhóm
const DEBOUNCE_MS = 280

const GROUPS = [
  { key: 'customers',  label: 'Khách Hàng',     icon: 'Heart' },
  { key: 'orders',     label: 'Đơn Hàng',       icon: 'Cart' },
  { key: 'cards',      label: 'Thẻ Liệu Trình',  icon: 'CreditCard' },
  { key: 'services',   label: 'Dịch Vụ',        icon: 'Spark' },
  { key: 'products',   label: 'Sản Phẩm Kho',   icon: 'Box' },
  { key: 'employees',  label: 'Nhân Viên',       icon: 'Users' },
]

function iconFor(key) {
  const g = GROUPS.find(x => x.key === key)
  const iconName = g?.icon || 'Search'
  return I[iconName]
}

// ── PHÂN LOẠI INPUT ───────────────────────────────────────
function classifyInput(raw) {
  const t = raw.trim()
  if (!t) return { type: 'empty' }
  if (PATTERNS.phone.test(t))      return { type: 'phone',      value: t }
  if (PATTERNS.order_code.test(t))  return { type: 'order_code', value: t.toUpperCase() }
  if (PATTERNS.card_code.test(t))   return { type: 'card_code',  value: t.toUpperCase() }
  return { type: 'text', value: t }
}

// ── ĐIỀU HƯỚNG ────────────────────────────────────────────
function navigateTo(groupKey, item) {
  switch (groupKey) {
    case 'customers':
      window.location.href = `/admin/crm/khach-hang/${item.id}`
      break
    case 'orders':
      window.location.href = `/pos?resume=${item.id}`
      break
    case 'cards':
      window.location.href = `/admin/the-lieu-trinh?search=${encodeURIComponent(item.ma_the || '')}`
      break
    case 'services':
      window.location.href = '/admin/dich-vu'
      break
    case 'products':
      window.location.href = '/admin/kho-hang'
      break
    case 'employees':
      window.location.href = '/admin/nhan-su/ho-so'
      break
    default:
      break
  }
}

// ── QUERY HELPERS ──────────────────────────────────────────
async function searchCustomers(q) {
  const { data } = await supabase.from('khach_hang')
    .select('id, ho_ten, so_dien_thoai')
    .eq('is_active', true)
    .or(`ho_ten.ilike.%${q}%,so_dien_thoai.ilike.%${q}%`)
    .order('lan_cuoi_den', { ascending: false, nullsFirst: false })
    .limit(LIMIT)
  return data || []
}

async function searchOrders(q) {
  const { data } = await supabase.from('don_hang')
    .select('id, ma_don, thuc_thu, trang_thai, khach_hang:khach_hang_id(ho_ten)')
    .ilike('ma_don', `%${q}%`)
    .order('ngay', { ascending: false })
    .limit(LIMIT)
  return data || []
}

async function searchCards(q) {
  const { data } = await supabase.from('the_lieu_trinh')
    .select('id, ma_the, ten_dich_vu, trang_thai, khach_hang:khach_hang_id(ho_ten)')
    .ilike('ma_the', `%${q}%`)
    .order('ngay_mua', { ascending: false, nullsFirst: false })
    .limit(LIMIT)
  return data || []
}

async function searchServices(q) {
  const { data } = await supabase.from('dich_vu')
    .select('id, ten, danh_muc, gia_co_ban')
    .eq('is_active', true)
    .ilike('ten', `%${q}%`)
    .order('ten')
    .limit(LIMIT)
  return data || []
}

async function searchProducts(q) {
  const { data } = await supabase.from('kho_san_pham')
    .select('id, ten, loai, ton_kho, gia_ban')
    .eq('is_active', true)
    .ilike('ten', `%${q}%`)
    .order('ten')
    .limit(LIMIT)
  return data || []
}

async function searchEmployees(q) {
  const { data } = await supabase.from('nhan_vien')
    .select('id, ho_ten, vi_tri, trang_thai')
    .or(`ho_ten.ilike.%${q}%,vi_tri.ilike.%${q}%`)
    .eq('trang_thai', 'dang_lam')
    .order('ho_ten')
    .limit(LIMIT)
  return data || []
}

// ── STATUS LABELS ──────────────────────────────────────────
const TT = {
  draft: 'Nháp', da_thanh_toan: 'Đã TT', no_mot_phan: 'Nợ', huy: 'Huỷ',
  active: 'Active', het_buoi: 'Hết buổi', het_han: 'Hết hạn', da_huy: 'Đã huỷ',
  dang_lam: 'Đang làm',
}

// ══════════════════════════════════════════════════════════════
export default function SmartSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  // ── Click ngoài → đóng dropdown ──────────────────────────
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Cmd+K / Ctrl+K → focus ───────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // ── Debounced search ─────────────────────────────────────
  const doSearch = useCallback(async (raw) => {
    const c = classifyInput(raw)
    if (c.type === 'empty') {
      setResults({}); setShow(false); setLoading(false); return
    }

    setLoading(true)
    try {
      const next = {}

      if (c.type === 'phone') {
        // Ưu tiên exact match SĐT
        const { data: exact } = await supabase.from('khach_hang')
          .select('id, ho_ten, so_dien_thoai')
          .eq('so_dien_thoai', c.value)
          .eq('is_active', true)
          .maybeSingle()
        if (exact) {
          next.customers = [exact]
          // Kèm đơn hàng của KH này
          const { data: custOrders } = await supabase.from('don_hang')
            .select('id, ma_don, thuc_thu, trang_thai, khach_hang:khach_hang_id(ho_ten)')
            .eq('khach_hang_id', exact.id)
            .order('ngay', { ascending: false })
            .limit(LIMIT)
          if (custOrders?.length) next.orders = custOrders
        } else {
          const cust = await searchCustomers(c.value)
          if (cust.length) next.customers = cust
        }
      } else if (c.type === 'order_code') {
        const ord = await searchOrders(c.value)
        if (ord.length) next.orders = ord
        // Fallback tìm KH nếu có text kèm
        const cust = await searchCustomers(c.value)
        if (cust.length) next.customers = cust
      } else if (c.type === 'card_code') {
        const cards = await searchCards(c.value)
        if (cards.length) next.cards = cards
        const cust = await searchCustomers(c.value)
        if (cust.length) next.customers = cust
      } else {
        // text: fan-out 6 query song song
        const settled = await Promise.allSettled([
          searchCustomers(c.value),
          searchOrders(c.value),
          searchCards(c.value),
          searchServices(c.value),
          searchProducts(c.value),
          searchEmployees(c.value),
        ])
        const [cust, ord, cards, svc, prod, emp] = settled.map(r => r.status === 'fulfilled' ? r.value : [])
        if (cust.length) next.customers = cust
        if (ord.length) next.orders = ord
        if (cards.length) next.cards = cards
        if (svc.length) next.services = svc
        if (prod.length) next.products = prod
        if (emp.length) next.employees = emp
      }

      setResults(next)
      setShow(true)
      setActiveIdx(-1)
    } catch (_) { /* silence */ }
    finally { setLoading(false) }
  }, [])

  const handleChange = useCallback((val) => {
    setQuery(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), DEBOUNCE_MS)
  }, [doSearch])

  // ── Danh sách phẳng cho phím mũi tên ──────────────────────
  const flat = GROUPS.reduce((acc, g) => {
    const items = results[g.key]
    if (items?.length) items.forEach(item => acc.push({ group: g.key, item }))
    return acc
  }, [])

  const hasAny = flat.length > 0

  // ── Keyboard ──────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!show && e.key === 'Escape') { inputRef.current?.blur(); return }
    if (!show) return

    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(p => Math.min(p + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(p => Math.max(p - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && flat[activeIdx]) {
        const { group, item } = flat[activeIdx]
        setShow(false)
        setQuery('')
        navigateTo(group, item)
      }
    } else if (e.key === 'Escape') { setShow(false); inputRef.current?.blur() }
  }

  // ── Render ────────────────────────────────────────────────
  const wrapperStyle = { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }

  return (
    <div ref={wrapRef} style={wrapperStyle}>
      <I.Search />
      <input
        ref={inputRef}
        type="text"
        placeholder="Tìm khách hàng, đơn hàng, dịch vụ…"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (hasAny) setShow(true) }}
        onKeyDown={handleKeyDown}
      />
      <kbd>⌘K</kbd>

      {/* ── Dropdown ── */}
      {show && (
        <div className="smart-search-dropdown">
          {loading && !hasAny && <div className="smart-search-empty">Đang tìm…</div>}
          {!loading && !hasAny && query.trim() && (
            <div className="smart-search-empty">Không tìm thấy kết quả cho "{query}"</div>
          )}
          {GROUPS.map(g => {
            const items = results[g.key]
            if (!items?.length) return null
            const GIcon = iconFor(g.key)
            return (
              <div key={g.key}>
                <div className="smart-search-group-label">
                  <GIcon style={{ width: 11, height: 11, verticalAlign: -2, marginRight: 5 }} />
                  {g.label} <span style={{ fontWeight: 400, marginLeft: 4 }}>({items.length})</span>
                </div>
                {items.map((item, i) => {
                  const fi = flat.findIndex(f => f.group === g.key && f.item === item)
                  const isActive = fi === activeIdx
                  return (
                    <div
                      key={item.id || i}
                      className={`smart-search-row${isActive ? ' active' : ''}`}
                      onClick={() => { setShow(false); setQuery(''); navigateTo(g.key, item) }}
                      onMouseEnter={() => setActiveIdx(fi)}
                    >
                      <div className="smart-search-row-icon">
                        <GIcon style={{ width: 15, height: 15 }} />
                      </div>
                      <div className="smart-search-row-main">
                        <div className="smart-search-row-title">
                          {g.key === 'customers' && item.ho_ten}
                          {g.key === 'orders' && (item.ma_don || 'Đơn #' + item.id.slice(0, 8))}
                          {g.key === 'cards' && (item.ma_the || 'Thẻ #' + item.id.slice(0, 8))}
                          {g.key === 'services' && item.ten}
                          {g.key === 'products' && item.ten}
                          {g.key === 'employees' && item.ho_ten}
                        </div>
                        <div className="smart-search-row-sub">
                          {g.key === 'customers' && item.so_dien_thoai}
                          {g.key === 'orders' && (item.khach_hang?.ho_ten || '—')}
                          {g.key === 'cards' && (item.ten_dich_vu || '')}
                          {g.key === 'services' && (item.danh_muc || '')}
                          {g.key === 'products' && `Tồn: ${item.ton_kho ?? 0}`}
                          {g.key === 'employees' && item.vi_tri}
                        </div>
                      </div>
                      <div className="smart-search-row-meta">
                        {g.key === 'orders' && (item.trang_thai && item.trang_thai !== 'da_thanh_toan' ? (TT[item.trang_thai] || item.trang_thai) : formatCurrency(item.thuc_thu || 0))}
                        {g.key === 'services' && formatCurrency(item.gia_co_ban || 0)}
                        {g.key === 'products' && formatCurrency(item.gia_ban || 0)}
                        {g.key === 'cards' && (TT[item.trang_thai] || item.trang_thai || '')}
                        {g.key === 'employees' && (TT[item.trang_thai] || item.trang_thai || '')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
