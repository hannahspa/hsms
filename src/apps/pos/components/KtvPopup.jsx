import { useEffect, useState } from 'react'
import { posService } from '../../../services/posService'
import { formatCurrency } from '../../../lib/utils'
import { getCardComboService } from '../../../lib/treatmentCardPolicy'
import { notify } from '../../../components/ui/notify'
import { C } from '../../../constants/colors'
import RightPanel from '../../../components/shared/RightPanel'
import { fmtInput, NvAvatar, parseVND, shortName } from '../posShared'

export default function KtvPopup({ item, ktvList, onAssign, onClose, isAdmin = false }) {
  const isTheLT = item.loai_item === 'the_lieu_trinh'
  const isSaleCommission = item.loai_item === 'the_moi' || item.loai_item === 'san_pham'
  const name = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || '-'
  const comboService = item.meta?.comboService || getCardComboService(item.the_lieu_trinh || {})
  const treatmentPolicy = item.meta?.treatmentPolicy || null
  const initTiLe = item.ti_le_hoa_hong || item.dich_vu?.ti_le_hoa_hong || comboService?.ti_le_hoa_hong || 0
  const fixedKtvRule = item.meta?.myspaCommission?.ktv?.type === 'absolute' ? item.meta.myspaCommission.ktv : null
  const isFreeWarrantyTour = !!treatmentPolicy?.isFreeWarrantySession
  const initManualTour = Math.round(Number(item.tien_tour || treatmentPolicy?.suggestedTour || 0))

  // PHÒNG THỦ (bug mất tour 02/07): item.nhan_vien join từ DB từng THIẾU id →
  // lưu popup làm nhan_vien_id thành null (KTV mất tour âm thầm dù chip vẫn hiện tên).
  // Bổ sung id từ item.nhan_vien_id nếu object thiếu.
  const [selectedKtv, setSelectedKtv] = useState(
    item.nhan_vien
      ? { ...item.nhan_vien, id: item.nhan_vien.id ?? item.nhan_vien_id ?? null }
      : null
  )
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

  // ── Chia tiền tour cho nhiều KTV (chỉ dịch vụ/thẻ liệu trình, không áp hoa hồng bán) ──
  const [splits, setSplits] = useState(() =>
    (item.meta?.tourSplits || []).map(s => ({ nvId: s.nvId, ho_ten: s.ho_ten, tien: Number(s.tien_tour || 0) }))
  )
  const [addingSplit, setAddingSplit] = useState(false)

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
  // Admin: được sửa tự do tiền tour (bỏ khóa quy tắc cố định). Giữ khóa gói bảo hành 0đ.
  const tourLocked = !isAdmin && !!fixedKtvRule
  const tienTour = isFreeWarrantyTour
    ? 0
    : (tourLocked && !isSaleCommission)
      ? absoluteRuleTour
      : tourMode === 'amount'
        ? manualTourAmount
        : pctTour
  const incomeLabel = isSaleCommission ? 'Hoa hồng bán' : 'Tiền Tour'
  // Chia tour: chỉ cho dịch vụ/thẻ LT (có tiền tour), không cho gói bảo hành 0đ / bán thẻ-SP
  const canSplit = !isSaleCommission && !isFreeWarrantyTour
  const splitSum = splits.reduce((s, r) => s + Math.round(Number(r.tien) || 0), 0)
  const ktv1Net = Math.max(0, tienTour - splitSum)
  const splitOver = splitSum > tienTour
  const availableForSplit = ktvList.filter(k =>
    k.id !== selectedKtv?.id && !splits.some(s => s.nvId === k.id)
  )
  const addSplit = (k) => {
    setSplits(prev => [...prev, { nvId: k.id, ho_ten: k.ho_ten, tien: 0 }])
    setAddingSplit(false)
  }
  const updateSplit = (nvId, tien) => setSplits(prev => prev.map(s => s.nvId === nvId ? { ...s, tien } : s))
  const removeSplit = (nvId) => setSplits(prev => prev.filter(s => s.nvId !== nvId))
  const allowedStaffIds = Array.isArray(treatmentPolicy?.allowedStaffIds) ? treatmentPolicy.allowedStaffIds : []
  const restrictWarrantyStaff = isFreeWarrantyTour && allowedStaffIds.length > 0
  const filtered = ktvList.filter(k => {
    const matchSearch = !ktvSearch || k.ho_ten.toLowerCase().includes(ktvSearch.toLowerCase())
    const matchWarranty = !restrictWarrantyStaff || allowedStaffIds.includes(k.id)
    return matchSearch && matchWarranty
  })

  // TRẦN tiền tour cho Lễ tân (anh Nam 12/07: "đơn 1tr stick 300k là vô lý — chặn"):
  // tối đa 10% giá trị dịch vụ, sàn 50k để không phá dịch vụ giá rẻ có tour cố định.
  // Admin không giới hạn (xử ngoại lệ). DV có mức cố định thì đã tourLocked sẵn.
  const tourCeiling = Math.max(Math.round(baseTienTour * 0.10), 50000)
  const overCeiling = !isAdmin && !isSaleCommission && !isFreeWarrantyTour && !tourLocked && tienTour > tourCeiling

  const handleSave = async () => {
    if (restrictWarrantyStaff && selectedKtv?.id && !allowedStaffIds.includes(selectedKtv.id)) {
      notify('Gói bảo hành này chỉ được chọn nhân viên đã nhận tiền tour trong 10 buổi đầu.', 'warn')
      return
    }
    if (overCeiling) {
      notify(`Tiền tour ${formatCurrency(tienTour)} vượt mức quy định (tối đa ${formatCurrency(tourCeiling)} cho dịch vụ này). Nhập lại đúng quy định — cần ngoại lệ thì báo Admin.`, 'warn')
      return
    }
    if (canSplit && splitOver) {
      notify('Tổng tiền chia cho các KTV vượt quá tiền tour của dịch vụ.', 'warn')
      return
    }
    const cleanSplits = canSplit
      ? splits.filter(s => s.nvId && Math.round(Number(s.tien) || 0) > 0)
          .map(s => ({ nvId: s.nvId, ho_ten: s.ho_ten, tien_tour: Math.round(Number(s.tien) || 0) }))
      : []
    setSaving(true)
    // KTV chính nhận phần còn lại (tổng tour − các phần chia). Không chia → nhận trọn.
    await onAssign(item, selectedKtv, tiLe, cleanSplits.length ? ktv1Net : tienTour, {
      tourMode: isFreeWarrantyTour ? 'free_warranty' : (tourLocked ? 'amount' : tourMode),
      manualTourAmount,
      pctTour,
      baseTienTour,
      treatmentPolicy,
      tourSplits: cleanSplits.length ? cleanSplits : null,
    })
    setSaving(false)
  }

  return (
    <RightPanel open onClose={onClose} zIndex={999}
      title="Chọn Kỹ Thuật Viên" subtitle={name}
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, border: '1px solid var(--bord)', borderRadius: 8, background: '#fff', color: 'var(--ink2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)' }}>Đóng</button>
          {selectedKtv && (
            <button onClick={handleSave} disabled={saving || loadingRate || (canSplit && splitOver)} style={{
              flex: 2, height: 40, border: 'none', borderRadius: 8,
              background: (loadingRate || (canSplit && splitOver)) ? C.line2 : 'var(--champagne)',
              color: (loadingRate || (canSplit && splitOver)) ? C.ink3 : '#2a1d14',
              cursor: (saving || loadingRate || (canSplit && splitOver)) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)',
            }}>
              {saving ? 'Đang lưu...' : loadingRate ? 'Đang tải...' : 'Lưu'}
            </button>
          )}
        </div>
      }>
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
                    onClick={() => !tourLocked && !isFreeWarrantyTour && setTourMode(mode)}
                    disabled={tourLocked || isFreeWarrantyTour}
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: 8,
                      border: `1px solid ${active ? 'var(--champagne)' : 'var(--bord)'}`,
                      background: active ? 'rgba(201,169,110,.16)' : '#fff',
                      color: active ? 'var(--ink)' : 'var(--ink3)',
                      cursor: tourLocked || isFreeWarrantyTour ? 'not-allowed' : 'pointer',
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
              {tourMode === 'amount' || tourLocked || isFreeWarrantyTour ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink3)' }}>Số tiền</span>
                  <input
                    value={isFreeWarrantyTour ? '0' : tourLocked ? fmtInput(absoluteRuleTour) : manualTourInput}
                    onChange={e => setManualTourInput(fmtInput(parseVND(e.target.value)))}
                    disabled={tourLocked || isFreeWarrantyTour}
                    style={{ width: 110, border: '1px solid var(--bord)', borderRadius: 6, padding: '4px 6px', fontSize: 13, fontWeight: 700, textAlign: 'right', outline: 'none', background: tourLocked || isFreeWarrantyTour ? 'rgba(0,0,0,.04)' : '#fff' }}
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
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--serif)', color: overCeiling ? '#C0392B' : 'var(--champagne)' }}>{formatCurrency(tienTour)}</div>
              </div>
            </div>

            {/* Chặn tour vượt quy định (Lễ tân) — anh Nam 12/07 */}
            {overCeiling && (
              <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: '#C0392B', background: '#fdecea', border: '1px solid rgba(192,57,43,.35)', borderRadius: 8, padding: '7px 10px' }}>
                ⛔ Vượt mức quy định — tối đa {formatCurrency(tourCeiling)} cho dịch vụ này. Không lưu được; cần ngoại lệ thì báo Admin.
              </div>
            )}

            {/* ── Chia tiền tour cho KTV khác (nhiều KTV cùng làm 1 dịch vụ) ── */}
            {canSplit && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--bord)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)' }}>Chia tour cho KTV khác</span>
                  <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Tổng tour: {formatCurrency(tienTour)}</span>
                </div>

                {/* KTV chính nhận phần còn lại */}
                {splits.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 8, background: 'rgba(201,169,110,.10)', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{shortName(selectedKtv.ho_ten)} <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(chính)</span></span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--serif)', color: splitOver ? '#C0392B' : 'var(--champagne)' }}>{formatCurrency(ktv1Net)}</span>
                  </div>
                )}

                {splits.map(s => (
                  <div key={s.nvId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(s.ho_ten)}</span>
                    <input
                      value={s.tien ? fmtInput(s.tien) : ''}
                      onChange={e => updateSplit(s.nvId, parseVND(e.target.value))}
                      placeholder="0"
                      style={{ width: 100, border: '1px solid var(--bord)', borderRadius: 6, padding: '4px 6px', fontSize: 13, fontWeight: 700, textAlign: 'right', outline: 'none' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--ink3)' }}>đ</span>
                    <button type="button" onClick={() => removeSplit(s.nvId)} style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 2px' }}>×</button>
                  </div>
                ))}

                {splitOver && (
                  <div style={{ fontSize: 11, color: '#C0392B', fontWeight: 600, marginBottom: 6 }}>
                    ⚠️ Tổng chia ({formatCurrency(splitSum)}) vượt tiền tour ({formatCurrency(tienTour)}).
                  </div>
                )}

                {addingSplit ? (
                  <div style={{ border: '1px solid var(--bord)', borderRadius: 8, background: '#fff', maxHeight: 160, overflowY: 'auto' }}>
                    {availableForSplit.length === 0 && <div style={{ padding: 10, fontSize: 12, color: 'var(--ink3)', textAlign: 'center' }}>Không còn KTV để thêm</div>}
                    {availableForSplit.map(k => (
                      <div key={k.id} onClick={() => addSplit(k)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}>
                        <NvAvatar nv={k} size={28} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{shortName(k.ho_ten)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button type="button" onClick={() => setAddingSplit(true)}
                    style={{ width: '100%', border: '1px dashed var(--champagne)', borderRadius: 8, background: 'transparent', color: 'var(--champagne)', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '7px 0', fontFamily: 'var(--sans)' }}>
                    + Thêm KTV cùng làm
                  </button>
                )}
              </div>
            )}
          </div>
        )}

    </RightPanel>
  )
}
