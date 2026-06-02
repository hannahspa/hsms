import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, todayISO, formatDateInput, getNowVN } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'

const METHODS = {
  tien_mat: { label: 'Tiền Mặt', short: 'TM', icon: '💵', color: '#3e5a32', bg: '#eef5e8' },
  chuyen_khoan: { label: 'MB Bank', short: 'MB', icon: '🏦', color: '#1a4f70', bg: '#e8f1f6' },
  quet_the: { label: 'TP Bank', short: 'TP', icon: '💳', color: '#5e2f74', bg: '#f1eaf4' },
  the_tra_truoc: { label: 'Thẻ Trả Trước', short: 'TTT', icon: '🎫', color: '#8a6a52', bg: '#f6efe4' },
}

const moneyStyle = {
  fontFamily: 'var(--sans)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-.01em',
}

function Stat({ label, value, note, tone = 'ink' }) {
  const color = tone === 'good' ? '#3e5a32' : tone === 'bad' ? '#843a23' : tone === 'gold' ? 'var(--espresso)' : 'var(--ink)'
  return (
    <div className="it" style={{ minHeight: 102, padding: '18px 20px' }}>
      <div className="l" style={{ fontSize: 10, letterSpacing: '.13em', fontWeight: 750 }}>{label}</div>
      <div className="v" style={{ ...moneyStyle, color, fontSize: 24, fontWeight: 800, marginTop: 8 }}>{formatCurrency(value)}</div>
      <div className="d" style={{ fontSize: 11.5, lineHeight: 1.35, marginTop: 8 }}>{note}</div>
    </div>
  )
}

function MethodCard({ method, amount, count, note }) {
  const meta = METHODS[method]
  return (
    <div style={{ border: '1px solid var(--line)', background: meta.bg, borderRadius: 10, padding: 14, minHeight: 126 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.64)', display: 'grid', placeItems: 'center', fontSize: 18 }}>{meta.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 750 }}>{meta.label}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2, fontWeight: 600 }}>{count} lệnh · {meta.short}</div>
        </div>
      </div>
      <div style={{ ...moneyStyle, fontSize: 22, fontWeight: 800, color: meta.color, marginTop: 13 }}>{formatCurrency(amount)}</div>
      <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.35, marginTop: 6 }}>{note}</div>
    </div>
  )
}

