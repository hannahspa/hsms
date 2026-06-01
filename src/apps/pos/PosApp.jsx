import { useState, useEffect, useCallback, useRef } from 'react'
import { posService } from '../../services/posService'
import { supabase } from '../../lib/supabase'
import { formatCurrency, getNowVN, todayISO } from '../../lib/utils'
import { calcServiceCommission, getCommissionPercent, serviceSalePrice, calcKmRefPct, calcCommissionRates, kmRefAlert } from '../../lib/serviceCommission'
import { useAuth } from '../../context/AuthContext'
import I from '../../components/shared/Icons'
import DatePicker from '../../components/shared/DatePicker'
import PosOrderHistory from './PosOrderHistory'
import PosProductCatalog from './PosProductCatalog'
import { HINH_THUC_THU } from '../../constants/enums'
import { C, FONT } from '../../constants/colors'

const PTTT_OPTS = HINH_THUC_THU

function parseVND(s) { return parseInt(String(s).replace(/\D/g, ''), 10) || 0 }
function fmtInput(n) { return n > 0 ? new Intl.NumberFormat('vi-VN').format(n) : '' }
function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = String(s).split('-')
  return d && m && y ? `${d}/${m}/${y}` : s
}
function getInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return (p[p.length - 1][0] || '').toUpperCase()
}
// Tên ngắn: 2 chữ cuối — "Lê Hoàng Phương Linh" → "Phương Linh"
function shortName(name) {
  if (!name) return ''
  const p = name.trim().split(/\s+/)
  return p.slice(-2).join(' ')
}
// Avatar nhân viên: ảnh nếu có, fallback initials
function NvAvatar({ nv, size = 36 }) {
  if (nv?.avatar_url) {
    return <img src={nv.avatar_url} alt={nv.ho_ten || ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(160,113,79,.25)' }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14', fontSize: Math.round(size * 0.36), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {getInitials(nv?.ho_ten)}
    </div>
  )
}
function paymentDisplayLabel(method) {
  if (method.id === 'chuyen_khoan') return 'Chuyển Khoản - MB Bank'
  if (method.id === 'quet_the') return 'Quẹt Thẻ - TP Bank'
  return method.label
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ on, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!on)} style={{
        width: 38, height: 21, borderRadius: 11, position: 'relative',
        background: on ? 'var(--champagne)' : 'rgba(0,0,0,.18)', transition: 'background .2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2.5, left: on ? 19 : 2.5,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left .18s', boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        }} />
      </div>
      {label && <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{label}</span>}
    </label>
  )
}

// ── Thẻ liệu trình card (horizontal) ─────────────────────────────────────────
function LieuTrinhCard({ card, onUse }) {
  const pct      = card.so_buoi_tong > 0 ? (card.so_buoi_da_dung / card.so_buoi_tong) * 100 : 0
  const conNo    = Math.max(0, (card.gia_tri_the || 0) - (card.da_thanh_toan ?? card.gia_tri_the ?? 0))
  const du30pct  = (card.da_thanh_toan ?? card.gia_tri_the ?? 0) >= Math.round((card.gia_tri_the || 0) * 0.30)
  const coNo     = conNo > 0
  return (
    <div style={{
      minWidth: 160, maxWidth: 175, flexShrink: 0, borderRadius: 8, padding: '7px 10px',
      background: coNo
        ? 'linear-gradient(135deg,#8e2218 0%,#C0392B 55%,#922b21 100%)'
        : 'linear-gradient(135deg,#C9A96E 0%,#A0714F 55%,#7D5A3C 100%)',
      color: '#fff', boxShadow: coNo
        ? '0 2px 8px rgba(192,57,43,.35)'
        : '0 2px 8px rgba(160,113,79,.25)',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.3, marginBottom: 1 }}>
        {card.ten_dich_vu}
      </div>
      <div style={{ fontSize: 9, opacity: .8, marginBottom: coNo ? 3 : 5 }}>
        {card.so_buoi_da_dung}/{card.so_buoi_tong} buổi · {formatCurrency(card.gia_tri_the || 0)}
      </div>
      {/* Badge nợ */}
      {coNo && (
        <div style={{
          fontSize: 9, fontWeight: 700, marginBottom: 4,
          background: du30pct ? 'rgba(255,255,255,.18)' : 'rgba(255,50,50,.35)',
          border: '1px solid rgba(255,255,255,.3)',
          borderRadius: 4, padding: '2px 6px', lineHeight: 1.4,
        }}>
          {`💸 Nợ ${formatCurrency(conNo)}`}
        </div>
      )}
      <div style={{ height: 2, background: 'rgba(255,255,255,.25)', borderRadius: 2, marginBottom: 5 }}>
        <div style={{ height: '100%', borderRadius: 2, background: '#fff', width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8.5, opacity: .7 }}>{card.ma_the || '—'}</span>
        <button onClick={() => onUse(card)} style={{
          background: 'rgba(255,255,255,.25)', border: '1px solid rgba(255,255,255,.4)',
          borderRadius: 5, padding: '2px 8px', color: '#fff', cursor: 'pointer',
          fontSize: 10, fontWeight: 700, fontFamily: 'var(--sans)',
        }}>→ Dùng</button>
      </div>
    </div>
  )
}

