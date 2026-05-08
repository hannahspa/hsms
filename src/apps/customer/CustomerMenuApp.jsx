import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

// ── Thứ tự và nhãn các nhóm hiển thị ─────────────────────────────────────────
const NHOM_ORDER = [
  { key: 'all',                    label: 'Tất Cả' },
  { key: 'Chăm Sóc Da',           label: 'Chăm Sóc Da' },
  { key: 'Triệt Lông',             label: 'Triệt Lông' },
  { key: 'Massage Body',           label: 'Massage Body' },
  { key: 'Tắm Trắng & Giảm Béo',  label: 'Tắm Trắng' },
  { key: 'Gội Đầu Dưỡng Sinh',    label: 'Gội Đầu' },
  { key: 'Combo',                  label: 'Combo' },
  { key: 'Khác',                   label: 'Khác' },
]

// ── Màu accent cho từng nhóm ──────────────────────────────────────────────────
const NHOM_COLOR = {
  'Chăm Sóc Da':          '#A0714F',
  'Triệt Lông':            '#6B4E9B',
  'Massage Body':          '#2D7A4F',
  'Tắm Trắng & Giảm Béo': '#1A6B8A',
  'Gội Đầu Dưỡng Sinh':   '#B5631A',
  'Combo':                 '#C0392B',
  'Khác':                  '#7F8C8D',
}

const NHOM_ICON = {
  'Chăm Sóc Da':          '✨',
  'Triệt Lông':            '⚡',
  'Massage Body':          '🌿',
  'Tắm Trắng & Giảm Béo': '🌸',
  'Gội Đầu Dưỡng Sinh':   '💆',
  'Combo':                 '🎁',
  'Khác':                  '💎',
}

function fmt(n) {
  if (!n) return 'Liên hệ'
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

// ── Clock realtime ─────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(now.getMinutes()).padStart(2, '0')
      setTime(`${h}:${m}`)
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])
  return time
}

function isOpen() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  const h = now.getHours(), m = now.getMinutes()
  const total = h * 60 + m
  return total >= 9 * 60 + 15 && total < 20 * 60
}

// ── Service Card ───────────────────────────────────────────────────────────────
function ServiceCard({ service, km, nhomColor, onClick }) {
  const color = nhomColor || '#A0714F'
  const hasKM = !!km
  return (
    <button className="mn-card" onClick={() => onClick(service, km)}>
      {/* Color bar top */}
      <div className="mn-card-bar" style={{ background: hasKM ? '#C0392B' : color }} />

      {/* Badge KM góc phải trên */}
      {hasKM && (
        <div className="mn-km-badge">-{Math.round(km.phan_tram_giam)}%</div>
      )}

      {/* Body */}
      <div className="mn-card-body">
        {/* Icon + nhóm */}
        <div className="mn-card-nhom" style={{ color }}>
          <span>{NHOM_ICON[service.nhom_hien_thi] || '💎'}</span>
          <span>{service.nhom_hien_thi}</span>
        </div>

        {/* Tên dịch vụ */}
        <div className="mn-card-ten">{service.ten}</div>

        {/* Thời gian */}
        {service.thoi_gian_phut > 0 && (
          <div className="mn-card-time">⏱ {service.thoi_gian_phut} phút</div>
        )}

        {/* Mô tả ngắn */}
        {service.mo_ta_ngan && (
          <div className="mn-card-mota">{service.mo_ta_ngan}</div>
        )}
      </div>

      {/* Footer giá */}
      <div className="mn-card-footer" style={{ borderTop: `1px solid ${(hasKM ? '#C0392B' : color)}22` }}>
        {service.la_hot && !hasKM && <span className="mn-card-hot">🔥 HOT</span>}
        {hasKM ? (
          <div className="mn-card-gia-km">
            <span className="mn-gia-goc">{fmt(km.gia_goc)}</span>
            <span className="mn-gia-moi" style={{ color: '#C0392B' }}>{fmt(km.gia_km)}</span>
          </div>
        ) : (
          <span className="mn-card-gia" style={{ color }}>{fmt(service.gia_co_ban)}</span>
        )}
      </div>
    </button>
  )
}