export default function ChotNgayPage({ user, refreshKey }) {
  const [ngay, setNgay] = useState(todayISO())
  const [showLich, setShowLich] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [data, setData] = useState(null)
  const [closeRow, setCloseRow] = useState(null)
  const [dbReady, setDbReady] = useState(true)
  const [giaiTrinh, setGiaiTrinh] = useState('')

  const isAdmin = user?.vai_tro === 'admin'
  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3200) }

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      supabase.from('doanh_thu').select('id,so_tien,hinh_thuc,dien_giai,created_at,nguon,don_hang_id').eq('ngay', ngay).order('created_at', { ascending: false }),
      supabase.from('chi_phi').select('id,so_tien,hinh_thuc_thanh_toan,dien_giai,danh_muc_id,nguoi_nhap,created_at').eq('ngay', ngay).order('created_at', { ascending: false }),
      supabase.from('danh_muc_chi_phi').select('id,ten,icon,parent_id'),
      supabase.from('so_thu_chi_chot_ngay').select('*').eq('ngay', ngay).maybeSingle(),
      supabase.from('so_du_vi_thuc_te').select('id,ten,loai'),
      supabase.from('doanh_thu').select('so_tien,hinh_thuc').lt('ngay', ngay),
      supabase.from('chi_phi').select('so_tien,hinh_thuc_thanh_toan').lt('ngay', ngay),
      supabase.from('chuyen_khoan_noi_bo').select('so_tien,tu_vi_id,den_vi_id,ngay').lt('ngay', ngay),
      supabase.from('chuyen_khoan_noi_bo').select('so_tien,tu_vi_id,den_vi_id,ngay').eq('ngay', ngay),
    ]).then(([rDT, rCP, rDM, rClose, rVi, rPrevDT, rPrevCP, rPrevCK, rTodayCK]) => {
      if (!alive) return
      if (rClose.error) setDbReady(false)
      else setDbReady(true)
      const dt = rDT.data || []
      const cp = rCP.data || []
      const dmMap = {}
      ;(rDM.data || []).forEach(dm => { dmMap[dm.id] = dm })
      const sumThu = key => dt.filter(r => r.hinh_thuc === key).reduce((s, r) => s + (r.so_tien || 0), 0)
      const countThu = key => dt.filter(r => r.hinh_thuc === key).length
      const sumChi = key => cp.filter(r => (r.hinh_thuc_thanh_toan || 'tien_mat') === key).reduce((s, r) => s + (r.so_tien || 0), 0)
      const posRows = dt.filter(r => r.nguon === 'pos')
      const manualRows = dt.filter(r => r.nguon !== 'pos')
      const viList = rVi.data || []
      const cashVi = viList.find(v => v.loai === 'tien_mat')
      const mbVi = viList.find(v => v.loai === 'chuyen_khoan')
      const isCashToMb = ck => cashVi && mbVi && ck.tu_vi_id === cashVi.id && ck.den_vi_id === mbVi.id
      const prevCashThu = (rPrevDT.data || []).filter(r => r.hinh_thuc === 'tien_mat').reduce((s, r) => s + (r.so_tien || 0), 0)
      const prevCashChi = (rPrevCP.data || []).filter(r => (r.hinh_thuc_thanh_toan || 'tien_mat') === 'tien_mat').reduce((s, r) => s + (r.so_tien || 0), 0)
      const prevCashDeposit = (rPrevCK.data || []).filter(isCashToMb).reduce((s, r) => s + (r.so_tien || 0), 0)
      const todayCashDeposit = (rTodayCK.data || []).filter(isCashToMb).reduce((s, r) => s + (r.so_tien || 0), 0)
      const carryBefore = prevCashThu - prevCashChi - prevCashDeposit
      const snapshot = {
        dt,
        cp,
        dmMap,
        cashVi,
        mbVi,
        tienMat: sumThu('tien_mat'),
        mb: sumThu('chuyen_khoan'),
        tp: sumThu('quet_the'),
        theTraTruoc: sumThu('the_tra_truoc'),
        soLenhTienMat: countThu('tien_mat'),
        soLenhMb: countThu('chuyen_khoan'),
        soLenhTp: countThu('quet_the'),
        soLenhThe: countThu('the_tra_truoc'),
        chiTienMat: sumChi('tien_mat'),
        chiMb: sumChi('chuyen_khoan'),
        chiTp: sumChi('quet_the'),
        tongChi: cp.reduce((s, r) => s + (r.so_tien || 0), 0),
        doanhThuPos: posRows.reduce((s, r) => s + (r.so_tien || 0), 0),
        doanhThuManual: manualRows.reduce((s, r) => s + (r.so_tien || 0), 0),
        soDonPos: new Set(posRows.map(r => r.don_hang_id).filter(Boolean)).size,
        daNopTienMat: todayCashDeposit,
        amTreoTruoc: carryBefore < 0 ? Math.abs(carryBefore) : 0,
        tonDuongChuaNopTruoc: carryBefore > 0 ? carryBefore : 0,
      }
      snapshot.tienMatDuKien = snapshot.tienMat - snapshot.chiTienMat
      snapshot.mbDuKien = snapshot.mb - snapshot.chiMb
      snapshot.tpDuKien = snapshot.tp - snapshot.chiTp
      snapshot.tienMatSauBuTru = carryBefore + snapshot.tienMatDuKien
      snapshot.tienMatPhaiNop = Math.max(0, snapshot.tienMatSauBuTru - todayCashDeposit)
      snapshot.amTreoSau = Math.max(0, -snapshot.tienMatSauBuTru)
      setData(snapshot)
      const savedClose = rClose.error ? null : rClose.data
      setCloseRow(savedClose || null)
      if (savedClose) {
        setGiaiTrinh(savedClose.giai_trinh || '')
      } else {
        setGiaiTrinh('')
      }
      setLoading(false)
    }).catch(e => {
      console.error(e)
      if (alive) {
        setLoading(false)
        showMsg(e.message?.includes('so_thu_chi_chot_ngay') ? 'Cần chạy migration 043_daily_cash_close.sql trước khi chốt ngày.' : `Lỗi tải dữ liệu: ${e.message}`, 'error')
      }
    })
    return () => { alive = false }
  }, [ngay, refreshKey])

  const closeProposal = useMemo(() => {
    if (!data) return { canDeposit: false, needsNote: false }
    return {
      canDeposit: data.tienMatPhaiNop > 0,
      needsNote: data.doanhThuManual > 0 || data.amTreoSau > 0 || data.daNopTienMat > 0,
    }
  }, [data])

  const isLocked = closeRow?.trang_thai === 'approved'

  const saveClose = async () => {
    if (!data) return
    if (!dbReady) return showMsg('Chưa có bảng Chốt Ngày. Hãy chạy migration 043_daily_cash_close.sql trong Supabase trước.', 'error')
    if (closeProposal.needsNote && !giaiTrinh.trim()) return showMsg('Ngày này có điểm cần lưu ý, hãy nhập ghi chú xác nhận trước khi chốt.', 'error')
    setSaving(true)
    try {
      if (data.tienMatPhaiNop > 0 && !closeRow && data.cashVi?.id && data.mbVi?.id) {
        const { error: ckError } = await supabase.from('chuyen_khoan_noi_bo').insert({
          ngay,
          tu_vi_id: data.cashVi.id,
          den_vi_id: data.mbVi.id,
          so_tien: data.tienMatPhaiNop,
          dien_giai: `Chốt ngày ${formatDateInput(ngay)} - nộp tiền mặt vào MB Bank`,
          nguoi_thuc_hien: user?.ho_ten || user?.email || null,
        })
        if (ckError) throw ckError
      }
      const nowISO = getNowVN().toISOString()
      const payload = {
        ngay,
        trang_thai: 'submitted',
        tien_mat_pos: data.tienMat,
        mb_pos: data.mb,
        tp_pos: data.tp,
        the_tra_truoc_pos: data.theTraTruoc,
        doanh_thu_pos: data.doanhThuPos,
        doanh_thu_manual: data.doanhThuManual,
        chi_tien_mat: data.chiTienMat,
        chi_mb: data.chiMb,
        chi_tp: data.chiTp,
        tong_chi: data.tongChi,
        tien_mat_du_kien: data.tienMatDuKien,
        mb_du_kien: data.mbDuKien,
        tp_du_kien: data.tpDuKien,
        am_treo_truoc: data.amTreoTruoc,
        tien_mat_phai_nop: data.tienMatPhaiNop,
        tien_mat_da_nop: data.daNopTienMat + (closeRow ? 0 : data.tienMatPhaiNop),
        am_treo_sau: data.amTreoSau,
        tien_mat_thuc_dem: data.tienMatSauBuTru,
        mb_thuc_nhan: data.mbDuKien,
        tp_thuc_nhan: data.tpDuKien,
        lech_tien_mat: 0,
        lech_mb: 0,
        lech_tp: 0,
        so_don_pos: data.soDonPos,
        so_lenh_tien_mat: data.soLenhTienMat,
        so_lenh_mb: data.soLenhMb,
        so_lenh_tp: data.soLenhTp,
        giai_trinh: giaiTrinh.trim() || null,
        nguoi_chot: user?.ho_ten || user?.email || null,
        chot_luc: nowISO,
        updated_at: nowISO,
      }
      const { data: saved, error } = await supabase.from('so_thu_chi_chot_ngay').upsert(payload, { onConflict: 'ngay' }).select().single()
      if (error) throw error
      setCloseRow(saved)
      showMsg('Đã chốt ngày và gửi báo cáo cho Admin.')
    } catch (e) {
      showMsg(`Lỗi chốt ngày: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const approveClose = async status => {
    if (!closeRow || !isAdmin) return
    setSaving(true)
    try {
      const nowISO = getNowVN().toISOString()
      const { data: saved, error } = await supabase
        .from('so_thu_chi_chot_ngay')
        .update({ trang_thai: status, approved_by: user?.ho_ten || user?.email || null, approved_at: nowISO, updated_at: nowISO })
        .eq('id', closeRow.id)
        .select()
        .single()
      if (error) throw error
      setCloseRow(saved)
      showMsg(status === 'approved' ? 'Admin đã duyệt chốt ngày.' : 'Admin đã trả lại phiếu chốt ngày.', status === 'approved' ? 'success' : 'error')
    } catch (e) {
      showMsg(`Lỗi duyệt: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải dữ liệu chốt ngày...</div>

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      {msg && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, background: msg.type === 'error' ? '#fae0d8' : '#e8f1de', color: msg.type === 'error' ? '#6e2818' : '#426a2c', boxShadow: 'var(--sh-2)' }}>{msg.text}</div>}
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={d => { setNgay(d); setShowLich(false) }} />

      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl" style={{ letterSpacing: '-.01em' }}>Chốt Ngày</div>
          <div className="sub">{user?.ho_ten} · {ngay === todayISO() ? 'Hôm nay' : formatDateInput(ngay)} · {closeRow ? `Trạng thái: ${closeRow.trang_thai}` : 'Chưa chốt'}</div>
        </div>
        <div className="acts">
          <button onClick={() => setShowLich(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.Calendar style={{ width: 13, height: 13 }} />
            {ngay === todayISO() ? 'Hôm nay' : formatDateInput(ngay)}
          </button>
        </div>
      </div>

      {!dbReady && (
        <div style={{ marginBottom: 16, border: '1px solid #d8a58a', background: '#fff8f3', color: '#843a23', borderRadius: 12, padding: '13px 15px', fontSize: 13, fontWeight: 750 }}>
          Cần chạy migration <b>043_daily_cash_close.sql</b> để lưu phiếu chốt ngày. Hiện tại trang vẫn xem được số liệu bán hàng/chi phí nhưng chưa thể bấm chốt.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div className="card-b" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr repeat(3, minmax(0, 1fr))', gap: 0 }}>
            <div style={{ padding: 22, background: 'linear-gradient(135deg,#3d2c20,#8a6a52)', color: '#f8efe1' }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.14em', opacity: .72, fontWeight: 750 }}>Báo cáo cuối ngày</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, lineHeight: 1.08, marginTop: 10 }}>{formatDateInput(ngay)}</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, opacity: .78, marginTop: 10, maxWidth: 280 }}>Hệ thống bán hàng là nguồn thu gốc. Lễ Tân kiểm tra chi phí và xác nhận tất toán cuối ngày.</div>
            </div>
            <Stat label="Doanh Thu Bán Hàng" value={data.doanhThuPos} note={`${data.soDonPos} đơn · ${data.dt.length} lệnh thanh toán`} tone="gold" />
            <Stat label="Tổng Chi" value={data.tongChi} note={`${data.cp.length} khoản chi phát sinh`} tone="bad" />
            <Stat label="Cần Nộp MB" value={data.tienMatPhaiNop} note={data.amTreoSau > 0 ? `Âm treo sang ngày sau ${formatCurrency(data.amTreoSau)}` : 'Hệ thống tự đề xuất tất toán'} tone={data.tienMatPhaiNop > 0 ? 'good' : data.amTreoSau > 0 ? 'bad' : 'gold'} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(390px, .75fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <div className="card-h">
              <div className="card-t"><div className="arch-i"><I.TrendUp style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Tiền Nhận Từ Bán Hàng</h3><span className="sub">Tự động ghi nhận, Lễ Tân không nhập tay</span></div>
            </div>
            <div className="card-b">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                <MethodCard method="tien_mat" amount={data.tienMat} count={data.soLenhTienMat} note={`Sau chi tiền mặt cần còn ${formatCurrency(data.tienMatDuKien)}`} />
                <MethodCard method="chuyen_khoan" amount={data.mb} count={data.soLenhMb} note={`Sau chi MB cần còn ${formatCurrency(data.mbDuKien)}`} />
                <MethodCard method="quet_the" amount={data.tp} count={data.soLenhTp} note={`Sau chi TP cần còn ${formatCurrency(data.tpDuKien)}`} />
                <MethodCard method="the_tra_truoc" amount={data.theTraTruoc} count={data.soLenhThe} note="Theo dõi nghĩa vụ, không tính vào tiền cần kiểm" />
              </div>
              {data.doanhThuManual > 0 && (
                <div style={{ marginTop: 12, border: '1px solid #d8a58a', background: '#fff8f3', borderRadius: 10, padding: 12, color: '#843a23', fontSize: 12.5, fontWeight: 700 }}>
                  Có {formatCurrency(data.doanhThuManual)} doanh thu nhập tay trong ngày này. Đây là nguồn cần Admin kiểm tra vì có thể gây lệch.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <div className="card-t"><div className="arch-i"><I.TrendDown style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Chi Phí Phát Sinh</h3><span className="sub">{data.cp.length} khoản chi · phân theo ví chi</span></div>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              {data.cp.length === 0 ? <div style={{ textAlign: 'center', padding: 34, color: 'var(--ink3)', fontSize: 13 }}>Không có khoản chi trong ngày này</div> : (
                <table className="tbl">
                  <thead><tr><th style={{ paddingLeft: 20 }}>Giờ</th><th>Khoản Chi</th><th>Người Nhập</th><th>Ví Chi</th><th className="amount" style={{ paddingRight: 20 }}>Số Tiền</th></tr></thead>
                  <tbody>{data.cp.map((cp, i) => {
                    const method = METHODS[cp.hinh_thuc_thanh_toan || 'tien_mat'] || METHODS.tien_mat
                    const dm = data.dmMap[cp.danh_muc_id]
                    return (
                      <tr key={cp.id || i}>
                        <td className="time" style={{ paddingLeft: 20 }}>{cp.created_at ? new Date(cp.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                        <td><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{dm ? `${dm.icon || ''} ${dm.ten}` : 'Chi phí'}</div><div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{cp.dien_giai || 'Không có diễn giải'}</div></td>
                        <td style={{ color: 'var(--ink3)', fontSize: 12 }}>{cp.nguoi_nhap || '-'}</td>
                        <td><span className="method cash" style={{ color: method.color, background: method.bg }}>{method.label}</span></td>
                        <td className="amount" style={{ ...moneyStyle, paddingRight: 20, color: '#843a23', fontWeight: 800 }}>−{formatCurrency(cp.so_tien)}</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <div className="card-h">
              <div className="card-t"><div className="arch-i"><I.Wallet style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Đề Xuất Tất Toán</h3><span className="sub">Hệ thống tự tính, Lễ Tân chỉ kiểm tra và xác nhận</span></div>
            </div>
            <div className="card-b" style={{ display: 'grid', gap: 12 }}>
              <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: 'var(--surface)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 750 }}>Công thức tiền mặt</div>
                <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                  <div className="rec-row"><span>Thu tiền mặt bán hàng</span><b>{formatCurrency(data.tienMat)}</b></div>
                  <div className="rec-row"><span>Chi tiền mặt trong ngày</span><b style={{ color: '#843a23' }}>−{formatCurrency(data.chiTienMat)}</b></div>
                  <div className="rec-row"><span>{data.tonDuongChuaNopTruoc > 0 ? 'Tồn chưa nộp trước đó' : 'Âm treo trước đó'}</span><b style={{ color: data.tonDuongChuaNopTruoc > 0 ? '#3e5a32' : '#843a23' }}>{data.tonDuongChuaNopTruoc > 0 ? '+' : '−'}{formatCurrency(data.tonDuongChuaNopTruoc || data.amTreoTruoc)}</b></div>
                  {data.daNopTienMat > 0 && <div className="rec-row"><span>Đã nộp trong ngày</span><b>−{formatCurrency(data.daNopTienMat)}</b></div>}
                  <div className="rec-row tot"><span>Cần nộp MB hôm nay</span><b style={{ color: '#3e5a32' }}>{formatCurrency(data.tienMatPhaiNop)}</b></div>
                </div>
              </div>

              {data.amTreoSau > 0 ? (
                <div style={{ border: '1px solid #d8a58a', borderRadius: 12, padding: 14, background: '#fff8f3', color: '#843a23' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800 }}>Ngày này chi tiền mặt lớn hơn thu tiền mặt.</div>
                  <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.45 }}>Hệ thống tự treo âm {formatCurrency(data.amTreoSau)} sang ngày sau. Khi ngày sau có thu tiền mặt, số này sẽ được bù trước rồi mới đề xuất nộp MB.</div>
                </div>
              ) : (
                <div style={{ border: '1px solid #c9ddbd', borderRadius: 12, padding: 14, background: '#f3f8ef', color: '#3e5a32' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800 }}>{data.tienMatPhaiNop > 0 ? `Đề xuất nộp ${formatCurrency(data.tienMatPhaiNop)} vào MB Bank.` : 'Không có tiền mặt cần nộp hôm nay.'}</div>
                  <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.45 }}>Khi bấm chốt, hệ thống tự tạo giao dịch chuyển tiền mặt sang MB Bank theo số đề xuất.</div>
                </div>
              )}

              <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: 'var(--surface)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 750, marginBottom: 8 }}>Ngân hàng cần kiểm trên app</div>
                <div className="rec-row"><span>MB Bank từ bán hàng</span><b>{formatCurrency(data.mb)}</b></div>
                <div className="rec-row"><span>TP Bank/quẹt thẻ từ bán hàng</span><b>{formatCurrency(data.tp)}</b></div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.45, marginTop: 8 }}>Lễ Tân đối chiếu số lệnh MB/TP trên app ngân hàng/máy quẹt. Nếu có sai, xử lý ở đơn bán hàng hoặc ghi chú bên dưới.</div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 750 }}>Ghi chú chốt ngày {closeProposal.needsNote ? '(bắt buộc)' : ''}</label>
                <textarea disabled={isLocked} value={giaiTrinh} onChange={e => setGiaiTrinh(e.target.value)} rows={3} placeholder="Ví dụ: đã kiểm MB/TP khớp, chi tiền mặt đúng chứng từ, có âm treo do chi vượt thu..." style={{ width: '100%', marginTop: 6, border: '1px solid var(--line)', borderRadius: 10, padding: 12, outline: 'none', resize: 'vertical', background: 'var(--surface2)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 13 }} />
              </div>

              <button onClick={saveClose} disabled={saving || isLocked || !dbReady} style={{ width: '100%', padding: 15, borderRadius: 'var(--r)', border: 'none', color: '#f8efe1', fontSize: 15, fontWeight: 800, cursor: saving || isLocked || !dbReady ? 'not-allowed' : 'pointer', background: saving || isLocked || !dbReady ? 'var(--ink3)' : 'linear-gradient(135deg,#d4a574,#8a6a52)', boxShadow: saving || isLocked || !dbReady ? 'none' : '0 10px 22px rgba(138,106,82,.22)', fontFamily: 'var(--sans)' }}>
                {isLocked ? 'Đã được Admin duyệt' : saving ? 'Đang tất toán...' : data.tienMatPhaiNop > 0 ? `Chốt Ngày & Nộp ${formatCurrency(data.tienMatPhaiNop)}` : 'Chốt Ngày & Gửi Admin'}
              </button>
            </div>
          </div>

          {closeRow && (
            <div className="card">
              <div className="card-h">
                <div className="card-t"><div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Trạng Thái Phiếu Chốt</h3></div>
              </div>
              <div className="card-b" style={{ display: 'grid', gap: 10 }}>
                <div className="rec-row"><span>Người chốt</span><b>{closeRow.nguoi_chot || '-'}</b></div>
                <div className="rec-row"><span>Thời gian</span><b>{closeRow.chot_luc ? new Date(closeRow.chot_luc).toLocaleString('vi-VN') : '-'}</b></div>
                <div className="rec-row tot"><span>Trạng thái</span><b>{closeRow.trang_thai}</b></div>
                {isAdmin && closeRow.trang_thai !== 'approved' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={() => approveClose('rejected')} disabled={saving} className="btn" style={{ justifyContent: 'center' }}>Trả Lại</button>
                    <button onClick={() => approveClose('approved')} disabled={saving} className="btn gold" style={{ justifyContent: 'center' }}>Duyệt Chốt</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
