import { useState } from 'react'
import DatePicker from '../../../components/shared/DatePicker'
import { formatCurrency, kmBadge } from '../../../lib/utils'
import { calcKmRefPct, kmRefAlert } from '../../../lib/serviceCommission'
import { C } from '../../../constants/colors'
import { posService } from '../../../services/posService'
import { parseVND, fmtInput, NvAvatar, shortName } from '../posShared'

export default function CartLine({ item, onRemove, onQtyChange, onDiscountChange, onSelectKTV, onToggleCard, onUpsale, kmGoiY }) {
  const name = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || item.meta?.tenDichVu || '-'
  const donGia = item.don_gia || 0
  const isDichVu = item.loai_item === 'dich_vu'
  const isSanPham = item.loai_item === 'san_pham'
  const isCard = item.loai_item === 'the_moi'
  const isTheLT = item.loai_item === 'the_lieu_trinh'
  const nv = item.nhan_vien

  const [qty, setQty] = useState(item.so_luong || 1)
  const [discAmt, setDiscAmt] = useState(Math.max(0, donGia * (item.so_luong || 1) - (item.thanh_tien || 0)))

  // Upsale: KTV nâng cấp lên dịch vụ cao hơn → KTV hưởng 10% chênh lệch
  const upsale = item.meta?.upsale || null
  const [upOpen, setUpOpen] = useState(false)
  const [upSearch, setUpSearch] = useState('')
  const [upResults, setUpResults] = useState([])
  const doUpSearch = async (q) => {
    setUpSearch(q)
    if (!q || q.length < 2) { setUpResults([]); return }
    try { setUpResults((await posService.getServices(q)).slice(0, 8)) } catch { setUpResults([]) }
  }

  const [cardBuoiMua, setCardBuoiMua] = useState(item.meta?.soBuoiMua || 10)
  const [cardBuoiTang, setCardBuoiTang] = useState(item.meta?.soBuoiTang || 0)
  // Giá bán/buổi (giá khách trả) — mặc định = giá gốc, lễ tân sửa thành giá KM (vd 159k → 99k).
  const [cardGiaBan, setCardGiaBan] = useState(
    item.meta?.giaBanBuoi
    || (item.meta?.phanTramGiam > 0 ? Math.round(donGia * (1 - Number(item.meta.phanTramGiam) / 100)) : donGia)
  )
  const [cardNgayHH, setCardNgayHH] = useState(item.meta?.ngayHetHan || '')
  const [cardKhongGH, setCardKhongGH] = useState(!item.meta?.ngayHetHan)
  const [ngayHHOpen, setNgayHHOpen] = useState(false)

  // % giảm hiệu dụng = (1 − giá bán / giá gốc) — chỉ dùng cho KM% + hoa hồng. Giá thẻ tính trực tiếp từ giá bán.
  const cardEffPct = donGia > 0
    ? Math.min(100, Math.max(0, (1 - (Number(cardGiaBan) || 0) / donGia) * 100))
    : 0
  const cardKmRefPct = calcKmRefPct({ soBuoiMua: cardBuoiMua, soBuoiTang: cardBuoiTang, phanTramGiam: cardEffPct })
  const cardKmAl = (cardBuoiTang > 0 || cardEffPct > 0) && cardKmRefPct > 0 ? kmRefAlert(cardKmRefPct) : null
  const cardThanhTien = Math.round((Number(cardBuoiMua) || 0) * (Number(cardGiaBan) || 0))

  const handleQty = (n) => {
    if (n < 1) return
    setQty(n)
    onQtyChange(item._lid, n, donGia)
  }

  const handleDiscBlur = () => {
    const newTT = Math.max(0, donGia * qty - discAmt)
    if (newTT !== item.thanh_tien && onDiscountChange) onDiscountChange(item._lid, newTT)
  }

  const commitCard = (buoiMua, buoiTang, ngayHH, khongGH, giaBan = cardGiaBan) => {
    const pct = donGia > 0 ? Math.min(100, Math.max(0, (1 - (Number(giaBan) || 0) / donGia) * 100)) : 0
    const km = calcKmRefPct({ soBuoiMua: buoiMua, soBuoiTang: buoiTang, phanTramGiam: pct })
    onToggleCard(item._lid, true, {
      soBuoiMua: buoiMua,
      soBuoiTang: buoiTang,
      ngayHetHan: khongGH ? null : (ngayHH || null),
      donGia,
      giaBanBuoi: Number(giaBan) || 0,
      phanTramGiam: pct,
      kmRefPct: km,
    })
  }

  const smBtn = {
    width: 22, height: 22, border: `1px solid ${C.line2}`, borderRadius: 3,
    background: C.surface2, cursor: 'pointer', fontSize: 14, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.ink2,
  }

  // ── CTKM tự nhận biết: áp khuyến mãi khớp dịch vụ này (lễ tân bấm xác nhận) ──
  const kmLoai = kmGoiY?.loai_km
  // Đã áp chưa? (để đổi nhãn nút / ẩn gợi ý trùng)
  const kmApplied = !!kmGoiY && (
    kmLoai === 'giam_gia'
      ? (isDichVu && !isCard && Math.abs((item.thanh_tien || 0) - (kmGoiY.gia_km || 0) * qty) < 1)
      : isCard && (item.meta?.soBuoiMua === (kmGoiY.mua_x || 0))
  )
  const applyKm = () => {
    if (!kmGoiY) return
    if (kmLoai === 'mua_x_tang_y') {
      const mua = Math.max(1, kmGoiY.mua_x || 1), tang = Math.max(0, kmGoiY.tang_y || 0)
      setCardBuoiMua(mua); setCardBuoiTang(tang); setCardGiaBan(donGia)
      commitCard(mua, tang, cardNgayHH, cardKhongGH, donGia)
    } else if (kmLoai === 'mua_n_giam_pct') {
      const mua = Math.max(1, kmGoiY.mua_x || 1)
      const pct = Number(kmGoiY.pct_giam_lan ?? kmGoiY.phan_tram_giam ?? 0)
      const giaBan = Math.round(donGia * (1 - pct / 100))
      setCardBuoiMua(mua); setCardBuoiTang(0); setCardGiaBan(giaBan)
      commitCard(mua, 0, cardNgayHH, cardKhongGH, giaBan)
    } else { // giam_gia — dịch vụ lẻ
      const giaKm = kmGoiY.gia_km || donGia
      const newTT = giaKm * qty
      setDiscAmt(Math.max(0, donGia * qty - newTT))
      if (onDiscountChange) onDiscountChange(item._lid, newTT)
    }
  }

  const theLTConLai = item.the_lieu_trinh?.so_buoi_con_lai ?? null
  const theLTTong = item.the_lieu_trinh?.so_buoi_tong ?? null
  const theLTHH = item.the_lieu_trinh?.ngay_het_han

  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => onRemove(item._lid)} style={{ background: 'none', border: 'none', color: C.chi, cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>x</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            {isTheLT && <span style={{ fontSize: 9, fontWeight: 800, color: C.thu, background: 'rgba(45,122,79,.12)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>DÙNG THẺ</span>}
            {isCard && <span style={{ fontSize: 9, fontWeight: 800, color: '#A0714F', background: 'rgba(160,113,79,.1)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>THẺ MỚI</span>}
            {name}
          </div>
          {isTheLT && theLTConLai !== null && (
            <div style={{ fontSize: 10, color: C.thu }}>Còn {theLTConLai}/{theLTTong} buổi{theLTHH ? ` · HH: ${theLTHH}` : ''}</div>
          )}
          {!isTheLT && !isCard && <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{formatCurrency(donGia)}</div>}
          {upsale && (
            <div style={{ fontSize: 10, color: '#6C3483', fontWeight: 700, marginTop: 1 }}>
              🔼 Upsale từ {upsale.ten_goc} · chênh {formatCurrency(upsale.chenh)} · HH KTV {formatCurrency(upsale.tien_upsale)}
            </div>
          )}
          {isCard && <div style={{ fontSize: 10.5, color: 'var(--champagne)', fontWeight: 600 }}>
            {cardBuoiMua}+{cardBuoiTang} buổi
            {cardEffPct > 0 && <span style={{ color: C.chi }}> -{cardEffPct.toFixed(0)}%</span>}
            {' · '}{formatCurrency(cardThanhTien)}
          </div>}
        </div>

        {(isDichVu || isSanPham) && !isCard ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <button onClick={() => handleQty(qty - 1)} style={smBtn}>-</button>
            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => handleQty(qty + 1)} style={smBtn}>+</button>
          </div>
        ) : isTheLT ? <div style={{ width: 54, flexShrink: 0 }} /> : null}

        {(isDichVu || isSanPham) && !isCard ? (
          <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
            <input
              value={discAmt > 0 ? fmtInput(discAmt) : ''}
              onChange={e => setDiscAmt(parseVND(e.target.value))}
              onBlur={handleDiscBlur}
              placeholder="0"
              style={{ width: 50, border: `1px solid ${C.line2}`, borderRadius: '4px 0 0 4px', padding: '3px 4px', fontSize: 11, textAlign: 'right', outline: 'none', color: C.chi, background: C.surface2 }}
            />
            <span style={{ background: C.bg, border: `1px solid ${C.line2}`, borderLeft: 'none', borderRadius: '0 4px 4px 0', padding: '3px 4px', fontSize: 10, color: C.ink3, display: 'flex', alignItems: 'center' }}>đ</span>
          </div>
        ) : isTheLT ? <div style={{ width: 62, flexShrink: 0 }} /> : null}

        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--serif)', minWidth: 76, textAlign: 'right', flexShrink: 0, color: isTheLT ? 'var(--ink3)' : (isCard ? 'var(--champagne)' : 'var(--ink)') }}>
          {isTheLT ? '0₫ ✓' : formatCurrency(item.thanh_tien || 0)}
        </div>

        {(isDichVu || isCard) && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
            <input
              type="checkbox" checked={isCard}
              onChange={e => {
                if (e.target.checked) {
                  commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH)
                } else {
                  onToggleCard(item._lid, false, { donGia })
                }
              }}
              style={{ cursor: 'pointer', width: 13, height: 13, accentColor: '#C9A96E' }}
            />
            <span style={{ fontSize: 10.5, color: isCard ? 'var(--champagne)' : 'var(--ink3)', fontWeight: isCard ? 700 : 400, whiteSpace: 'nowrap' }}>Thẻ LT</span>
          </label>
        )}

        {isDichVu && !isCard && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
            <input
              type="checkbox" checked={!!upsale || upOpen}
              onChange={e => {
                if (e.target.checked) { setUpOpen(true) }
                else { setUpOpen(false); if (upsale) onUpsale(item._lid, null) }
              }}
              style={{ cursor: 'pointer', width: 13, height: 13, accentColor: '#7E57C2' }}
            />
            <span style={{ fontSize: 10.5, color: (upsale || upOpen) ? '#6C3483' : 'var(--ink3)', fontWeight: (upsale || upOpen) ? 700 : 400, whiteSpace: 'nowrap' }}>🔼 Upsale</span>
          </label>
        )}
      </div>

      {/* ── Gợi ý CTKM tự nhận biết ── */}
      {kmGoiY && isDichVu && (
        <div style={{
          marginTop: 6, marginLeft: 16, marginRight: 4, padding: '7px 10px',
          background: kmApplied ? '#eafaf1' : '#FFF6E9',
          border: `1px solid ${kmApplied ? '#27AE6055' : '#F0C674'}`, borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14 }}>🎁</span>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: kmApplied ? '#1E7E47' : '#9C6A12' }}>
              {kmApplied ? '✓ Đã áp CTKM' : 'Có CTKM cho dịch vụ này'}
              <span style={{ marginLeft: 6, background: C.chi, color: '#fff', borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                {kmBadge(kmGoiY)}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 1 }}>
              {kmGoiY.ten}
              {kmGoiY.gioi_han_suat > 0 ? ` · tối đa ${kmGoiY.gioi_han_suat} suất/khách` : ''}
            </div>
          </div>
          {!kmApplied && (
            <button type="button" onClick={applyKm} style={{
              border: 'none', background: C.grad || C.champagne, color: '#fff',
              borderRadius: 6, padding: '5px 12px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {kmLoai === 'giam_gia' ? 'Áp giá KM' : 'Áp gói thẻ'}
            </button>
          )}
        </div>
      )}

      {isDichVu && upOpen && (
        <div style={{ marginTop: 6, marginLeft: 16, marginRight: 4, padding: '8px 10px', background: '#F4EFFA', border: '1px solid #D8C8F0', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#5B2C6F', fontWeight: 700, marginBottom: 6 }}>Khách được upsale lên dịch vụ nào?</div>
          <input autoFocus value={upSearch} onChange={e => doUpSearch(e.target.value)}
            placeholder="Gõ tên dịch vụ cao hơn..."
            style={{ width: '100%', border: '1px solid #D8C8F0', borderRadius: 6, padding: '6px 9px', fontSize: 12.5, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
          {upResults.length > 0 && (
            <div style={{ marginTop: 6, background: '#fff', border: '1px solid #D8C8F0', borderRadius: 6, maxHeight: 200, overflowY: 'auto' }}>
              {upResults.map(dv => {
                const chenh = Math.max(0, (dv.gia_co_ban || 0) - (upsale?.gia_goc ?? donGia))
                return (
                  <button key={dv.id} type="button"
                    onClick={() => { onUpsale(item._lid, dv); setUpOpen(false); setUpSearch(''); setUpResults([]) }}
                    style={{ width: '100%', border: 'none', borderBottom: '1px solid #EEE', background: '#fff', padding: '7px 10px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: C.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dv.ten}</span>
                    <span style={{ fontSize: 11, color: '#6C3483', fontWeight: 700, flexShrink: 0 }}>
                      {formatCurrency(dv.gia_co_ban)}{chenh > 0 ? ` · +${formatCurrency(chenh)}` : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {isCard && (
        <div style={{ marginTop: 6, paddingLeft: 16, paddingRight: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Giá bán/buổi</span>
              <input
                type="text" inputMode="numeric"
                value={cardGiaBan ? fmtInput(cardGiaBan) : ''}
                onChange={e => setCardGiaBan(parseVND(e.target.value))}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH)}
                placeholder={fmtInput(donGia)}
                title="Giá khách trả mỗi buổi (giá khuyến mãi). Mặc định = giá gốc."
                style={{ width: 86, border: `1px solid ${cardEffPct > 0 ? C.champagne : 'var(--bord)'}`, borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: 800, textAlign: 'right', outline: 'none', color: C.champagne }}
              />
              {cardEffPct > 0 && (
                <span style={{ fontSize: 10, color: 'var(--ink3)', textDecoration: 'line-through', whiteSpace: 'nowrap' }}>{fmtInput(donGia)}</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Buổi mua</span>
              <button onClick={() => { const v = Math.max(1, cardBuoiMua - 1); setCardBuoiMua(v); commitCard(v, cardBuoiTang, cardNgayHH, cardKhongGH) }} style={smBtn}>-</button>
              <input
                type="number" min={1} value={cardBuoiMua}
                onChange={e => { const v = Math.max(1, parseInt(e.target.value) || 1); setCardBuoiMua(v) }}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH)}
                style={{ width: 38, border: '1px solid var(--bord)', borderRadius: 4, padding: '2px 3px', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <button onClick={() => { const v = cardBuoiMua + 1; setCardBuoiMua(v); commitCard(v, cardBuoiTang, cardNgayHH, cardKhongGH) }} style={smBtn}>+</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Tặng</span>
              <button onClick={() => { const v = Math.max(0, cardBuoiTang - 1); setCardBuoiTang(v); commitCard(cardBuoiMua, v, cardNgayHH, cardKhongGH) }} style={smBtn}>-</button>
              <input
                type="number" min={0} value={cardBuoiTang}
                onChange={e => { const v = Math.max(0, parseInt(e.target.value) || 0); setCardBuoiTang(v) }}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH)}
                style={{ width: 38, border: '1px solid var(--bord)', borderRadius: 4, padding: '2px 3px', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <button onClick={() => { const v = cardBuoiTang + 1; setCardBuoiTang(v); commitCard(cardBuoiMua, v, cardNgayHH, cardKhongGH) }} style={smBtn}>+</button>
            </div>

            {cardKmAl && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                background: cardKmAl.bg, color: cardKmAl.color,
                border: `1px solid ${cardKmAl.color}44`, whiteSpace: 'nowrap',
              }}>
                KM {cardKmRefPct.toFixed(0)}%
                {cardKmAl.level === 'ok' ? ' ✓' : cardKmAl.level === 'warning' ? ' ⚠' : ' ⛔'}
              </span>
            )}
          </div>

          {/* Tóm tắt: giá gốc → giá bán × buổi = thành tiền (theo giá khách trả thật) */}
          <div style={{ marginBottom: 6, fontSize: 11.5, color: 'var(--ink2)' }}>
            {cardEffPct > 0 && <span style={{ textDecoration: 'line-through', color: 'var(--ink3)', marginRight: 6 }}>{fmtInput(donGia)}₫</span>}
            <span style={{ fontWeight: 800, color: C.champagne }}>{fmtInput(cardGiaBan)}₫</span>
            <span style={{ color: 'var(--ink3)' }}> × {cardBuoiMua} buổi{cardBuoiTang > 0 ? ` (+${cardBuoiTang} tặng)` : ''} = </span>
            <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{formatCurrency(cardThanhTien)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Ngày Hết Hạn</span>
            {!cardKhongGH ? (
              <button onClick={() => setNgayHHOpen(true)} style={{
                flex: 1, minWidth: 120, border: '1px solid var(--bord)', borderRadius: 4, padding: '4px 8px',
                fontSize: 11.5, background: '#fff', color: cardNgayHH ? 'var(--ink)' : 'var(--ink3)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
              }}>
                {cardNgayHH ? cardNgayHH.split('-').reverse().join('/') : 'Chọn ngày...'}
              </button>
            ) : (
              <span style={{ flex: 1, fontSize: 11, color: 'var(--ink3)', fontStyle: 'italic' }}>Không giới hạn</span>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox" checked={cardKhongGH}
                onChange={e => { setCardKhongGH(e.target.checked); commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, e.target.checked) }}
                style={{ cursor: 'pointer', width: 12, height: 12, accentColor: C.champagne }}
              />
              <span style={{ fontSize: 10, color: 'var(--ink3)' }}>Không giới hạn ∞</span>
            </label>
          </div>

          <DatePicker
            open={ngayHHOpen}
            selectedDate={cardNgayHH || null}
            onClose={() => setNgayHHOpen(false)}
            onConfirm={d => { setCardNgayHH(d); setNgayHHOpen(false); commitCard(cardBuoiMua, cardBuoiTang, d, false) }}
          />
        </div>
      )}

      {(isDichVu || isTheLT || isSanPham) && (
        <div style={{ marginTop: 5, paddingLeft: 16 }}>
          {nv ? (
            <button onClick={() => onSelectKTV(item)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: `1px solid ${C.champagne}`, background: 'rgba(201,169,110,.1)',
              borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>
              <NvAvatar nv={nv} size={24} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{shortName(nv.ho_ten)}</span>
              {(item.tien_tour > 0 || item.tien_hoa_hong > 0) && (
                <span style={{ fontSize: 11, fontWeight: 700, color: C.champagne }}>
                  · {isSanPham ? 'HH' : 'Tour'} {formatCurrency(item.tien_tour || item.tien_hoa_hong || 0)}
                </span>
              )}
              <span style={{ fontSize: 10, color: C.ink3 }}>✎</span>
            </button>
          ) : (
            <button onClick={() => onSelectKTV(item)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              border: `1px dashed ${C.line2}`, background: 'transparent',
              borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontFamily: 'var(--sans)',
              fontSize: 11, fontWeight: 600, color: C.ink3,
            }}>
              + Chọn KTV {isSanPham ? 'bán SP' : 'làm dịch vụ'}
            </button>
          )}
          {Array.isArray(item.meta?.tourSplits) && item.meta.tourSplits.length > 0 && (
            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.meta.tourSplits.map((s, idx) => (
                <span key={s.nvId || idx} style={{ fontSize: 10.5, color: '#6C3483', fontWeight: 700, background: 'rgba(108,52,131,.08)', borderRadius: 5, padding: '2px 7px' }}>
                  + {shortName(s.ho_ten || '')} · tour {formatCurrency(s.tien_tour || 0)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