// ── Modal Chi Tiết ─────────────────────────────────────────────────────────────
function ServiceModal({ service, km, onClose }) {
  const color = km ? '#C0392B' : (NHOM_COLOR[service.nhom_hien_thi] || '#A0714F')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="mn-modal-overlay" onClick={onClose}>
      <div className="mn-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="mn-modal-header" style={{ background: color }}>
          <div>
            <div className="mn-modal-nhom">
              {NHOM_ICON[service.nhom_hien_thi]} {service.nhom_hien_thi}
            </div>
            <div className="mn-modal-ten">{service.ten}</div>
          </div>
          <button className="mn-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="mn-modal-body">
          <div className="mn-modal-info-row">
            {service.thoi_gian_phut > 0 && (
              <div className="mn-modal-chip">
                <span>⏱</span>
                <span>{service.thoi_gian_phut} phút</span>
              </div>
            )}
            {service.danh_muc && (
              <div className="mn-modal-chip">
                <span>📋</span>
                <span>{service.danh_muc}</span>
              </div>
            )}
            {service.la_hot && (
              <div className="mn-modal-chip mn-chip-hot">
                <span>🔥 Dịch vụ nổi bật</span>
              </div>
            )}
          </div>

          {/* Mô tả */}
          {(service.mo_ta_day_du || service.mo_ta_ngan || service.mo_ta) ? (
            <p className="mn-modal-desc">
              {service.mo_ta_day_du || service.mo_ta_ngan || service.mo_ta}
            </p>
          ) : (
            <p className="mn-modal-desc mn-desc-placeholder">
              Liên hệ để được tư vấn chi tiết về liệu trình phù hợp với tình trạng của bạn.
            </p>
          )}

          {/* Giá */}
          {km ? (
            <div className="mn-modal-gia-block" style={{ borderColor: '#C0392B33', background: '#FFF5F5' }}>
              <div>
                <div className="mn-modal-gia-label">Giá khuyến mãi · Tiết kiệm {fmt(km.gia_goc - km.gia_km)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '14px', color: '#B8A898', textDecoration: 'line-through' }}>{fmt(km.gia_goc)}</span>
                  <span className="mn-modal-gia" style={{ color: '#C0392B' }}>{fmt(km.gia_km)}</span>
                </div>
              </div>
              <span style={{ background: '#C0392B', color: 'white', borderRadius: '8px',
                padding: '4px 10px', fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>
                -{Math.round(km.phan_tram_giam)}%
              </span>
            </div>
          ) : (
            <div className="mn-modal-gia-block" style={{ borderColor: color + '33' }}>
              <span className="mn-modal-gia-label">Giá dịch vụ</span>
              <span className="mn-modal-gia" style={{ color }}>{fmt(service.gia_co_ban)}</span>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mn-modal-footer">
          <a
            href={`https://www.facebook.com/hannahspact`}
            target="_blank"
            rel="noopener noreferrer"
            className="mn-cta-primary"
            style={{ background: color }}
          >
            💬 Đặt lịch dịch vụ này
          </a>
          <a href="tel:0379080909" className="mn-cta-ghost">
            📞 0379 080 909
          </a>
        </div>
      </div>
    </div>
  )
}

function todayISO() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    .toISOString().slice(0, 10)
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function CustomerMenuApp() {
  const [services, setServices]   = useState([])
  const [kmMap, setKmMap]         = useState({}) // dich_vu_id → km object
  const [loading, setLoading]     = useState(true)
  const [nhom, setNhom]           = useState('all')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const time = useClock()
  const open = isOpen()

  useEffect(() => {
    const today = todayISO()
    Promise.all([
      supabase.from('dich_vu').select('*')
        .eq('is_active', true).eq('hien_tren_menu', true).order('thu_tu'),
      supabase.from('khuyen_mai').select('*')
        .eq('trang_thai', 'active')
        .lte('ngay_bat_dau', today)
        .gte('ngay_ket_thuc', today),
    ]).then(([{ data: dvs }, { data: kms }]) => {
      setServices(dvs || [])
      // Map dich_vu_id → km (lấy KM giảm nhiều nhất nếu có nhiều)
      const map = {}
      ;(kms || []).forEach(km => {
        if (!km.dich_vu_id) return
        if (!map[km.dich_vu_id] || km.phan_tram_giam > map[km.dich_vu_id].phan_tram_giam) {
          map[km.dich_vu_id] = km
        }
      })
      setKmMap(map)
      setLoading(false)
    })
  }, [])

  // Filter
  const filtered = services.filter(s => {
    const matchNhom = nhom === 'all' || s.nhom_hien_thi === nhom
    const matchSearch = !search || s.ten.toLowerCase().includes(search.toLowerCase())
    return matchNhom && matchSearch
  })

  // Nhóm nào có dữ liệu
  const activeNhoms = new Set(services.map(s => s.nhom_hien_thi))

  const handleSelect = useCallback((s, km) => setSelected({ ...s, _km: km || null }), [])
  const handleClose  = useCallback(() => setSelected(null), [])

  return (
    <div className="mn-root">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mn-header">
        <div className="mn-header-brand">
          <div className="mn-logo-circle">H</div>
          <div>
            <div className="mn-brand-name">Hannah Beauty &amp; Spa</div>
            <div className="mn-brand-addr">39 Nam Kỳ Khởi Nghĩa · Ninh Kiều · Cần Thơ</div>
          </div>
        </div>

        <div className="mn-header-right">
          <div className={`mn-open-badge ${open ? 'open' : 'closed'}`}>
            <span className="mn-open-dot" />
            {open ? `Đang mở cửa · đến 20:00` : 'Đã đóng cửa'}
          </div>
          <div className="mn-clock">{time}</div>
        </div>
      </header>

      {/* ── Search + Filter tabs ────────────────────────────────── */}
      <div className="mn-filter-bar">
        <input
          className="mn-search"
          type="text"
          placeholder="🔍 Tìm dịch vụ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="mn-tabs">
          {NHOM_ORDER.filter(n => n.key === 'all' || activeNhoms.has(n.key)).map(n => (
            <button
              key={n.key}
              className={`mn-tab ${nhom === n.key ? 'active' : ''}`}
              style={nhom === n.key ? { background: NHOM_COLOR[n.key] || '#A0714F', borderColor: NHOM_COLOR[n.key] || '#A0714F' } : {}}
              onClick={() => { setNhom(n.key); setSearch('') }}
            >
              {n.key !== 'all' && NHOM_ICON[n.key]} {n.label}
              <span className="mn-tab-count">
                {n.key === 'all' ? services.length : services.filter(s => s.nhom_hien_thi === n.key).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid dịch vụ ───────────────────────────────────────── */}
      <main className="mn-main">
        {loading ? (
          <div className="mn-loading">
            <div className="mn-spinner" />
            <div>Đang tải dịch vụ...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mn-empty">
            <div style={{ fontSize: 48 }}>🔍</div>
            <div>Không tìm thấy dịch vụ phù hợp</div>
          </div>
        ) : (
          <div className="mn-grid">
            {filtered.map(s => (
              <ServiceCard
                key={s.id}
                service={s}
                km={kmMap[s.id] || null}
                nhomColor={NHOM_COLOR[s.nhom_hien_thi]}
                onClick={handleSelect}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer CTA cố định ─────────────────────────────────── */}
      <footer className="mn-footer">
        <div className="mn-footer-text">
          <span className="mn-footer-title">Đặt lịch ngay hôm nay</span>
          <span className="mn-footer-sub">Chuyên viên tư vấn miễn phí · Xác nhận trong 30 phút</span>
        </div>
        <div className="mn-footer-btns">
          <a href="https://www.facebook.com/hannahspact" target="_blank" rel="noopener noreferrer"
            className="mn-footer-btn mn-footer-btn-primary">
            💬 Nhắn Facebook
          </a>
          <a href="tel:0379080909" className="mn-footer-btn mn-footer-btn-ghost">
            📞 0379 080 909
          </a>
        </div>
      </footer>

      {/* ── Modal ──────────────────────────────────────────────── */}
      {selected && <ServiceModal service={selected} km={selected._km} onClose={handleClose} />}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .mn-root {
          min-height: 100vh;
          background: #FAF7F4;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          color: #1A1209;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── Header ── */
        .mn-header {
          background: #1A1209;
          color: #FAF7F4;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-shrink: 0;
          box-shadow: 0 2px 16px rgba(0,0,0,0.3);
        }
        .mn-header-brand { display: flex; align-items: center; gap: 14px; }
        .mn-logo-circle {
          width: 42px; height: 42px; border-radius: 50%;
          background: linear-gradient(135deg, #C9A96E, #A0714F);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px; color: white; font-weight: 500; flex-shrink: 0;
        }
        .mn-brand-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px; font-weight: 400; line-height: 1.1;
        }
        .mn-brand-addr { font-size: 11px; opacity: 0.6; margin-top: 2px; letter-spacing: 0.04em; }
        .mn-header-right { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
        .mn-open-badge {
          display: flex; align-items: center; gap: 7px;
          font-size: 12px; font-weight: 500;
          padding: 5px 12px; border-radius: 999px;
        }
        .mn-open-badge.open  { background: rgba(45,122,79,0.25); color: #6FCF8E; }
        .mn-open-badge.closed { background: rgba(192,57,43,0.25); color: #E8796B; }
        .mn-open-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
        }
        .mn-open-badge.open  .mn-open-dot { background: #6FCF8E; box-shadow: 0 0 0 3px rgba(111,207,142,0.3); }
        .mn-open-badge.closed .mn-open-dot { background: #E8796B; }
        .mn-clock {
          font-family: 'JetBrains Mono', monospace;
          font-size: 22px; font-weight: 500;
          color: #C9A96E; letter-spacing: 0.05em;
        }

        /* ── Filter bar ── */
        .mn-filter-bar {
          background: white;
          border-bottom: 1px solid #E8DDD4;
          padding: 10px 20px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mn-search {
          width: 100%; max-width: 360px;
          border: 1px solid #E8DDD4; border-radius: 8px;
          padding: 8px 14px; font-size: 14px;
          background: #FAF7F4; color: #1A1209;
          outline: none; transition: border-color .2s;
        }
        .mn-search:focus { border-color: #A0714F; }
        .mn-tabs {
          display: flex; gap: 8px; overflow-x: auto;
          scrollbar-width: none; -ms-overflow-style: none;
          padding-bottom: 2px;
        }
        .mn-tabs::-webkit-scrollbar { display: none; }
        .mn-tab {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 999px;
          border: 1.5px solid #E8DDD4;
          background: white; cursor: pointer;
          font-size: 13px; font-weight: 500;
          color: #8B7355; white-space: nowrap;
          transition: all .2s; flex-shrink: 0;
        }
        .mn-tab:hover { border-color: #A0714F; color: #A0714F; }
        .mn-tab.active { color: white; }
        .mn-tab-count {
          background: rgba(255,255,255,0.25);
          border-radius: 999px; padding: 1px 6px;
          font-size: 11px; font-weight: 600;
        }
        .mn-tab:not(.active) .mn-tab-count {
          background: #F0E9E0; color: #A0714F;
        }

        /* ── Main grid ── */
        .mn-main {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          -webkit-overflow-scrolling: touch;
        }
        .mn-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        /* ── Card ── */
        .mn-card {
          background: white;
          border-radius: 14px;
          border: 1px solid #EEE5DC;
          box-shadow: 0 2px 12px rgba(160,113,79,0.07);
          cursor: pointer;
          text-align: left;
          overflow: hidden;
          display: flex; flex-direction: column;
          transition: transform .18s, box-shadow .18s;
        }
        .mn-card:hover, .mn-card:active {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(160,113,79,0.16);
        }
        .mn-card-bar { height: 4px; flex-shrink: 0; }
        .mn-card-body { padding: 16px 16px 10px; flex: 1; }
        .mn-card-nhom {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 8px; opacity: 0.85;
        }
        .mn-card-ten {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 18px; font-weight: 500; line-height: 1.25;
          color: #1A1209; margin-bottom: 6px;
        }
        .mn-card-time {
          font-size: 11px; color: #8B7355; margin-bottom: 4px;
        }
        .mn-card-mota {
          font-size: 12px; color: #B8A898; line-height: 1.5;
          margin-top: 4px;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .mn-card-footer {
          padding: 10px 16px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .mn-card-hot {
          font-size: 10px; font-weight: 700;
          background: #FEF3CD; color: #B8860B;
          border-radius: 4px; padding: 2px 6px;
        }
        .mn-card-gia {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px; font-weight: 600;
          margin-left: auto;
        }
        .mn-km-badge {
          position: absolute; top: 10px; right: 10px;
          background: #C0392B; color: white;
          border-radius: 6px; padding: 3px 8px;
          font-size: 11px; font-weight: 800;
          box-shadow: 0 2px 8px rgba(192,57,43,0.35);
        }
        .mn-card { position: relative; }
        .mn-card-gia-km {
          display: flex; flex-direction: column; align-items: flex-end; margin-left: auto; gap: 1px;
        }
        .mn-gia-goc {
          font-size: 11px; color: #B8A898; text-decoration: line-through;
        }
        .mn-gia-moi {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px; font-weight: 700;
        }

        /* ── Loading / Empty ── */
        .mn-loading, .mn-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 16px;
          min-height: 300px; color: #8B7355; font-size: 15px;
        }
        .mn-spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid #E8DDD4; border-top-color: #A0714F;
          animation: mn-spin .8s linear infinite;
        }
        @keyframes mn-spin { to { transform: rotate(360deg); } }

        /* ── Footer ── */
        .mn-footer {
          background: #1A1209;
          padding: 14px 28px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-shrink: 0; flex-wrap: wrap;
        }
        .mn-footer-text { display: flex; flex-direction: column; gap: 2px; }
        .mn-footer-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 18px; color: #FAF7F4;
        }
        .mn-footer-sub { font-size: 11px; color: rgba(250,247,244,0.5); }
        .mn-footer-btns { display: flex; gap: 10px; }
        .mn-footer-btn {
          padding: 10px 20px; border-radius: 999px;
          font-size: 13px; font-weight: 600;
          text-decoration: none; white-space: nowrap;
          transition: opacity .2s;
        }
        .mn-footer-btn:hover { opacity: 0.85; }
        .mn-footer-btn-primary {
          background: linear-gradient(135deg, #C9A96E, #A0714F);
          color: white;
        }
        .mn-footer-btn-ghost {
          background: transparent; color: #FAF7F4;
          border: 1.5px solid rgba(250,247,244,0.25);
        }

        /* ── Modal ── */
        .mn-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(26,18,9,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; padding: 20px;
          animation: mn-fade-in .2s ease;
        }
        @keyframes mn-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .mn-modal {
          background: white; border-radius: 20px;
          width: 100%; max-width: 520px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.3);
          animation: mn-slide-up .25s ease;
        }
        @keyframes mn-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .mn-modal-header {
          padding: 24px 24px 20px;
          color: white;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
        }
        .mn-modal-nhom {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          opacity: 0.85; margin-bottom: 8px;
        }
        .mn-modal-ten {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 26px; font-weight: 500; line-height: 1.2;
        }
        .mn-modal-close {
          background: rgba(255,255,255,0.2); border: none;
          color: white; width: 32px; height: 32px; border-radius: 50%;
          cursor: pointer; font-size: 14px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: background .2s;
        }
        .mn-modal-close:hover { background: rgba(255,255,255,0.35); }
        .mn-modal-body { padding: 24px; }
        .mn-modal-info-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .mn-modal-chip {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; color: #8B7355;
          background: #FAF7F4; border: 1px solid #E8DDD4;
          padding: 5px 10px; border-radius: 6px;
        }
        .mn-chip-hot { background: #FEF3CD; border-color: #F0D060; color: #B8860B; }
        .mn-modal-desc {
          font-size: 14px; color: #5A4A3A; line-height: 1.72;
          margin-bottom: 20px;
        }
        .mn-desc-placeholder { font-style: italic; color: #B8A898; }
        .mn-modal-gia-block {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-radius: 12px; border: 1px solid;
          background: #FAF7F4;
        }
        .mn-modal-gia-label { font-size: 12px; color: #8B7355; text-transform: uppercase; letter-spacing: 0.1em; }
        .mn-modal-gia {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 28px; font-weight: 600;
        }
        .mn-modal-footer {
          padding: 16px 24px 24px;
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .mn-cta-primary, .mn-cta-ghost {
          flex: 1; padding: 14px 20px; border-radius: 12px;
          text-align: center; font-size: 14px; font-weight: 600;
          text-decoration: none; transition: opacity .2s;
          min-width: 140px;
        }
        .mn-cta-primary { color: white; }
        .mn-cta-primary:hover { opacity: 0.88; }
        .mn-cta-ghost {
          background: transparent; color: #1A1209;
          border: 1.5px solid #E8DDD4;
        }
        .mn-cta-ghost:hover { border-color: #A0714F; color: #A0714F; }

        /* ── iPad landscape ── */
        @media (min-width: 1024px) {
          .mn-grid { grid-template-columns: repeat(4, 1fr); }
          .mn-header { padding: 16px 40px; }
          .mn-filter-bar { padding: 12px 40px; flex-direction: row; align-items: center; }
          .mn-search { max-width: 280px; }
          .mn-main { padding: 24px 40px; }
          .mn-footer { padding: 16px 40px; }
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .mn-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .mn-main { padding: 12px; }
          .mn-footer { padding: 12px 16px; }
          .mn-footer-title { font-size: 15px; }
          .mn-header { padding: 10px 14px; }
          .mn-brand-addr { display: none; }
          .mn-clock { font-size: 18px; }
          .mn-card-ten { font-size: 15px; }
          .mn-card-gia { font-size: 16px; }
        }
      `}</style>
    </div>
  )
}
