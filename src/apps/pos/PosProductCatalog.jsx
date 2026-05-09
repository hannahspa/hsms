import { useState, useEffect, useCallback } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency } from '../../lib/utils'
import { LUX } from '../../constants/lux'
import { COLORS } from '../../constants/colors'

const S = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  searchBar: {
    display: 'flex', gap: '8px', padding: '12px 16px',
    borderBottom: `1px solid ${LUX.line}`,
  },
  input: {
    flex: 1, padding: '10px 14px', borderRadius: LUX.radiusSm,
    border: `1.5px solid ${LUX.line2}`, fontSize: '14px',
    outline: 'none', color: LUX.ink, background: LUX.surface2,
  },
  categoryBar: {
    display: 'flex', gap: '8px', padding: '8px 16px', overflowX: 'auto',
    borderBottom: `1px solid ${LUX.line}`,
  },
  catChip: (active) => ({
    padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
    fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
    border: active ? 'none' : `1.5px solid ${LUX.line2}`,
    background: active ? COLORS.grad : 'transparent',
    color: active ? '#fff' : LUX.ink2,
  }),
  grid: {
    flex: 1, overflowY: 'auto', display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '8px',
    alignContent: 'start',
  },
  card: {
    background: LUX.surface2, borderRadius: LUX.radiusSm,
    padding: '12px', cursor: 'pointer', border: `1px solid ${LUX.line}`,
    boxShadow: LUX.shadowSm,
  },
  cardName: {
    fontWeight: 600, fontSize: '13px', color: LUX.ink, marginBottom: '4px',
    lineHeight: '1.3',
  },
  cardPrice: {
    fontWeight: 700, fontSize: '14px', color: COLORS.primary,
  },
  cardMeta: {
    fontSize: '11px', color: LUX.ink3, marginTop: '2px',
  },
  typeToggle: {
    display: 'flex', gap: '4px', padding: '8px 16px',
  },
  typeBtn: (active) => ({
    flex: 1, padding: '8px', borderRadius: LUX.radiusSm, fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', textAlign: 'center', border: 'none',
    background: active ? LUX.espresso : LUX.line,
    color: active ? '#fff' : LUX.ink2,
  }),
}

export default function PosProductCatalog({ onAddItem, selectedCustomer, currentOrder }) {
  const [mode, setMode] = useState('dich_vu') // 'dich_vu' | 'san_pham' | 'the'
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [cards, setCards] = useState([])
  const [ktvs, setKtvs] = useState([])

  const loadServices = useCallback(async () => {
    try {
      const svc = await posService.getServices(search, category)
      setServices(svc)
      if (!categories.length) {
        const cats = await posService.getServiceCategories()
        setCategories(['', ...cats])
      }
    } catch (_) {}
  }, [search, category])

  const loadProducts = useCallback(async () => {
    try { setProducts(await posService.getSellableProducts(search)) } catch (_) {}
  }, [search])

  const loadCards = useCallback(async () => {
    if (!selectedCustomer?.id) { setCards([]); return }
    try { setCards(await posService.getCustomerCards(selectedCustomer.id)) } catch (_) {}
  }, [selectedCustomer])

  const loadKtvs = useCallback(async () => {
    try { setKtvs(await posService.getKTVs()) } catch (_) {}
  }, [])

  useEffect(() => { loadServices() }, [loadServices])
  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadCards() }, [loadCards])
  useEffect(() => { loadKtvs() }, [loadKtvs])

  const handleAddService = (dv) => {
    const gia = dv.gia_co_ban || 0
    const hhPct = dv.ti_le_hoa_hong || 0
    onAddItem({
      loai_item: 'dich_vu',
      dich_vu_id: dv.id,
      don_gia: gia,
      thanh_tien: gia,
      ti_le_hoa_hong: hhPct,
      tien_hoa_hong: Math.round(gia * hhPct / 100),
    })
  }

  const handleAddProduct = (sp) => {
    const gia = sp.gia_ban || 0
    onAddItem({
      loai_item: 'san_pham',
      san_pham_id: sp.id,
      don_gia: gia,
      thanh_tien: gia,
      so_luong: 1,
    })
  }

  const handleAddCard = (the) => {
    onAddItem({
      loai_item: 'the_lieu_trinh',
      the_lieu_trinh_id: the.id,
      don_gia: 0,
      thanh_tien: 0,
      so_luong: 1,
    })
  }

  const renderServices = () => (
    <>
      <div style={S.categoryBar}>
        <div style={S.catChip(!category)} onClick={() => setCategory('')}>Tất Cả</div>
        {categories.slice(1).map(c => (
          <div key={c} style={S.catChip(category === c)} onClick={() => setCategory(category === c ? '' : c)}>
            {c}
          </div>
        ))}
      </div>
      <div style={S.grid}>
        {services.filter(d => !category || d.danh_muc === category).map(dv => (
          <div key={dv.id} style={S.card} onClick={() => handleAddService(dv)}>
            <div style={S.cardName}>{dv.ten}</div>
            <div style={S.cardPrice}>{formatCurrency(dv.gia_co_ban)}</div>
            {dv.thoi_gian_phut && <div style={S.cardMeta}>{dv.thoi_gian_phut} phút</div>}
          </div>
        ))}
      </div>
    </>
  )

  const renderProducts = () => (
    <div style={S.grid}>
      {products.map(sp => (
        <div key={sp.id} style={S.card} onClick={() => handleAddProduct(sp)}>
          <div style={S.cardName}>{sp.ten}</div>
          <div style={S.cardPrice}>{formatCurrency(sp.gia_ban)}</div>
          <div style={S.cardMeta}>Tồn: {sp.ton_kho} {sp.don_vi}</div>
        </div>
      ))}
    </div>
  )

  const renderCards = () => (
    <div style={{ padding: '12px' }}>
      {!selectedCustomer ? (
        <div style={{ color: LUX.ink3, fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
          Vui lòng chọn khách hàng để xem thẻ liệu trình
        </div>
      ) : cards.length === 0 ? (
        <div style={{ color: LUX.ink3, fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
          Khách hàng không có thẻ liệu trình active
        </div>
      ) : (
        <div style={S.grid}>
          {cards.map(the => (
            <div key={the.id} style={S.card} onClick={() => handleAddCard(the)}>
              <div style={S.cardName}>{the.ten_dich_vu}</div>
              <div style={{ ...S.cardPrice, color: LUX.champagne }}>
                Còn {the.so_buoi_con_lai} buổi
              </div>
              <div style={S.cardMeta}>Hết hạn: {the.ngay_het_han || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={S.container}>
      <div style={S.searchBar}>
        <input
          style={S.input}
          placeholder={mode === 'dich_vu' ? 'Tìm dịch vụ...' : mode === 'san_pham' ? 'Tìm sản phẩm...' : 'Tìm thẻ...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div style={S.typeToggle}>
        <button style={S.typeBtn(mode === 'dich_vu')} onClick={() => { setMode('dich_vu'); setSearch('') }}>
          💆 Dịch Vụ
        </button>
        <button style={S.typeBtn(mode === 'san_pham')} onClick={() => { setMode('san_pham'); setSearch('') }}>
          🛍️ Sản Phẩm
        </button>
        <button style={S.typeBtn(mode === 'the')} onClick={() => { setMode('the'); setSearch('') }}>
          🎫 Thẻ Liệu Trình
        </button>
      </div>
      {mode === 'dich_vu' && renderServices()}
      {mode === 'san_pham' && renderProducts()}
      {mode === 'the' && renderCards()}
    </div>
  )
}
