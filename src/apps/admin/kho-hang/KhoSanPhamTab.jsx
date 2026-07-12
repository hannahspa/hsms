// ═══════════════════════════════════════════════════════════════════════════
// Kho Hàng — Tab Sản Phẩm + Form thêm/sửa sản phẩm
// Tách từ AdminKhoHangPage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { DANH_MUC_LIST, DON_VI_LIST, LOAI_SP, ZoomImg, fmt, fmtMoneyShort, fmtSL, fmtTonQD, suyDanhMuc, inp, lbl, moneyFmt, moneyRaw, uploadAnhSP } from './khoShared'

// FORM SẢN PHẨM
// ══════════════════════════════════════════════════════════════════════════════
export function FormSanPham({ initial, products, onSave, onClose }) {
  const isEdit = !!initial?.id
  const [f, setF] = useState({
    ma_sp: initial?.ma_sp || '',
    sku: initial?.sku || '',
    barcode: initial?.barcode || '',
    ten: initial?.ten || '',
    loai: initial?.loai || 'tieu_hao',
    nhan_hieu: initial?.nhan_hieu || '',
    danh_muc: initial?.danh_muc || '',
    don_vi: DON_VI_LIST.includes(initial?.don_vi) ? (initial?.don_vi || 'cái') : '__custom',
    don_vi_custom: DON_VI_LIST.includes(initial?.don_vi) ? '' : (initial?.don_vi || ''),
    don_vi_nhap: initial?.don_vi_nhap || '',
    quy_doi: initial?.quy_doi || 1,
    anh_url: initial?.anh_url || '',
    mo_ta: initial?.mo_ta || '',
    gia_nhap: initial?.gia_nhap ? Math.round(initial.gia_nhap * (initial?.quy_doi || 1)) : '',  // hiển thị theo đơn vị nhập
    gia_ban: initial?.gia_ban || '',
    gia_uu_dai: initial?.gia_uu_dai || '',
    gia_uu_dai_ecommerce: initial?.gia_uu_dai_ecommerce || '',
    ton_kho: initial?.ton_kho ?? '',
    canh_bao_ton: initial?.canh_bao_ton ?? 5,
    hien_tren_pos: initial?.hien_tren_pos ?? true,
    hoa_hong_kieu: initial?.hoa_hong_kieu || 'none',
    ti_le_hoa_hong: initial?.ti_le_hoa_hong || '',
    tien_hoa_hong: initial?.tien_hoa_hong || '',
    co_the_chiet: initial?.co_the_chiet || false,
    san_pham_chiet_id: initial?.san_pham_chiet_id || '',
    he_so_chiet: initial?.he_so_chiet || 1,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [canKhoPct, setCanKhoPct] = useState('')   // % còn lại để cân kho 1 lần
  const [err, setErr] = useState('')
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const handleUploadAnh = async (file) => {
    if (!file) return
    setUploading(true); setErr('')
    try {
      const url = await uploadAnhSP(file)   // tự nén trước khi upload
      set('anh_url', url)
    } catch (e) { setErr('Lỗi tải ảnh: ' + e.message) }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!f.ten.trim()) return setErr('Nhập tên sản phẩm')
    const dv = f.don_vi === '__custom' ? f.don_vi_custom.trim() : f.don_vi
    if (!dv) return setErr('Chọn đơn vị tính')
    setSaving(true); setErr('')
    const qd = +f.quy_doi || 1
    const giaNhapCoSo = Math.round((+f.gia_nhap || 0) / qd)  // giá / 1 đơn vị cơ sở
    const payload = {
      ten: f.ten.trim(), loai: f.loai, don_vi: dv,
      mo_ta: f.mo_ta.trim(),
      gia_nhap: giaNhapCoSo, gia_ban: +f.gia_ban || 0,
      canh_bao_ton: +f.canh_bao_ton || 0,
      co_the_chiet: f.co_the_chiet,
      san_pham_chiet_id: f.co_the_chiet && f.san_pham_chiet_id ? f.san_pham_chiet_id : null,
      he_so_chiet: f.co_the_chiet ? +f.he_so_chiet || 1 : 1,
    }
    const extendedPayload = {
      ...payload,
      ma_sp: f.ma_sp.trim() || (isEdit ? null : nextMa),
      sku: f.sku.trim() || null,
      barcode: f.barcode.trim() || null,
      nhan_hieu: f.nhan_hieu.trim() || null,
      danh_muc: f.danh_muc.trim() || null,
      don_vi_nhap: f.don_vi_nhap.trim() || null,
      quy_doi: +f.quy_doi || 1,
      anh_url: f.anh_url || null,
      gia_uu_dai: +f.gia_uu_dai || 0,
      gia_uu_dai_ecommerce: +f.gia_uu_dai_ecommerce || 0,
      hien_tren_pos: f.loai === 'ban_khach' ? true : !!f.hien_tren_pos,
      hoa_hong_kieu: f.hoa_hong_kieu || 'none',
      ti_le_hoa_hong: +f.ti_le_hoa_hong || 0,
      tien_hoa_hong: +f.tien_hoa_hong || 0,
    }
    // Tồn ban đầu: nếu có quy đổi → nhập theo đơn vị mua (hũ) → ×quy_doi ra đơn vị cơ sở
    const _qd = +f.quy_doi || 1
    const _hasQD = _qd > 1 && f.don_vi_nhap.trim()
    const tonBanDau = _hasQD ? (+f.ton_kho || 0) * _qd : (+f.ton_kho || 0)
    if (!isEdit) payload.ton_kho = tonBanDau
    if (!isEdit) extendedPayload.ton_kho = tonBanDau
    if (!isEdit) extendedPayload.ton_dinh_muc = tonBanDau   // mốc 100% ban đầu
    // Cân kho % (1 lần) cho tiêu hao/vật tư → đặt tồn = % của định mức, rồi khoá
    if (isEdit && !initial?.da_can_kho && (f.loai === 'tieu_hao' || f.loai === 'vat_tu') && canKhoPct !== '') {
      const pct = Math.max(0, Math.min(100, +canKhoPct || 0))
      // Mốc 100% = 1 đơn vị mua (quy đổi) nếu có; nếu không thì định mức/tồn cũ
      const base = _hasQD ? _qd : (Number(initial?.ton_dinh_muc) || Number(initial?.ton_kho) || 1)
      extendedPayload.ton_kho = Math.round(base * pct / 100 * 100) / 100
      extendedPayload.ton_dinh_muc = base
      extendedPayload.da_can_kho = true
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('kho_san_pham').update(extendedPayload).eq('id', initial.id))
      if (error?.code === 'PGRST204' || error?.message?.includes('column')) {
        ;({ error } = await supabase.from('kho_san_pham').update(payload).eq('id', initial.id))
      }
    } else {
      ;({ error } = await supabase.from('kho_san_pham').insert(extendedPayload))
      if (error?.code === 'PGRST204' || error?.message?.includes('column')) {
        ;({ error } = await supabase.from('kho_san_pham').insert(payload))
      }
    }
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  // Mã SP tự động: SP-xxxxx = (mã lớn nhất hiện có) + 1
  const maxMa = products.reduce((m, p) => {
    const n = parseInt(String(p.ma_sp || '').replace(/\D/g, ''), 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  const nextMa = `SP-${String(maxMa + 1).padStart(5, '0')}`
  const maHienThi = isEdit ? (f.ma_sp || '(chưa có)') : nextMa
  // SP có bán cho khách? (Sản phẩm bán, hoặc tiêu hao/vật tư được bật bán)
  const laBan = f.loai === 'ban_khach' || f.hien_tren_pos
  const dvCoSo = f.don_vi === '__custom' ? (f.don_vi_custom || 'đơn vị') : f.don_vi
  const hasQD = Number(f.quy_doi) > 1 && !!f.don_vi_nhap.trim()

  return createPortal((
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--side-w, 248px)',
      background: 'rgba(250,247,244,0.78)', backdropFilter: 'blur(10px)',
      zIndex: 200 }}>
      <div style={{ position: 'absolute', inset: 0, maxWidth: '100vw', background: 'white',
        overflow: 'auto', borderLeft: `1px solid ${COLORS.border}`,
        boxShadow: '-6px 0 40px rgba(139,94,60,0.25)', animation: 'rpSlideIn .22s ease' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '18px 18px 0 0', position: 'sticky', top: 0, zIndex: 2 }}>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>
            {isEdit ? '✏️ Sửa sản phẩm' : '➕ Thêm sản phẩm'}
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Thanh % pin — mức tồn còn lại (chỉ tiêu hao/vật tư) */}
          {isEdit && (f.loai === 'tieu_hao' || f.loai === 'vat_tu') && (() => {
            const ton = Number(initial?.ton_kho) || 0
            const dm  = Number(initial?.ton_dinh_muc) || ton || 1
            const pct = Math.max(0, Math.min(100, Math.round(ton / dm * 100)))
            const col = pct <= 15 ? '#C0392B' : pct <= 40 ? '#E67E22' : '#2D7A4F'
            return (
              <div style={{ background: '#FBF7F2', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: COLORS.textSub, letterSpacing: '.03em' }}>🔋 MỨC TỒN CÒN LẠI</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: col }}>{pct}% · {fmtTonQD(initial)}</span>
                </div>
                <div style={{ height: 16, background: '#EFE7DD', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 8, transition: 'width .3s' }} />
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 6 }}>
                  {pct <= 15
                    ? <span style={{ color: '#C0392B', fontWeight: 700 }}>⚠️ Sắp hết — nên nhập thêm</span>
                    : `Đầy 100% = ${fmtSL(dm, initial?.don_vi)} (mức nhập cao nhất)`}
                </div>

                {/* Cân kho %: nhập 1 lần rồi khoá */}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${COLORS.border}` }}>
                  {initial?.da_can_kho ? (
                    <div style={{ fontSize: 12, color: COLORS.textSub, fontWeight: 700 }}>
                      🔒 Đã cân kho — thay đổi tồn qua <b>Nhập / Xuất</b> (không sửa tay)
                    </div>
                  ) : (
                    <>
                      {(() => { const canBase = hasQD ? (+f.quy_doi || 1) : dm; return (<>
                      <label style={{ ...lbl, marginBottom: 4 }}>
                        CÂN KHO — % CÒN LẠI THỰC TẾ {hasQD ? `(100% = 1 ${f.don_vi_nhap} = ${+f.quy_doi || 1} ${dvCoSo})` : ''}
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input style={{ ...inp, width: 110 }} type="number" min="0" max="100"
                          value={canKhoPct} onChange={e => setCanKhoPct(e.target.value)} placeholder="VD: 80" />
                        <span style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary }}>%</span>
                        <span style={{ fontSize: 11, color: COLORS.textMute }}>
                          → tồn = {canKhoPct ? Math.round((canBase * (+canKhoPct || 0) / 100) * 100) / 100 : '…'} {dvCoSo}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#B8791F', marginTop: 5 }}>
                        ⚠️ Nhập đúng % thực tế rồi bấm Lưu → hệ thống <b>khoá lại</b>, sau này chỉ đổi qua Nhập/Xuất (chống thất thoát).
                      </div>
                      </>)})()}
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          <div>
            <label style={lbl}>LOẠI SẢN PHẨM</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(LOAI_SP).map(([k, v]) => (
                <button key={k} onClick={() => set('loai', k)}
                  style={{ flex: 1, minWidth: 0, height: 56, padding: '0 12px',
                    borderRadius: '10px',
                    border: f.loai === k ? 'none' : `1px solid ${COLORS.border}`,
                    cursor: 'pointer', fontSize: '12px', fontWeight: '800',
                    background: f.loai === k ? COLORS.grad : COLORS.bg,
                    color: f.loai === k ? 'white' : COLORS.textSub,
                    boxShadow: f.loai === k ? '0 8px 20px rgba(160,113,79,0.18)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{v.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>TÊN SẢN PHẨM *</label>
            <input style={inp} value={f.ten} onChange={e => set('ten', e.target.value)}
              placeholder="VD: Dầu massage Body, Bông tẩy trang..." />
          </div>

          <div>
            <label style={lbl}>ẢNH SẢN PHẨM</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {f.anh_url ? (
                <ZoomImg src={f.anh_url} size={64} radius={10} alt={f.ten} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 10, background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: COLORS.textMute }}>📷</div>
              )}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                  background: COLORS.grad, color: 'white', borderRadius: 10, fontWeight: 800, fontSize: 12.5,
                  cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                  📷 {uploading ? 'Đang tải...' : f.anh_url ? 'Đổi ảnh' : 'Tải ảnh lên'}
                  <input type="file" accept="image/*" disabled={uploading}
                    onChange={e => handleUploadAnh(e.target.files?.[0])} style={{ display: 'none' }} />
                </label>
                {f.anh_url && !uploading && (
                  <button type="button" onClick={() => set('anh_url', '')}
                    style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '9px 16px', background: '#FDECEA', color: '#C0392B',
                      border: '1px solid #F5C6C0', borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
                    🗑 Xóa ảnh
                  </button>
                )}
                <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 5 }}>Ảnh tự nén nhẹ trước khi tải · JPG/PNG</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>MÃ SP (tự động)</label>
              <input style={{ ...inp, background: '#F4F1ED', color: COLORS.textSub, fontWeight: 700 }}
                value={maHienThi} readOnly title="Mã tự sinh, không cần nhập" />
            </div>
            <div>
              <label style={lbl}>SKU</label>
              <input style={inp} value={f.sku} onChange={e => set('sku', e.target.value)}
                placeholder="SKU" />
            </div>
            <div>
              <label style={lbl}>BARCODE</label>
              <input style={inp} value={f.barcode} onChange={e => set('barcode', e.target.value)}
                placeholder="Barcode" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>NHÃN HIỆU</label>
              <input style={inp} value={f.nhan_hieu} onChange={e => set('nhan_hieu', e.target.value)}
                placeholder="VD: Fino, Hannah Spa..." />
            </div>
            <div>
              <label style={lbl}>DANH MỤC</label>
              <select style={inp} value={f.danh_muc} onChange={e => set('danh_muc', e.target.value)}>
                <option value="">— Chọn danh mục —</option>
                {DANH_MUC_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                {f.danh_muc && !DANH_MUC_LIST.includes(f.danh_muc) && <option value={f.danh_muc}>{f.danh_muc} (cũ)</option>}
              </select>
              {suyDanhMuc(f.ten) && suyDanhMuc(f.ten) !== f.danh_muc && (
                <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 4 }}>
                  Gợi ý: <button type="button" onClick={() => set('danh_muc', suyDanhMuc(f.ten))}
                    style={{ background: '#FDF8F1', border: `1px solid ${COLORS.border}`, color: COLORS.primary,
                      borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {suyDanhMuc(f.ten)} ✓
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={lbl}>ĐƠN VỊ TÍNH *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select style={{ ...inp, flex: 1 }} value={f.don_vi}
                onChange={e => { set('don_vi', e.target.value); if (e.target.value !== '__custom') set('don_vi_custom', '') }}>
                {DON_VI_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                <option value="__custom">Nhập tùy chọn...</option>
              </select>
              {f.don_vi === '__custom' && (
                <input style={{ ...inp, flex: 1 }} placeholder="VD: viên, ống, set..."
                  value={f.don_vi_custom} onChange={e => set('don_vi_custom', e.target.value)} />
              )}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '4px' }}>
              Đơn vị nhỏ nhất để theo dõi tồn + xuất (gram, miếng, ml...)
            </div>
          </div>

          {/* Quy cách đóng gói — chỉ cho tiêu hao/vật tư (bán khách bán nguyên, không quy đổi) */}
          {f.loai !== 'ban_khach' && (() => { const dvCoSo = f.don_vi === '__custom' ? (f.don_vi_custom || 'đơn vị') : f.don_vi; return (
          <div style={{ background: '#FDF8F1', borderRadius: '12px', padding: '14px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.primary, marginBottom: '4px' }}>
              📦 Quy cách đóng gói (giúp hệ thống tự tính tồn kho)
            </div>
            <div style={{ fontSize: '11.5px', color: COLORS.textSub, marginBottom: '10px', lineHeight: 1.5 }}>
              Mua theo <b>đơn vị lớn</b> (túi/hộp/chai) nhưng dùng theo <b>{dvCoSo}</b>. Khai 1 lần,
              hệ thống tự đổi: nhập theo túi/hộp → tự thành {dvCoSo}; xuất {dvCoSo} → tự trừ.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>① ĐƠN VỊ MUA VÀO</label>
                <input style={inp} value={f.don_vi_nhap} onChange={e => set('don_vi_nhap', e.target.value)}
                  placeholder="VD: túi / hộp / chai / lốc" />
              </div>
              <div>
                <label style={lbl}>② 1 {f.don_vi_nhap || 'đơn vị mua'} CHỨA MẤY {dvCoSo.toUpperCase()}?</label>
                <input style={inp} type="number" step="0.01" min="1" value={f.quy_doi}
                  onChange={e => set('quy_doi', e.target.value)} placeholder="VD: 700" />
              </div>
            </div>
            <div style={{ fontSize: '11.5px', color: '#2D7A4F', background: '#EAF4EA', border: '1px solid #BCDCBC',
              borderRadius: 8, padding: '8px 10px', marginTop: '8px', lineHeight: 1.55 }}>
              💡 <b>Ví dụ:</b> 1 túi nạ nặng 700 gram → ô ① ghi <b>"túi"</b>, ô ② ghi <b>700</b>.<br/>
              → Nhập 2 túi = kho có <b>1400 gram</b>. Xuất 50 gram → còn <b>1350 gram</b>.<br/>
              <span style={{ color: COLORS.textMute }}>Nếu bán/dùng nguyên đơn vị (vd chai dầu gội bán cả chai) → bỏ trống mục này.</span>
            </div>
          </div>
          )})()}

          {/* GIÁ NHẬP — luôn có (để tính chi phí + giá trị tồn) */}
          <div>
            <label style={lbl}>GIÁ NHẬP {Number(f.quy_doi) > 1 && f.don_vi_nhap ? `(/${f.don_vi_nhap})` : ''}</label>
            <input style={inp} type="text" inputMode="numeric" value={moneyFmt(f.gia_nhap)}
              onChange={e => set('gia_nhap', moneyRaw(e.target.value))} placeholder="0₫" />
            <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 4 }}>Dùng để tính chi phí + giá trị tồn kho (mọi sản phẩm nên có).</div>
          </div>

          {/* Tiêu hao/vật tư: bật nếu cũng bán cho khách */}
          {f.loai !== 'ban_khach' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700,
              color: COLORS.textSub, cursor: 'pointer', background: '#FBF7F2', border: `1px solid ${COLORS.border}`,
              borderRadius: 10, padding: '11px 13px' }}>
              <input type="checkbox" checked={f.hien_tren_pos} onChange={e => set('hien_tren_pos', e.target.checked)} />
              🛒 Sản phẩm này cũng <b>&nbsp;bán cho khách&nbsp;</b> (hiện trên POS + nhập giá bán)
            </label>
          )}

          {/* Giá bán — chỉ khi SP có bán */}
          {laBan && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>GIÁ BÁN</label>
                <input style={inp} type="text" inputMode="numeric" value={moneyFmt(f.gia_ban)}
                  onChange={e => set('gia_ban', moneyRaw(e.target.value))} placeholder="0₫" />
              </div>
              <div>
                <label style={lbl}>GIÁ ƯU ĐÃI</label>
                <input style={inp} type="text" inputMode="numeric" value={moneyFmt(f.gia_uu_dai)}
                  onChange={e => set('gia_uu_dai', moneyRaw(e.target.value))} placeholder="0₫" />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>TỒN KHO {isEdit ? 'HIỆN TẠI' : `BAN ĐẦU ${hasQD ? `(số ${f.don_vi_nhap})` : `(${dvCoSo})`}`}</label>
              {isEdit ? (
                <>
                  <input style={{ ...inp, background: '#F4F1ED', color: COLORS.textSub, fontWeight: 700 }}
                    value={fmtTonQD(initial)} readOnly />
                  <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '3px' }}>
                    Dùng tab Nhập/Xuất để thay đổi
                  </div>
                </>
              ) : (
                <>
                  <input style={inp} type="number" step="0.1" value={f.ton_kho}
                    onChange={e => set('ton_kho', e.target.value)} placeholder="0" />
                  {hasQD && +f.ton_kho > 0 && (
                    <div style={{ fontSize: '11px', color: '#2D7A4F', marginTop: '3px', fontWeight: 700 }}>
                      = {(+f.ton_kho) * (+f.quy_doi || 1)} {dvCoSo}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label style={lbl}>CẢNH BÁO KHI TỒN ≤</label>
              <input style={inp} type="number" step="0.1" value={f.canh_bao_ton}
                onChange={e => set('canh_bao_ton', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>MÔ TẢ (tùy chọn)</label>
            <textarea style={{ ...inp, height: '60px', resize: 'vertical' }}
              value={f.mo_ta} onChange={e => set('mo_ta', e.target.value)} />
          </div>

          {laBan && (
          <div style={{ background: '#FDF8F1', borderRadius: '12px', padding: '14px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontWeight: '800', fontSize: '13px', color: COLORS.primary }}>Hoa hồng bán sản phẩm</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>KIỂU HOA HỒNG</label>
                <select style={inp} value={f.hoa_hong_kieu} onChange={e => set('hoa_hong_kieu', e.target.value)}>
                  <option value="none">Không tính</option>
                  <option value="percent">% doanh thu sản phẩm</option>
                  <option value="fixed">Số tiền cố định</option>
                </select>
              </div>
              <div>
                <label style={lbl}>{f.hoa_hong_kieu === 'fixed' ? 'TIỀN HOA HỒNG' : 'TỈ LỆ HOA HỒNG (%)'}</label>
                <input style={inp} type="number"
                  value={f.hoa_hong_kieu === 'fixed' ? f.tien_hoa_hong : f.ti_le_hoa_hong}
                  onChange={e => f.hoa_hong_kieu === 'fixed'
                    ? set('tien_hoa_hong', e.target.value)
                    : set('ti_le_hoa_hong', e.target.value)}
                  disabled={f.hoa_hong_kieu === 'none'} placeholder="0" />
              </div>
            </div>
          </div>
          )}

          {err && (
            <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>⚠️ {err}</div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '13px', background: 'white', border: `1px solid ${COLORS.border}`,
                borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', color: COLORS.textSub }}>
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '13px', background: COLORS.grad, color: 'white',
                border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px',
                cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : isEdit ? '💾 Lưu' : '✅ Thêm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body)
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: SẢN PHẨM
// ══════════════════════════════════════════════════════════════════════════════
export function TabSanPham({ products, onReload, showToast }) {
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [search, setSearch]     = useState('')

  const filtered = products.filter(p => {
    if (!p.is_active) return false
    if (filter !== 'all' && p.loai !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const haystack = [p.ten, p.ma_sp, p.sku, p.barcode, p.nhan_hieu, p.danh_muc]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    const ac = a.ma_sp || ''
    const bc = b.ma_sp || ''
    if (ac && bc) return bc.localeCompare(ac, 'vi', { numeric: true })
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })

  const handleToggleActive = async (p) => {
    const { error } = await supabase.from('kho_san_pham').update({ is_active: false }).eq('id', p.id)
    if (error) return showToast('❌ ' + error.message)
    showToast('🗑 Đã ẩn sản phẩm')
    onReload()
  }

  return (
    <div>
      {/* Header dính — search + filter cố định khi trượt danh sách */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: COLORS.bg,
        paddingBottom: '12px', marginBottom: '2px', boxShadow: `0 6px 8px -6px rgba(139,94,60,0.12)` }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input style={{ ...inp, flex: 1, padding: '9px 14px' }}
            placeholder="🔍 Tìm sản phẩm..." value={search}
            onChange={e => setSearch(e.target.value)} />
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            style={{ padding: '9px 18px', background: COLORS.grad, color: 'white', border: 'none',
              borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Thêm
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[['all', '📦 Tất cả'], ...Object.entries(LOAI_SP).map(([k, v]) => [k, `${v.icon} ${v.label}`])]
            .map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                  fontWeight: '700', fontSize: '12px',
                  background: filter === k ? COLORS.primary : 'white',
                  color: filter === k ? 'white' : COLORS.textSub,
                  boxShadow: COLORS.shadow }}>
                {l} ({k === 'all' ? products.filter(p => p.is_active).length
                  : products.filter(p => p.is_active && p.loai === k).length})
              </button>
            ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${COLORS.border}`,
        boxShadow: COLORS.shadow, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div>Chưa có sản phẩm nào</div>
          </div>
        ) : (
          <div>
            {filtered.map(p => {
              const loai = LOAI_SP[p.loai] || {}
              const warn = Number(p.ton_kho) <= Number(p.canh_bao_ton) && Number(p.canh_bao_ton) > 0
              const commission = p.hoa_hong_kieu === 'fixed'
                ? fmt(p.tien_hoa_hong)
                : p.hoa_hong_kieu === 'percent' && Number(p.ti_le_hoa_hong) > 0 ? `${p.ti_le_hoa_hong}%` : ''
              return (
                <div key={p.id} onClick={() => { setEditing(p); setShowForm(true) }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                    borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', transition: 'background .12s' }}>
                  {p.anh_url ? (
                    <ZoomImg src={p.anh_url} size={42} radius={9} alt={p.ten} />
                  ) : (
                    <div style={{ width: 42, height: 42, borderRadius: 9, background: loai.bg, color: loai.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{loai.icon}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: COLORS.text, fontSize: 13.5, lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ten}</div>
                    <div style={{ fontSize: 11.5, color: COLORS.textMute, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loai.label} · {p.don_vi}
                      {p.danh_muc ? ` · ${p.danh_muc}` : ''}
                      {p.nhan_hieu ? ` · ${p.nhan_hieu}` : ''}
                      {commission ? ` · HH ${commission}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 110 }}>
                    <div style={{ fontWeight: 800, fontSize: 12.5,
                      color: Number(p.ton_kho) <= 0 ? '#C0392B' : warn ? '#E67E22' : '#2D7A4F' }}>
                      {fmtTonQD(p)}
                    </div>
                    {p.loai === 'ban_khach' && <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary }}>{fmtMoneyShort(p.gia_ban)}</div>}
                  </div>
                  <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
                    background: p.hien_tren_pos === false ? '#F4F1ED' : '#E8F5E9',
                    color: p.hien_tren_pos === false ? COLORS.textMute : '#2D7A4F' }}>
                    ● {p.hien_tren_pos === false ? 'Ẩn POS' : 'POS'}
                  </span>
                  <button onClick={e => { e.stopPropagation(); handleToggleActive(p) }}
                    title="Ẩn sản phẩm"
                    style={{ flexShrink: 0, width: 30, height: 30, background: '#FDECEA', border: '1px solid #FADBD8',
                      borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#C0392B' }}>✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <FormSanPham
          initial={editing}
          products={products.filter(p => p.is_active)}
          onSave={() => { setShowForm(false); onReload(); showToast('✅ Đã lưu!') }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
