import { useState } from 'react'
import DatePicker from '../../../components/shared/DatePicker'
import { formatCurrency } from '../../../lib/utils'
import { calcKmRefPct, kmRefAlert } from '../../../lib/serviceCommission'
import { C } from '../../../constants/colors'
import { parseVND, fmtInput, NvAvatar, shortName } from '../posShared'

export default function CartLine({ item, onRemove, onQtyChange, onDiscountChange, onSelectKTV, onToggleCard }) {
  const name = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || item.meta?.tenDichVu || '-'
  const donGia = item.don_gia || 0
  const isDichVu = item.loai_item === 'dich_vu'
  const isSanPham = item.loai_item === 'san_pham'
  const isCard = item.loai_item === 'the_moi'
  const isTheLT = item.loai_item === 'the_lieu_trinh'
  const nv = item.nhan_vien

  const [qty, setQty] = useState(item.so_luong || 1)
  const [discAmt, setDiscAmt] = useState(Math.max(0, donGia * (item.so_luong || 1) - (item.thanh_tien || 0)))

  const [cardBuoiMua, setCardBuoiMua] = useState(item.meta?.soBuoiMua || 10)
  const [cardBuoiTang, setCardBuoiTang] = useState(item.meta?.soBuoiTang || 0)
  const [cardPhanTramGiam, setCardPhanTramGiam] = useState(item.meta?.phanTramGiam || 0)
  const [cardNgayHH, setCardNgayHH] = useState(item.meta?.ngayHetHan || '')
  const [cardKhongGH, setCardKhongGH] = useState(!item.meta?.ngayHetHan)
  const [ngayHHOpen, setNgayHHOpen] = useState(false)

  const cardKmRefPct = calcKmRefPct({ soBuoiMua: cardBuoiMua, soBuoiTang: cardBuoiTang, phanTramGiam: Number(cardPhanTramGiam) })
  const cardKmAl = (cardBuoiTang > 0 || Number(cardPhanTramGiam) > 0) && cardKmRefPct > 0 ? kmRefAlert(cardKmRefPct) : null
  const cardThanhTien = Math.round(cardBuoiMua * donGia * (1 - Number(cardPhanTramGiam) / 100))

  const handleQty = (n) => {
    if (n < 1) return
    setQty(n)
    onQtyChange(item._lid, n, donGia)
  }

  const handleDiscBlur = () => {
    const newTT = Math.max(0, donGia * qty - discAmt)
    if (newTT !== item.thanh_tien && onDiscountChange) onDiscountChange(item._lid, newTT)
  }

  const commitCard = (buoiMua, buoiTang, ngayHH, khongGH, pctGiam) => {
    const km = calcKmRefPct({ soBuoiMua: buoiMua, soBuoiTang: buoiTang, phanTramGiam: Number(pctGiam || 0) })
    onToggleCard(item._lid, true, {
      soBuoiMua: buoiMua,
      soBuoiTang: buoiTang,
      ngayHetHan: khongGH ? null : (ngayHH || null),
      donGia,
      phanTramGiam: Number(pctGiam || 0),
      kmRefPct: km,
    })
  }

  const smBtn = {
    width: 22, height: 22, border: `1px solid ${C.line2}`, borderRadius: 3,
    background: C.surface2, cursor: 'pointer', fontSize: 14, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.ink2,
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
          {isCard && <div style={{ fontSize: 10.5, color: 'var(--champagne)', fontWeight: 600 }}>
            {cardBuoiMua}+{cardBuoiTang} buổi
            {Number(cardPhanTramGiam) > 0 && <span style={{ color: C.chi }}> -{cardPhanTramGiam}%</span>}
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
          {isTheLT ? '0đ ✓' : formatCurrency(item.thanh_tien || 0)}
        </div>

        {(isDichVu || isCard) && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
            <input
              type="checkbox" checked={isCard}
              onChange={e => {
                if (e.target.checked) {
                  commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam)
                } else {
                  onToggleCard(item._lid, false, { donGia })
                }
              }}
              style={{ cursor: 'pointer', width: 13, height: 13, accentColor: '#C9A96E' }}
            />
            <span style={{ fontSize: 10.5, color: isCard ? 'var(--champagne)' : 'var(--ink3)', fontWeight: isCard ? 700 : 400, whiteSpace: 'nowrap' }}>Thẻ LT</span>
          </label>
        )}
      </div>

      {isCard && (
        <div style={{ marginTop: 6, paddingLeft: 16, paddingRight: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Buổi mua</span>
              <button onClick={() => { const v = Math.max(1, cardBuoiMua - 1); setCardBuoiMua(v); commitCard(v, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam) }} style={smBtn}>-</button>
              <input
                type="number" min={1} value={cardBuoiMua}
                onChange={e => { const v = Math.max(1, parseInt(e.target.value) || 1); setCardBuoiMua(v) }}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam)}
                style={{ width: 38, border: '1px solid var(--bord)', borderRadius: 4, padding: '2px 3px', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <button onClick={() => { const v = cardBuoiMua + 1; setCardBuoiMua(v); commitCard(v, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam) }} style={smBtn}>+</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Tặng</span>
              <button onClick={() => { const v = Math.max(0, cardBuoiTang - 1); setCardBuoiTang(v); commitCard(cardBuoiMua, v, cardNgayHH, cardKhongGH, cardPhanTramGiam) }} style={smBtn}>-</button>
              <input
                type="number" min={0} value={cardBuoiTang}
                onChange={e => { const v = Math.max(0, parseInt(e.target.value) || 0); setCardBuoiTang(v) }}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam)}
                style={{ width: 38, border: '1px solid var(--bord)', borderRadius: 4, padding: '2px 3px', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <button onClick={() => { const v = cardBuoiTang + 1; setCardBuoiTang(v); commitCard(cardBuoiMua, v, cardNgayHH, cardKhongGH, cardPhanTramGiam) }} style={smBtn}>+</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Giảm</span>
              <input
                type="number" min={0} max={100} step={0.5}
                value={cardPhanTramGiam}
                onChange={e => { const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)); setCardPhanTramGiam(v) }}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam)}
                style={{ width: 38, border: '1px solid var(--bord)', borderRadius: 4, padding: '2px 3px', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <span style={{ fontSize: 10, color: 'var(--ink3)' }}>%</span>
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
                onChange={e => { setCardKhongGH(e.target.checked); commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, e.target.checked, cardPhanTramGiam) }}
                style={{ cursor: 'pointer', width: 12, height: 12, accentColor: C.champagne }}
              />
              <span style={{ fontSize: 10, color: 'var(--ink3)' }}>Không giới hạn ∞</span>
            </label>
          </div>

          <DatePicker
            open={ngayHHOpen}
            selectedDate={cardNgayHH || null}
            onClose={() => setNgayHHOpen(false)}
            onConfirm={d => { setCardNgayHH(d); setNgayHHOpen(false); commitCard(cardBuoiMua, cardBuoiTang, d, false, cardPhanTramGiam) }}
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
              {(item.tien_tour > 0 || item.tien_commission > 0) && (
                <span style={{ fontSize: 11, fontWeight: 700, color: C.champagne }}>
                  · {isSanPham ? 'HH' : 'Tour'} {formatCurrency(item.tien_tour || item.tien_commission || 0)}
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
        </div>
      )}
    </div>
  )
}
