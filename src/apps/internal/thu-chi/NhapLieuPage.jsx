import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, todayISO, formatDateInput } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'
import LedgerTable from './components/LedgerTable'
import EditTransactionModal from './components/EditTransactionModal'
import CashDepositPanel from './components/CashDepositPanel'
import InternalTransferForm from './components/InternalTransferForm'
import ExpenseEntryForm from './components/ExpenseEntryForm'
import { thuChiService } from '../../../services/thuChiService'
import { confirmDialog } from '../../../components/ui/notify'

const HINH_THUC = [
  { id: 'tien_mat', label: 'Tiền Mặt', icon: '💵', color: '#3e5a32', bg: '#e8f1de' },
  { id: 'chuyen_khoan', label: 'Chuyển Khoản', icon: '🏦', color: '#1a4f70', bg: '#ddeaf3' },
  { id: 'quet_the', label: 'Quẹt Thẻ', icon: '💳', color: '#5e2f74', bg: '#ecdcef' },
  { id: 'the_tra_truoc', label: 'Thẻ Trả Trước', icon: '🎫', color: '#6e4a1f', bg: '#f0e2cd' },
]
const QUICK = [80000, 350000, 500000, 1000000, 1500000, 2000000, 3000000, 5000000]
const TABS = [
  { id: 'thu', label: 'Doanh Thu', desc: 'Nhập doanh thu MySpa', icon: I.Coin, color: '#8a6a52', grad: 'linear-gradient(180deg,#f8ead2,#d4a574)' },
  { id: 'chi', label: 'Chi Phí', desc: 'Nhập khoản chi', icon: I.Receipt, color: '#C0392B', grad: 'linear-gradient(180deg,#f5d8c8,#e3a890)' },
  { id: 'ck', label: 'Chuyển Khoản', desc: 'Chuyển nội bộ giữa các ví', icon: I.Bank, color: '#6C3483', grad: 'linear-gradient(180deg,#d8d0f0,#b8a8e0)' },
  { id: 'noptm', label: 'Nộp Tiền Mặt', desc: 'Tính toán & nộp vào MB Bank', icon: I.Wallet, color: '#1a4f70', grad: 'linear-gradient(180deg,#dde9f3,#a8c5dc)' },
]

