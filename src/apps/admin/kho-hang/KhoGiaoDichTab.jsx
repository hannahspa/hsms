// ═══════════════════════════════════════════════════════════════════════════
// Kho Hàng — Tab Giao Dịch (nhập/xuất) + Form + Modal sửa
// Tách từ AdminKhoHangPage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { confirmDialog } from '../../../components/ui/notify'
import { todayISO, getNowVN } from '../../../lib/utils'
import Modal from '../../../components/ui/Modal'
import { DateField, HINH_THUC, LOAI_GD, LOAI_SP, ZoomImg, fmt, fmtSL, fmtTonQD, monthRange, inp, lbl, moneyFmt, moneyRaw, uploadAnhSP } from './khoShared'

// FORM GIAO DỊCH (enhanced: fix dieu_chinh + auto chi_phi)
// ══════════════════════════════════════════════════════════════════════════════
export function FormGiaoDich({ products, userId, danhMucKho, onSave, onClose }) {
  const [f, setF] = useState({
    loai: 'nhap_kho',
    san_pham_id: '',
    so_luong: '',
    gia_don_vi: '',
    ghi_chu: '',
    ngay: todayISO(),
    taoChi: true,
    hinh_thuc: 'tien_mat',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const [ktvList, setKtvList] = useState([])
  const [nguoiNhanId, setNguoiNhanId] = useState('')
  const [anhSP, setAnhSP] = useState('')
  const [uploadingAnh, setUploadingAnh] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleUploadAnhSP = async (file) => {
    if (!file || !f.san_pham_id) return
    setUploadingAnh(true); setErr('')
    try {
      const url = await uploadAnhSP(file)   // tự nén trước khi upload
      await supabase.from('kho_san_pham').update({ anh_url: url }).eq('id', f.san_pham_id)
      setAnhSP(url)
    } catch (e) { setErr('Lỗi tải ảnh: ' + e.message) }
    setUploadingAnh(false)
  }

  useEffect(() => {
    supabase.from('nhan_vien').select('id, ho_ten, vi_tri')
      .eq('trang_thai', 'dang_lam').order('vi_tri').order('ho_ten')
      .then(({ data }) => setKtvList(data || []))
  }, [])

  const loaiOptions = ['nhap_kho', 'xuat_su_dung', 'xuat_ban', 'dieu_chinh', 'tra_nha_cc']
  const sp = products.find(p => p.id === f.san_pham_id)
  const loaiGD = LOAI_GD[f.loai]

  // Quy đổi: chỉ áp dụng khi NHẬP KHO + SP có đơn vị nhập lớn (vd 1 hộp = 10 miếng)
  const qd = (f.loai === 'nhap_kho' && Number(sp?.quy_doi) > 1 && sp?.don_vi_nhap) ? Number(sp.quy_doi) : 1
  const dvInput = qd > 1 ? sp.don_vi_nhap : (sp?.don_vi || '')

  // Tồn sau giao dịch (preview) — quy ra đơn vị cơ sở
  let tonSau = null
  if (sp && f.so_luong) {
    const sl = +f.so_luong
    if (f.loai === 'dieu_chinh') tonSau = sl
    else tonSau = Math.max(0, Number(sp.ton_kho) + loaiGD.sign * sl * qd)
  }

  const tongTien = (sp && f.so_luong && f.gia_don_vi)
    ? +f.so_luong * +f.gia_don_vi : 0

  // Tìm danh_muc phù hợp với loai SP
  const findDanhMuc = (loaiSP) => {
    const names = {
      tieu_hao:  ['MP Tiêu Hao', 'Mỹ Phẩm Tiêu Hao'],
      ban_khach: ['Mỹ Phẩm Bán Khách', 'Bán Khách'],
      vat_tu:    ['VT Tiêu Hao', 'Vật Tư Tiêu Hao', 'DC Tiêu Hao'],
    }
    const keywords = names[loaiSP] || []
    return danhMucKho.find(d => keywords.some(kw => d.ten.includes(kw)))
  }

  const handleSave = async () => {
    if (!f.san_pham_id) return setErr('Chọn sản phẩm')
    const sl = +f.so_luong
    if (!sl || sl <= 0) return setErr('Nhập số lượng hợp lệ (> 0)')

    if (f.loai === 'dieu_chinh' && sl === Number(sp.ton_kho))
      return setErr('Tồn kho không thay đổi')

    if (f.loai === 'xuat_su_dung' && !nguoiNhanId)
      return setErr('Chọn nhân viên nhận để xuất sử dụng')

    if (loaiGD.sign < 0) {
      if (Number(sp.ton_kho) < sl)
        return setErr(`Không đủ tồn! Hiện có: ${fmtSL(sp.ton_kho, sp.don_vi)}`)
    }

    setSaving(true); setErr('')

    // Ghi chú: xuất sử dụng → ghi rõ "Xuất cho <KTV>" để theo dõi
    const nguoiNhan = ktvList.find(k => k.id === nguoiNhanId)
    const ghiChuFinal = (f.loai === 'xuat_su_dung' && nguoiNhan)
      ? `Xuất cho ${nguoiNhan.ho_ten}${f.ghi_chu.trim() ? ' — ' + f.ghi_chu.trim() : ''}`
      : (f.ghi_chu.trim() || (f.loai === 'dieu_chinh'
          ? `Điều chỉnh: ${fmtSL(sp.ton_kho, sp.don_vi)} → ${fmtSL(sl, sp.don_vi)}` : ''))

    // so_luong lưu DB:
    // - dieu_chinh: lưu |delta| (để thỏa CHECK > 0)
    // - các loại khác: lưu sl bình thường
    // Quy đổi ra đơn vị cơ sở (nhập theo đơn vị lớn → nhân quy_doi)
    const slCoSo = sl * qd
    const soLuongDB = f.loai === 'dieu_chinh'
      ? Math.max(0.001, Math.abs(sl - Number(sp.ton_kho)))
      : slCoSo

    const { data: gdNew, error: e1 } = await supabase.from('kho_giao_dich').insert({
      san_pham_id: f.san_pham_id, loai: f.loai, so_luong: soLuongDB,
      gia_don_vi: Math.round((+f.gia_don_vi || 0) / qd),   // đơn giá / đơn vị cơ sở
      ghi_chu: ghiChuFinal,
      ngay: f.ngay, nguoi_thuc_hien: userId || null,
      nhan_vien_nhan_id: (f.loai === 'xuat_su_dung' && nguoiNhanId) ? nguoiNhanId : null,
    }).select('id').single()
    if (e1) { setSaving(false); return setErr(e1.message) }

    // Cập nhật tồn kho (đơn vị cơ sở)
    const tonMoi = f.loai === 'dieu_chinh'
      ? sl
      : Number(sp.ton_kho) + loaiGD.sign * slCoSo
    const updSP = { ton_kho: Math.max(0, tonMoi) }
    // Nhập kho → cập nhật luôn giá nhập/đơn vị cơ sở mới nhất (cho giá trị tồn chính xác)
    if (f.loai === 'nhap_kho' && +f.gia_don_vi) updSP.gia_nhap = Math.round((+f.gia_don_vi || 0) / qd)
    // Nhập kho → nâng "định mức 100%" = mức tồn cao nhất từng đạt (cho thanh % pin)
    if (f.loai === 'nhap_kho') updSP.ton_dinh_muc = Math.max(Number(sp.ton_dinh_muc) || 0, tonMoi)
    const { error: e2 } = await supabase.from('kho_san_pham')
      .update(updSP).eq('id', f.san_pham_id)
    if (e2) { setSaving(false); return setErr(e2.message) }

    // Auto tạo chi_phi khi nhập kho — LINK trực tiếp vào giao dịch kho (1 đầu dữ liệu)
    if (f.loai === 'nhap_kho' && f.taoChi && tongTien > 0) {
      const dm = findDanhMuc(sp.loai)
      if (dm) {
        const { data: cpNew } = await supabase.from('chi_phi').insert({
          ngay: f.ngay, danh_muc_id: dm.id,
          so_tien: tongTien,
          hinh_thuc_thanh_toan: f.hinh_thuc,
          dien_giai: `Nhập kho: ${sp.ten} (${sl} ${dvInput} × ${fmt(+f.gia_don_vi)}${qd > 1 ? ` = ${slCoSo} ${sp.don_vi}` : ''})`,
          nguoi_nhap: userId || null,
        }).select('id').single()
        // Gắn phiếu chi vào giao dịch kho → sửa/xóa kho tự đồng bộ thu chi chính xác
        if (cpNew?.id && gdNew?.id) {
          await supabase.from('kho_giao_dich').update({ lien_quan_id: cpNew.id }).eq('id', gdNew.id)
        }
      }
    }

    setSaving(false)
    onSave()
  }

  return createPortal((
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--side-w, 248px)', background: 'rgba(26,18,9,0.55)', zIndex: 200 }}>
      <div style={{ position: 'absolute', inset: 0, maxWidth: '100vw', background: 'white',
        overflow: 'auto', boxShadow: '-6px 0 40px rgba(0,0,0,0.3)', animation: 'rpSlideIn .22s ease' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0', position: 'sticky', top: 0 }}>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>📥 Nhập / Xuất Kho</div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Loại GD */}
          <div>
            <label style={lbl}>LOẠI GIAO DỊCH</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {loaiOptions.map(k => {
                const gd = LOAI_GD[k]
                return (
                  <button key={k} onClick={() => set('loai', k)}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: 'none',
                      cursor: 'pointer', textAlign: 'left', fontWeight: '700', fontSize: '12px',
                      background: f.loai === k ? gd.color : '#F5F2EF',
                      color: f.loai === k ? 'white' : COLORS.text }}>
                    {gd.icon} {gd.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sản phẩm */}
          <div>
            <label style={lbl}>SẢN PHẨM *</label>
            <select style={inp} value={f.san_pham_id} onChange={e => {
              set('san_pham_id', e.target.value)
              setAnhSP('')
              const p = products.find(x => x.id === e.target.value)
              if (p?.gia_nhap && f.loai === 'nhap_kho') set('gia_don_vi', Math.round(p.gia_nhap * (p.quy_doi || 1)))
            }}>
              <option value="">— Chọn sản phẩm —</option>
              {Object.entries(LOAI_SP).map(([loai, lv]) => (
                <optgroup key={loai} label={`${lv.icon} ${lv.label}`}>
                  {products.filter(p => p.is_active && p.loai === loai).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.ten} (tồn: {fmtSL(p.ton_kho, p.don_vi)})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Ảnh sản phẩm — khi nhập kho (tự nén trước khi tải) */}
          {f.loai === 'nhap_kho' && sp && (
            <div>
              <label style={lbl}>ẢNH SẢN PHẨM {(anhSP || sp.anh_url) ? '' : '(chưa có — chụp/chọn để thêm)'}</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {(anhSP || sp.anh_url) ? (
                  <ZoomImg src={anhSP || sp.anh_url} size={56} radius={8} alt={sp.ten} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: COLORS.textMute }}>📷</div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                    background: COLORS.grad, color: 'white', borderRadius: 10, fontWeight: 800, fontSize: 12.5,
                    cursor: uploadingAnh ? 'wait' : 'pointer', opacity: uploadingAnh ? 0.7 : 1 }}>
                    📷 {uploadingAnh ? 'Đang nén & tải...' : (anhSP || sp.anh_url) ? 'Đổi ảnh' : 'Tải ảnh lên'}
                    <input type="file" accept="image/*" disabled={uploadingAnh}
                      onChange={e => handleUploadAnhSP(e.target.files?.[0])} style={{ display: 'none' }} />
                  </label>
                  <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 5 }}>Chụp/chọn ảnh SP — tự nén trước khi tải</div>
                </div>
              </div>
            </div>
          )}

          {/* Số lượng + đơn giá */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>
                {f.loai === 'dieu_chinh' ? 'TỒN KHO THỰC TẾ' : 'SỐ LƯỢNG'} {sp ? `(${dvInput})` : ''}  *
              </label>
              <input style={inp} type="number" step="0.1" min="0"
                value={f.so_luong} onChange={e => set('so_luong', e.target.value)} />
              {qd > 1 && f.so_luong > 0 && (
                <div style={{ fontSize: '11px', color: '#2D7A4F', marginTop: '3px', fontWeight: 700 }}>
                  = {+f.so_luong * qd} {sp.don_vi} (1 {dvInput} = {qd} {sp.don_vi})
                </div>
              )}
              {f.loai === 'dieu_chinh' && sp && (
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '3px' }}>
                  Hiện DB: {fmtSL(sp.ton_kho, sp.don_vi)}
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>ĐƠN GIÁ {qd > 1 ? `(/${dvInput})` : ''}</label>
              <input style={inp} type="text" inputMode="numeric" value={moneyFmt(f.gia_don_vi)}
                onChange={e => set('gia_don_vi', moneyRaw(e.target.value))} placeholder="0₫" />
              {qd > 1 && +f.gia_don_vi > 0 && (
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '3px' }}>
                  ≈ {fmt(Math.round(+f.gia_don_vi / qd))}/{sp.don_vi}
                </div>
              )}
            </div>
          </div>

          {/* Preview tồn sau */}
          {sp && f.so_luong && (
            <div style={{ background: COLORS.bg, borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: COLORS.textSub }}>
                {f.loai === 'dieu_chinh' ? 'Thay đổi:' : 'Tồn sau giao dịch:'}
              </span>
              <strong style={{ color: COLORS.primary }}>
                {f.loai === 'dieu_chinh'
                  ? (() => {
                      const d = +f.so_luong - Number(sp.ton_kho)
                      return `${d >= 0 ? '+' : ''}${fmtSL(d, sp.don_vi)}`
                    })()
                  : (sp ? fmtTonQD({ ...sp, ton_kho: tonSau }) : fmtSL(tonSau, sp?.don_vi))}
              </strong>
            </div>
          )}

          {/* Xuất cho KTV — chỉ khi xuất sử dụng */}
          {f.loai === 'xuat_su_dung' && (
            <div>
              <label style={lbl}>XUẤT CHO (NHÂN VIÊN) *</label>
              <select style={inp} value={nguoiNhanId} onChange={e => setNguoiNhanId(e.target.value)}>
                <option value="">— Chọn nhân viên nhận —</option>
                {ktvList.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.ho_ten}{k.vi_tri === 'ktv' ? ' (KTV)' : k.vi_tri === 'le_tan' ? ' (Lễ Tân)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Auto chi_phi — chỉ khi nhập kho */}
          {f.loai === 'nhap_kho' && (
            <div style={{ background: '#E8F5E9', borderRadius: '12px', padding: '14px', border: '1px solid #A5D6A7' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={f.taoChi}
                  onChange={e => set('taoChi', e.target.checked)} />
                <div>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#2D7A4F' }}>
                    💳 Ghi nhận chi phí mua hàng
                  </div>
                  {tongTien > 0 && (
                    <div style={{ fontSize: '12px', color: '#388E3C', marginTop: '2px' }}>
                      Tổng: {fmt(tongTien)}
                    </div>
                  )}
                </div>
              </label>
              {f.taoChi && (
                <div style={{ marginTop: '10px' }}>
                  <label style={lbl}>HÌNH THỨC THANH TOÁN</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {HINH_THUC.map(h => (
                      <button key={h.val} onClick={() => set('hinh_thuc', h.val)}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                          cursor: 'pointer', fontWeight: '700', fontSize: '12px',
                          background: f.hinh_thuc === h.val ? '#2D7A4F' : 'white',
                          color: f.hinh_thuc === h.val ? 'white' : COLORS.textSub }}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={lbl}>NGÀY</label>
            <DateField value={f.ngay} onChange={d => set('ngay', d)} />
          </div>

          <div>
            <label style={lbl}>GHI CHÚ</label>
            <textarea style={{ ...inp, height: '60px', resize: 'vertical' }}
              value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)}
              placeholder="Nhà cung cấp, lý do xuất..." />
          </div>

          {err && <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
            borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>⚠️ {err}</div>}

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
              {saving ? 'Đang lưu...' : '✅ Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body)
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: NHẬP / XUẤT (enhanced: date filter, search, delete)
// ══════════════════════════════════════════════════════════════════════════════
export function TabGiaoDich({ transactions, products, userId, danhMucKho, onReload, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const [editGd, setEditGd]     = useState(null)   // giao dịch đang sửa (admin)
  const [filterLoai, setFilterLoai] = useState('all')
  const [filterDate, setFilterDate] = useState('month') // today/week/month/custom
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [search, setSearch]         = useState('')
  const spMap = Object.fromEntries(products.map(p => [p.id, p]))

  const getDateRange = () => {
    const now = getNowVN()
    const today = todayISO()
    if (filterDate === 'today')  return { from: today, to: today }
    if (filterDate === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 6)
      return { from: d.toISOString().slice(0, 10), to: today }
    }
    if (filterDate === 'month') {
      const { from, to } = monthRange(now.getFullYear(), now.getMonth() + 1)
      return { from, to }
    }
    if (filterDate === 'custom') return { from: customFrom, to: customTo }
    return { from: null, to: null }
  }

  const { from, to } = getDateRange()

  const filtered = transactions.filter(t => {
    if (filterLoai !== 'all' && t.loai !== filterLoai) return false
    if (from && t.ngay < from) return false
    if (to   && t.ngay > to)   return false
    if (search) {
      const sp = spMap[t.san_pham_id]
      if (!sp?.ten.toLowerCase().includes(search.toLowerCase())) return false
    }
    return true
  })
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // KPI tổng (theo bộ lọc hiện tại) — như danh sách đơn hàng
  const kpiNhapTien = filtered.filter(t => t.loai === 'nhap_kho').reduce((s, t) => s + (Number(t.so_luong) * Number(t.gia_don_vi) || 0), 0)
  const kpiSoNhap = filtered.filter(t => t.loai === 'nhap_kho').length
  const kpiSoXuat = filtered.filter(t => ['xuat_su_dung', 'xuat_ban', 'tra_nha_cc'].includes(t.loai)).length

  const handleDelete = async (gd) => {
    const sp = spMap[gd.san_pham_id]
    if (['dieu_chinh'].includes(gd.loai)) {
      return showToast('⚠️ Không xóa được GD điều chỉnh. Hãy tạo điều chỉnh mới để sửa.')
    }
    if (['chiet_ra', 'chiet_vao'].includes(gd.loai)) {
      return showToast('⚠️ Dùng tab Chiết Rót để xóa cặp chiết rót.')
    }
    if (!(await confirmDialog({ title: 'Xoá giao dịch', message: 'Xóa giao dịch này?', note: 'Tồn kho sẽ được hoàn lại.', danger: true, confirmLabel: 'Xoá' }))) return

    const loaiGD = LOAI_GD[gd.loai]
    const tonHoanLai = Number(sp?.ton_kho || 0) - loaiGD.sign * gd.so_luong

    const { error } = await supabase.from('kho_giao_dich').delete().eq('id', gd.id)
    if (error) return showToast('❌ ' + error.message)

    if (sp) {
      await supabase.from('kho_san_pham')
        .update({ ton_kho: Math.max(0, tonHoanLai) }).eq('id', gd.san_pham_id)
    }

    // Xoá chi_phi tự động tạo khi nhập kho (nếu có)
    if (gd.loai === 'nhap_kho') {
      if (gd.lien_quan_id) {
        // Phiếu nhập từ form Sổ Thu Chi mới (1 chi_phi có thể gồm nhiều dòng kho)
        // → chỉ xoá chi_phi khi KHÔNG còn dòng kho nào khác link tới nó
        const { count } = await supabase.from('kho_giao_dich')
          .select('id', { count: 'exact', head: true })
          .eq('lien_quan_id', gd.lien_quan_id)
        if ((count || 0) === 0) {
          const { error: cpErr } = await supabase.from('chi_phi').delete().eq('id', gd.lien_quan_id)
          if (cpErr) console.error('Xoá chi_phi nhập kho thất bại:', cpErr)
        } else {
          showToast('⚠️ Đã xoá dòng kho. Phiếu chi gồm nhiều mặt hàng — sửa số tiền tại Sổ Thu Chi.')
          onReload(); return
        }
      } else if (sp) {
        // Phiếu nhập kiểu cũ — match theo diễn giải "Nhập kho: <tên SP>"
        const { error: cpErr } = await supabase.from('chi_phi')
          .delete()
          .eq('ngay', gd.ngay)
          .ilike('dien_giai', `Nhập kho: ${sp.ten}%`)
        if (cpErr) console.error('Xoá chi_phi nhập kho thất bại:', cpErr)
      }
    }

    showToast('🗑 Đã xóa giao dịch')
    onReload()
  }

  // ── SỬA giao dịch (admin) — cập nhật tồn kho theo delta + chi phí nếu nhập kho ──
  const handleSaveEdit = async (gd, vals) => {
    const sp = spMap[gd.san_pham_id]
    const loaiGD = LOAI_GD[gd.loai] || {}
    const slOld = Number(gd.so_luong || 0)
    const slNew = Number(vals.so_luong || 0)
    const giaNew = Number(vals.gia_don_vi || 0)
    if (slNew <= 0) return showToast('⚠️ Số lượng phải lớn hơn 0')
    const delta = (loaiGD.sign || 0) * (slNew - slOld)   // thay đổi tồn kho

    const { error } = await supabase.from('kho_giao_dich')
      .update({ so_luong: slNew, gia_don_vi: giaNew, ngay: vals.ngay, ghi_chu: vals.ghi_chu || null })
      .eq('id', gd.id)
    if (error) return showToast('❌ ' + error.message)

    if (sp && delta !== 0) {
      await supabase.from('kho_san_pham')
        .update({ ton_kho: Math.max(0, Number(sp.ton_kho || 0) + delta) })
        .eq('id', gd.san_pham_id)
    }

    // Nhập kho có ghi sổ thu chi → cập nhật số tiền phiếu chi cho khớp
    if (gd.loai === 'nhap_kho') {
      const tienMoi = slNew * giaNew
      if (gd.lien_quan_id) {
        // Phiếu chi từ form Sổ Thu Chi mới (link qua lien_quan_id)
        const { count } = await supabase.from('kho_giao_dich')
          .select('id', { count: 'exact', head: true }).eq('lien_quan_id', gd.lien_quan_id)
        if ((count || 0) <= 1) {
          await supabase.from('chi_phi').update({ so_tien: tienMoi }).eq('id', gd.lien_quan_id)
        } else {
          showToast('⚠️ Đã sửa kho. Phiếu chi gồm nhiều mặt hàng — sửa số tiền tại Sổ Thu Chi.')
        }
      } else if (sp) {
        // Phiếu chi kiểu cũ — match theo "Nhập kho: <tên>" + ngày cũ + số tiền cũ (chính xác đúng phiếu)
        const tienCu = slOld * Number(gd.gia_don_vi || 0)
        await supabase.from('chi_phi')
          .update({ so_tien: tienMoi })
          .eq('ngay', gd.ngay).eq('so_tien', tienCu)
          .ilike('dien_giai', `Nhập kho: ${sp.ten}%`)
      }
    }

    showToast('✅ Đã sửa giao dịch')
    setEditGd(null)
    onReload()
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input style={{ ...inp, flex: 1, padding: '9px 14px' }}
          placeholder="🔍 Tên sản phẩm..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setShowForm(true)}
          style={{ padding: '9px 18px', background: COLORS.grad, color: 'white', border: 'none',
            borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Nhập / Xuất Kho
        </button>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {[['today','Hôm nay'],['week','7 ngày'],['month','Tháng này'],['custom','Tùy chọn']].map(([k,l]) => (
          <button key={k} onClick={() => setFilterDate(k)}
            style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontWeight: '700', fontSize: '12px',
              background: filterDate === k ? COLORS.primary : 'white',
              color: filterDate === k ? 'white' : COLORS.textSub, boxShadow: COLORS.shadow }}>
            {l}
          </button>
        ))}
      </div>
      {filterDate === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <DateField value={customFrom} onChange={setCustomFrom} placeholder="Từ ngày" />
          <DateField value={customTo}   onChange={setCustomTo}   placeholder="Đến ngày" />
        </div>
      )}

      {/* Loại filter */}
      <div style={{ marginBottom: '14px' }}>
        <select style={{ ...inp, padding: '9px 14px' }}
          value={filterLoai} onChange={e => setFilterLoai(e.target.value)}>
          <option value="all">Tất cả loại ({sorted.length})</option>
          {Object.entries(LOAI_GD).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* KPI tổng theo bộ lọc */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: 'Tổng giao dịch', value: String(filtered.length), color: COLORS.taiSan },
          { label: `Tiền nhập kho (${kpiSoNhap})`, value: fmt(kpiNhapTien), color: '#2D7A4F' },
          { label: 'Lượt xuất kho', value: String(kpiSoXuat), color: '#C0392B' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadowSm }}>
            <div style={{ fontSize: '10.5px', color: COLORS.textMute, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: k.color, marginTop: '4px', fontFamily: 'var(--sans)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
            Chưa có giao dịch nào
          </div>
        ) : sorted.map(gd => {
          const sp = spMap[gd.san_pham_id]
          const loaiGD = LOAI_GD[gd.loai] || {}
          const canDelete = !['dieu_chinh', 'chiet_ra', 'chiet_vao'].includes(gd.loai)
          return (
            <div key={gd.id} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px',
              border: `1px solid ${COLORS.border}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                background: `${loaiGD.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                {loaiGD.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sp?.ten || '—'}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                  {loaiGD.label} · {gd.ngay}
                  {gd.ghi_chu ? ` · ${gd.ghi_chu}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '800',
                  color: loaiGD.sign > 0 ? '#2D7A4F' : loaiGD.sign < 0 ? '#C0392B' : '#1A5276' }}>
                  {loaiGD.sign > 0 ? '+' : loaiGD.sign < 0 ? '-' : '±'}{fmtSL(gd.so_luong, sp?.don_vi)}
                </div>
                {gd.gia_don_vi > 0 && (
                  <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                    {fmt(gd.gia_don_vi)}/{sp?.don_vi}
                  </div>
                )}
              </div>
              {canDelete && (
                <button onClick={() => setEditGd(gd)}
                  style={{ padding: '5px 8px', background: '#FFF6E9', border: '1px solid #F0C674',
                    borderRadius: '7px', cursor: 'pointer', fontSize: '11px', color: '#9C6A12',
                    flexShrink: 0 }}>
                  ✏️
                </button>
              )}
              {canDelete && (
                <button onClick={() => handleDelete(gd)}
                  style={{ padding: '5px 8px', background: '#FDECEA', border: '1px solid #FADBD8',
                    borderRadius: '7px', cursor: 'pointer', fontSize: '11px', color: '#C0392B',
                    flexShrink: 0 }}>
                  🗑
                </button>
              )}
            </div>
          )
        })}
      </div>

      {editGd && (
        <SuaGiaoDichModal gd={editGd} sp={spMap[editGd.san_pham_id]}
          onSave={(vals) => handleSaveEdit(editGd, vals)}
          onClose={() => setEditGd(null)} />
      )}

      {showForm && (
        <FormGiaoDich
          products={products.filter(p => p.is_active)}
          userId={userId}
          danhMucKho={danhMucKho}
          onSave={() => { setShowForm(false); onReload(); showToast('✅ Đã ghi giao dịch!') }}
          onClose={() => setShowForm(false)}
        />
      )}

    </div>
  )
}

// ── Modal: Admin sửa 1 giao dịch kho ──────────────────────────────────────────
export function SuaGiaoDichModal({ gd, sp, onSave, onClose }) {
  const loaiGD = LOAI_GD[gd.loai] || {}
  const isNhap = gd.loai === 'nhap_kho'
  const [form, setForm] = useState({
    so_luong:   gd.so_luong   || '',
    gia_don_vi: gd.gia_don_vi || '',
    ngay:       gd.ngay       || todayISO(),
    ghi_chu:    gd.ghi_chu    || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const lbl = { fontSize: '12px', fontWeight: 700, color: COLORS.textSub, marginBottom: '6px', display: 'block' }

  const submit = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose} size="sm" icon="✏️" title="Sửa Giao Dịch Kho"
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', color: COLORS.textSub }}>Hủy</button>
          <button onClick={submit} disabled={saving} style={{ flex: 2, padding: 12, background: COLORS.grad, color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
          </button>
        </div>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
            {loaiGD.icon} {sp?.ten || '—'} <span style={{ color: COLORS.textMute, fontWeight: 500 }}>· {loaiGD.label}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isNhap ? '1fr 1fr' : '1fr', gap: 12 }}>
            <div>
              <label style={lbl}>SỐ LƯỢNG ({sp?.don_vi || ''}) *</label>
              <input style={inp} type="number" value={form.so_luong}
                onChange={e => set('so_luong', e.target.value)} />
            </div>
            {isNhap && (
              <div>
                <label style={lbl}>ĐƠN GIÁ (đ/{sp?.don_vi || ''})</label>
                <input style={inp} type="number" value={form.gia_don_vi}
                  onChange={e => set('gia_don_vi', e.target.value)} />
              </div>
            )}
          </div>
          {isNhap && Number(form.so_luong) > 0 && (
            <div style={{ fontSize: 12, color: COLORS.textSub }}>
              Thành tiền: <b style={{ color: '#2D7A4F' }}>{fmt(Number(form.so_luong) * Number(form.gia_don_vi || 0))}</b>
            </div>
          )}
          <div>
            <label style={lbl}>NGÀY</label>
            <DateField value={form.ngay} onChange={d => set('ngay', d)} />
          </div>
          <div>
            <label style={lbl}>GHI CHÚ</label>
            <input style={inp} value={form.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} placeholder="Lý do / ghi chú..." />
          </div>
          <div style={{ fontSize: 11.5, color: '#9C6A12', background: '#FFF6E9', border: '1px solid #F0C674', borderRadius: 8, padding: '8px 10px', lineHeight: 1.4 }}>
            ⚠️ Đổi số lượng sẽ tự điều chỉnh <b>tồn kho</b>{isNhap ? ' và số tiền phiếu chi (nếu có)' : ''} theo chênh lệch.
          </div>
        </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
