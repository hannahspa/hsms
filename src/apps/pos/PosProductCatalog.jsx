import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { posService } from '../../services/posService'
import { formatCurrency } from '../../lib/utils'
import { calcServiceCommission, getCommissionPercent, getMyspaCommissionRule, serviceSalePrice } from '../../lib/serviceCommission'
import { C, FONT } from '../../constants/colors'

const PRIORITY_CATS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Gội Đầu', label: 'Gội Đầu' },
  { key: 'Massage Body', label: 'Massage Body' },
  { key: 'Chăm Sóc Da Mặt', label: 'Chăm Sóc Da' },
  { key: 'Triệt Lông', label: 'Triệt Lông' },
  { key: 'Công Nghệ Cao - Laser', label: 'Công Nghệ Cao' },
]

const PRIORITY_KEYS = new Set(PRIORITY_CATS.filter(c => c.key !== 'all').map(c => c.key))

const TABS_KH = [
  { key: 'the', label: 'Dùng thẻ' },
  { key: 'combo', label: 'Mua combo' },
  { key: 'dich_vu', label: 'Dịch vụ' },
  { key: 'san_pham', label: 'Sản phẩm' },
]

export default function PosProductCatalog({ onAddItem, selectedCustomer, isGuest }) {
  const [mode, setMode] = useState('dich_vu')
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')
  const [services, setServices] = useState([])
  const [allCats, setAllCats] = useState([])
  const [products, setProducts] = useState([])
  const [cards, setCards] = useState([])
  const [combos, setCombos] = useState([])
  const [showOtherMenu, setShowOtherMenu] = useState(false)
  const [otherMenuPos, setOtherMenuPos] = useState({ top: 0, left: 0, width: 220 })
  const otherMenuBtnRef = useRef(null)

  const loadServices = useCallback(async () => {
    try {
      const svc = await posService.getServices(search, cat === 'all' ? '' : cat)
      setServices(svc)
      if (!allCats.length) setAllCats(await posService.getServiceCategories())
    } catch (_) {}
  }, [search, cat, allCats.length])

  const loadProducts = useCallback(async () => {
    try { setProducts(await posService.getSellableProducts(search)) } catch (_) {}
  }, [search])

  const loadCards = useCallback(async () => {
    if (!selectedCustomer?.id) { setCards([]); return }
    try { setCards(await posService.getCustomerCards(selectedCustomer.id)) } catch (_) { setCards([]) }
  }, [selectedCustomer?.id])

  const loadCombos = useCallback(async () => {
    try { setCombos(await posService.getTreatmentCombos()) } catch (_) { setCombos([]) }
  }, [])

  useEffect(() => { loadServices() }, [loadServices])
  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadCards() }, [loadCards])
  useEffect(() => { loadCombos() }, [loadCombos])
  const tabs = TABS_KH
  const otherCats = allCats.filter(c => !PRIORITY_KEYS.has(c))

  const handleAddService = (dv) => {
    const gia = serviceSalePrice(dv)
    const pct = getCommissionPercent(dv, 'ktv')
    const tour = calcServiceCommission(dv, gia, 'ktv')
    onAddItem({
      loai_item: 'dich_vu',
      dich_vu_id: dv.id,
      dich_vu: { ten: dv.ten, danh_muc: dv.danh_muc, ti_le_hoa_hong: pct },
      don_gia: gia,
      thanh_tien: gia,
      ti_le_hoa_hong: pct,
      tien_tour: tour,
      tien_commission: 0,
      meta: {
        myspaCommission: {
          ktv: getMyspaCommissionRule(dv, 'ktv'),
          le_tan: getMyspaCommissionRule(dv, 'le_tan'),
        },
      },
    })
  }

  const handleAddProduct = (sp) => {
    const gia = sp.gia_ban || 0
    const commission = sp.hoa_hong_kieu === 'fixed'
      ? Number(sp.tien_hoa_hong || 0)
      : sp.hoa_hong_kieu === 'percent'
        ? Math.round(gia * Number(sp.ti_le_hoa_hong || 0) / 100)
        : 0
    onAddItem({
      loai_item: 'san_pham',
      san_pham_id: sp.id,
      san_pham: { ten: sp.ten, don_vi: sp.don_vi },
      don_gia: gia,
      thanh_tien: gia,
      so_luong: 1,
      tien_tour: 0,
      ti_le_hoa_hong: sp.hoa_hong_kieu === 'percent' ? Number(sp.ti_le_hoa_hong || 0) : null,
      tien_commission: commission,
      meta: {
        productCode: sp.ma_sp || null,
        sku: sp.sku || null,
        barcode: sp.barcode || null,
        commissionRule: {
          type: sp.hoa_hong_kieu || 'none',
          percent: Number(sp.ti_le_hoa_hong || 0),
          fixed: Number(sp.tien_hoa_hong || 0),
        },
      },
    })
  }

  const handleAddCard = (the) => {
    onAddItem({
      loai_item: 'the_lieu_trinh',
      the_lieu_trinh_id: the.id,
      the_lieu_trinh: {
        ten_dich_vu: the.ten_dich_vu,
        so_buoi_con_lai: the.so_buoi_con_lai,
        so_buoi_tong: the.so_buoi_tong,
        so_buoi_da_dung: the.so_buoi_da_dung,
        gia_tri_the: the.gia_tri_the,
        ngay_het_han: the.ngay_het_han,
        is_khong_gioi_han: the.is_khong_gioi_han,
      },
      don_gia: 0,
      thanh_tien: 0,
      tien_tour: 0,
      tien_commission: 0,
    })
  }

  const handleAddCombo = (combo) => {
    if (!selectedCustomer?.id) {
      alert('Vui lòng chọn khách hàng trước khi bán combo liệu trình')
      return
    }
    const primary = combo.dich_vu?.[0] || {}
    const soLan = primary.khong_gioi_han ? 9999 : (primary.so_lan || 1)
    const gia = combo.gia_ban || 0
    const commission = combo.tien_commission || Math.round(gia * (combo.ti_le_commission || 0) / 100)
    const end = new Date()
    if (combo.thoi_han_don_vi === 'month') end.setMonth(end.getMonth() + (combo.thoi_han_so || 1))
    else if (combo.thoi_han_don_vi === 'day') end.setDate(end.getDate() + (combo.thoi_han_so || 1))
    else end.setFullYear(end.getFullYear() + (combo.thoi_han_so || 1))
    const ngayHetHan = end.toISOString().slice(0, 10)
    onAddItem({
      loai_item: 'the_moi',
      dich_vu_id: primary.dich_vu_id || null,
      dich_vu: { ten: combo.ten_combo, danh_muc: 'Combo liệu trình' },
      don_gia: gia,
      thanh_tien: gia,
      so_luong: 1,
      ti_le_hoa_hong: combo.ti_le_commission || null,
      tien_tour: 0,
      tien_commission: commission,
      meta: {
        loai: 'combo_lieu_trinh',
        comboId: combo.id,
        maCombo: combo.ma_combo,
        tenDichVu: combo.ten_combo,
        dichVuId: primary.dich_vu_id || null,
        soBuoiMua: soLan,
        soBuoiTang: 0,
        soBuoiTong: soLan,
        giaTriThe: gia,
        ngayHetHan,
        khongGioiHan: !!primary.khong_gioi_han,
        thoiHanSo: combo.thoi_han_so || 1,
        thoiHanDonVi: combo.thoi_han_don_vi || 'year',
        dichVuCombo: combo.dich_vu || [],
      },
    })
  }

  const ServiceChips = () => (
    <div style={{ display: 'flex', gap: 6, padding: '6px 16px 8px', overflowX: 'auto', scrollbarWidth: 'none', position: 'sticky', top: 84, zIndex: 19, background: C.bg, borderBottom: `1px solid ${C.line}` }}>
      {PRIORITY_CATS.map(c => (
        <button key={c.key} onClick={() => { setCat(c.key); setShowOtherMenu(false) }} style={{
          padding: '5px 14px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          border: c.key === cat ? 'none' : `1px solid ${C.line2}`,
          background: c.key === cat ? C.espresso : C.surface2,
          color: c.key === cat ? '#fff' : C.ink2,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: FONT.sans,
        }}>{c.label}</button>
      ))}

      {otherCats.length > 0 && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button ref={otherMenuBtnRef} onClick={() => {
            const rect = otherMenuBtnRef.current?.getBoundingClientRect()
            if (rect) {
              setOtherMenuPos({
                top: rect.bottom + 6,
                left: Math.min(rect.left, window.innerWidth - 260),
                width: Math.max(220, rect.width),
              })
            }
            setShowOtherMenu(v => !v)
          }} style={{
            padding: '5px 14px',
            borderRadius: 999,
            border: otherCats.includes(cat) ? 'none' : `1px solid ${C.line2}`,
            background: otherCats.includes(cat) ? C.espresso : C.surface2,
            color: otherCats.includes(cat) ? '#fff' : C.ink2,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: FONT.sans,
            whiteSpace: 'nowrap',
          }}>
            {otherCats.includes(cat) ? cat : 'Khác'} ▾
          </button>
          {showOtherMenu && createPortal(
            <>
              <div style={{ position: 'fixed', top: otherMenuPos.top, left: otherMenuPos.left, zIndex: 3000, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: C.shadow, minWidth: otherMenuPos.width, overflow: 'hidden' }}>
                {otherCats.map(c => (
                  <button key={c} onClick={() => { setCat(c); setShowOtherMenu(false) }} style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 14px',
                    border: 'none',
                    borderBottom: `1px solid ${C.line}`,
                    background: cat === c ? C.bg : C.surface2,
                    color: cat === c ? C.ink : C.ink2,
                    fontWeight: cat === c ? 700 : 400,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: FONT.sans,
                  }}>{c}</button>
                ))}
              </div>
              <div style={{ position: 'fixed', inset: 0, zIndex: 2999 }} onClick={() => setShowOtherMenu(false)} />
            </>,
            document.body
          )}
        </div>
      )}
    </div>
  )

  const renderServices = () => (
    <>
      <ServiceChips />
      <div style={{ padding: '8px 12px 16px' }}>
        {services.length === 0 ? (
          <Empty text="Không tìm thấy dịch vụ" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {services.map(dv => (
              <CatalogButton key={dv.id} onClick={() => handleAddService(dv)} title={dv.ten} meta={dv.thoi_gian_phut > 0 ? `${dv.thoi_gian_phut} phút` : ''} price={dv.gia_co_ban} />
            ))}
          </div>
        )}
      </div>
    </>
  )

  const renderProducts = () => (
    <div style={{ padding: '8px 12px 16px' }}>
      {products.length === 0 ? (
        <Empty text="Không có sản phẩm" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {products.map(sp => (
            <CatalogButton key={sp.id} onClick={() => handleAddProduct(sp)} title={sp.ten} meta={`Tồn: ${sp.ton_kho} ${sp.don_vi}`} price={sp.gia_ban} />
          ))}
        </div>
      )}
    </div>
  )

  const renderCards = () => {
    const usable = cards.filter(c => (c.is_khong_gioi_han || c.so_buoi_con_lai > 0))
    return (
      <div style={{ padding: '12px 16px' }}>
        {!selectedCustomer ? (
          <Empty text="Chọn khách hàng để xem thẻ liệu trình" />
        ) : usable.length === 0 ? (
          <Empty text="Khách không có thẻ liệu trình đang dùng" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, alignContent: 'start' }}>
            {usable.map(the => (
              <button key={the.id} onClick={() => handleAddCard(the)} style={{
                border: '1px solid var(--bord)',
                borderRadius: 10,
                padding: 10,
                textAlign: 'left',
                cursor: 'pointer',
                background: the.combo_id ? 'linear-gradient(135deg,#2f241b 0%,#A0714F 55%,#C9A96E 100%)' : 'linear-gradient(135deg,#C9A96E 0%,#A0714F 55%,#7D5A3C 100%)',
                boxShadow: '0 2px 8px rgba(160,113,79,.25)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>{the.ten_dich_vu}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>
                  {the.is_khong_gioi_han ? 'Không giới hạn' : `Còn ${the.so_buoi_con_lai}/${the.so_buoi_tong} buổi`}
                </div>
                {the.ngay_het_han && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>HH: {the.ngay_het_han}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderCombos = () => (
    <div style={{ padding: '8px 12px 16px' }}>
      {!selectedCustomer ? (
        <Empty text="Chọn khách hàng để bán combo liệu trình" />
      ) : combos.length === 0 ? (
        <Empty text="Chưa có combo liệu trình đang hoạt động" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
          {combos.filter(c => !search || `${c.ten_combo} ${c.ma_combo}`.toLowerCase().includes(search.toLowerCase())).map(combo => {
            const primary = combo.dich_vu?.[0]
            return (
              <CatalogButton
                key={combo.id}
                onClick={() => handleAddCombo(combo)}
                title={combo.ten_combo}
                meta={`${primary?.ten_dich_vu || 'Combo'} · ${primary?.khong_gioi_han ? 'Không giới hạn' : `${primary?.so_lan || 0} lần`} · ${combo.thoi_han_so} ${combo.thoi_han_don_vi === 'year' ? 'năm' : combo.thoi_han_don_vi}`}
                price={combo.gia_ban}
                wide
              />
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Sticky: Search + Tabs ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: C.bg, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ padding: '8px 16px 6px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={mode === 'san_pham' ? 'Tìm nhanh sản phẩm' : mode === 'the' ? 'Tìm nhanh thẻ liệu trình' : mode === 'combo' ? 'Tìm nhanh combo liệu trình' : 'Tìm nhanh dịch vụ'}
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.line2}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none', background: C.surface2, color: C.ink, fontFamily: FONT.sans }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setMode(t.key); setSearch(''); setCat('all') }} style={{
              flex: 1,
              height: 32,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: FONT.sans,
              border: mode === t.key ? 'none' : `1px solid ${C.line2}`,
              background: mode === t.key ? C.grad : C.surface2,
              color: mode === t.key ? C.espresso : C.ink2,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {mode === 'dich_vu' && renderServices()}
      {mode === 'san_pham' && renderProducts()}
      {mode === 'the' && renderCards()}
      {mode === 'combo' && renderCombos()}
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 13 }}>{text}</div>
}

function CatalogButton({ title, meta, price, onClick, wide = false }) {
  return (
    <button onClick={onClick} style={{
      border: `1px solid ${C.line}`,
      borderRadius: 8,
      background: C.surface2,
      cursor: 'pointer',
      textAlign: 'left',
      padding: '10px 10px 8px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: wide ? 118 : 96,
      fontFamily: FONT.sans,
      boxShadow: C.shadowSm,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.35 }}>{title}</div>
        {meta && <div style={{ fontSize: 11, color: C.ink3, marginTop: 4, lineHeight: 1.35 }}>{meta}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, fontFamily: FONT.serif, marginTop: 6 }}>
        {formatCurrency(price || 0)}
      </div>
    </button>
  )
}
