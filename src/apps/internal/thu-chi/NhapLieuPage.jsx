import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, todayISO, formatDateInput } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'

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

function LedgerTable({ data, onEdit, onDelete }) {
  return <table className="ledger">
    <thead><tr><th>Giờ</th><th>Loại</th><th>Diễn Giải</th><th>Nguồn</th><th className="r">Số Tiền</th><th className="r" style={{ width: 60 }}></th></tr></thead>
    <tbody>{data.map((tx, i) => {
      const isThu = tx._t === 'thu', isChi = tx._t === 'chi'
      const tagClass = isThu ? 'sv' : 'ut'
      const tagLabel = isThu ? 'Doanh Thu' : 'Chi Phí'
      const pk = tx.hinh_thuc || tx.hinh_thuc_thanh_toan
      const ml = pk === 'tien_mat' ? 'Tiền Mặt' : pk === 'chuyen_khoan' ? 'Chuyển Khoản' : pk === 'quet_the' ? 'Quẹt Thẻ' : '—'
      const mk = pk === 'tien_mat' ? 'cash' : pk === 'chuyen_khoan' ? 'transfer' : 'card'
      const amtClass = isChi ? 'amt out' : 'amt in'
      const amtPrefix = isChi ? '−' : '+'
      return <tr key={i}>
        <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'var(--ink3)', fontSize: 12 }}>{tx.created_at ? new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
        <td><span className={`tag ${tagClass}`}>{tagLabel}</span></td>
        <td className="nm">{tx.dien_giai || 'Giao dịch'}</td>
        <td style={{ whiteSpace: 'nowrap' }}><span className={`method ${mk}`}>{ml}</span></td>
        <td className={amtClass}>{amtPrefix}{formatCurrency(tx.so_tien)}</td>
        <td className="r"><div style={{ display: 'flex', gap: 3 }}><button onClick={() => onEdit(tx)} className="icon-btn" style={{ width: 24, height: 24 }} title="Sửa"><I.Edit style={{ width: 11, height: 11 }} /></button><button onClick={() => onDelete(tx)} className="icon-btn" style={{ width: 24, height: 24 }} title="Xóa"><I.Trash style={{ width: 11, height: 11, color: 'var(--danger)' }} /></button></div></td>
      </tr>
    })}</tbody>
  </table>
}

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
  }, [])
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
  const resetForm = () => { setSoTien(''); setDienGiai(''); setNhomId(null); setHangMucId(null) }

  const loadTodayTx = () => {
    setLoadingTx(true)
    supabase.from('doanh_thu').select('*').eq('ngay', ngay).order('created_at', { ascending: false }).then(rDT => {
      supabase.from('chi_phi').select('*').eq('ngay', ngay).order('created_at', { ascending: false }).then(rCP => {
        const all = [
          ...(rDT.data || []).map(r => ({ ...r, _t: 'thu' })),
          ...(rCP.data || []).map(r => ({ ...r, _t: 'chi' })),
        ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        setTodayTx(all); setLoadingTx(false)
      })
    }).catch(() => setLoadingTx(false))
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
    const amt = parseInt(soTien.replace(/\D/g, '')); if (!amt || amt <= 0) return showMsg('Nhập số tiền!', 'error')
    if (!hangMucId) return showMsg('Chọn hạng mục chi!', 'error')
    if (!dienGiai?.trim()) return showMsg('Nhập diễn giải!', 'error')
    setSaving(true)
    try {
      const { error } = await supabase.from('chi_phi').insert({ ngay, danh_muc_id: hangMucId, so_tien: amt, hinh_thuc_thanh_toan: nguonChi, dien_giai: dienGiai, nguoi_nhap: user?.ho_ten || null })
      if (error) throw error
      showMsg(`✓ Đã chi ${formatCurrency(amt)}`); resetForm(); loadTodayTx()
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
      const [{ data: dtTm }, { data: cpTm }, { data: viList }] = await Promise.all([
        supabase.from('doanh_thu').select('so_tien').eq('ngay', ngay).eq('hinh_thuc', 'tien_mat'),
        supabase.from('chi_phi').select('so_tien').eq('ngay', ngay).eq('hinh_thuc_thanh_toan', 'tien_mat'),
        supabase.from('so_du_vi_thuc_te').select('*'),
      ])
      const thuTm = (dtTm || []).reduce((s, r) => s + (r.so_tien || 0), 0)
      const chiTm = (cpTm || []).reduce((s, r) => s + (r.so_tien || 0), 0)
      const d = new Date(ngay + 'T00:00:00'); d.setDate(d.getDate() - 1); const prev = d.toISOString().slice(0, 10)
      const [{ data: pDT }, { data: pCP }] = await Promise.all([
        supabase.from('doanh_thu').select('so_tien').eq('ngay', prev).eq('hinh_thuc', 'tien_mat'),
        supabase.from('chi_phi').select('so_tien').eq('ngay', prev).eq('hinh_thuc_thanh_toan', 'tien_mat'),
      ])
      const prevThu = (pDT || []).reduce((s, r) => s + (r.so_tien || 0), 0); const prevChi = (pCP || []).reduce((s, r) => s + (r.so_tien || 0), 0)
      const amHomTrc = prevThu - prevChi < 0 ? Math.abs(prevThu - prevChi) : 0
      const tmVi = viList?.find(v => v.loai === 'tien_mat'); const mbVi = viList?.find(v => v.loai === 'chuyen_khoan')
      let daNop = 0
      if (tmVi && mbVi) { const { data: ck } = await supabase.from('chuyen_khoan_noi_bo').select('so_tien').eq('ngay', ngay).eq('tu_vi_id', tmVi.id).eq('den_vi_id', mbVi.id); daNop = (ck || []).reduce((s, r) => s + (r.so_tien || 0), 0) }
      setNopTmData({ thuTm, chiTm, amHomTrc, phaiNop: Math.max(0, thuTm - chiTm - amHomTrc), daNop, prev, tmVi, mbVi })
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
      const [rDT, rCP, rCK] = await Promise.all([
        supabase.from('doanh_thu').select('*').gte('ngay', hsFrom).lte('ngay', hsTo).order('created_at', { ascending: false }),
        supabase.from('chi_phi').select('*').gte('ngay', hsFrom).lte('ngay', hsTo).order('created_at', { ascending: false }),
        supabase.from('chuyen_khoan_noi_bo').select('*').gte('ngay', hsFrom).lte('ngay', hsTo).order('created_at', { ascending: false }),
      ])
      setHsData([...(rDT.data || []).map(r => ({ ...r, _t: 'thu' })), ...(rCP.data || []).map(r => ({ ...r, _t: 'chi' })), ...(rCK.data || []).map(r => ({ ...r, _t: 'ck' }))].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')))
    } catch (e) { console.error(e) } finally { setHsLoading(false) }
  }

  const handleDelete = async (item) => {
    if (isAdmin) { if (!confirm('Xóa giao dịch này?')) return }
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

  // Tổng hợp nhanh từ danh sách giao dịch hôm nay
  const summary = (() => {
    const thuItems = todayTx.filter(t => t._t === 'thu')
    const chiItems = todayTx.filter(t => t._t === 'chi')
    const thu = thuItems.reduce((s, r) => s + (r.so_tien || 0), 0)
    const chi = chiItems.reduce((s, r) => s + (r.so_tien || 0), 0)
    const pos = thuItems.filter(r => r.nguon === 'pos').reduce((s, r) => s + (r.so_tien || 0), 0)
    const byMethod = {
      tien_mat: thuItems.filter(r => r.hinh_thuc === 'tien_mat').reduce((s, r) => s + (r.so_tien || 0), 0)
               - chiItems.filter(r => r.hinh_thuc_thanh_toan === 'tien_mat').reduce((s, r) => s + (r.so_tien || 0), 0),
      chuyen_khoan: thuItems.filter(r => r.hinh_thuc === 'chuyen_khoan').reduce((s, r) => s + (r.so_tien || 0), 0),
      quet_the: thuItems.filter(r => r.hinh_thuc === 'quet_the').reduce((s, r) => s + (r.so_tien || 0), 0),
    }
    return { thu, chi, pos, net: thu - chi, byMethod }
  })()

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

      {/* Tab cards — sang trọng */}
      {false && <>
      <div className="strip" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))', marginBottom: 16 }}>
        <div className="it"><div className="l">Tổng Thu</div><div className="v" style={{ color: '#2D7A4F' }}>{formatCurrency(summary.thu)}</div><div className="d">Bán hàng tự ghi nhận {formatCurrency(summary.pos)}</div></div>
        <div className="it"><div className="l">Tổng Chi</div><div className="v" style={{ color: '#C0392B' }}>{formatCurrency(summary.chi)}</div><div className="d">chi phí trong ngày</div></div>
        <div className="it"><div className="l">Chênh Ngày</div><div className="v" style={{ color: summary.net >= 0 ? '#2D7A4F' : '#C0392B' }}>{formatCurrency(summary.net)}</div><div className="d">{todayTx.length} giao dịch</div></div>
        <div className="it"><div className="l">Tiền Mặt</div><div className="v">{formatCurrency(summary.byMethod.tien_mat || 0)}</div><div className="d">thu - chi tiền mặt</div></div>
        <div className="it"><div className="l">MB / TP Bank</div><div className="v">{formatCurrency((summary.byMethod.chuyen_khoan || 0) + (summary.byMethod.quet_the || 0))}</div><div className="d">MB {formatCurrency(summary.byMethod.chuyen_khoan || 0)} · TP {formatCurrency(summary.byMethod.quet_the || 0)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div className="card-t">
            <div className="arch-i"><I.Spark style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
            <h3>Kiểm Soát Lệch Số</h3>
            <span className="sub">Soi nhanh doanh thu bán hàng tự động, nhập tay, chi phí và chuyển khoản nội bộ</span>
          </div>
        </div>
        <div className="card-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
          {[
            ['Doanh thu bán hàng', summary.pos, 'Tự sinh từ đơn bán hàng đã chốt'],
            ['Doanh thu nhập tay', Math.max(0, summary.thu - summary.pos), 'Cần đối chiếu với MySpa/phiếu thu'],
            ['Chi phí', summary.chi, 'Theo danh mục chi phí'],
            ['Dòng tiền ròng', summary.net, 'Thu trừ chi trong ngày'],
          ].map(([label, value, note]) => (
            <div key={label} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, background: 'var(--surface)' }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>{label}</div>
              <div style={{ marginTop: 5, fontSize: 18, fontWeight: 800, color: value < 0 ? '#C0392B' : 'var(--ink)' }}>{formatCurrency(value)}</div>
              <div style={{ marginTop: 3, fontSize: 11, color: 'var(--ink3)' }}>{note}</div>
            </div>
          ))}
        </div>
      </div>

      </>}

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

          {/* === TAB: CHI PHÍ === */}
          {tab === 'chi' && <div className="card">
            <div className="card-h"><div className="card-t"><div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Nhập Chi Phí</h3></div></div>
            <div className="card-b">
              <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 10 }}>Số Tiền Chi</div>
                <input type="text" inputMode="numeric" placeholder="0" value={soTien ? parseInt(soTien.replace(/\D/g, '')).toLocaleString('vi-VN') : ''} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 34, fontWeight: 700, textAlign: 'center', background: 'transparent', color: soTien ? '#C0392B' : 'var(--line2)', fontFamily: 'var(--serif)' }} autoFocus />
                {soTien && <div style={{ fontSize: 14, color: '#C0392B', fontWeight: 600, marginTop: 4 }}>{formatCurrency(parseInt(soTien.replace(/\D/g, '')))}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <button onClick={() => setShowLich(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
                  <I.Calendar style={{ width: 13, height: 13, color: 'var(--espresso)' }} />
                  {ngay === today ? 'Hôm nay' : formatDateInput(ngay)}
                  <span style={{ fontSize: 10, color: 'var(--ink3)' }}>— đổi ngày</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'center' }}>{QUICK.map(a => <button key={a} onClick={() => setSoTien(String(a))} style={{ padding: '6px 14px', borderRadius: 8, border: soTien === String(a) ? `2px solid #C0392B` : '1px solid var(--line)', background: soTien === String(a) ? '#FEF2F2' : 'var(--surface2)', color: soTien === String(a) ? '#C0392B' : 'var(--ink2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)' }}>{a >= 1000000 ? (a / 1000000).toFixed(1) + 'M' : a >= 1000 ? (a / 1000).toFixed(0) + 'K' : a}</button>)}</div>
              <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>Nhóm Chi</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{nhomList.map(n => <button key={n.id} onClick={() => { setNhomId(n.id); setHangMucId(null) }} style={{ padding: '8px 14px', borderRadius: 8, border: nhomId === n.id ? `2px solid #C0392B` : '1px solid var(--line)', background: nhomId === n.id ? '#FEF2F2' : 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: nhomId === n.id ? '#C0392B' : 'var(--ink2)' }}>{n.icon} {n.ten}</button>)}</div></div>
              {nhomId && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>Hạng Mục</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{hmCuaNhom.map(hm => <button key={hm.id} onClick={() => setHangMucId(hm.id)} style={{ padding: '8px 14px', borderRadius: 8, border: hangMucId === hm.id ? `2px solid #C0392B` : '1px solid var(--line)', background: hangMucId === hm.id ? '#FEF2F2' : 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: hangMucId === hm.id ? '#C0392B' : 'var(--ink2)' }}>{hm.icon} {hm.ten}</button>)}</div></div>}
              <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>Nguồn Tiền Chi</div><div style={{ display: 'flex', gap: 8 }}>{[{ id: 'tien_mat', l: '💵 Tiền Mặt' }, { id: 'chuyen_khoan', l: '🏦 CK' }, { id: 'quet_the', l: '💳 Quẹt Thẻ' }].map(pt => <button key={pt.id} onClick={() => setNguonChi(pt.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: nguonChi === pt.id ? `2px solid #C0392B` : '1px solid var(--line)', background: nguonChi === pt.id ? '#FEF2F2' : 'var(--surface2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: nguonChi === pt.id ? '#C0392B' : 'var(--ink2)' }}>{pt.l}</button>)}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I.Edit style={{ width: 16, height: 16, color: '#C0392B' }} /></div>
                <input placeholder="Diễn giải (bắt buộc) *" value={dienGiai} onChange={e => setDienGiai(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--ink)', background: 'transparent', fontFamily: 'var(--sans)' }} />
              </div>
              <button onClick={handleSaveChi} disabled={saving} style={{ width: '100%', padding: 15, borderRadius: 'var(--r)', border: 'none', color: '#f8efe1', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--ink3)' : 'linear-gradient(135deg,#d4a574,#8a6a52)', boxShadow: saving ? 'none' : '0 10px 22px rgba(138,106,82,.22)', fontFamily: 'var(--sans)' }}>{saving ? '⏳ Đang lưu...' : '💾 Lưu Chi Phí'}</button>
            </div>
          </div>}

          {/* === TAB: CHUYỂN KHOẢN === */}
          {tab === 'ck' && <div className="card">
            <div className="card-h"><div className="card-t"><div className="arch-i"><I.Bank style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Chuyển Khoản Nội Bộ</h3></div></div>
            <div className="card-b">
              <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 10 }}>Số Tiền Chuyển</div>
                <input type="text" inputMode="numeric" placeholder="0" value={soTien ? parseInt(soTien.replace(/\D/g, '')).toLocaleString('vi-VN') : ''} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 34, fontWeight: 700, textAlign: 'center', background: 'transparent', color: soTien ? '#6C3483' : 'var(--line2)', fontFamily: 'var(--serif)' }} autoFocus />
                {soTien && <div style={{ fontSize: 14, color: '#6C3483', fontWeight: 600, marginTop: 4 }}>{formatCurrency(parseInt(soTien.replace(/\D/g, '')))}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <button onClick={() => setShowLich(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
                  <I.Calendar style={{ width: 13, height: 13, color: 'var(--espresso)' }} />
                  {ngay === today ? 'Hôm nay' : formatDateInput(ngay)}
                  <span style={{ fontSize: 10, color: 'var(--ink3)' }}>— đổi ngày</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'center' }}>{QUICK.map(a => <button key={a} onClick={() => setSoTien(String(a))} style={{ padding: '6px 14px', borderRadius: 8, border: soTien === String(a) ? `2px solid #6C3483` : '1px solid var(--line)', background: soTien === String(a) ? '#F5F3FF' : 'var(--surface2)', color: soTien === String(a) ? '#6C3483' : 'var(--ink2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)' }}>{a >= 1000000 ? (a / 1000000).toFixed(1) + 'M' : a >= 1000 ? (a / 1000).toFixed(0) + 'K' : a}</button>)}</div>
              <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><span style={{ fontWeight: 600, fontSize: 13, minWidth: 50 }}>Từ:</span>{[{ id: 'tien_mat', l: '💵 Tiền Mặt' }, { id: 'quet_the', l: '💳 TP Bank' }, { id: 'chuyen_khoan', l: '🏦 MB Bank' }].map(v => <button key={v.id} onClick={() => { setCkTu(v.id); setCkDen(v.id === 'chuyen_khoan' ? 'tien_mat' : 'chuyen_khoan') }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: ckTu === v.id ? '2px solid #6C3483' : '1px solid var(--line)', background: ckTu === v.id ? '#F5F3FF' : 'var(--surface2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: ckTu === v.id ? '#6C3483' : 'var(--ink2)' }}>{v.l}</button>)}</div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}><span style={{ fontSize: 20 }}>⬇</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontWeight: 600, fontSize: 13, minWidth: 50 }}>Đến:</span>{[{ id: 'tien_mat', l: '💵 Tiền Mặt' }, { id: 'chuyen_khoan', l: '🏦 MB Bank' }].filter(v => v.id !== ckTu).map(v => <button key={v.id} onClick={() => setCkDen(v.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: ckDen === v.id ? '2px solid #6C3483' : '1px solid var(--line)', background: ckDen === v.id ? '#F5F3FF' : 'var(--surface2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: ckDen === v.id ? '#6C3483' : 'var(--ink2)' }}>{v.l}</button>)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I.Edit style={{ width: 16, height: 16, color: '#6C3483' }} /></div><input placeholder="Ghi chú (không bắt buộc)..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--ink)', background: 'transparent', fontFamily: 'var(--sans)' }} /></div>
              <button onClick={handleSaveCk} disabled={saving} style={{ width: '100%', padding: 15, borderRadius: 'var(--r)', border: 'none', color: '#f8efe1', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--ink3)' : 'linear-gradient(135deg,#d4a574,#8a6a52)', boxShadow: saving ? 'none' : '0 10px 22px rgba(138,106,82,.22)', fontFamily: 'var(--sans)' }}>{saving ? '⏳ Đang lưu...' : '💾 Lưu Chuyển Khoản'}</button>
            </div>
          </div>}

          {/* === TAB: NỘP TM === */}
          {tab === 'noptm' && <div className="card">
            <div className="card-h"><div className="card-t"><div className="arch-i"><I.Wallet style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Nộp Tiền Mặt → MB Bank</h3><span className="sub">{formatDateInput(ngay)}</span></div></div>
            <div className="card-b">
              {loadingNop ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink3)' }}>Đang tính toán...</div> : nopTmData ? <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#e8f1de', borderRadius: 12, padding: 14, textAlign: 'center', border: '1px solid #6e8a5e20' }}><div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>Thu Tiền Mặt</div><div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, color: '#426a2c', marginTop: 4 }}>{formatCurrency(nopTmData.thuTm)}</div></div>
                  <div style={{ background: '#fae0d8', borderRadius: 12, padding: 14, textAlign: 'center', border: '1px solid #b85a4a20' }}><div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>Chi Tiền Mặt</div><div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, color: '#843a23', marginTop: 4 }}>{formatCurrency(nopTmData.chiTm)}</div></div>
                </div>
                {nopTmData.amHomTrc > 0 && <div style={{ background: '#FFF9F0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid #F0C080', fontSize: 12, color: '#8B6914', textAlign: 'center' }}>🔻 Bù âm ngày {formatDateInput(nopTmData.prev)}: <b>{formatCurrency(nopTmData.amHomTrc)}</b></div>}
                <div style={{ background: nopTmData.phaiNop > 0 ? 'linear-gradient(135deg,#1a4f70,#0d3b5a)' : 'var(--bg2)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16, color: nopTmData.phaiNop > 0 ? '#fff' : 'var(--ink3)' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, opacity: .7 }}>Cần Nộp Hôm Nay</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 700, marginTop: 4 }}>{nopTmData.phaiNop > 0 ? formatCurrency(nopTmData.phaiNop) : '0đ — Không cần nộp'}</div>
                </div>
                {nopTmData.daNop > 0 && <div style={{ background: '#e8f1de', borderRadius: 10, padding: '10px 14px', marginBottom: 14, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#426a2c' }}>✓ Đã nộp {formatCurrency(nopTmData.daNop)} — {nopTmData.daNop < nopTmData.phaiNop ? <>Còn thiếu <b>{formatCurrency(nopTmData.phaiNop - nopTmData.daNop)}</b></> : 'Đã nộp đủ'}</div>}
                {nopTmData.phaiNop > 0 && nopTmData.daNop < nopTmData.phaiNop && <button onClick={handleNopTm} disabled={saving} style={{ width: '100%', padding: 15, borderRadius: 'var(--r)', border: 'none', color: '#f8efe1', fontSize: 15, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#d4a574,#8a6a52)', boxShadow: '0 10px 22px rgba(138,106,82,.22)', fontFamily: 'var(--sans)' }}>{saving ? '⏳ Đang lưu...' : `🏦 Xác Nhận Đã Nộp ${formatCurrency(nopTmData.phaiNop - nopTmData.daNop)}`}</button>}
              </div> : <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink3)' }}>Không có dữ liệu</div>}
            </div>
          </div>}

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

      {/* Modal Sửa */}
      {editItem && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setEditItem(null) }}>
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r-lg)', padding: 24, maxWidth: 440, width: '100%', boxShadow: 'var(--sh-3)' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700 }}>{isAdmin ? 'Sửa Giao Dịch' : 'Yêu Cầu Sửa'}</h3>
            <button onClick={() => setEditItem(null)} className="icon-btn" style={{ width: 32, height: 32 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Ngày</label><input value={editItem.ngay ? formatDateInput(editItem.ngay) : ''} onChange={e => { const v = e.target.value; if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) { const [dd, mm, yyyy] = v.split('/'); setEditItem({ ...editItem, ngay: `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}` }) } else setEditItem({ ...editItem, ngay: v }) }} placeholder="DD/MM/YYYY" style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, outline: 'none', fontFamily: 'var(--sans)' }} /></div>
            <div><label style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nguồn Tiền</label><select value={(editItem.hinh_thuc || editItem.hinh_thuc_thanh_toan || 'tien_mat')} onChange={e => { const key = editItem._t === 'thu' ? 'hinh_thuc' : 'hinh_thuc_thanh_toan'; setEditItem({ ...editItem, [key]: e.target.value }) }} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, outline: 'none', fontFamily: 'var(--sans)', background: 'var(--surface2)' }}>{editItem._t === 'thu' ? <><option value="tien_mat">💵 Tiền Mặt</option><option value="chuyen_khoan">🏦 Chuyển Khoản</option><option value="quet_the">💳 Quẹt Thẻ</option><option value="the_tra_truoc">🎫 Thẻ Trả Trước</option></> : <><option value="tien_mat">💵 Tiền Mặt</option><option value="chuyen_khoan">🏦 Chuyển Khoản</option><option value="quet_the">💳 Quẹt Thẻ</option></>}</select></div>
            {editItem._t === 'chi' && <><div><label style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nhóm Chi</label><select value={hangMucList.find(h => h.id === editItem.danh_muc_id)?.parent_id || ''} onChange={e => setEditItem({ ...editItem, danh_muc_id: '', _nhomId: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, outline: 'none', fontFamily: 'var(--sans)', background: 'var(--surface2)' }}><option value="">-- Chọn nhóm --</option>{nhomList.map(n => <option key={n.id} value={n.id}>{n.icon} {n.ten}</option>)}</select></div>
            <div><label style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Hạng Mục Chi</label><select value={editItem.danh_muc_id || ''} onChange={e => setEditItem({ ...editItem, danh_muc_id: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, outline: 'none', fontFamily: 'var(--sans)', background: 'var(--surface2)' }}><option value="">-- Chọn hạng mục --</option>{hangMucList.filter(h => h.parent_id === (editItem._nhomId || hangMucList.find(h => h.id === editItem.danh_muc_id)?.parent_id)).map(hm => <option key={hm.id} value={hm.id}>{hm.icon} {hm.ten}</option>)}</select></div></>}
            <div><label style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Số Tiền</label><input type="number" value={editItem.so_tien || ''} onChange={e => setEditItem({ ...editItem, so_tien: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 20, fontWeight: 700, outline: 'none', fontFamily: 'var(--serif)' }} /></div>
            <div><label style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Diễn Giải</label><input value={editItem.dien_giai || ''} onChange={e => setEditItem({ ...editItem, dien_giai: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, outline: 'none', fontFamily: 'var(--sans)' }} /></div>
            <div><label style={{ fontSize: 10.5, color: 'var(--ink3)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Lý do {!isAdmin && '(bắt buộc)'}</label><textarea value={lyDo} onChange={e => setLyDo(e.target.value)} placeholder="Nhập lý do..." rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'var(--sans)' }} /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button onClick={() => setEditItem(null)} className="btn" style={{ flex: 1, justifyContent: 'center' }}>Hủy</button><button onClick={handleSaveEdit} className="btn gold" style={{ flex: 1, justifyContent: 'center' }}>{isAdmin ? 'Lưu Ngay' : 'Gửi Yêu Cầu'}</button></div>
            {!isAdmin && <div style={{ fontSize: 10, color: 'var(--ink3)', textAlign: 'center' }}>Admin sẽ duyệt trước khi có hiệu lực</div>}
          </div>
        </div>
      </div>}
    </div>
  )
}
