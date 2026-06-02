import { useEffect, useState } from 'react'
import { posService } from '../../../services/posService'
import { formatCurrency } from '../../../lib/utils'
import { getCardComboService } from '../../../lib/treatmentCardPolicy'
import { C } from '../../../constants/colors'
import { fmtInput, NvAvatar, parseVND, shortName } from '../posShared'

export default function KtvPopup({ item, ktvList, onAssign, onClose }) {
  const isTheLT = item.loai_item === 'the_lieu_trinh'
  const isSaleCommission = item.loai_item === 'the_moi' || item.loai_item === 'san_pham'
  const name = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || '-'
  const comboService = item.meta?.comboService || getCardComboService(item.the_lieu_trinh || {})
  const treatmentPolicy = item.meta?.treatmentPolicy || null
  const initTiLe = item.ti_le_hoa_hong || item.dich_vu?.ti_le_hoa_hong || comboService?.ti_le_hoa_hong || 0
  const fixedKtvRule = item.meta?.myspaCommission?.ktv?.type === 'absolute' ? item.meta.myspaCommission.ktv : null
  const isFreeWarrantyTour = !!treatmentPolicy?.isFreeWarrantySession
  const initManualTour = Math.round(Number(item.tien_tour || treatmentPolicy?.suggestedTour || 0))

  const [selectedKtv, setSelectedKtv] = useState(item.nhan_vien || null)
  const [tiLe, setTiLe] = useState(initTiLe)
  const [tourMode, setTourMode] = useState(item.meta?.tourMode || (initManualTour > 0 || fixedKtvRule ? 'amount' : 'pct'))
  const [manualTourInput, setManualTourInput] = useState(fmtInput(initManualTour))
  const [baseGiaBuoi, setBaseGiaBuoi] = useState(
    isTheLT && item.the_lieu_trinh?.gia_tri_the && item.the_lieu_trinh?.so_buoi_tong
      ? Math.round(item.the_lieu_trinh.gia_tri_the / Math.max(1, item.the_lieu_trinh.so_buoi_tong))
      : 0
  )
  const [ktvSearch, setKtvSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingRate, setLoadingRate] = useState(isTheLT && !item.ti_le_hoa_hong)

  useEffect(() => {
    if (!isTheLT) return
    const tenDV = comboService?.ten_dich_vu || comboService?.ten || item.the_lieu_trinh?.ten_dich_vu
    if (!tenDV) {
      setLoadingRate(false)
      return
    }

    setLoadingRate(true)
    const cleanName = String(tenDV).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
    const loadService = item.dich_vu_id
      ? posService.getService(item.dich_vu_id)
      : posService.getServices(cleanName || tenDV).then(svcs => svcs.find(dv => dv.ten === cleanName || dv.ten === tenDV) || svcs[0])

    loadService
      .then(match => {
        if (!match) return
        if (tiLe === 0 && match.ti_le_hoa_hong > 0) setTiLe(match.ti_le_hoa_hong)
        if (baseGiaBuoi === 0 && match.gia_co_ban > 0) setBaseGiaBuoi(match.gia_co_ban)
      })
      .catch(() => {})
      .finally(() => setLoadingRate(false))
  }, [])

  const baseTienTour = isTheLT
    ? baseGiaBuoi * (item.so_luong || 1)
    : (item.thanh_tien || 0)
  const pctTour = Math.round(baseTienTour * tiLe / 100)
  const manualTourAmount = parseVND(manualTourInput)
  const absoluteRuleTour = Math.round(Number(fixedKtvRule?.amount || 0) * Math.max(1, Number(item.so_luong || 1)))
  const tienTour = isFreeWarrantyTour
    ? 0
    : fixedKtvRule && !isSaleCommission
      ? absoluteRuleTour
      : tourMode === 'amount'
        ? manualTourAmount
        : pctTour
  const incomeLabel = isSaleCommission ? 'Hoa hồng bán' : 'Tiền Tour'
  const allowedStaffIds = Array.isArray(treatmentPolicy?.allowedStaffIds) ? treatmentPolicy.allowedStaffIds : []
  const restrictWarrantyStaff = isFreeWarrantyTour && allowedStaffIds.length > 0
  const filtered = ktvList.filter(k => {
    const matchSearch = !ktvSearch || k.ho_ten.toLowerCase().includes(ktvSearch.toLowerCase())
    const matchWarranty = !restrictWarrantyStaff || allowedStaffIds.includes(k.id)
    return matchSearch && matchWarranty
  })

  const handleSave = async () => {
    if (restrictWarrantyStaff && selectedKtv?.id && !allowedStaffIds.includes(selectedKtv.id)) {
      alert('Gói bảo hành này chỉ được chọn nhân viên đã nhận tiền tour trong 10 buổi đầu.')
      return
    }
    setSaving(true)
    await onAssign(item, selectedKtv, tiLe, tienTour, {
      tourMode: isFreeWarrantyTour ? 'free_warranty' : (fixedKtvRule ? 'amount' : tourMode),
      manualTourAmount,
      pctTour,
      baseTienTour,
      treatmentPolicy,
    })
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink3)', lineHeight: 1 }}>x</button>
        </div>

        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <input placeholder="Tìm nhân viên..." value={ktvSearch} onChange={e => setKtvSearch(e.target.value)}
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
              {shortName(selectedKtv.ho_ten)} - {incomeLabel}
              {loadingRate && <span style={{ fontWeight: 400, color: 'var(--ink3)', marginLeft: 6 }}>(đang tải tỷ lệ...)</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[
                ['amount', 'Nhập tiền'],
                ['pct', 'Theo %'],
              ].map(([mode, label]) => {
                const active = tourMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => !fixedKtvRule && !isFreeWarrantyTour && setTourMode(mode)}
                    disabled={!!fixedKtvRule || isFreeWarrantyTour}
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: 8,
                      border: `1px solid ${active ? 'var(--champagne)' : 'var(--bord)'}`,
                      background: active ? 'rgba(201,169,110,.16)' : '#fff',
                      color: active ? 'var(--ink)' : 'var(--ink3)',
                      cursor: fixedKtvRule || isFreeWarrantyTour ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'var(--sans)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {isFreeWarrantyTour && (
              <div style={{ fontSize: 11, color: '#2D7A4F', marginBottom: 8 }}>
                Gói bảo hành triệt lông sau {treatmentPolicy?.tourLimit || 10} buổi: không tính tiền tour.
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {tourMode === 'amount' || fixedKtvRule || isFreeWarrantyTour ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink3)' }}>Số tiền</span>
                  <input
                    value={isFreeWarrantyTour ? '0' : fixedKtvRule ? fmtInput(absoluteRuleTour) : manualTourInput}
                    onChange={e => setManualTourInput(fmtInput(parseVND(e.target.value)))}
                    disabled={!!fixedKtvRule || isFreeWarrantyTour}
                    style={{ width: 110, border: '1px solid var(--bord)', borderRadius: 6, padding: '4px 6px', fontSize: 13, fontWeight: 700, textAlign: 'right', outline: 'none', background: fixedKtvRule || isFreeWarrantyTour ? 'rgba(0,0,0,.04)' : '#fff' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--ink3)' }}>đ</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink3)' }}>Tỷ lệ</span>
                  <input value={tiLe} onChange={e => setTiLe(parseFloat(e.target.value) || 0)}
                    style={{ width: 50, border: '1px solid var(--bord)', borderRadius: 6, padding: '4px 6px', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
                  <span style={{ fontSize: 12, color: 'var(--ink3)' }}>%</span>
                </div>
              )}
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
              {saving ? 'Đang lưu...' : loadingRate ? 'Đang tải...' : 'Lưu'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