export default function NhapLieuPage({ user }) {
  const today = todayISO()
  const [tab, setTab] = useState('chi')
  const [ngay, setNgay] = useState(today)
  const [showLich, setShowLich] = useState(false)
  const [soTien, setSoTien] = useState('')
  const [hinhThuc, setHinhThuc] = useState('tien_mat')
  const [dienGiai, setDienGiai] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const isAdmin = user?.vai_tro === 'admin'
  // Doanh thu tự động đổ về từ POS (bảng doanh_thu nguon='pos') → đóng tab nhập doanh thu thủ công.
  // Chỉ còn nhập Chi Phí, Chuyển Khoản, Nộp Tiền Mặt.
  const visibleTabs = (isAdmin ? TABS : TABS.filter(t => !t.adminOnly)).filter(t => t.id !== 'thu')

  // Chi Phí
  const [nhomList, setNhomList] = useState([])
  const [hangMucList, setHangMucList] = useState([])
  const [nhomId, setNhomId] = useState(null)
  const [hangMucId, setHangMucId] = useState(null)
  const [nguonChi, setNguonChi] = useState('tien_mat')
  // Nhập kho tích hợp: khi chọn hạng mục kho → nhập sản phẩm ngay
  const [products, setProducts] = useState([])
  const [khoLines, setKhoLines] = useState([])
  const rawN = s => parseInt(String(s).replace(/\D/g, ''), 10) || 0
  const fmtN = n => n ? new Intl.NumberFormat('vi-VN').format(n) : ''
  const newKhoLine = () => ({ key: Math.random().toString(36).slice(2), sp_id: '', so_luong: '', gia_don_vi: '' })

  // CK
  const [ckTu, setCkTu] = useState('tien_mat')
  const [ckDen, setCkDen] = useState('chuyen_khoan')

  // Nộp TM
  const [nopTmData, setNopTmData] = useState(null)
  const [loadingNop, setLoadingNop] = useState(false)

  const [editItem, setEditItem] = useState(null)
  const [lyDo, setLyDo] = useState('')

  // Today tx list
  const [todayTx, setTodayTx] = useState([])
  const [loadingTx, setLoadingTx] = useState(true)
  const [txFilter, setTxFilter] = useState('all')

  // Lịch sử giao dịch (dùng khi delete/edit)
  const [hsFrom, setHsFrom] = useState(today)
  const [hsTo, setHsTo] = useState(today)
  const [hsData, setHsData] = useState([])
  const [hsLoading, setHsLoading] = useState(false)
  const [dailyClose, setDailyClose] = useState(null)

  useEffect(() => {
    supabase.from('danh_muc_chi_phi').select('*').eq('is_active', true).order('thu_tu').then(r => {
      const all = r.data || []
      setNhomList(all.filter(d => !d.parent_id))
      setHangMucList(all.filter(d => d.parent_id))
    })
    loadProducts()
  }, [])
  const KHO_SELECT = 'id, ten, don_vi, ton_kho, gia_nhap, loai, ton_dinh_muc, don_vi_nhap, quy_doi, gia_ban, danh_muc, canh_bao_ton'
  const loadProducts = async () => {
    // Bản DB cũ có thể thiếu cột mở rộng (don_vi_nhap/quy_doi…) → fallback select gọn
    let r = await supabase.from('kho_san_pham').select(KHO_SELECT).eq('is_active', true).order('ten')
    if (r.error) r = await supabase.from('kho_san_pham').select('id, ten, don_vi, ton_kho, gia_nhap, loai, ton_dinh_muc').eq('is_active', true).order('ten')
    setProducts(r.data || [])
  }
  useEffect(() => { loadTodayTx() }, [ngay])
  useEffect(() => { if (tab === 'noptm') loadNopTm() }, [tab, ngay])
  // Lễ Tân được nhập đầy đủ 4 loại (Doanh Thu / Chi Phí / Chuyển Khoản / Nộp TM)
  // để chốt sổ 31/05/2026 từ MySpa. Sau cutover, chỉ Doanh Thu sẽ tự sinh qua POS.
  useEffect(() => {
    supabase.from('so_thu_chi_chot_ngay').select('id,trang_thai,nguoi_chot,chot_luc').eq('ngay', ngay).maybeSingle()
      .then(r => setDailyClose(r.data || null))
      .catch(() => setDailyClose(null))
  }, [ngay])

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }
  const resetForm = () => { setSoTien(''); setDienGiai(''); setNhomId(null); setHangMucId(null); setKhoLines([]) }

  const loadTodayTx = async () => {
    setLoadingTx(true)
    try {
      setTodayTx(await thuChiService.getDailyTransactions(ngay))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTx(false)
    }
  }

  // ── SAVE HANDLERS ──
  const handleSaveThu = async () => {
    const amt = parseInt(soTien.replace(/\D/g, '')); if (!amt || amt <= 0) return showMsg('Nhập số tiền!', 'error')
    setSaving(true)
    try {
      const { error } = await supabase.from('doanh_thu').insert({ ngay, hinh_thuc: hinhThuc, so_tien: amt, dien_giai: dienGiai || null, nguoi_nhap: user?.ho_ten || null })
      if (error) throw error
      showMsg(`✓ Đã thu ${formatCurrency(amt)}`); resetForm(); loadTodayTx()
    } catch (e) { showMsg('Lỗi: ' + e.message, 'error') } finally { setSaving(false) }
  }

  const handleSaveChi = async () => {
    if (!isAdmin && dailyClose && ['submitted', 'approved'].includes(dailyClose.trang_thai)) return showMsg('Ngày này đã chốt. Muốn nhập thêm chi phí cần báo Admin mở điều chỉnh.', 'error')
    if (isKho) {
      if (validKhoLines.length === 0) return showMsg('Chọn ít nhất 1 sản phẩm (đủ số lượng + đơn giá) để nhập kho!', 'error')
      const ids = validKhoLines.map(l => l.sp_id)
      if (new Set(ids).size !== ids.length) return showMsg('Có sản phẩm bị chọn trùng dòng — gộp lại giúp em!', 'error')
    }
    const amt = parseInt(soTien.replace(/\D/g, '')); if (!amt || amt <= 0) return showMsg('Nhập số tiền!', 'error')
    if (!hangMucId) return showMsg('Chọn hạng mục chi!', 'error')
    if (!dienGiai?.trim()) return showMsg('Nhập diễn giải!', 'error')
    setSaving(true)
    try {
      const { data: cp, error } = await supabase.from('chi_phi')
        .insert({ ngay, danh_muc_id: hangMucId, so_tien: amt, hinh_thuc_thanh_toan: nguonChi, dien_giai: dienGiai, nguoi_nhap: user?.ho_ten || null })
        .select('id').single()
      if (error) throw error

      // Hạng mục KHO → nhập kho từng sản phẩm + tăng tồn (link phiếu chi)
      // NV nhập theo ĐƠN VỊ NHẬP (chai/hộp) + giá/1 đơn vị nhập → quy về ĐƠN VỊ CƠ SỞ (ml/gram)
      if (isKho && validKhoLines.length > 0) {
        for (const l of validKhoLines) {
          const sp = products.find(p => p.id === l.sp_id)
          const qd = Number(sp?.quy_doi) || 1            // 1 đơn vị nhập = qd đơn vị cơ sở
          const slNhap = rawN(l.so_luong)                // số đơn vị nhập (vd 2 chai)
          const giaNhap = rawN(l.gia_don_vi)             // giá / 1 đơn vị nhập (giá/chai)
          const slCoSo = slNhap * qd                     // tồn theo đơn vị cơ sở (vd 600 ml)
          const giaCoSo = Math.round(giaNhap / qd)       // giá / 1 đơn vị cơ sở (đồng nhất ProductForm)
          const { error: e2 } = await supabase.from('kho_giao_dich').insert({
            san_pham_id: l.sp_id, loai: 'nhap_kho', so_luong: slCoSo, gia_don_vi: giaCoSo,
            ghi_chu: `Nhập kho từ Sổ Thu Chi ${formatDateInput(ngay)}`, ngay,
            nguoi_thuc_hien: user?.id || null, lien_quan_id: cp?.id || null,
          })
          if (e2) throw e2
          const tonMoi = Number(sp?.ton_kho || 0) + slCoSo
          await supabase.from('kho_san_pham').update({
            ton_kho: tonMoi, gia_nhap: giaCoSo,
            ton_dinh_muc: Math.max(Number(sp?.ton_dinh_muc) || 0, tonMoi),
          }).eq('id', l.sp_id)
        }
        // refresh tồn kho local
        await loadProducts()
        showMsg(`✓ Đã chi ${formatCurrency(amt)} + nhập ${validKhoLines.length} SP vào kho`); resetForm(); loadTodayTx()
      } else {
        showMsg(`✓ Đã chi ${formatCurrency(amt)}`); resetForm(); loadTodayTx()
      }
    } catch (e) { showMsg('Lỗi: ' + e.message, 'error') } finally { setSaving(false) }
  }

  const handleSaveCk = async () => {
    const amt = parseInt(soTien.replace(/\D/g, '')); if (!amt || amt <= 0) return showMsg('Nhập số tiền!', 'error')
    setSaving(true)
    try {
      const { data: viList } = await supabase.from('so_du_vi_thuc_te').select('*')
      const tuVi = viList?.find(v => v.loai === ckTu); const denVi = viList?.find(v => v.loai === ckDen)
      if (!tuVi || !denVi) return showMsg('Không tìm thấy ví!', 'error')
      const { error } = await supabase.from('chuyen_khoan_noi_bo').insert({ ngay, tu_vi_id: tuVi.id, den_vi_id: denVi.id, so_tien: amt, dien_giai: dienGiai || `${tuVi.ten} → ${denVi.ten}`, nguoi_thuc_hien: user?.ho_ten || null })
      if (error) throw error
      showMsg(`✓ Đã chuyển ${formatCurrency(amt)}`); resetForm(); loadTodayTx()
    } catch (e) { showMsg('Lỗi: ' + e.message, 'error') } finally { setSaving(false) }
  }

  // ── NỘP TM ──
  const loadNopTm = async () => {
    setLoadingNop(true)
    try {
      setNopTmData(await thuChiService.getCashDepositData(ngay))
    } catch (e) { console.error(e) } finally { setLoadingNop(false) }
  }

  const handleNopTm = async () => {
    if (!nopTmData || nopTmData.phaiNop <= 0) return showMsg('Không có tiền cần nộp!', 'error')
    if (nopTmData.daNop >= nopTmData.phaiNop) return showMsg('Đã nộp đủ!')
    setSaving(true)
    try {
      const thieu = nopTmData.phaiNop - nopTmData.daNop
      const { error } = await supabase.from('chuyen_khoan_noi_bo').insert({ ngay, tu_vi_id: nopTmData.tmVi.id, den_vi_id: nopTmData.mbVi.id, so_tien: thieu, dien_giai: `Nộp TM → MB Bank (${formatDateInput(ngay)})`, nguoi_thuc_hien: user?.ho_ten || null })
      if (error) throw error
      showMsg(`✓ Đã nộp ${formatCurrency(thieu)} vào MB Bank`); loadNopTm(); loadTodayTx()
    } catch (e) { showMsg('Lỗi: ' + e.message, 'error') } finally { setSaving(false) }
  }

  // ── LỊCH SỬ ──
  const loadHistory = async () => {
    setHsLoading(true)
    try {
      setHsData(await thuChiService.getHistory(hsFrom, hsTo))
    } catch (e) { console.error(e) } finally { setHsLoading(false) }
  }

  const handleDelete = async (item) => {
    if (isAdmin) { if (!(await confirmDialog({ title: 'Xoá giao dịch', message: 'Xóa giao dịch này?', danger: true, confirmLabel: 'Xoá' }))) return }
    else if (!lyDo.trim()) return showMsg('Nhập lý do xóa!', 'error')
    try {
      if (isAdmin) {
        const tbl = item._t === 'thu' ? 'doanh_thu' : item._t === 'chi' ? 'chi_phi' : 'chuyen_khoan_noi_bo'
        const { error } = await supabase.from(tbl).delete().eq('id', item.id)
        if (error) throw error
        showMsg('✓ Đã xóa'); loadHistory(); loadTodayTx()
      } else {
        await supabase.from('yeu_cau_chinh_sua').insert({ loai_yeu_cau: 'xoa', bang: item._t, record_id: item.id, du_lieu_cu: item, ly_do: lyDo, nguoi_yeu_cau: user?.ho_ten || user?.email, trang_thai: 'cho_duyet' })
        showMsg('✓ Đã gửi yêu cầu xóa'); setEditItem(null)
      }
    } catch (e) { showMsg('Lỗi: ' + e.message, 'error') }
  }

  const handleEdit = (item) => setEditItem({ ...item, so_tien: String(item.so_tien || '') })
  const handleSaveEdit = async () => {
    if (!editItem) return; if (!isAdmin && !lyDo.trim()) return showMsg('Nhập lý do!', 'error')
    const amt = parseInt(String(editItem.so_tien).replace(/\D/g, '')); if (!amt || amt <= 0) return showMsg('Số tiền không hợp lệ!', 'error')
    try {
      const tbl = editItem._t === 'thu' ? 'doanh_thu' : editItem._t === 'chi' ? 'chi_phi' : 'chuyen_khoan_noi_bo'
      const moi = { so_tien: amt, dien_giai: editItem.dien_giai, ngay: editItem.ngay }; if (editItem._t === 'thu') moi.hinh_thuc = editItem.hinh_thuc || editItem.hinh_thuc_thanh_toan || 'tien_mat'; if (editItem._t === 'chi') { moi.hinh_thuc_thanh_toan = editItem.hinh_thuc_thanh_toan || editItem.hinh_thuc || 'tien_mat'; if (editItem.danh_muc_id) moi.danh_muc_id = editItem.danh_muc_id }
      if (isAdmin) { const { error } = await supabase.from(tbl).update(moi).eq('id', editItem.id); if (error) throw error; showMsg('✓ Đã cập nhật') }
      else { await supabase.from('yeu_cau_chinh_sua').insert({ loai_yeu_cau: 'sua', bang: tbl, record_id: editItem.id, du_lieu_cu: editItem, du_lieu_moi: moi, ly_do: lyDo, nguoi_yeu_cau: user?.ho_ten || user?.email, trang_thai: 'cho_duyet' }); showMsg('✓ Đã gửi yêu cầu sửa') }
      setEditItem(null); loadHistory(); loadTodayTx()
    } catch (e) { showMsg('Lỗi: ' + e.message, 'error') }
  }

  const nhomChon = nhomList.find(n => n.id === nhomId)
  const hangMucChon = hangMucList.find(h => h.id === hangMucId)
  const hmCuaNhom = hangMucList.filter(h => h.parent_id === nhomId)

  // ── Hạng mục liên quan KHO → bật nhập kho ngay trong form chi phí ──
  const KHO_KW = ['tiêu hao', 'bán khách', 'nhập kho', 'dầu gội', 'vật tư', 'mỹ phẩm', 'dụng cụ']
  const isKho = !!hangMucChon && KHO_KW.some(k => (hangMucChon.ten || '').toLowerCase().includes(k))
  const tongKho = khoLines.reduce((s, l) => s + rawN(l.so_luong) * rawN(l.gia_don_vi), 0)
  const validKhoLines = khoLines.filter(l => l.sp_id && rawN(l.so_luong) > 0 && rawN(l.gia_don_vi) > 0)
  useEffect(() => {
    if (isKho) {
      setKhoLines(ls => (ls.length === 0 ? [newKhoLine()] : ls))
      setSoTien(tongKho ? String(tongKho) : '')
    }
  }, [isKho, tongKho])
  const setKhoLine = (key, patch) => setKhoLines(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l))
  const addKhoLine = () => setKhoLines(ls => [...ls, newKhoLine()])
  const removeKhoLine = (key) => setKhoLines(ls => ls.length > 1 ? ls.filter(l => l.key !== key) : ls)
  const onPickKhoSP = (key, spId) => {
    const sp = products.find(p => p.id === spId)
    const qd = Number(sp?.quy_doi) || 1
    // gia_nhap lưu theo đơn vị cơ sở → hiển thị giá / 1 đơn vị nhập (giá/chai)
    const giaNhap = sp?.gia_nhap ? Math.round(Number(sp.gia_nhap) * qd) : ''
    setKhoLine(key, { sp_id: spId, gia_don_vi: giaNhap ? fmtN(giaNhap) : '' })
  }

  // Tạo nhanh sản phẩm mới ngay trong form Sổ Thu Chi → chọn luôn vào dòng kho
  const taoNhanhSP = async (p) => {
    const qd = Number(p.quy_doi) || 1
    const giaCoSo = Math.round((Number(p.giaNhap) || 0) / qd)
    const base = {
      ten: (p.ten || '').trim(), loai: p.loai || 'tieu_hao', don_vi: p.don_vi || 'cái',
      gia_nhap: giaCoSo, gia_ban: Number(p.gia_ban) || 0,
      canh_bao_ton: Number(p.canh_bao_ton) || 0, ton_kho: 0, is_active: true,
    }
    const ext = { ...base, don_vi_nhap: (p.don_vi_nhap || '').trim() || null, quy_doi: qd, danh_muc: (p.danh_muc || '').trim() || null }
    let res = await supabase.from('kho_san_pham').insert(ext).select(KHO_SELECT).single()
    if (res.error) res = await supabase.from('kho_san_pham').insert(base).select('id, ten, don_vi, ton_kho, gia_nhap, loai, ton_dinh_muc').single()
    if (res.error) throw res.error
    const sp = res.data
    setProducts(ps => [...ps, sp].sort((a, b) => (a.ten || '').localeCompare(b.ten || '')))
    // gán vào dòng trống đầu tiên, nếu không có thì thêm dòng mới
    const giaHienThi = sp.gia_nhap ? fmtN(Math.round(Number(sp.gia_nhap) * (Number(sp.quy_doi) || 1))) : ''
    setKhoLines(ls => {
      const empty = ls.find(l => !l.sp_id)
      if (empty) return ls.map(l => l.key === empty.key ? { ...l, sp_id: sp.id, gia_don_vi: giaHienThi } : l)
      return [...ls, { ...newKhoLine(), sp_id: sp.id, gia_don_vi: giaHienThi }]
    })
    return sp
  }

  return (
    <div style={{ padding: '22px 24px' }}>
      {/* Toast */}
      {msg && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '10px 20px', borderRadius: 12, fontWeight: 600, fontSize: 13, background: msg.type === 'error' ? '#fae0d8' : '#e8f1de', color: msg.type === 'error' ? '#6e2818' : '#426a2c', boxShadow: 'var(--sh-2)' }}>{msg.text}</div>}
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={d => { setNgay(d); setShowLich(false) }} />

      {/* Header */}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Nhập Thu Chi</div>
          <div className="sub">{user?.ho_ten} · {ngay === today ? 'Hôm nay' : formatDateInput(ngay)}</div>
        </div>
        <div className="acts">
          <button onClick={() => setShowLich(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.Calendar style={{ width: 13, height: 13 }} />
            {ngay === today ? 'Hôm nay' : formatDateInput(ngay)}
          </button>
        </div>
      </div>

      <div>
        {dailyClose && ['submitted', 'approved'].includes(dailyClose.trang_thai) && (
          <div style={{ marginBottom: 14, border: '1px solid #d8a58a', background: '#fff8f3', color: '#843a23', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, fontWeight: 700 }}>
            Ngày {formatDateInput(ngay)} đã chốt bởi {dailyClose.nguoi_chot || 'Lễ Tân'}. Nhân sự không thể nhập thêm chi phí sau khi chốt ngày.
          </div>
        )}
        <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div className="card-h">
            <div className="card-t">
              <div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
              <h3 style={{ whiteSpace: 'nowrap' }}>Nghiệp Vụ</h3>
              <span className="sub">Chọn loại phiếu cần nhập</span>
            </div>
          </div>
          <div className="card-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        {visibleTabs.map(t => {
          const Icon = t.icon; const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
	              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8,
	              border: active ? `2px solid ${t.color}` : '1px solid var(--line)',
	              background: active ? 'var(--surface)' : 'var(--surface2)',
              boxShadow: active ? 'var(--sh-2)' : 'var(--sh-1)',
	              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s', width: '100%', textAlign: 'left',
            }}>
	              <div style={{ width: 36, height: 36, borderRadius: 8, background: t.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 18, height: 18, color: t.color }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: active ? t.color : 'var(--ink)', fontFamily: 'var(--sans)' }}>{t.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 1 }}>{t.desc}</div>
              </div>
            </button>
          )
        })}
          </div>
        </div>

      <div className="cashbook-form-shell" style={{ minWidth: 0 }}>
        {/* FORM NHẬP LIỆU */}
        <div className="cashbook-form-panel">
          {/* === TAB: DOANH THU === */}
          {tab === 'thu' && <div className="card">
            <div className="card-h"><div className="card-t"><div className="arch-i"><I.Coin style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Nhập Doanh Thu</h3></div></div>
            <div className="card-b">
              <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 10 }}>Số Tiền</div>
                <input type="text" inputMode="numeric" placeholder="0" value={soTien ? parseInt(soTien.replace(/\D/g, '')).toLocaleString('vi-VN') : ''} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 34, fontWeight: 700, textAlign: 'center', background: 'transparent', color: soTien ? '#2D7A4F' : 'var(--line2)', fontFamily: 'var(--serif)', letterSpacing: '-.01em' }} autoFocus />
                {soTien && <div style={{ fontSize: 14, color: '#2D7A4F', fontWeight: 600, marginTop: 4 }}>{formatCurrency(parseInt(soTien.replace(/\D/g, '')))}</div>}
              </div>
              {/* Chọn ngày — dưới input số tiền */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <button onClick={() => setShowLich(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
                  <I.Calendar style={{ width: 13, height: 13, color: 'var(--espresso)' }} />
                  {ngay === today ? 'Hôm nay' : formatDateInput(ngay)}
                  <span style={{ fontSize: 10, color: 'var(--ink3)' }}>— đổi ngày</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'center' }}>
                {QUICK.map(a => <button key={a} onClick={() => setSoTien(String(a))} style={{ padding: '6px 14px', borderRadius: 8, border: soTien === String(a) ? `2px solid var(--espresso)` : '1px solid var(--line)', background: soTien === String(a) ? 'var(--espresso)' : 'var(--surface2)', color: soTien === String(a) ? '#f3e6d2' : 'var(--ink2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)' }}>{a >= 1000000 ? (a / 1000000).toFixed(1) + 'M' : a >= 1000 ? (a / 1000).toFixed(0) + 'K' : a}</button>)}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>Hình Thức Thu</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {HINH_THUC.map(ht => <button key={ht.id} onClick={() => setHinhThuc(ht.id)} style={{ flex: 1, padding: '12px 8px', borderRadius: 10, border: hinhThuc === ht.id ? `2px solid ${ht.color}` : '1px solid var(--line)', background: hinhThuc === ht.id ? ht.bg : 'var(--surface2)', cursor: 'pointer', textAlign: 'center', transition: '.15s' }}><div style={{ fontSize: 22 }}>{ht.icon}</div><div style={{ fontSize: 10.5, fontWeight: 600, color: hinhThuc === ht.id ? ht.color : 'var(--ink3)', marginTop: 4 }}>{ht.label}</div></button>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I.Edit style={{ width: 16, height: 16, color: '#6C3483' }} /></div>
                <input placeholder="Diễn giải (không bắt buộc)..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--ink)', background: 'transparent', fontFamily: 'var(--sans)' }} />
              </div>
              <button onClick={handleSaveThu} disabled={saving} style={{ width: '100%', padding: 15, borderRadius: 'var(--r)', border: 'none', color: '#f8efe1', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--ink3)' : 'linear-gradient(135deg,#d4a574,#8a6a52)', boxShadow: saving ? 'none' : '0 10px 22px rgba(138,106,82,.22)', fontFamily: 'var(--sans)' }}>{saving ? '⏳ Đang lưu...' : '💾 Lưu Doanh Thu'}</button>
            </div>
          </div>}

          {tab === 'chi' && (
            <ExpenseEntryForm
              ngay={ngay}
              today={today}
              soTien={soTien}
              setSoTien={setSoTien}
              nhomList={nhomList}
              nhomId={nhomId}
              setNhomId={setNhomId}
              hangMucId={hangMucId}
              setHangMucId={setHangMucId}
              hmCuaNhom={hmCuaNhom}
              nguonChi={nguonChi}
              setNguonChi={setNguonChi}
              dienGiai={dienGiai}
              setDienGiai={setDienGiai}
              saving={saving}
              onOpenDate={() => setShowLich(true)}
              onSave={handleSaveChi}
              isKho={isKho}
              products={products}
              khoLines={khoLines}
              tongKho={tongKho}
              onPickKhoSP={onPickKhoSP}
              setKhoLine={setKhoLine}
              addKhoLine={addKhoLine}
              removeKhoLine={removeKhoLine}
              onCreateSP={taoNhanhSP}
            />
          )}

          {tab === 'ck' && (
            <InternalTransferForm
              ngay={ngay}
              today={today}
              soTien={soTien}
              setSoTien={setSoTien}
              ckTu={ckTu}
              setCkTu={setCkTu}
              ckDen={ckDen}
              setCkDen={setCkDen}
              dienGiai={dienGiai}
              setDienGiai={setDienGiai}
              saving={saving}
              onOpenDate={() => setShowLich(true)}
              onSave={handleSaveCk}
            />
          )}

          {tab === 'noptm' && (
            <CashDepositPanel
              ngay={ngay}
              loading={loadingNop}
              data={nopTmData}
              saving={saving}
              onDeposit={handleNopTm}
            />
          )}

        </div>

        {/* ── LỊCH SỬ GIAO DỊCH — CỘT PHẢI ── */}
        <div className="card" style={{ display: 'none' }}>
        <div className="card-h">
          <div className="card-t">
            <div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
            <h3>Lịch Sử Giao Dịch</h3>
            <span className="sub">{formatDateInput(ngay)} · {todayTx.length} giao dịch</span>
          </div>
          <div className="card-actions">
            {[{ id: 'all', label: 'Tất cả' }, { id: 'thu', label: 'Thu' }, { id: 'chi', label: 'Chi' }].map(f => (
              <button key={f.id} className={`chip${txFilter === f.id ? ' active' : ''}`} onClick={() => setTxFilter(f.id)}>{f.label}</button>
            ))}
            <button className="icon-btn" onClick={loadTodayTx} style={{ width: 28, height: 28 }}><I.Spark style={{ width: 13, height: 13 }} /></button>
          </div>
        </div>
        <div style={{ padding: 0 }}>
          {loadingTx ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)' }}>Đang tải...</div> :
            todayTx.filter(tx => txFilter === 'all' || (txFilter === 'thu' ? tx._t === 'thu' : tx._t === 'chi')).length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)' }}>Không có giao dịch</div> :
            <LedgerTable data={todayTx.filter(tx => txFilter === 'all' || (txFilter === 'thu' ? tx._t === 'thu' : tx._t === 'chi'))} onEdit={handleEdit} onDelete={handleDelete} />}
        </div>
        </div>
      </div>
      </div>

      <EditTransactionModal
        item={editItem}
        isAdmin={isAdmin}
        lyDo={lyDo}
        nhomList={nhomList}
        hangMucList={hangMucList}
        onChangeItem={setEditItem}
        onChangeLyDo={setLyDo}
        onClose={() => setEditItem(null)}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