// ── KTV Popup ────────────────────────────────────────────────────────────────
function KtvPopup({ item, ktvList, onAssign, onClose }) {
  const isTheLT  = item.loai_item === 'the_lieu_trinh'
  const isSaleCommission = item.loai_item === 'the_moi' || item.loai_item === 'san_pham'
  const name     = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || '—'
  const initTiLe = item.ti_le_hoa_hong || item.dich_vu?.ti_le_hoa_hong || 0
  const fixedKtvRule = item.meta?.myspaCommission?.ktv?.type === 'absolute' ? item.meta.myspaCommission.ktv : null

  const [selectedKtv, setSelectedKtv] = useState(item.nhan_vien || null)
  const [tiLe, setTiLe]               = useState(initTiLe)
  const [baseGiaBuoi, setBaseGiaBuoi] = useState(
    isTheLT && item.the_lieu_trinh?.gia_tri_the && item.the_lieu_trinh?.so_buoi_tong
      ? Math.round(item.the_lieu_trinh.gia_tri_the / Math.max(1, item.the_lieu_trinh.so_buoi_tong))
      : 0
  )
  const [ktvSearch, setKtvSearch]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [loadingRate, setLoadingRate] = useState(isTheLT && !item.ti_le_hoa_hong)

  useEffect(() => {
    if (!isTheLT) return
    const tenDV = item.the_lieu_trinh?.ten_dich_vu
    if (!tenDV) { setLoadingRate(false); return }
    setLoadingRate(true)
    posService.getServices(tenDV).then(svcs => {
      const match = svcs.find(dv => dv.ten === tenDV) || svcs[0]
      if (!match) return
      if (tiLe === 0 && match.ti_le_hoa_hong > 0) setTiLe(match.ti_le_hoa_hong)
      if (baseGiaBuoi === 0 && match.gia_co_ban > 0) setBaseGiaBuoi(match.gia_co_ban)
    }).catch(() => {}).finally(() => setLoadingRate(false))
  }, [])

  const baseTienTour = isTheLT
    ? baseGiaBuoi * (item.so_luong || 1)
    : (item.thanh_tien || 0)
  const tienTour = fixedKtvRule && !isSaleCommission
    ? Math.round(Number(fixedKtvRule.amount || 0) * Math.max(1, Number(item.so_luong || 1)))
    : Math.round(baseTienTour * tiLe / 100)
  const incomeLabel = isSaleCommission ? 'Hoa hồng bán' : 'Tiền Tour'
  const filtered = ktvList.filter(k => !ktvSearch || k.ho_ten.toLowerCase().includes(ktvSearch.toLowerCase()))

  const handleSave = async () => {
    setSaving(true)
    await onAssign(item, selectedKtv, tiLe, tienTour)
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: C.surface2, borderRadius: 16, width: 460, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px 12px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Chọn Kỹ Thuật Viên</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink3)', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <input placeholder="Tìm nhân viên…" value={ktvSearch} onChange={e => setKtvSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--bord)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--sans)' }}
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 20px' }}>
          {filtered.map(k => {
            const isSelected = selectedKtv?.id === k.id
            return (
              <div key={k.id} onClick={() => setSelectedKtv(k)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                background: isSelected ? 'rgba(201,169,110,.1)' : 'transparent',
                border: `1.5px solid ${isSelected ? 'var(--champagne)' : 'transparent'}`,
                transition: 'all .15s',
              }}>
                <NvAvatar nv={k} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{shortName(k.ho_ten)}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{k.vi_tri === 'ktv' ? 'KTV' : 'Lễ Tân'}</div>
                </div>
                {isSelected && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--champagne)', color: '#2a1d14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>✓</div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink3)', fontSize: 13 }}>Không tìm thấy</div>}
        </div>

        {selectedKtv && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', background: 'rgba(201,169,110,.05)', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)', marginBottom: 8 }}>
              {shortName(selectedKtv.ho_ten)} — {incomeLabel}
              {loadingRate && <span style={{ fontWeight: 400, color: 'var(--ink3)', marginLeft: 6 }}>(đang tải tỷ lệ…)</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <span style={{ fontSize: 12, color: 'var(--ink3)' }}>Tỷ lệ</span>
                <input value={tiLe} onChange={e => setTiLe(parseFloat(e.target.value) || 0)}
                  style={{ width: 50, border: '1px solid var(--bord)', borderRadius: 6, padding: '4px 6px', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
                <span style={{ fontSize: 12, color: 'var(--ink3)' }}>%</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--ink3)' }}>{incomeLabel}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--champagne)' }}>{formatCurrency(tienTour)}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, border: '1px solid var(--bord)', borderRadius: 8, background: '#fff', color: 'var(--ink2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)' }}>Đóng</button>
          {selectedKtv && (
            <button onClick={handleSave} disabled={saving || loadingRate} style={{
              flex: 2, height: 40, border: 'none', borderRadius: 8,
              background: loadingRate ? C.line2 : 'var(--champagne)',
              color: loadingRate ? C.ink3 : '#2a1d14',
              cursor: (saving || loadingRate) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)',
            }}>
              {saving ? 'Đang lưu…' : loadingRate ? 'Đang tải…' : 'Lưu'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── BuyCard Popup — (đã tích hợp inline vào CartLine, giữ lại phòng trường hợp tái dùng) ──
function BuyCardPopup({ dichVu, ktvList, onConfirm, onClose }) {
  const donGia = serviceSalePrice(dichVu)

  const [soBuoiMua,    setSoBuoiMua]    = useState(10)
  const [soBuoiTang,   setSoBuoiTang]   = useState(0)
  const [phanTramGiam, setPhanTramGiam] = useState(0)   // % giảm giá trực tiếp
  const [thanhTien,    setThanhTien]    = useState(10 * donGia)
  const [ttManual,     setTtManual]     = useState(false)
  const [selectedKtvId, setKtvId]       = useState('')
  const [selectedLtId,  setLtId]        = useState('')  // LT tư vấn (optional)
  const [ngayHetHan,   setNgayHetHan]   = useState('')

  const soBuoiTong  = soBuoiMua + soBuoiTang
  const giaGoc      = soBuoiMua * donGia
  const chiKhauPct  = giaGoc > 0 ? Math.round((1 - thanhTien / giaGoc) * 100) : 0
  const selectedKtv = ktvList.find(k => k.id === selectedKtvId) || null
  const selectedLt  = ktvList.find(k => k.id === selectedLtId)  || null
  const ltList      = ktvList.filter(k => k.vi_tri === 'le_tan')
  const canConfirm  = soBuoiMua >= 1 && thanhTien > 0

  // ── Commission theo rules mới ────────────────────────
  const kmRefPct   = calcKmRefPct({ soBuoiMua, soBuoiTang, phanTramGiam: Number(phanTramGiam) })
  const rates      = calcCommissionRates(kmRefPct, !!selectedKtvId, !!selectedLtId)
  const kmAl       = (soBuoiTang > 0 || Number(phanTramGiam) > 0) ? kmRefAlert(kmRefPct) : null
  const commKtvTien = selectedKtv ? Math.round(thanhTien * rates.tiLeKtv / 100) : 0
  const commLtTien  = selectedLt  ? Math.round(thanhTien * rates.tiLeLt  / 100) : 0

  const handleMuaChange = (n) => {
    const val = Math.max(1, n)
    setSoBuoiMua(val)
    if (!ttManual) setThanhTien(val * donGia)
  }

  const handleThanhTienChange = (raw) => {
    setThanhTien(parseVND(raw))
    setTtManual(true)
  }

  const handleResetTT = () => {
    setThanhTien(soBuoiMua * donGia)
    setTtManual(false)
  }

  const lbl11 = { fontSize: 11, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: C.surface2, borderRadius: 16, width: 'min(500px, 95vw)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,.28)', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '14px 18px 12px', background: 'linear-gradient(135deg,#3d2c20 0%,#2a1d14 100%)', borderRadius: '16px 16px 0 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(243,230,210,.55)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Mua Thẻ Liệu Trình</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--serif)', color: '#f3e6d2', marginTop: 2 }}>{dichVu.ten}</div>
              <div style={{ fontSize: 12, color: 'rgba(243,230,210,.6)', marginTop: 1 }}>{formatCurrency(donGia)} / buổi</div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.12)', border: 'none', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', color: '#f3e6d2', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '16px 18px', flex: 1, minHeight: 0, overflowY: 'auto' }}>

          {/* ① Số buổi mua + tặng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={lbl11}>Số buổi mua</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => handleMuaChange(soBuoiMua - 1)} style={{ width: 30, height: 36, border: '1px solid var(--bord)', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                <input type="number" min={1} value={soBuoiMua} onChange={e => handleMuaChange(parseInt(e.target.value) || 1)} style={{ flex: 1, border: '1.5px solid var(--champagne)', borderRadius: 8, padding: '7px 6px', fontSize: 16, fontWeight: 700, textAlign: 'center', outline: 'none', fontFamily: 'var(--sans)' }} />
                <button onClick={() => handleMuaChange(soBuoiMua + 1)} style={{ width: 30, height: 36, border: '1px solid var(--bord)', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
              </div>
            </div>
            <div>
              <div style={lbl11}>Số buổi tặng</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setSoBuoiTang(Math.max(0, soBuoiTang - 1))} style={{ width: 30, height: 36, border: '1px solid var(--bord)', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                <input type="number" min={0} value={soBuoiTang} onChange={e => setSoBuoiTang(Math.max(0, parseInt(e.target.value) || 0))} style={{ flex: 1, border: '1.5px solid var(--bord)', borderRadius: 8, padding: '7px 6px', fontSize: 16, fontWeight: 700, textAlign: 'center', outline: 'none', fontFamily: 'var(--sans)' }} />
                <button onClick={() => setSoBuoiTang(soBuoiTang + 1)} style={{ width: 30, height: 36, border: '1px solid var(--bord)', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
              </div>
            </div>
          </div>

          {/* ② % Giảm giá trực tiếp (KM dạng giảm tiền, không phải tặng buổi) */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={lbl11}>% Giảm giá trực tiếp (nếu có)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={phanTramGiam}
                  onChange={e => setPhanTramGiam(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  style={{ width: 72, border: '1.5px solid var(--bord)', borderRadius: 8, padding: '7px 8px', fontSize: 15, fontWeight: 700, textAlign: 'center', outline: 'none', fontFamily: 'var(--sans)' }}
                />
                <span style={{ fontSize: 14, color: 'var(--ink2)' }}>%</span>
                {Number(phanTramGiam) > 0 && (
                  <span style={{ fontSize: 12, color: C.chi, fontWeight: 600 }}>
                    = giảm {formatCurrency(Math.round(giaGoc * Number(phanTramGiam) / 100))}
                  </span>
                )}
              </div>
            </div>
            {/* KM_ref% badge — chỉ hiện khi có tặng buổi hoặc giảm giá */}
            {kmAl && kmRefPct > 0 && (
              <div style={{ flexShrink: 0, alignSelf: 'flex-end', marginBottom: 2, padding: '5px 10px', borderRadius: 8, background: kmAl.bg, border: `1px solid ${kmAl.color}55` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: kmAl.color }}>KM {kmRefPct.toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: kmAl.color, opacity: 0.85, marginTop: 1 }}>
                  {kmAl.level === 'ok' ? 'Commission tiêu chuẩn' : kmAl.level === 'warning' ? 'Commission giảm' : 'KM rất cao!'}
                </div>
              </div>
            )}
          </div>

          {/* ③ Tổng buổi summary */}
          <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: '#f5f0ea', border: '1px solid rgba(201,169,110,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
              Tổng {soBuoiMua}{soBuoiTang > 0 ? ` + ${soBuoiTang} tặng = ${soBuoiTong}` : ''} buổi
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>Niêm yết: {formatCurrency(giaGoc)}</span>
          </div>

          {/* ④ Thành tiền */}
          <div style={{ marginBottom: 14 }}>
            <div style={lbl11}>Thành tiền (lễ tân nhập)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={fmtInput(thanhTien)}
                onChange={e => handleThanhTienChange(e.target.value)}
                placeholder="0đ"
                style={{ flex: 1, border: '1.5px solid var(--champagne)', borderRadius: 8, padding: '9px 12px', fontSize: 18, fontWeight: 800, outline: 'none', background: '#fff', fontFamily: 'var(--serif)', color: 'var(--champagne)', textAlign: 'right' }}
              />
              {ttManual && (
                <button onClick={handleResetTT} title="Đặt lại theo giá niêm yết" style={{ width: 34, height: 42, border: '1px solid var(--bord)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: 'var(--ink3)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↺</button>
              )}
            </div>
            {chiKhauPct > 0 && (
              <div style={{ marginTop: 5, fontSize: 12, color: C.chi, fontWeight: 700 }}>
                Chiết khấu {chiKhauPct}% — giảm {formatCurrency(giaGoc - thanhTien)}
              </div>
            )}
            {chiKhauPct < 0 && (
              <div style={{ marginTop: 5, fontSize: 12, color: C.thu, fontWeight: 700 }}>
                Phụ thu {Math.abs(chiKhauPct)}%
              </div>
            )}
          </div>

          {/* ⑤ Người bán (KTV) + Lễ Tân tư vấn */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={lbl11}>KTV bán thẻ</div>
              <select value={selectedKtvId} onChange={e => setKtvId(e.target.value)} style={{ width: '100%', border: '1.5px solid var(--bord)', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', background: '#fff', color: selectedKtvId ? 'var(--ink)' : 'var(--ink3)', fontFamily: 'var(--sans)', cursor: 'pointer' }}>
                <option value="">-- Không ghi --</option>
                {ktvList.map(k => <option key={k.id} value={k.id}>{k.ho_ten}</option>)}
              </select>
            </div>
            <div>
              <div style={lbl11}>Lễ tân tư vấn</div>
              <select value={selectedLtId} onChange={e => setLtId(e.target.value)} style={{ width: '100%', border: '1.5px solid var(--bord)', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', background: '#fff', color: selectedLtId ? 'var(--ink)' : 'var(--ink3)', fontFamily: 'var(--sans)', cursor: 'pointer' }}>
                <option value="">-- Không có --</option>
                {(ltList.length > 0 ? ltList : ktvList).map(k => <option key={k.id} value={k.id}>{k.ho_ten}</option>)}
              </select>
            </div>
          </div>

          {/* ⑥ Bảng commission đề xuất — chỉ hiện khi có ít nhất 1 NV */}
          {(selectedKtv || selectedLt) && (
            <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#f0faf5', border: '1px solid #b7e4cc' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.thu, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                Commission đề xuất
              </div>
              {selectedKtv && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>KTV — {selectedKtv.ho_ten}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: rates.tiLeKtv > 0 ? C.thu : 'var(--ink3)' }}>
                    {rates.tiLeKtv > 0 ? `${rates.tiLeKtv}% = ${formatCurrency(commKtvTien)}` : '0%'}
                  </span>
                </div>
              )}
              {selectedLt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>LT — {selectedLt.ho_ten}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: rates.tiLeLt > 0 ? C.thu : 'var(--ink3)' }}>
                    {rates.tiLeLt > 0 ? `${rates.tiLeLt}% = ${formatCurrency(commLtTien)}` : '0%'}
                  </span>
                </div>
              )}
              {rates.label && (
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6, paddingTop: 6, borderTop: '1px dashed #b7e4cc' }}>
                  {rates.label}
                </div>
              )}
              {!rates.label && !selectedKtv && !selectedLt && (
                <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Chọn KTV hoặc LT để tính commission</div>
              )}
            </div>
          )}

          {/* ⑦ Ngày hết hạn */}
          <div>
            <div style={lbl11}>Ngày hết hạn (để trống = không hạn)</div>
            <input
              type="date" value={ngayHetHan} onChange={e => setNgayHetHan(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--bord)', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'var(--sans)', color: ngayHetHan ? 'var(--ink)' : 'var(--ink3)' }}
            />
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: 44, border: '1.5px solid var(--bord)', borderRadius: 10, background: '#fff', color: 'var(--ink2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)' }}>Huỷ</button>
          <button
            onClick={() => onConfirm({
              soBuoiMua, soBuoiTang, soBuoiTong,
              giaTri: thanhTien,
              nhanVienBan: selectedKtv,
              nhanVienTuVanLt: selectedLt,
              ngayHetHan: ngayHetHan || null,
              tiLeCommKtv: rates.tiLeKtv,
              tiLeCommLt: rates.tiLeLt,
              kmRefPct,
            })}
            disabled={!canConfirm}
            style={{ flex: 2, height: 44, border: 'none', borderRadius: 10, background: canConfirm ? 'linear-gradient(135deg,#C9A96E 0%,#A0714F 45%,#7D5A3C 100%)' : 'var(--line)', color: canConfirm ? '#fff' : 'var(--ink3)', cursor: canConfirm ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)' }}
          >
            Thêm vào đơn — {formatCurrency(thanhTien)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cart line (right panel) — layout MySpa ───────────────────────────────────
function CartLine({ item, onRemove, onQtyChange, onDiscountChange, onSelectKTV, onToggleCard, ktvList }) {
  const name      = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || item.meta?.tenDichVu || '—'
  const donGia    = item.don_gia || 0
  const isDichVu  = item.loai_item === 'dich_vu'
  const isSanPham = item.loai_item === 'san_pham'
  const isCard    = item.loai_item === 'the_moi'
  const isTheLT   = item.loai_item === 'the_lieu_trinh'
  const nv        = item.nhan_vien

  // QTY + giảm giá (dịch vụ / sản phẩm thường)
  const [qty,     setQty]     = useState(item.so_luong || 1)
  const [discAmt, setDiscAmt] = useState(Math.max(0, donGia * (item.so_luong||1) - (item.thanh_tien||0)))

  // Inline card state — đầy đủ thông tin thẻ + commission
  const [cardBuoiMua,      setCardBuoiMua]      = useState(item.meta?.soBuoiMua    || 10)
  const [cardBuoiTang,     setCardBuoiTang]     = useState(item.meta?.soBuoiTang   || 0)
  const [cardPhanTramGiam, setCardPhanTramGiam] = useState(item.meta?.phanTramGiam  || 0)
  const [cardNgayHH,       setCardNgayHH]       = useState(item.meta?.ngayHetHan   || '')
  const [cardKhongGH,      setCardKhongGH]      = useState(!item.meta?.ngayHetHan)
  const [ngayHHOpen,       setNgayHHOpen]       = useState(false)

  // KM badge
  const cardKmRefPct  = calcKmRefPct({ soBuoiMua: cardBuoiMua, soBuoiTang: cardBuoiTang, phanTramGiam: Number(cardPhanTramGiam) })
  const cardKmAl      = (cardBuoiTang > 0 || Number(cardPhanTramGiam) > 0) && cardKmRefPct > 0 ? kmRefAlert(cardKmRefPct) : null
  // Thành tiền = buổi mua × đơn giá × (1 − giảm%)
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

  // commitCard — truyền đầy đủ params vào handleToggleCard
  const commitCard = (buoiMua, buoiTang, ngayHH, khongGH, pctGiam) => {
    const km = calcKmRefPct({ soBuoiMua: buoiMua, soBuoiTang: buoiTang, phanTramGiam: Number(pctGiam || 0) })
    onToggleCard(item._lid, true, {
      soBuoiMua:    buoiMua,
      soBuoiTang:   buoiTang,
      ngayHetHan:   khongGH ? null : (ngayHH || null),
      donGia,
      phanTramGiam: Number(pctGiam || 0),
      kmRefPct:     km,
    })
  }

  const smBtn = {
    width: 22, height: 22, border: `1px solid ${C.line2}`, borderRadius: 3,
    background: C.surface2, cursor: 'pointer', fontSize: 14, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.ink2,
  }

  // Thẻ liệu trình dùng buổi (cũ)
  const theLTConLai = item.the_lieu_trinh?.so_buoi_con_lai ?? null
  const theLTTong   = item.the_lieu_trinh?.so_buoi_tong ?? null
  const theLTHH     = item.the_lieu_trinh?.ngay_het_han

  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>

      {/* ── ROW CHÍNH: ✕ | Tên + giá/buổi | SL | Giảm+đ | Thành tiền | CB Thẻ ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => onRemove(item._lid)} style={{ background: 'none', border: 'none', color: C.chi, cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>

        {/* Tên + đơn giá */}
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
            {Number(cardPhanTramGiam) > 0 && <span style={{ color: C.chi }}> −{cardPhanTramGiam}%</span>}
            {' · '}{formatCurrency(cardThanhTien)}
          </div>}
        </div>

        {/* SL (chỉ dịch vụ/SP thường, không phải thẻ) */}
        {(isDichVu || isSanPham) && !isCard ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <button onClick={() => handleQty(qty - 1)} style={smBtn}>−</button>
            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => handleQty(qty + 1)} style={smBtn}>+</button>
          </div>
        ) : isTheLT ? <div style={{ width: 54, flexShrink: 0 }} /> : null}

        {/* Giảm giá + đ (chỉ DV/SP thường) */}
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

        {/* Thành tiền */}
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--serif)', minWidth: 76, textAlign: 'right', flexShrink: 0, color: isTheLT ? 'var(--ink3)' : (isCard ? 'var(--champagne)' : 'var(--ink)') }}>
          {isTheLT ? '0đ ✓' : formatCurrency(item.thanh_tien || 0)}
        </div>

        {/* Checkbox Thẻ liệu trình */}
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

      {/* ── CARD SECTION — hiện khi tick Thẻ liệu trình ── */}
      {isCard && (
        <div style={{ marginTop: 6, paddingLeft: 16, paddingRight: 4 }}>

          {/* Row 1: Số buổi + KM tặng + % giảm giá */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>

            {/* Số buổi mua */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Buổi mua</span>
              <button onClick={() => { const v = Math.max(1, cardBuoiMua-1); setCardBuoiMua(v); commitCard(v, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam) }} style={smBtn}>−</button>
              <input
                type="number" min={1} value={cardBuoiMua}
                onChange={e => { const v = Math.max(1, parseInt(e.target.value)||1); setCardBuoiMua(v) }}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam)}
                style={{ width: 38, border: '1px solid var(--bord)', borderRadius: 4, padding: '2px 3px', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <button onClick={() => { const v = cardBuoiMua+1; setCardBuoiMua(v); commitCard(v, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam) }} style={smBtn}>+</button>
            </div>

            {/* Tặng buổi */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Tặng</span>
              <button onClick={() => { const v = Math.max(0, cardBuoiTang-1); setCardBuoiTang(v); commitCard(cardBuoiMua, v, cardNgayHH, cardKhongGH, cardPhanTramGiam) }} style={smBtn}>−</button>
              <input
                type="number" min={0} value={cardBuoiTang}
                onChange={e => { const v = Math.max(0, parseInt(e.target.value)||0); setCardBuoiTang(v) }}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam)}
                style={{ width: 38, border: '1px solid var(--bord)', borderRadius: 4, padding: '2px 3px', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <button onClick={() => { const v = cardBuoiTang+1; setCardBuoiTang(v); commitCard(cardBuoiMua, v, cardNgayHH, cardKhongGH, cardPhanTramGiam) }} style={smBtn}>+</button>
            </div>

            {/* % Giảm giá trực tiếp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Giảm</span>
              <input
                type="number" min={0} max={100} step={0.5}
                value={cardPhanTramGiam}
                onChange={e => { const v = Math.min(100, Math.max(0, parseFloat(e.target.value)||0)); setCardPhanTramGiam(v) }}
                onBlur={() => commitCard(cardBuoiMua, cardBuoiTang, cardNgayHH, cardKhongGH, cardPhanTramGiam)}
                style={{ width: 38, border: '1px solid var(--bord)', borderRadius: 4, padding: '2px 3px', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <span style={{ fontSize: 10, color: 'var(--ink3)' }}>%</span>
            </div>

            {/* Badge KM_ref% */}
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

          {/* Row 2: Ngày Hết Hạn (đã bỏ LT tư vấn) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Ngày Hết Hạn</span>
            {!cardKhongGH ? (
              <button onClick={() => setNgayHHOpen(true)} style={{
                flex: 1, minWidth: 120, border: '1px solid var(--bord)', borderRadius: 4, padding: '4px 8px',
                fontSize: 11.5, background: '#fff', color: cardNgayHH ? 'var(--ink)' : 'var(--ink3)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
              }}>
                {cardNgayHH ? cardNgayHH.split('-').reverse().join('/') : 'Chọn ngày…'}
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
            onConfirm={d => { setCardNgayHH(d); setNgayHHOpen(false); commitCard(cardBuoiMua, cardBuoiTang, d, false, cardLtId, cardPhanTramGiam) }}
          />
        </div>
      )}

      {/* ── Chọn KTV làm dịch vụ → tiền tour / hoa hồng theo từng dòng (kiểu MySpa) ── */}
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

// ── PosCreateOrder ────────────────────────────────────────────────────────────
function PosCreateOrder({ resumeOrderId }) {
  const { user } = useAuth()

  // Order — local khi chưa lưu, DB mode khi đã lưu/resume
  const [lineItems, setLineItems]       = useState([])
  const [savedOrderId, setSavedOrderId] = useState(null)  // null = local, uuid = đã lưu DB

  // Customer
  const [isGuest, setIsGuest]           = useState(true)
  const [guestName, setGuestName]       = useState('')
  const [guestPhone, setGuestPhone]     = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerCards, setCustomerCards]       = useState([])
  const [customerDebt, setCustomerDebt]         = useState([])
  const [cardHistory, setCardHistory]           = useState([])
  const [showCardHistory, setShowCardHistory]   = useState(false)
  const [custSearch, setCustSearch]     = useState('')
  const [custResults, setCustResults]   = useState([])
  // Modal thu nợ
  const [debtModal, setDebtModal]       = useState(null)   // { the: <debt_row> }
  const [debtSoTien, setDebtSoTien]     = useState('')
  const [debtHinhThuc, setDebtHinhThuc] = useState('tien_mat')
  const [debtLoading, setDebtLoading]   = useState(false)
  const [custOpen, setCustOpen]         = useState(false)
  // Ref: payments đã insert cho order hiện tại (tránh insert 2 lần khi retry checkout)
  const paymentsInserted = useRef(false)
  const [custLoading, setCustLoading]   = useState(false)

  // Right panel
  const [rightTab, setRightTab]   = useState('don_hang')
  const [giamDVPct, setGiamDVPct] = useState('')
  const [giamDVVnd, setGiamDVVnd] = useState('')
  const [giamMode, setGiamMode]   = useState('pct')   // 'pct' | 'vnd'
  const [vatPct, setVatPct]       = useState('')
  const [maKM, setMaKM]           = useState('')
  const [todayStats, setTodayStats] = useState({ soDon: 0, tongThu: 0 })
  const [loading, setLoading]     = useState(false)

  // Nhân viên per-order
  const [orderStaff, setOrderStaff]   = useState([])
  const [staffSearch, setStaffSearch] = useState('')
  const [staffOpen, setStaffOpen]     = useState(false)
  const staffInputRef = useRef(null)
  const [staffDropPos, setStaffDropPos] = useState({ top: 0, left: 0, width: 0 })

  // Payment inline
  const [payLines, setPayLines]     = useState([{ _id: 1, soTien: 0, hinhThuc: 'tien_mat' }])
  const [ghiChuDon, setGhiChuDon]   = useState('')
  const _payId = useRef(1)

  // KTV
  const [ktvList, setKtvList]   = useState([])
  const [ktvPopup, setKtvPopup] = useState(null)

  const custTimer = useRef(null)

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    posService.getTodayStats().then(s => setTodayStats(s))
    posService.getKTVs().then(d => setKtvList(d || []))
  }, [])

  // Resume đơn nháp từ danh sách
  useEffect(() => {
    if (!resumeOrderId) return
    setSavedOrderId(resumeOrderId)
    Promise.all([
      posService.getOrder(resumeOrderId),
      posService.getLineItems(resumeOrderId),
    ]).then(([order, items]) => {
      // Restore customer
      if (order.khach_hang) {
        setSelectedCustomer({ id: order.khach_hang_id, ho_ten: order.khach_hang.ho_ten, so_dien_thoai: order.khach_hang.so_dien_thoai })
        setCustSearch(order.khach_hang.ho_ten)
        setIsGuest(false)
      }
      // items từ DB dùng id làm _lid để handlers nhất quán
      setLineItems((items || []).map(i => ({ ...i, _lid: i.id })))
    }).catch(err => { alert('Lỗi tải đơn: ' + err.message) })
  }, [resumeOrderId])

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerCards([])
      setCustomerDebt([])
      setCardHistory([])
      setShowCardHistory(false)
      return
    }
    posService.getCustomerCards(selectedCustomer.id)
      .then(cards => setCustomerCards(cards || []))
      .catch(() => setCustomerCards([]))
    posService.getCustomerCardsHistory(selectedCustomer.id)
      .then(hist => setCardHistory(hist || []))
      .catch(() => setCardHistory([]))
    posService.getCustomerDebt(selectedCustomer.id)
      .then(debt => setCustomerDebt(debt || []))
      .catch(() => setCustomerDebt([]))
  }, [selectedCustomer?.id])

  // Auto-fill ghi chú khi có thẻ liệu trình
  useEffect(() => {
    const theLTItems = lineItems.filter(i => i.loai_item === 'the_lieu_trinh' && i.the_lieu_trinh)
    if (theLTItems.length > 0) {
      const notes = theLTItems.map(i => {
        const c = i.the_lieu_trinh
        const conLai = Math.max(0, (c.so_buoi_con_lai || 0) - (i.so_luong || 1))
        return `${c.ten_dich_vu}: còn ${conLai}/${c.so_buoi_tong} buổi`
      })
      setGhiChuDon(notes.join('\n'))
    } else if (lineItems.length > 0) {
      setGhiChuDon('')
    }
  }, [lineItems])

  // ── Customer search ─────────────────────────────────────────────────────────
  const searchCustomers = useCallback(async (q) => {
    if (!q || q.length < 2) { setCustResults([]); return }
    setCustLoading(true)
    try { setCustResults(await posService.searchCustomers(q, 6)) }
    finally { setCustLoading(false) }
  }, [])

  const onCustChange = (v) => {
    setCustSearch(v)
    setCustOpen(true)
    clearTimeout(custTimer.current)
    custTimer.current = setTimeout(() => searchCustomers(v), 280)
  }

  const pickCustomer = (c) => {
    setSelectedCustomer(c)
    setIsGuest(false)
    setCustSearch(c.ho_ten)
    setCustOpen(false)
    setCustResults([])
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustSearch('')
    setCustResults([])
    setCustomerCards([])
    setCustomerDebt([])
    setCardHistory([])
    setDebtModal(null)
    setDebtSoTien('')
    setShowCardHistory(false)
  }

  // ── Item handlers — local hoặc DB nếu đã lưu ────────────────────────────────
  const handleAddCard = (card) => handleAddItem({
    loai_item:         'the_lieu_trinh',
    the_lieu_trinh_id: card.id,
    the_lieu_trinh:    {
      ten_dich_vu:     card.ten_dich_vu,
      so_buoi_con_lai: card.so_buoi_con_lai,
      so_buoi_tong:    card.so_buoi_tong,
      so_buoi_da_dung: card.so_buoi_da_dung,
      gia_tri_the:     card.gia_tri_the,
      ngay_het_han:    card.ngay_het_han,
    },
    don_gia:    0,
    thanh_tien: 0,
    tien_tour:  0,
    tien_commission: 0,
  })

  const handleAddItem = async (itemData) => {
    if (savedOrderId) {
      try {
        const inserted = await posService.addLineItem(savedOrderId, { so_luong: 1, ...itemData })
        setLineItems(prev => [...prev, { ...inserted, _lid: inserted.id, ...itemData }])
      } catch (err) { alert('Lỗi thêm dịch vụ: ' + err.message) }
    } else {
      const _lid = crypto.randomUUID()
      setLineItems(prev => [...prev, { _lid, so_luong: 1, ...itemData }])
    }
  }

  const handleRemoveItem = async (_lid) => {
    const item = lineItems.find(i => i._lid === _lid)
    if (savedOrderId && item?.id) {
      try { await posService.removeLineItem(item.id) } catch (_) {}
    }
    setLineItems(prev => prev.filter(i => i._lid !== _lid))
  }

  const handleQtyChange = async (_lid, qty, donGia) => {
    const item = lineItems.find(i => i._lid === _lid)
    const nextThanhTien = qty * donGia
    const ktvRule = item?.meta?.myspaCommission?.ktv || null
    const nextTour = item?.loai_item === 'dich_vu'
      ? (ktvRule?.type === 'absolute'
          ? Math.round(Number(ktvRule.amount || 0) * qty)
          : Math.round(nextThanhTien * Number(item.ti_le_hoa_hong || 0) / 100))
      : (item?.tien_tour || 0)
    const updatePayload = item?.loai_item === 'dich_vu'
      ? { so_luong: qty, thanh_tien: nextThanhTien, tien_tour: nextTour, tien_commission: 0 }
      : { so_luong: qty, thanh_tien: nextThanhTien }
    if (savedOrderId && item?.id) {
      try {
        await supabase.from('don_hang_chi_tiet').update(updatePayload).eq('id', item.id)
      } catch (_) {}
    }
    setLineItems(prev => prev.map(i => i._lid === _lid
      ? { ...i, ...updatePayload }
      : i))
  }

  const handleItemDiscount = async (_lid, newThanhTien) => {
    const item = lineItems.find(i => i._lid === _lid)
    const ktvRule = item?.meta?.myspaCommission?.ktv || null
    const qty = Number(item?.so_luong || 1)
    const nextTour = item?.loai_item === 'dich_vu'
      ? (ktvRule?.type === 'absolute'
          ? Math.round(Number(ktvRule.amount || 0) * qty)
          : Math.round(newThanhTien * Number(item.ti_le_hoa_hong || 0) / 100))
      : (item?.tien_tour || 0)
    const updatePayload = item?.loai_item === 'dich_vu'
      ? { thanh_tien: newThanhTien, tien_tour: nextTour, tien_commission: 0 }
      : { thanh_tien: newThanhTien }
    if (savedOrderId && item?.id) {
      try {
        await supabase.from('don_hang_chi_tiet').update(updatePayload).eq('id', item.id)
      } catch (_) {}
    }
    setLineItems(prev => prev.map(i => i._lid === _lid
      ? { ...i, ...updatePayload }
      : i))
  }

  const handleAssignKTV = async (item, ktv, tiLe, tienTourFromPopup) => {
    const isSaleCommission = item.loai_item === 'the_moi' || item.loai_item === 'san_pham'
    const baseTT = item.loai_item === 'the_lieu_trinh' && item.the_lieu_trinh
      ? Math.round((item.the_lieu_trinh.gia_tri_the || 0) / Math.max(1, item.the_lieu_trinh.so_buoi_tong || 1)) * (item.so_luong || 1)
      : (item.thanh_tien || 0)
    const incomeAmount = tienTourFromPopup !== undefined ? tienTourFromPopup : Math.round(baseTT * tiLe / 100)
    const tienTour       = isSaleCommission ? 0 : incomeAmount
    const tienCommission = isSaleCommission ? incomeAmount : 0

    // ── Với thẻ mới: tính lại commission rates theo rules và update meta ──
    // Cần thiết vì lễ tân có thể tick thẻ TRƯỚC khi chọn NV
    // → meta.tiLeCommKtv = 0 → migration 046 không ghi the_lieu_trinh_tu_van
    let updatedMeta = item.meta || null
    if (item.loai_item === 'the_moi' && item.meta) {
      const kmRef    = Number(item.meta.kmRefPct || 0)
      const coLt     = !!(item.meta.nhanVienTuVanLtId)
      const newRates = calcCommissionRates(kmRef, !!(ktv?.id), coLt)
      updatedMeta = {
        ...item.meta,
        nhanVienBanId: ktv?.id || null,
        tiLeCommKtv:   newRates.tiLeKtv,
        tiLeCommLt:    newRates.tiLeLt,
      }
    }

    if (savedOrderId && item?.id) {
      try {
        await supabase.from('don_hang_chi_tiet')
          .update({
            nhan_vien_id:    ktv?.id || null,
            ti_le_hoa_hong:  tiLe,
            tien_tour:       tienTour,
            tien_commission: tienCommission,
            ...(updatedMeta !== item.meta ? { meta: updatedMeta } : {}),
          })
          .eq('id', item.id)
      } catch (_) {}
    }
    setLineItems(prev => prev.map(i => i._lid === item._lid ? {
      ...i,
      nhan_vien_id:    ktv?.id || null,
      nhan_vien:       ktv || null,
      ti_le_hoa_hong:  tiLe,
      tien_tour:       tienTour,
      tien_commission: tienCommission,
      ...(updatedMeta !== item.meta ? { meta: updatedMeta } : {}),
    } : i))
    setKtvPopup(null)
  }

  const handleCreateGuest = async () => {
    if (!guestName.trim()) return
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .insert({ ho_ten: guestName.trim(), so_dien_thoai: guestPhone.trim() || null })
        .select().single()
      if (error) throw error
      setSelectedCustomer(data)
      setIsGuest(false)
      setCustSearch(data.ho_ten)
      setGuestName(''); setGuestPhone('')
    } catch (err) { alert('Lỗi tạo KH: ' + err.message) }
  }

  const resetCreateForm = () => {
    setLineItems([])
    setGiamDVPct(''); setGiamDVVnd(''); setVatPct(''); setMaKM('')
    _payId.current = 1
    setPayLines([{ _id: 1, soTien: 0, hinhThuc: 'tien_mat' }])
    setGhiChuDon('')
    setOrderStaff([])
    paymentsInserted.current = false
    clearCustomer()
  }

  const handleVoidOrder = async () => {
    if (lineItems.length === 0 && !savedOrderId) return
    if (!confirm('Hủy đơn hiện tại?')) return
    if (savedOrderId) {
      try { await posService.voidOrder(savedOrderId) } catch (_) {}
    }
    setSavedOrderId(null)
    resetCreateForm()
    window.location.href = '/pos'
  }

  // ── Thu nợ thẻ liệu trình ──────────────────────────────────────────────────
  const handleThuNo = async () => {
    if (!debtModal || !parseVND(debtSoTien)) return
    const isFromCheckout = !!debtModal.fromCheckout
    setDebtLoading(true)
    try {
      const result = await posService.thuNoThe({
        theLieuTrinhId: debtModal.the.the_lieu_trinh_id,
        soTien:         parseVND(debtSoTien),
        hinhThuc:       debtHinhThuc,
        nguoiThu:       user?.ho_ten || 'Lễ Tân',
      })
      if (!result?.success) throw new Error(result?.error || 'Lỗi thu nợ')

      // Refresh công nợ + thẻ
      const [debt, cards] = await Promise.all([
        posService.getCustomerDebt(selectedCustomer.id),
        posService.getCustomerCards(selectedCustomer.id),
      ])
      setCustomerDebt(debt || [])
      setCustomerCards(cards || [])
      setDebtModal(null)
      setDebtSoTien('')
      setDebtHinhThuc('tien_mat')

      // Nếu thu nợ để mở khoá checkout → tự động retry chốt đơn
      if (isFromCheckout) {
        setTimeout(() => handleConfirmOrder(), 200)
      }
    } catch (err) {
      alert('Lỗi thu nợ: ' + err.message)
    } finally {
      setDebtLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    if (lineItems.length === 0) {
      alert('Thêm ít nhất 1 dịch vụ trước khi lưu đơn')
      return
    }
    if (savedOrderId) {
      // Đã lưu rồi → về danh sách
      window.location.href = '/pos/danh-sach'
      return
    }
    setLoading(true)
    try {
      const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
      const oid = order.id
      const inserted = await Promise.all(lineItems.map(item => posService.addLineItem(oid, {
        loai_item:         item.loai_item,
        dich_vu_id:        item.dich_vu_id        || null,
        san_pham_id:       item.san_pham_id        || null,
        the_lieu_trinh_id: item.the_lieu_trinh_id  || null,
        nhan_vien_id:      item.nhan_vien_id        || null,
        so_luong:          item.so_luong || 1,
        don_gia:           item.don_gia  || 0,
        thanh_tien:        item.thanh_tien || 0,
        ti_le_hoa_hong:    item.ti_le_hoa_hong || null,
        tien_tour:         item.tien_tour || 0,
        tien_commission:   item.tien_commission || 0,
        ghi_chu:           item.ghi_chu || '',
        meta:              item.meta || undefined,
      })))
      setSavedOrderId(oid)
      // Gán DB id cho mỗi item (dùng làm _lid từ đây trở đi)
      setLineItems(lineItems.map((item, i) => ({ ...item, ...inserted[i], _lid: inserted[i].id })))
      window.location.href = '/pos/danh-sach'
    } catch (err) { alert('Lỗi lưu đơn: ' + err.message) }
    finally { setLoading(false) }
  }

  // ── Payment line handlers ────────────────────────────────────────────────────
  const addPayLine = () => {
    _payId.current++
    const prevTotal = payLines.reduce((s, l) => s + l.soTien, 0)
    const conLai = Math.max(0, tongCuoi - prevTotal)
    setPayLines(p => [...p, { _id: _payId.current, soTien: conLai, hinhThuc: '' }])
  }
  const removePayLine = (id) => setPayLines(p => p.filter(l => l._id !== id))
  const updatePayLine = (id, field, val) => setPayLines(p => p.map(l => l._id === id ? { ...l, [field]: val } : l))

  // ── Toggle thẻ liệu trình inline ────────────────────────────────────────────
  const handleToggleCard = useCallback(async (_lid, toCard, {
    soBuoiMua, soBuoiTang, ngayHetHan, donGia, phanTramGiam = 0,
    kmRefPct: kmRef,
  }) => {
    if (toCard && !selectedCustomer?.id) {
      alert('Vui lòng chọn khách hàng trước khi tạo thẻ liệu trình')
      return
    }
    const item = lineItems.find(i => i._lid === _lid)
    const soBuoiTong = soBuoiMua + soBuoiTang
    // Thành tiền = buổi mua × đơn giá × (1 − giảm%)
    const thanhTien  = Math.round(soBuoiMua * donGia * (1 - Number(phanTramGiam) / 100))

    const metaData = toCard ? {
      loai:        'the_moi',
      dichVuId:    item?.dich_vu_id  || null,
      tenDichVu:   item?.dich_vu?.ten || null,
      soBuoiMua, soBuoiTang, soBuoiTong,
      phanTramGiam: Number(phanTramGiam),
      giaTriThe:   thanhTien,
      ngayHetHan:  ngayHetHan || null,
      kmRefPct:    kmRef || 0,
    } : null

    if (savedOrderId && item?.id) {
      try {
        await supabase.from('don_hang_chi_tiet')
          .update(toCard
            ? { loai_item: 'the_moi', so_luong: soBuoiMua, thanh_tien: thanhTien, tien_tour: 0, tien_commission: 0, meta: metaData }
            : { loai_item: 'dich_vu', so_luong: 1, thanh_tien: donGia, tien_tour: item?.tien_tour || 0, tien_commission: 0, meta: null })
          .eq('id', item.id)
      } catch (_) {}
    }
    setLineItems(prev => prev.map(i => i._lid === _lid ? {
      ...i,
      ...(toCard
        ? { loai_item: 'the_moi', so_luong: soBuoiMua, thanh_tien: thanhTien, tien_tour: 0, tien_commission: 0, meta: metaData }
        : { loai_item: 'dich_vu', so_luong: 1, thanh_tien: donGia, tien_tour: i.tien_tour || 0, tien_commission: 0, meta: null }),
    } : i))
  }, [selectedCustomer, lineItems, savedOrderId])

  // ── Chốt đơn — tạo DB record chỉ tại đây ───────────────────────────────────
  const handleConfirmOrder = async () => {
    if (lineItems.length === 0) return
    if (!selectedCustomer?.id) {
      alert('Vui long chon khach hang truoc khi chot don de CRM va doi soat du lieu duoc ghi nhan day du.')
      return
    }
    const validPayments = payLines.filter(l => l.soTien > 0 && l.hinhThuc)
    if (tongCuoi > 0 && validPayments.length === 0) {
      alert('Vui lòng nhập số tiền và chọn hình thức thanh toán')
      return
    }
    if (conNo > 0 && !selectedCustomer) {
      alert('Khách lẻ phải thanh toán đủ. Vui lòng chọn khách hàng để ghi nợ.')
      return
    }
    const theMoiItems = lineItems.filter(i => i.loai_item === 'the_moi')
    if (theMoiItems.length > 0 && !selectedCustomer?.id) {
      alert('Đơn có mua thẻ liệu trình — vui lòng chọn khách hàng để lưu thẻ.')
      return
    }
    setLoading(true)
    try {
      let oid = savedOrderId

      if (!oid) {
        // Chưa lưu nháp → tạo order + items ngay
        const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
        oid = order.id
        await Promise.all(lineItems.map(item => posService.addLineItem(oid, {
          loai_item:         item.loai_item,
          dich_vu_id:        item.dich_vu_id        || null,
          san_pham_id:       item.san_pham_id        || null,
          the_lieu_trinh_id: item.the_lieu_trinh_id  || null,
          nhan_vien_id:      item.nhan_vien_id        || null,
          so_luong:          item.so_luong || 1,
          don_gia:           item.don_gia  || 0,
          thanh_tien:        item.thanh_tien || 0,
          ti_le_hoa_hong:    item.ti_le_hoa_hong || null,
          tien_tour:         item.tien_tour || 0,
          tien_commission:   item.tien_commission || 0,
          ghi_chu:           item.ghi_chu || '',
          meta:              item.meta || undefined,
        })))
        paymentsInserted.current = false  // order mới → chưa có payments
      }

      // Insert payments — chỉ khi chưa insert (tránh duplicate khi retry sau CHUA_DU_BUOI)
      if (tongCuoi > 0 && !paymentsInserted.current) {
        for (const p of validPayments) {
          await posService.addPayment(oid, { hinhThuc: p.hinhThuc, soTien: p.soTien, ghiChu: ghiChuDon })
        }
        paymentsInserted.current = true
      }

      // 4. Finalize — RPC xử lý kho, thẻ LT dùng, thẻ mới, công nợ, doanh_thu
      const result = await posService.finalizeOrder(oid, { giamGia: giamDVAmt, conNo, ghiChu: ghiChuDon })

      // ── Thẻ chưa đủ buổi được phép → yêu cầu KH thanh toán trước ──────────
      if (result?.error_code === 'CHUA_DU_BUOI') {
        setSavedOrderId(oid)  // giữ để retry sau khi thu nợ xong
        // Tìm tên thẻ từ customerCards hoặc customerDebt
        const theId   = result.the_lieu_trinh_id
        const theCard = customerCards.find(c => c.id === theId)
                     || customerDebt.find(d => d.the_lieu_trinh_id === theId)
        setDebtModal({
          the: {
            the_lieu_trinh_id: theId,
            ten_dich_vu: theCard?.ten_dich_vu || 'Thẻ liệu trình',
            con_no: result.can_tra_them,
          },
          fromCheckout: true,  // flag: sau khi thu → tự retry checkout
        })
        setDebtSoTien(String(result.can_tra_them))
        setDebtHinhThuc('tien_mat')
        return  // dừng, chờ KH thanh toán
      }

      const comboItems = lineItems.filter(i => i.loai_item === 'the_moi' && i.meta?.loai === 'combo_lieu_trinh')
      if (comboItems.length > 0) {
        await posService.markCreatedComboCards(oid, comboItems)
      }

      // 5. Reset
      paymentsInserted.current = false
      setSavedOrderId(null)
      resetCreateForm()
      const stats = await posService.getTodayStats()
      setTodayStats(stats)
    } catch (err) { alert('Lỗi thanh toán: ' + err.message) }
    finally { setLoading(false) }
  }

  // ── Computed ─────────────────────────────────────────────────────────────────
  const tongHang   = lineItems.reduce((s, i) => s + (i.thanh_tien || 0), 0)
  const giamDVAmt  = giamMode === 'vnd'
    ? Math.min(tongHang, parseVND(giamDVVnd))
    : Math.round(tongHang * (parseFloat(giamDVPct) || 0) / 100)
  const vatAmt     = Math.round((tongHang - giamDVAmt) * (parseFloat(vatPct) || 0) / 100)
  const tongCuoi   = Math.max(0, tongHang - giamDVAmt + vatAmt)

  // Khi chỉ có 1 pay line → luôn sync = tongCuoi (100% mặc định)
  // Khi có 2+ lines (khách cọc) → không override
  useEffect(() => {
    setPayLines(prev => {
      if (prev.length !== 1) return prev
      if (prev[0].soTien === tongCuoi) return prev
      return [{ ...prev[0], soTien: tongCuoi }]
    })
  }, [tongCuoi])

  const tongNhan   = payLines.reduce((s, l) => s + (l.hinhThuc ? (l.soTien || 0) : 0), 0)
  const tienThua   = Math.max(0, tongNhan - tongCuoi)
  const conNo      = Math.max(0, tongCuoi - tongNhan)

  // KM_ref% của toàn đơn: lấy từ thẻ mới (meta.kmRefPct) hoặc giảm giá DV tổng
  const orderKmRefPct = (() => {
    const theKm = lineItems
      .filter(i => i.loai_item === 'the_moi' && Number(i.meta?.kmRefPct) > 0)
      .reduce((mx, i) => Math.max(mx, Number(i.meta.kmRefPct)), 0)
    const giamKm = tongHang > 0 ? (giamDVAmt / tongHang * 100) : 0
    return Math.max(theKm, giamKm)
  })()

  // Tính % commission đúng rules theo vi_tri và KM của đơn
  // Khi add NV mới, truyền danh sách staff sẽ có để tính coLt
  const calcStaffPct = (viTri, staffList) => {
    if (viTri === 'le_tan') return 3
    const coLt = staffList.some(s => s.nv.vi_tri === 'le_tan')
    if (orderKmRefPct >= 30) return 5                // KM ≥ 30% → KTV 5%
    return coLt ? 7 : 10                             // KTV+LT → 7%, KTV đơn → 10%
  }
  // Rules pct của NV đang có trong orderStaff (để hiện cảnh báo)
  const coLtInStaff   = orderStaff.some(s => s.nv.vi_tri === 'le_tan')
  const getRulesPct   = (viTri) => {
    if (viTri === 'le_tan') return 3
    if (orderKmRefPct >= 30) return 5
    return coLtInStaff ? 7 : 10
  }

  const canConfirm = lineItems.length > 0 && !!selectedCustomer?.id && (
    tongCuoi === 0
    || (payLines.some(l => l.soTien > 0 && l.hinhThuc) &&
        (tongNhan >= tongCuoi || (conNo > 0 && !!selectedCustomer)))
  )

  const disabledReason = lineItems.length === 0
    ? 'Thêm dịch vụ để bắt đầu'
    : !selectedCustomer?.id
      ? 'Vui lòng chọn khách hàng trước khi chốt đơn'
      : 'Chưa đủ thanh toán'

  const nowVN  = getNowVN()
  const dateStr = nowVN.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
    <style>{`
      .app { height: 100vh; overflow: hidden; }
      .main { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
      .topbar { display: none !important; }
      .page { flex: 1 !important; min-height: 0; padding: 0 !important; gap: 0 !important; overflow: hidden !important; }
    `}</style>
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ═══ LEFT PANEL (60%) ═══ */}
      <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRight: '1px solid var(--line)' }}>

        {/* Left header */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.line}`, background: C.surface, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT.serif, color: C.champagne }}>Tạo Đơn Hàng</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>
            {user?.ho_ten} · {todayStats.soDon} đơn hôm nay · {formatCurrency(todayStats.tongThu)}
          </div>
        </div>

        {/* ── CUSTOMER SECTION ── */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.line}`, background: C.surface, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: selectedCustomer ? 10 : (isGuest && (guestName || guestPhone) ? 8 : 0), position: 'relative' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={custSearch}
                onChange={e => { onCustChange(e.target.value); if (selectedCustomer) clearCustomer() }}
                onFocus={() => setCustOpen(true)}
                placeholder="🔍  Tìm khách hàng theo tên, số điện thoại…"
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--bord)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
              />
            </div>
            <button
              onClick={() => { clearCustomer(); setIsGuest(true); setGuestName(''); setGuestPhone('') }}
              style={{ flexShrink: 0, height: 38, padding: '0 14px', border: 'none', borderRadius: 8, background: isGuest && !selectedCustomer ? '#1a1209' : 'rgba(0,0,0,.08)', color: isGuest && !selectedCustomer ? '#fff' : 'var(--ink2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'all .15s' }}>
              Khách lẻ
            </button>

            {custOpen && (custResults.length > 0 || (custSearch.length >= 2 && !custLoading)) && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 48, zIndex: 200, marginTop: 4, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: C.shadow, overflow: 'hidden' }}>
                {custResults.length === 0 ? (
                  <div style={{ padding: '14px', fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>{custLoading ? 'Đang tìm…' : 'Không tìm thấy khách hàng'}</div>
                ) : custResults.map(c => (
                  <button key={c.id} onClick={() => { pickCustomer(c); setIsGuest(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--line)', fontFamily: 'var(--sans)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(c.ho_ten)}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{c.ho_ten}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.so_dien_thoai}{c.ma_kh && <span style={{ marginLeft: 6, color: 'var(--champagne)', fontWeight: 600 }}>{c.ma_kh}</span>}</div>
                    </div>
                    <span style={{ fontSize: 10, background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>Hannah Spa</span>
                  </button>
                ))}
              </div>
            )}
            {custOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setCustOpen(false)} />}
          </div>

          {selectedCustomer && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid var(--champagne)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(selectedCustomer.ho_ten)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--champagne)' }}>{selectedCustomer.ho_ten}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{selectedCustomer.so_dien_thoai}{selectedCustomer.ma_kh && <span style={{ marginLeft: 6, fontWeight: 600 }}>{selectedCustomer.ma_kh}</span>}</div>
                </div>
                <button onClick={clearCustomer} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}>✕</button>
              </div>
              {customerCards.filter(c => c.so_buoi_con_lai > 0).length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {customerCards.filter(c => c.so_buoi_con_lai > 0).map(card => (
                    <LieuTrinhCard key={card.id} card={card} onUse={handleAddCard} />
                  ))}
                </div>
              )}

              {/* ── CÔNG NỢ KHÁCH HÀNG ── */}
              {customerDebt.length > 0 && (
                <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(192,57,43,.28)' }}>
                  {/* Header tổng nợ */}
                  <div style={{ background: 'rgba(192,57,43,.08)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#C0392B' }}>
                      ⚠ Còn nợ {formatCurrency(customerDebt.reduce((s, d) => s + (d.con_no || 0), 0))}
                    </span>
                    <span style={{ fontSize: 11, color: '#C0392B', opacity: .7 }}>
                      · {customerDebt.length} thẻ
                    </span>
                  </div>
                  {/* Từng khoản nợ */}
                  {customerDebt.map(d => {
                    const conNo   = d.con_no || 0
                    const pctTra  = d.pct_da_tra || 0
                    const du30    = d.du_30_pct
                    return (
                      <div key={d.the_lieu_trinh_id} style={{
                        padding: '7px 12px', borderTop: '1px solid rgba(192,57,43,.1)',
                        display: 'flex', alignItems: 'center', gap: 8, background: '#fff',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.ten_dich_vu}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#C0392B' }}>
                              {formatCurrency(conNo)}
                            </span>
                            <span style={{
                              fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                              background: 'rgba(39,174,96,.12)', color: '#27AE60',
                            }}>
                              {pctTra}% đã trả
                            </span>
                            {d.ngay_mua && <span style={{ fontSize: 10, color: C.ink3 }}>{fmtDate(d.ngay_mua)}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setDebtModal({ the: d })
                            setDebtSoTien(String(conNo))
                            setDebtHinhThuc('tien_mat')
                          }}
                          style={{
                            flexShrink: 0, padding: '5px 12px', border: 'none', borderRadius: 6,
                            background: '#C0392B', color: '#fff',
                            fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
                          }}>
                          Thu Nợ
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Lịch sử thẻ đã hết / đã dùng */}
              {cardHistory.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => setShowCardHistory(v => !v)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                    fontSize: 11, color: C.ink3, fontFamily: FONT.sans, display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 9, transform: showCardHistory ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform .15s' }}>▶</span>
                    Lịch sử thẻ liệu trình ({cardHistory.length} thẻ đã hết)
                  </button>
                  {showCardHistory && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {cardHistory.map(c => (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6,
                          padding: '5px 10px', fontSize: 11,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: C.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.ten_dich_vu}
                            </div>
                            <div style={{ color: C.ink3, marginTop: 1 }}>
                              {c.so_buoi_da_dung}/{c.so_buoi_tong} buổi · {formatCurrency(c.gia_tri_the || 0)}
                              {c.ngay_mua && <span style={{ marginLeft: 6 }}>Mua: {fmtDate(c.ngay_mua)}</span>}
                            </div>
                          </div>
                          <span style={{
                            flexShrink: 0, marginLeft: 8, fontSize: 10, fontWeight: 700,
                            color: c.trang_thai === 'het_buoi' ? C.ink3 : '#C0392B',
                            background: C.surface2, borderRadius: 4, padding: '2px 6px',
                          }}>
                            {c.trang_thai === 'het_buoi' ? 'Hết buổi' : c.trang_thai === 'het_han' ? 'Hết hạn' : c.trang_thai}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isGuest && !selectedCustomer && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Tên khách (tùy chọn)…"
                style={{ flex: 1, border: '1px solid var(--bord)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, outline: 'none', background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)' }} />
              <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="SĐT (tùy chọn)…" type="tel"
                style={{ flex: 1, border: '1px solid var(--bord)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, outline: 'none', background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)' }} />
              {guestName.trim() && (
                <button onClick={handleCreateGuest} style={{ flexShrink: 0, height: 32, padding: '0 10px', border: 'none', borderRadius: 7, background: 'var(--champagne)', color: '#2a1d14', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Lưu KH</button>
              )}
            </div>
          )}
        </div>

        {/* ── CATALOG ── */}
        <PosProductCatalog
          onAddItem={handleAddItem}
          selectedCustomer={selectedCustomer}
          isGuest={isGuest}
        />
      </div>

      {/* ═══ RIGHT PANEL (40%) ═══ */}
      <aside style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.surface2, overflow: 'hidden' }}>

        {/* Right header */}
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.line}`, background: C.surface2 }}>
          <div style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 16px', background: C.grad, color: C.espresso, fontSize: 13, fontWeight: 700, letterSpacing: '.02em', fontFamily: FONT.serif }}>
            Thông tin đơn hàng
          </div>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}`, background: C.surface2 }}>
            {[['don_hang', 'Đơn hàng'], ['vat_tu', 'Vật tư tiêu hao']].map(([k, lbl]) => (
              <button key={k} onClick={() => setRightTab(k)} style={{
                flex: 1,
                height: 36,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: rightTab === k ? 700 : 500,
                fontFamily: FONT.sans,
                color: rightTab === k ? C.champagne : C.ink3,
                borderBottom: rightTab === k ? `2px solid ${C.champagne}` : `2px solid transparent`,
                transition: 'all .15s',
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        {rightTab === 'don_hang' && (<>
          {/* KH + ngày giờ */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.line}`, background: C.surface2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              {selectedCustomer ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{selectedCustomer.ho_ten}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>
                    {selectedCustomer.so_dien_thoai}{selectedCustomer.ma_kh && <span style={{ marginLeft: 6 }}>{selectedCustomer.ma_kh}</span>}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 650 }}>Khách lẻ</div>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateStr}</div>
          </div>

          {/* Cart header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 46px 88px 96px', gap: 8, padding: '8px 14px', background: C.bg, borderBottom: `1px solid ${C.line}`, flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            <span>DV / SP</span>
            <span style={{ textAlign: 'center' }}>SL</span>
            <span style={{ textAlign: 'right' }}>Giảm giá</span>
            <span style={{ textAlign: 'right' }}>Thành tiền</span>
          </div>

          {/* ── Scrollable: items + summary + payment ── */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

            {/* Cart items */}
            <div style={{ padding: lineItems.length === 0 ? '32px 14px' : '0 14px', borderBottom: '1px solid var(--line)', minHeight: 126 }}>
              {lineItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
                  Chọn dịch vụ bên trái để thêm vào đơn
                </div>
              ) : lineItems.map(item => (
                <CartLine
                  key={item._lid}
                  item={item}
                  onRemove={handleRemoveItem}
                  onQtyChange={handleQtyChange}
                  onDiscountChange={handleItemDiscount}
                  onSelectKTV={setKtvPopup}
                  onToggleCard={handleToggleCard}
                  ktvList={ktvList}
                />
              ))}
            </div>

            {/* ── Summary + Payment ── */}
            {lineItems.length > 0 && (
            <div style={{ padding: '10px 14px' }}>

              {/* Mã KM */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input value={maKM} onChange={e => setMaKM(e.target.value)} placeholder="Mã khuyến mại"
                  style={{ flex: 1, border: '1px solid var(--bord)', borderRadius: 6, padding: '5px 8px', fontSize: 12, background: '#fff', outline: 'none', fontFamily: 'var(--sans)' }} />
                <button style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: 'var(--champagne)', color: '#2a1d14', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)' }}>ÁP DỤNG</button>
              </div>

              {/* Tạm tính */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ color: 'var(--ink3)' }}>Tạm tính</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--serif)' }}>{formatCurrency(tongHang)}</span>
              </div>

              {/* Giảm giá — toggle % / VNĐ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--ink3)', flex: 1 }}>− Giảm giá DV</span>
                {giamMode === 'pct' ? (
                  <input value={giamDVPct} onChange={e => setGiamDVPct(e.target.value)} placeholder="0"
                    style={{ width: 40, border: '1px solid var(--bord)', borderRadius: '5px 0 0 5px', padding: '3px 5px', fontSize: 12, textAlign: 'center', outline: 'none', background: '#fff' }} />
                ) : (
                  <input value={giamDVVnd} onChange={e => setGiamDVVnd(e.target.value)} placeholder="0"
                    style={{ width: 72, border: '1px solid var(--bord)', borderRadius: '5px 0 0 5px', padding: '3px 5px', fontSize: 12, textAlign: 'right', outline: 'none', background: '#fff' }} />
                )}
                <button onClick={() => setGiamMode(m => m === 'pct' ? 'vnd' : 'pct')} style={{
                  padding: '3px 7px', border: '1px solid var(--bord)', borderLeft: 'none', borderRadius: '0 5px 5px 0',
                  background: C.bg, cursor: 'pointer', fontSize: 11, color: C.ink2, fontWeight: 700,
                }}>{giamMode === 'pct' ? '%' : 'đ'}</button>
                <span style={{ fontWeight: 700, color: C.chi, minWidth: 60, textAlign: 'right', fontFamily: FONT.serif, fontSize: 12 }}>
                  {giamDVAmt > 0 ? `−${formatCurrency(giamDVAmt)}` : '—'}
                </span>
              </div>

              {/* VAT */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, fontSize: 12 }}>
                <span style={{ color: 'var(--ink3)', flex: 1 }}>+ VAT</span>
                <input value={vatPct} onChange={e => setVatPct(e.target.value)} placeholder="0"
                  style={{ width: 40, border: '1px solid var(--bord)', borderRadius: '5px 0 0 5px', padding: '3px 5px', fontSize: 12, textAlign: 'center', outline: 'none', background: '#fff' }} />
                <span style={{ padding: '3px 7px', border: `1px solid ${C.line2}`, borderLeft: 'none', borderRadius: '0 5px 5px 0', background: C.bg, fontSize: 11, color: C.ink2, fontWeight: 700 }}>%</span>
                <span style={{ fontWeight: 700, color: C.thu, minWidth: 60, textAlign: 'right', fontFamily: FONT.serif, fontSize: 12 }}>
                  {vatAmt > 0 ? `+${formatCurrency(vatAmt)}` : '—'}
                </span>
              </div>

              {/* Tổng cộng */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: C.bg, marginBottom: 12, border: `1px solid ${C.line2}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT.serif, color: C.ink }}>Tổng cộng</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.thu, fontFamily: FONT.serif }}>{formatCurrency(tongCuoi)}</span>
              </div>

              {/* ══ Thanh toán ══ */}
              <div style={{ marginBottom: 10 }}>
                {/* Header */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 5, paddingLeft: 26 }}>
                  <div style={{ flex: 5, fontSize: 9, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Thanh toán</div>
                  <div style={{ flex: 4, fontSize: 9, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Còn</div>
                  <div style={{ flex: 7, fontSize: 9, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>PTTT</div>
                </div>

                {payLines.map((line, idx) => {
                  const prevPaid = payLines.slice(0, idx).reduce((s, l) => s + l.soTien, 0)
                  const conLai   = Math.max(0, tongCuoi - prevPaid - line.soTien)
                  return (
                    <div key={line._id} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      {/* + hoặc ✕ */}
                      {idx === 0 ? (
                        <button onClick={addPayLine} style={{ width: 22, height: 32, border: 'none', borderRadius: 4, background: C.thu, color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>+</button>
                      ) : (
                        <button onClick={() => removePayLine(line._id)} style={{ width: 22, height: 32, border: 'none', background: 'none', color: C.chi, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>✕</button>
                      )}
                      {/* Số tiền */}
                      <input
                        value={fmtInput(line.soTien)}
                        onChange={e => updatePayLine(line._id, 'soTien', parseVND(e.target.value))}
                        placeholder="0"
                        style={{ flex: 5, border: '1.5px solid var(--bord)', borderRadius: 6, padding: '5px 6px', fontSize: 12, fontWeight: 700, textAlign: 'right', outline: 'none', background: '#fff', minWidth: 0 }}
                      />
                      {/* Còn */}
                      <input readOnly value={conLai > 0 ? fmtInput(conLai) : '0'}
                        style={{ flex: 4, border: `1px solid ${C.line}`, borderRadius: 6, padding: '5px 5px', fontSize: 11, textAlign: 'right', background: C.bg, color: conLai > 0 ? C.chi : C.thu, cursor: 'default', minWidth: 0 }}
                      />
                      {/* PTTT */}
                      <select
                        value={line.hinhThuc}
                        onChange={e => updatePayLine(line._id, 'hinhThuc', e.target.value)}
                        style={{
                          flex: 7,
                          border: `1.5px solid ${!line.hinhThuc ? '#C0392B' : 'var(--bord)'}`,
                          borderRadius: 6,
                          padding: '5px 8px',
                          fontSize: 11.5,
                          outline: 'none',
                          background: '#fff',
                          color: line.hinhThuc ? 'var(--ink)' : 'var(--ink3)',
                          cursor: 'pointer',
                          minWidth: 0,
                          height: 32,
                          fontFamily: 'var(--sans)',
                          appearance: 'auto',
                        }}
                      >
                        <option value="">-- Chọn PTTT --</option>
                        {PTTT_OPTS.map(p => <option key={p.id} value={p.id}>{paymentDisplayLabel(p)}</option>)}
                      </select>
                    </div>
                  )
                })}

                {/* Còn nợ (nếu có) */}
                {conNo > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: 'rgba(192,57,43,.06)', border: `1px solid rgba(192,57,43,.2)`, fontSize: 12 }}>
                    <span style={{ color: C.ink3 }}>{selectedCustomer ? 'Ghi nợ KH' : 'Còn thiếu ⚠'}</span>
                    <span style={{ fontWeight: 700, color: C.chi, fontFamily: FONT.serif }}>{formatCurrency(conNo)}</span>
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Ghi chú</div>
                <textarea value={ghiChuDon} onChange={e => setGhiChuDon(e.target.value)}
                  placeholder="Ghi chú đơn hàng…" rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--bord)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, outline: 'none', resize: 'none', background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* ══ Hoa Hồng Nhân Viên Bán Hàng ══ */}
              <div style={{ paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Hoa Hồng Nhân Viên Bán Hàng</div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <input
                    ref={staffInputRef}
                    value={staffSearch}
                    onChange={e => {
                      setStaffSearch(e.target.value)
                      if (staffInputRef.current) {
                        const r = staffInputRef.current.getBoundingClientRect()
                        const dropH = Math.min(ktvList.length, 6) * 44
                        const goUp = r.bottom + dropH + 8 > window.innerHeight
                        setStaffDropPos({ bottom: goUp ? window.innerHeight - r.top + 2 : undefined, top: goUp ? undefined : r.bottom + 2, left: r.left, width: r.width })
                      }
                      setStaffOpen(true)
                    }}
                    onFocus={() => {
                      if (staffInputRef.current) {
                        const r = staffInputRef.current.getBoundingClientRect()
                        const dropH = Math.min(ktvList.length, 6) * 44
                        const goUp = r.bottom + dropH + 8 > window.innerHeight
                        setStaffDropPos({ bottom: goUp ? window.innerHeight - r.top + 2 : undefined, top: goUp ? undefined : r.bottom + 2, left: r.left, width: r.width })
                      }
                      setStaffOpen(true)
                    }}
                    placeholder="Chọn nhân viên bán hàng…"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--bord)', borderRadius: 7, padding: '6px 10px', fontSize: 12, outline: 'none', background: '#fff', fontFamily: 'var(--sans)' }}
                  />
                  {staffOpen && ktvList.filter(k => !staffSearch || k.ho_ten.toLowerCase().includes(staffSearch.toLowerCase())).length > 0 && (
                    <>
                      <div style={{ position: 'fixed', top: staffDropPos.top, bottom: staffDropPos.bottom, left: staffDropPos.left, width: staffDropPos.width, zIndex: 9000, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: C.shadow, overflow: 'hidden' }}>
                        {ktvList.filter(k => !staffSearch || k.ho_ten.toLowerCase().includes(staffSearch.toLowerCase())).slice(0, 6).map(k => {
                          const alreadyIn    = !!orderStaff.find(s => s.nv.id === k.id)
                          const slotsBlocked = orderStaff.some(s => s.nv.vi_tri === k.vi_tri)  // đã có người cùng vị trí
                          const blocked      = alreadyIn || slotsBlocked
                          const blockLabel   = alreadyIn
                            ? 'Đã thêm'
                            : k.vi_tri === 'ktv' ? 'Đã có KTV' : 'Đã có Lễ Tân'
                          return (
                          <button key={k.id}
                            disabled={blocked}
                            onClick={() => {
                              if (!blocked) {
                                const newList = [...orderStaff, { nv: k, role: 'tu_van', pct: 0 }]
                                setOrderStaff(newList.map(s => ({ ...s, pct: calcStaffPct(s.nv.vi_tri, newList) })))
                              }
                              setStaffSearch(''); setStaffOpen(false)
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: blocked ? '#f8f6f3' : 'none', cursor: blocked ? 'not-allowed' : 'pointer', borderBottom: `1px solid ${C.line}`, fontFamily: FONT.sans, opacity: blocked ? 0.55 : 1 }}>
                            <NvAvatar nv={k} size={26} />
                            <span style={{ fontSize: 12.5, color: blocked ? C.ink3 : C.ink }}>{shortName(k.ho_ten)}</span>
                            <span style={{ fontSize: 10, color: C.ink3, marginLeft: 'auto' }}>
                              {blocked ? blockLabel : (k.vi_tri === 'ktv' ? 'KTV' : 'Lễ Tân')}
                            </span>
                          </button>
                        )})}

                      </div>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 8999 }} onClick={() => setStaffOpen(false)} />
                    </>
                  )}
                </div>

                {/* Rows nhân viên đã chọn */}
                {orderStaff.map(s => {
                  const commAmt  = Math.round(tongNhan * s.pct / 100)
                  const rulesPct = getRulesPct(s.nv.vi_tri)
                  const overRule = s.pct > rulesPct   // vượt ngưỡng rules
                  return (
                  <div key={s.nv.id} style={{ padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <NvAvatar nv={s.nv} size={28} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, flex: 1 }}>{shortName(s.nv.ho_ten)}</span>
                      {/* % chỉnh được — màu theo rules */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                          type="number" min={0} max={10} step={0.5}
                          value={s.pct}
                          onChange={e => {
                            const v = Math.min(10, Math.max(0, parseFloat(e.target.value) || 0))
                            setOrderStaff(p => p.map(x => x.nv.id === s.nv.id ? { ...x, pct: v } : x))
                          }}
                          style={{
                            width: 54, borderRadius: 5, padding: '3px 6px', fontSize: 12, fontWeight: 800,
                            textAlign: 'center', outline: 'none',
                            border:      `1.5px solid ${overRule ? '#E67E22' : 'rgba(201,169,110,.5)'}`,
                            background:  overRule ? '#fef3e2' : 'rgba(201,169,110,.08)',
                            color:       overRule ? '#E67E22' : C.champagne,
                          }}
                        />
                        <span style={{ fontSize: 10, color: C.ink3 }}>%</span>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 78 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: C.champagne, fontFamily: FONT.serif }}>{formatCurrency(commAmt)}</div>
                        <div style={{ fontSize: 9, color: C.ink3 }}>
                          {tongNhan < tongCuoi ? `${formatCurrency(tongNhan)} × ${s.pct}%` : `${s.pct}% commission`}
                        </div>
                      </div>
                      <button onClick={() => {
                        const remaining = orderStaff.filter(x => x.nv.id !== s.nv.id)
                        // Recalculate pct sau khi xóa
                        setOrderStaff(remaining.map(x => ({ ...x, pct: calcStaffPct(x.nv.vi_tri, remaining) })))
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                    {/* Cảnh báo khi % vượt rules */}
                    {overRule && (
                      <div style={{ marginTop: 4, fontSize: 10, color: '#E67E22', background: '#fef3e2', border: '1px solid #E67E2244', borderRadius: 5, padding: '3px 8px' }}>
                        ⚠ KM {orderKmRefPct.toFixed(0)}% ≥ 30% — tối đa {rulesPct}% (đang tính {s.pct}%)
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>

            </div>
            )}

          </div>{/* end scrollable */}

          {/* ── Bottom action bar — cố định ── */}
          <div style={{ borderTop: `1px solid ${C.line2}`, padding: '10px 12px 14px', flexShrink: 0, background: C.bg }}>
            <style>{`
              @keyframes goldPulse {
                0%,100% { box-shadow: 0 4px 16px rgba(160,113,79,.35); }
                50%      { box-shadow: 0 4px 24px rgba(160,113,79,.6); }
              }
              @keyframes redPulse {
                0%,100% { box-shadow: 0 4px 16px rgba(192,57,43,.35); }
                50%      { box-shadow: 0 4px 24px rgba(192,57,43,.6); }
              }
            `}</style>

            {/* Validation hint */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              {!canConfirm && lineItems.length > 0 && (
                <span style={{ fontSize: 10.5, color: '#A0714F', fontStyle: 'italic' }}>
                  ⚠ {disabledReason}
                </span>
              )}
            </div>

            {/* 4 nút chính */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>

              {/* ← Hủy / Đơn mới */}
              <button onClick={handleVoidOrder} title="Hủy đơn / Đơn mới"
                style={{
                  width: 44, height: 40, border: `1.5px solid ${C.line2}`, borderRadius: 999,
                  background: C.surface2, color: C.ink2,
                  cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>←</button>

              {/* Lưu nháp */}
              <button onClick={handleSaveDraft} title="Lưu đơn nháp để khách thanh toán sau"
                style={{
                  width: 60, height: 40, border: `1.5px solid ${C.line2}`, borderRadius: 999,
                  background: C.surface2, color: C.ink,
                  cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT.sans,
                }}>Lưu</button>

              {/* Thanh Toán & In — nút chính */}
              <button
                disabled={!canConfirm || loading}
                onClick={() => handleConfirmOrder(true)}
                title="Thanh toán và in hoá đơn"
                style={{
                  flex: 1, height: 40, border: 'none', borderRadius: 999, fontFamily: 'var(--sans)',
                  background: !canConfirm
                    ? 'rgba(0,0,0,.08)'
                    : conNo > 0 && selectedCustomer
                      ? 'linear-gradient(135deg,#C0392B 0%,#8e2218 100%)'
                      : 'linear-gradient(135deg,#C9A96E 0%,#A0714F 45%,#7D5A3C 100%)',
                  color: !canConfirm ? 'var(--ink3)' : '#fff',
                  cursor: !canConfirm || loading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 800, letterSpacing: '.02em',
                  animation: canConfirm && !loading
                    ? conNo > 0 && selectedCustomer
                      ? 'redPulse 2.5s ease-in-out infinite'
                      : 'goldPulse 2.5s ease-in-out infinite'
                    : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {loading ? 'Đang xử lý…' : (
                  tongCuoi === 0
                    ? 'Thanh Toán & In'
                    : conNo > 0 && selectedCustomer
                      ? 'Ghi Nợ & In'
                      : 'Thanh Toán & In'
                )}
              </button>

              {/* Thanh Toán — nút phụ */}
              <button
                disabled={!canConfirm || loading}
                onClick={() => handleConfirmOrder(false)}
                title="Thanh toán không in hoá đơn"
                style={{
                  width: 100, height: 40, borderRadius: 999, fontFamily: FONT.sans, flexShrink: 0,
                  border: `1.5px solid ${canConfirm ? C.champagne : C.line2}`,
                  background: canConfirm ? C.surface2 : C.bg,
                  color: canConfirm ? C.ink : C.ink3,
                  cursor: !canConfirm || loading ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                Thanh Toán
              </button>

            </div>
          </div>
        </>)}

        {rightTab === 'vat_tu' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)' }}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧴</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Vật tư tiêu hao</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Tính năng đang phát triển</div>
            </div>
          </div>
        )}
      </aside>
    </div>

    {/* KTV Popup */}
    {ktvPopup && (
      <KtvPopup item={ktvPopup} ktvList={ktvList} onAssign={handleAssignKTV} onClose={() => setKtvPopup(null)} />
    )}

    {/* ── Modal Thu Nợ ── */}
    {debtModal && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.5)',
      }} onClick={e => e.target === e.currentTarget && !debtLoading && setDebtModal(null)}>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '22px 24px',
          width: 360, boxShadow: '0 12px 48px rgba(0,0,0,.28)',
        }}>
          {/* Header — khác nhau giữa thu nợ thường và từ checkout */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: debtModal.fromCheckout ? 'rgba(230,126,34,.1)' : 'rgba(192,57,43,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {debtModal.fromCheckout ? '⚠️' : '💸'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.ink, lineHeight: 1.2 }}>
                {debtModal.fromCheckout ? 'Yêu Cầu Thanh Toán Để Tiếp Tục' : 'Thu Nợ Thẻ Liệu Trình'}
              </div>
              <div style={{ fontSize: 12, color: C.ink2, marginTop: 2 }}>
                {debtModal.fromCheckout
                  ? `Thẻ "${debtModal.the.ten_dich_vu}" cần thanh toán thêm trước khi dùng buổi tiếp theo`
                  : debtModal.the.ten_dich_vu
                }
              </div>
            </div>
          </div>

          {/* Tóm tắt — màu cam nếu từ checkout, đỏ nếu thu nợ thường */}
          <div style={{
            background: debtModal.fromCheckout ? 'rgba(230,126,34,.06)' : 'rgba(192,57,43,.06)',
            border: `1px solid ${debtModal.fromCheckout ? 'rgba(230,126,34,.25)' : 'rgba(192,57,43,.2)'}`,
            borderRadius: 8, padding: '8px 12px', marginBottom: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: C.ink2 }}>
              {debtModal.fromCheckout ? 'Cần thanh toán tối thiểu' : 'Còn nợ'}
            </span>
            <span style={{
              fontSize: 16, fontWeight: 800, fontFamily: FONT.serif,
              color: debtModal.fromCheckout ? '#E67E22' : '#C0392B',
            }}>
              {formatCurrency(debtModal.the.con_no)}
            </span>
          </div>

          {/* Số tiền thu */}
          <label style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: 'block', marginBottom: 5 }}>
            Số tiền thu
          </label>
          <input
            value={debtSoTien ? fmtInput(parseVND(debtSoTien)) : ''}
            onChange={e => setDebtSoTien(String(parseVND(e.target.value)))}
            placeholder="Nhập số tiền…"
            disabled={debtLoading}
            style={{
              width: '100%', boxSizing: 'border-box', marginBottom: 12,
              border: '1.5px solid var(--bord)', borderRadius: 8, padding: '9px 12px',
              fontSize: 16, fontFamily: FONT.sans, outline: 'none',
            }}
          />

          {/* Hình thức thanh toán */}
          <label style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: 'block', marginBottom: 6 }}>
            Hình thức thanh toán
          </label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {[
              { id: 'tien_mat',      label: '💵 Tiền Mặt' },
              { id: 'chuyen_khoan', label: '🏦 Chuyển Khoản' },
              { id: 'quet_the',     label: '💳 Quẹt Thẻ' },
            ].map(p => (
              <button key={p.id} onClick={() => setDebtHinhThuc(p.id)} disabled={debtLoading}
                style={{
                  flex: 1, padding: '7px 4px', cursor: 'pointer', fontFamily: FONT.sans,
                  border: `1.5px solid ${debtHinhThuc === p.id ? C.champagne : C.line}`,
                  borderRadius: 8, fontSize: 11, fontWeight: debtHinhThuc === p.id ? 700 : 400,
                  background: debtHinhThuc === p.id ? 'rgba(201,169,110,.12)' : 'none',
                  color: debtHinhThuc === p.id ? C.champagne : C.ink2,
                  transition: 'all .15s',
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setDebtModal(null); setDebtSoTien(''); setDebtHinhThuc('tien_mat') }}
              disabled={debtLoading}
              style={{
                flex: 1, padding: '10px 0', border: `1px solid ${C.line}`, borderRadius: 8,
                background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: FONT.sans, color: C.ink2,
              }}>
              Huỷ
            </button>
            <button
              onClick={handleThuNo}
              disabled={!parseVND(debtSoTien) || debtLoading}
              style={{
                flex: 2, padding: '10px 0', border: 'none', borderRadius: 8,
                background: !parseVND(debtSoTien) || debtLoading
                  ? 'rgba(0,0,0,.1)'
                  : 'linear-gradient(135deg,#C0392B 0%,#8e2218 100%)',
                color: !parseVND(debtSoTien) || debtLoading ? C.ink3 : '#fff',
                cursor: !parseVND(debtSoTien) || debtLoading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 800, fontFamily: FONT.sans,
                transition: 'all .15s',
              }}>
              {debtLoading ? 'Đang xử lý…' : `Thu ${parseVND(debtSoTien) ? formatCurrency(parseVND(debtSoTien)) : '…'}`}
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function PosApp() {
  const path   = window.location.pathname
  const params = new URLSearchParams(window.location.search)
  const resumeId = params.get('resume')
  if (path === '/pos/danh-sach') {
    return <PosOrderHistory onResumeOrder={(o) => { window.location.href = '/pos?resume=' + o.id }} />
  }
  return <PosCreateOrder resumeOrderId={resumeId} />
}
