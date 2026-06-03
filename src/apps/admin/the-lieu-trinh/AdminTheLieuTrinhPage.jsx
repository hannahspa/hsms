import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrency } from '../../../lib/utils'
import I from '../../../components/shared/Icons'
import ModalCheckoutBuoi from './components/ModalCheckoutBuoi'
import { ComboStatus, StatusBadge } from './components/StatusBadges'
import CardReviewModal from './components/CardReviewModal'
import CardEditModal from './components/CardEditModal'
import ComboEditModal from './components/ComboEditModal'
import { theLieuTrinhService } from '../../../services/theLieuTrinhService'
import {
  displayConLai,
  displayPct,
  displaySuDung,
  displayTongBuoi,
  filterCards,
  fmtCompact,
  fmtDate,
  getCardStats,
  getRemain,
  isAlmostDoneCard,
  isExpiredCard,
  needsReviewCard,
  sortCardsNewestFirst,
} from './theLieuTrinhUtils'

const CARD_PAGE_SIZE = 25
const CARD_BACKGROUND_FETCH_SIZE = 500

function Empty({ children }) {
  return (
    <div style={{ padding: 38, border: '1px dashed var(--line)', borderRadius: 'var(--r)', background: 'var(--bg)', textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
      {children}
    </div>
  )
}

export default function AdminTheLieuTrinhPage() {
  const [cards, setCards] = useState([])
  const [combos, setCombos] = useState([])
  const [backfill, setBackfill] = useState([])
  const [loading, setLoading] = useState(true)
  const [comboLoading, setComboLoading] = useState(true)
  const [cardsFullyLoaded, setCardsFullyLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [cardPage, setCardPage] = useState(1)
  const [tab, setTab] = useState(window.location.pathname.endsWith('/combo') ? 'combos' : 'cards')
  const [selected, setSelected] = useState(null)
  const [editingCombo, setEditingCombo] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [reviewAction, setReviewAction] = useState(null)
  const [comboError, setComboError] = useState('')
  const [checkoutCard, setCheckoutCard] = useState(null)

  useEffect(() => {
    loadCards()
    loadCombos()
  }, [])

  useEffect(() => {
    setCardPage(1)
  }, [search, filter])

  const loadCards = async () => {
    setLoading(true)
    setCardsFullyLoaded(false)
    try {
      const sortedCards = await theLieuTrinhService.loadCardsProgressively({
        pageSize: CARD_PAGE_SIZE,
        backgroundFetchSize: CARD_BACKGROUND_FETCH_SIZE,
        onCards: (nextCards, meta) => {
          setCards(nextCards)
          if (meta?.firstPage) setLoading(false)
        },
      })
      setCards(sortedCards)
      if (selected?.id) {
        const fresh = sortedCards.find(card => card.id === selected.id)
        if (fresh) setSelected(fresh)
      }
      setCardsFullyLoaded(true)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const loadCombos = async () => {
    setComboLoading(true)
    setComboError('')
    const result = await theLieuTrinhService.loadCombosWithBackfill()
    setComboError(result.error || '')
    setCombos(result.combos)
    setBackfill(result.backfill)
    setComboLoading(false)
  }

  const mergeUpdatedCard = (updatedCard) => {
    setCards(prev => prev.map(card => card.id === updatedCard.id ? updatedCard : card).sort(sortCardsNewestFirst))
    setSelected(updatedCard)
  }

  const isExpired = isExpiredCard
  const isAlmostDone = isAlmostDoneCard
  const needsReview = needsReviewCard

  const { total, activeN, expiredN, doneN, almostN, comboCardN, reviewN, totalValue } = getCardStats(cards)
  const backfilledCardN = (backfill || []).reduce((sum, row) => sum + Number(row.so_the_da_gan || 0), 0)
  const filtered = filterCards(cards, filter, search)
  const cardTotalPages = Math.max(1, Math.ceil(filtered.length / CARD_PAGE_SIZE))
  const safeCardPage = Math.min(cardPage, cardTotalPages)
  const cardPageStart = (safeCardPage - 1) * CARD_PAGE_SIZE
  const pagedCards = filtered.slice(cardPageStart, cardPageStart + CARD_PAGE_SIZE)

  const comboSummary = Object.fromEntries((backfill || []).map(row => [row.ma_combo, row]))

  const CHIPS = [
    { k: 'all', label: 'Tất cả', n: total },
    { k: 'combo', label: 'Combo', n: comboCardN },
    { k: 'review', label: 'Cần rà', n: reviewN },
    { k: 'active', label: 'Đang dùng', n: activeN },
    { k: 'almost', label: 'Sắp hết', n: almostN },
    { k: 'done', label: 'Hết buổi', n: doneN },
    { k: 'expired', label: 'Hết hạn', n: expiredN },
  ]

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mod-head" style={{ marginBottom: 20 }}>
          <div>
            <div className="ttl">{tab === 'combos' ? 'Combo Liệu Trình' : 'Thẻ Liệu Trình'}</div>
            <div className="sub">
              {tab === 'combos'
                ? `${combos.length} combo cấu hình · ${backfilledCardN || comboCardN} thẻ đã gắn từ dữ liệu cũ`
                : `${total.toLocaleString('vi-VN')} thẻ khách hàng · mới nhất theo ngày mua · ${cardsFullyLoaded ? 'đã tải đủ' : 'đang tải nền'}`}
            </div>
          </div>
          <div className="acts">
            <button className="btn ghost">
              <I.Filter style={{ width: 13, height: 13 }} /> Xuất Excel
            </button>
          </div>
        </div>

        {tab === 'cards' && (
          <>
            <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
              <div className="it">
                <div className="l">Tổng thẻ</div>
                <div className="v">{total.toLocaleString('vi-VN')}</div>
                <div className="d">mọi trạng thái</div>
              </div>
              <div className="it">
                <div className="l">Đang hoạt động</div>
                <div className="v" style={{ color: '#426a2c' }}>{activeN}</div>
                <div className="d">{total > 0 ? Math.round(activeN / total * 100) : 0}% tổng thẻ</div>
              </div>
              <div className="it">
                <div className="l">Combo đã gán</div>
                <div className="v" style={{ color: 'var(--champagne)' }}>{comboCardN}</div>
                <div className="d">từ MySpa/import</div>
              </div>
              <div className="it">
                <div className="l">Cần rà trước go-live</div>
                <div className="v" style={{ color: reviewN > 0 ? '#e67e22' : '#426a2c' }}>{reviewN}</div>
                <div className="d">hết hạn / vượt buổi</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              {CHIPS.map(x => (
                <button key={x.k} className={`chip${x.k === filter ? ' active' : ''}`}
                  onClick={() => setFilter(x.k)} style={{ padding: '7px 14px', fontSize: '12.5px' }}>
                  {x.label} <span style={{ opacity: .6, marginLeft: 5 }}>{x.n}</span>
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div className="search" style={{ flex: '1 1 420px', minWidth: 320, maxWidth: 720, margin: 0 }}>
                <I.Search />
                <input placeholder="Tên KH, dịch vụ, SĐT..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink3)' }}>Đang tải danh sách thẻ...</div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ overflowX: 'visible' }}>
                <table className="tbl" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 14, width: 112, minWidth: 112, whiteSpace: 'nowrap' }}>Mã thẻ</th>
                      <th>Khách hàng</th>
                      <th>Dịch vụ / combo</th>
                      <th style={{ width: 82 }}>Ngày mua</th>
                      <th style={{ width: 78 }}>Hết hạn</th>
                      <th style={{ width: 112 }}>Sử dụng</th>
                      <th className="amount">Còn lại</th>
                      <th className="amount">Giá trị</th>
                      <th style={{ minWidth: 96, whiteSpace: 'nowrap' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCards.map(c => {
                      const pct = displayPct(c)
                      const con = getRemain(c)
                      const almost = isAlmostDone(c)
                      const expired = isExpired(c)
                      return (
                        <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                          style={{ cursor: 'pointer', ...(selected?.id === c.id ? { background: 'rgba(201,169,110,.07)', borderLeft: '3px solid var(--champagne)' } : {}) }}>
                          <td style={{ paddingLeft: 14, width: 112, minWidth: 112, whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 900, fontSize: 12, color: 'var(--champagne)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{c.ma_the || '-'}</div>
                            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>{c.loai_the === 'combo_lieu_trinh' || c.combo_id ? 'Combo' : 'Liệu trình'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{c.khach_hang?.ho_ten || '-'}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{c.khach_hang?.so_dien_thoai || ''}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700 }}>{c.ten_dich_vu}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
                              {c.combo?.ten_combo || displayTongBuoi(c)}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 700 }}>{fmtDate(c.ngay_mua)}</div>
                            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>{c.source || 'HSMS'}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: expired ? 'var(--danger)' : 'var(--ink2)', fontWeight: expired ? 800 : 600 }}>
                              {fmtDate(c.ngay_het_han)}
                            </div>
                          </td>
                          <td style={{ minWidth: 128 }}>
                            <div className="bar-h" style={{ height: 6, borderRadius: 3 }}>
                              <i style={{
                                width: `${pct}%`,
                                borderRadius: 3,
                                background: expired ? 'var(--ink3)' : almost ? '#e67e22' : 'var(--grad-gold)',
                              }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 3 }}>
                              {displaySuDung(c)}
                            </div>
                          </td>
                          <td className="amount" style={{ whiteSpace: 'nowrap', minWidth: 82 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 800, color: expired ? 'var(--ink3)' : almost ? '#e67e22' : (c.so_buoi_tong === 0 ? '#B8860B' : con > 0 ? 'var(--thu)' : 'var(--ink3)') }}>
                              {displayConLai(c)}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{c.so_buoi_tong ? 'buổi' : '—chưa cập nhật'}</span>
                            </span>
                          </td>
                          <td className="amount">
                            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 700 }}>{c.gia_tri_the ? formatCurrency(c.gia_tri_the) : '-'}</div>
                          </td>
                          <td style={{ minWidth: 96, whiteSpace: 'nowrap' }}><StatusBadge card={c} /></td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9}><Empty>Không có thẻ phù hợp.</Empty></td></tr>
                    )}
                  </tbody>
                </table>
                </div>
                {filtered.length > CARD_PAGE_SIZE && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 16px',
                    borderTop: '1px solid var(--line)',
                    color: 'var(--ink3)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    <span>
                      Hiển thị {cardPageStart + 1}-{Math.min(cardPageStart + CARD_PAGE_SIZE, filtered.length)} / {filtered.length.toLocaleString('vi-VN')} thẻ
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn ghost" disabled={safeCardPage <= 1} onClick={() => setCardPage(p => Math.max(1, p - 1))}>
                        Trước
                      </button>
                      <span>Trang {safeCardPage}/{cardTotalPages}</span>
                      <button className="btn ghost" disabled={safeCardPage >= cardTotalPages} onClick={() => setCardPage(p => Math.min(cardTotalPages, p + 1))}>
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'combos' && (
          <div>
            <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
              <div className="it"><div className="l">Combo mẫu</div><div className="v">{combos.length}</div><div className="d">cấu hình bán sẵn</div></div>
              <div className="it"><div className="l">Active</div><div className="v" style={{ color: '#426a2c' }}>{combos.filter(c => c.trang_thai === 'active').length}</div><div className="d">đang bán</div></div>
              <div className="it"><div className="l">Đã gán khách</div><div className="v" style={{ color: 'var(--champagne)' }}>{backfilledCardN || comboCardN}</div><div className="d">từ dữ liệu cũ/POS</div></div>
              <div className="it"><div className="l">Giá bán TB</div><div className="v">{fmtCompact(combos.reduce((s, c) => s + (c.gia_ban || 0), 0) / Math.max(1, combos.length))}</div><div className="d">theo combo</div></div>
            </div>

            {comboError && (
              <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, border: '1px solid rgba(180,70,55,.2)', background: 'rgba(180,70,55,.06)', color: 'var(--danger)', fontSize: 13, fontWeight: 700 }}>
                {comboError}
              </div>
            )}

            {comboLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink3)' }}>Đang tải combo liệu trình...</div>
            ) : combos.length ? (
              <div className="card" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Tên combo</th>
                      <th>Dịch vụ trong combo</th>
                      <th>Hạn dùng</th>
                      <th className="amount">Mệnh giá</th>
                      <th className="amount">Giá bán</th>
                      <th className="amount">Hoa hồng</th>
                      <th>Đã gán</th>
                      <th>Trạng thái</th>
                      <th style={{ paddingRight: 20, textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map(combo => {
                      const sum = comboSummary[combo.ma_combo] || {}
                      const services = combo.dich_vu || []
                      return (
                        <tr key={combo.id}>
                          <td style={{ paddingLeft: 20 }}>
                            <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{combo.ten_combo}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{combo.ma_combo}</div>
                          </td>
                          <td>
                            {services.length ? services.map(s => (
                              <div key={s.id} style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 3 }}>
                                {s.ten_dich_vu} · {s.so_lan > 0 ? `${s.so_lan} lần` : '? lần'}
                              </div>
                            )) : <span style={{ color: 'var(--ink3)' }}>Chưa gắn dịch vụ</span>}
                          </td>
                          <td>{combo.thoi_han_so} {combo.thoi_han_don_vi === 'year' ? 'năm' : combo.thoi_han_don_vi}</td>
                          <td className="amount">{formatCurrency(combo.menh_gia || 0)}</td>
                          <td className="amount" style={{ fontWeight: 800 }}>{formatCurrency(combo.gia_ban || 0)}</td>
                          <td className="amount">
                            <div style={{ fontWeight: 800, color: combo.ti_le_commission > 0 || combo.tien_hoa_hong > 0 ? '#426a2c' : 'var(--ink3)' }}>
                              {combo.tien_hoa_hong > 0
                                ? formatCurrency(combo.tien_hoa_hong)
                                : combo.ti_le_commission > 0
                                  ? `${combo.ti_le_commission}%`
                                  : '—'}
                            </div>
                            {combo.ti_le_commission > 0 && combo.tien_hoa_hong <= 0 && (
                              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{formatCurrency(Math.round((combo.gia_ban || 0) * combo.ti_le_commission / 100))}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--champagne)' }}>{sum.so_the_da_gan || 0} thẻ</div>
                            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{sum.so_khach_da_gan || 0} khách</div>
                          </td>
                          <td><ComboStatus combo={combo} /></td>
                          <td style={{ paddingRight: 20, textAlign: 'center' }}>
                            <button className="btn ghost" style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                              onClick={() => setEditingCombo(combo)}>
                              <I.Edit style={{ width: 13, height: 13 }} /> Sửa
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : <Empty>Chưa có combo liệu trình. Sau khi chạy migration 027, 20 combo triệt lông từ MySpa sẽ xuất hiện ở đây.</Empty>}
          </div>
        )}

        {tab === 'backfill' && (
          <div>
            {comboError ? (
              <Empty>Chưa có dữ liệu backfill vì migration 027 chưa được chạy.</Empty>
            ) : backfill.length ? (
              <div className="card" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Mã combo</th>
                      <th>Tên combo</th>
                      <th className="amount">Số thẻ đã gán</th>
                      <th className="amount">Số khách đã gán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backfill.map(row => (
                      <tr key={row.ma_combo}>
                        <td style={{ paddingLeft: 20, fontWeight: 800 }}>{row.ma_combo}</td>
                        <td>{row.ten_combo}</td>
                        <td className="amount">{row.so_the_da_gan || 0}</td>
                        <td className="amount">{row.so_khach_da_gan || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty>Chưa có thẻ cũ nào được gán combo. Nếu dữ liệu cũ có tên khác MySpa, mình sẽ bổ sung luật nhận diện theo file import.</Empty>}
          </div>
        )}
      </div>

      {selected && tab === 'cards' && createPortal((
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,.46)', zIndex: 880 }} />
          <section style={{
            position: 'fixed',
            zIndex: 881,
            top: 64,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(980px, 94vw)',
            maxHeight: 'calc(100vh - 96px)',
            background: 'var(--surface)',
            border: '1px solid var(--bord)',
            borderRadius: 12,
            boxShadow: '0 28px 90px rgba(0,0,0,.32)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--line)',
              background: 'linear-gradient(180deg, #fff, var(--bg))',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 18,
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
                <div style={{
                  width: 62,
                  height: 62,
                  borderRadius: 12,
                  background: selected.combo_id ? 'linear-gradient(135deg,#C9A96E,#7D5A3C)' : 'var(--grad-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 20,
                  flexShrink: 0,
                }}>
                  {selected.combo_id ? 'CB' : 'LT'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--champagne)' }}>{selected.ma_the || '-'}</span>
                    <StatusBadge card={selected} />
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 900, color: 'var(--ink)', lineHeight: 1.2 }}>
                    {selected.ten_dich_vu}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 5 }}>
                    {selected.khach_hang?.ho_ten || 'Khách hàng'} · {selected.khach_hang?.so_dien_thoai || '-'}
                  </div>
                </div>
              </div>
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setSelected(null)}>×</button>
            </div>

            <div style={{ padding: 22, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 18, marginBottom: 18 }}>
                <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>Tiến độ sử dụng</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--ink)' }}>
                      {`${selected.so_buoi_da_dung || 0}/${selected.so_buoi_tong || '?'} buổi`}
                    </span>
                  </div>
                  <div className="bar-h" style={{ height: 10, borderRadius: 6 }}>
                    <i style={{
                      width: `${displayPct(selected)}%`,
                      borderRadius: 6,
                      background: 'var(--grad-gold)',
                    }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
                    {[
                      ['Tổng buổi', selected.so_buoi_tong || '?'],
                      ['Đã dùng',   selected.so_buoi_da_dung || 0],
                      ['Còn lại',   displayConLai(selected)],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--champagne)', fontWeight: 900 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, background: 'var(--bg)' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>Giá trị thẻ</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 900, color: 'var(--champagne)' }}>
                    {selected.gia_tri_the ? formatCurrency(selected.gia_tri_the) : '-'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>Ngày mua</div>
                      <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 800, marginTop: 3 }}>{fmtDate(selected.ngay_mua)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>Hết hạn</div>
                      <div style={{ fontSize: 14, color: isExpired(selected) ? 'var(--danger)' : 'var(--ink)', fontWeight: 800, marginTop: 3 }}>{fmtDate(selected.ngay_het_han)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
                {[
                  ['SĐT', selected.khach_hang?.so_dien_thoai || '-'],
                  ['Combo', selected.combo?.ten_combo || '-'],
                  ['Loại thẻ', selected.combo_id ? 'Combo liệu trình' : 'Thẻ liệu trình'],
                  ['Nguồn dữ liệu', selected.source || '-'],
                  ['Ghi chú', selected.ghi_chu || '-'],
                  ['Lý do sửa gần nhất', selected.meta?.last_admin_edit_reason || '-'],
                ].map(([label, value]) => (
                  <div key={label} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', background: '#fff' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 900, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700, marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
                  </div>
                ))}
              </div>

              {needsReview(selected) && (
                <div style={{ border: '1px solid rgba(230,126,34,.25)', background: 'rgba(230,126,34,.06)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#a85f11', marginBottom: 10 }}>
                    Thẻ này cần quyết định trước go-live
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn ghost" onClick={() => setReviewAction('close_expired')}>Đóng thẻ hết hạn</button>
                    <button className="btn ghost" onClick={() => setReviewAction('extend_expiry')}>Gia hạn thẻ</button>
                    <button className="btn ghost" onClick={() => setReviewAction('adjust_sessions')}>Điều chỉnh số buổi</button>
                    <button className="btn gold" onClick={() => setReviewAction('keep_active')}>Giữ active có lý do</button>
                  </div>
                </div>
              )}

              {selected.meta?.review_status && (
                <div style={{ border: '1px solid rgba(45,122,79,.18)', background: 'rgba(45,122,79,.06)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#426a2c', textTransform: 'uppercase' }}>Đã rà soát</div>
                  <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 5 }}>{selected.meta.review_reason || 'Đã xử lý thẻ cũ'}</div>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn ghost" onClick={() => setSelected(null)}>Đóng</button>
              <button className="btn ghost" onClick={() => window.open(`tel:${selected.khach_hang?.so_dien_thoai || ''}`)}>
                <I.Phone style={{ width: 13, height: 13 }} /> Gọi nhắc lịch
              </button>
              {getRemain(selected) > 0 && (
                <button className="btn"
                  style={{ background: '#eef5e8', border: '1px solid #a5c87a', color: '#3a6a2a' }}
                  onClick={() => setCheckoutCard(selected)}>
                  ✓ Dùng 1 Buổi
                </button>
              )}
              <button className="btn gold" onClick={() => setEditingCard(selected)}>
                <I.Edit style={{ width: 13, height: 13 }} /> Sửa thông tin thẻ
              </button>
            </div>
          </section>
        </>
      ), document.body)}

      {editingCombo && (
        <ComboEditModal
          combo={editingCombo}
          onClose={() => setEditingCombo(null)}
          onSaved={loadCombos}
        />
      )}

      {reviewAction && selected && createPortal((
        <CardReviewModal
          card={selected}
          action={reviewAction}
          onClose={() => setReviewAction(null)}
          onSaved={loadCards}
        />
      ), document.body)}

      {editingCard && createPortal((
        <CardEditModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSaved={mergeUpdatedCard}
        />
      ), document.body)}

      {checkoutCard && createPortal((
        <ModalCheckoutBuoi
          card={checkoutCard}
          onClose={() => setCheckoutCard(null)}
          onDone={() => {
            setCheckoutCard(null)
            setSelected(null)
            loadCards()
          }}
        />
      ), document.body)}
    </div>
  )
}
