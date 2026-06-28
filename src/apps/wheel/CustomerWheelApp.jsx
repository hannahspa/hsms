import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import LuckyWheel from '../../components/shared/LuckyWheel'

// ═══════════════════════════════════════════════════════════════════════
// Trang KHÁCH QUAY — iPad tại quầy. Nhập SĐT → tự lấy tên + tính số lượt
// theo chi tiêu trong ngày (ngưỡng cấu hình admin). Quay → trúng → mã riêng.
// ═══════════════════════════════════════════════════════════════════════

const GOLD = '#C9A96E', PRIMARY = '#A0714F', ESP = '#7D5A3C', INK = '#1A1209'
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'

export default function CustomerWheelApp() {
  const [config, setConfig] = useState([])
  const [buoc, setBuoc] = useState('nhap')        // nhap | quay | ketqua | khongdu
  const [phone, setPhone] = useState('')
  const [kh, setKh] = useState(null)              // { ho_ten, khach_hang_id, so_luot_con, chi_tieu, nguong, so_dien_thoai }
  const [luotCon, setLuotCon] = useState(0)
  const [ketqua, setKetqua] = useState(null)
  const [voucher, setVoucher] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const tongRef = useRef(0)

  useEffect(() => {
    supabase.rpc('vong_quay_lay_config').then(({ data }) => {
      const arr = Array.isArray(data) ? data : []
      setConfig(arr); tongRef.current = arr.reduce((s, it) => s + (+it.ty_le || 0), 0)
    })
  }, [])

  const pickIndex = useCallback(() => {
    const items = config, tong = tongRef.current || 1
    let r = Math.random() * tong
    for (let i = 0; i < items.length; i++) { r -= (+items[i].ty_le || 0); if (r <= 0) return i }
    return items.length - 1
  }, [config])

  const kiemTra = async () => {
    const p = phone.replace(/\D/g, '')
    if (p.length < 9) return
    setLoading(true); setMsg('')
    try {
      const { data } = await supabase.rpc('vong_quay_kiem_tra', { p_phone: phone })
      if (!data?.ok) { setMsg(data?.ly_do || 'Không tìm thấy khách hàng'); setBuoc('khongdu'); setKh(data); }
      else if ((data.so_luot_con || 0) <= 0) { setKh(data); setBuoc('khongdu') }
      else { setKh(data); setLuotCon(data.so_luot_con); setBuoc('quay') }
    } catch (e) { setMsg('Có lỗi, vui lòng thử lại') } finally { setLoading(false) }
  }

  const onResult = useCallback(async (item) => {
    setKetqua(item); setVoucher(null)
    const conLai = item.loai === 'them_luot' ? luotCon : luotCon - 1
    if (item.loai !== 'them_luot') setLuotCon(Math.max(0, conLai))
    try {
      const { data } = await supabase.rpc('vong_quay_ghi', {
        p_phone: kh?.so_dien_thoai || phone, p_ten: kh?.ho_ten || null, p_label: item.label,
        p_loai: item.loai, p_nhom: item.nhom || null, p_phan_tram: item.phan_tram || null,
      })
      if (data?.voucher_code) setVoucher(data.voucher_code)
    } catch (e) { /* vẫn hiện kết quả */ }
    setBuoc('ketqua')
  }, [kh, phone, luotCon])

  const lamMoi = () => { setPhone(''); setKh(null); setLuotCon(0); setKetqua(null); setVoucher(null); setMsg(''); setBuoc('nhap') }
  const quayTiep = () => { setKetqua(null); setVoucher(null); setBuoc('quay') }

  const wrap = {
    minHeight: '100vh', width: '100%',
    background: 'radial-gradient(130% 90% at 50% -10%, #FFFFFF 0%, #FBF4E9 45%, #F2E6CF 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 24, boxSizing: 'border-box', fontFamily: "'Inter',-apple-system,sans-serif", color: INK,
  }
  const card = { background: '#fff', border: `1px solid rgba(160,113,79,.18)`, borderRadius: 24, boxShadow: '0 14px 50px rgba(139,94,60,.16)' }

  return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: "'Lora','Playfair Display',serif", fontSize: 34, fontWeight: 700, color: INK, letterSpacing: '.5px' }}>
          Hannah Beauty &amp; Spa
        </div>
        <div style={{ color: PRIMARY, fontSize: 15, fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', marginTop: 2 }}>
          🎡 Vòng Quay May Mắn
        </div>
      </div>

      {/* NHẬP SĐT */}
      {buoc === 'nhap' && (
        <div style={{ ...card, padding: 30, width: 'min(440px, 92vw)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Mời quý khách nhập số điện thoại</div>
          <div style={{ color: ESP, fontSize: 13, marginBottom: 20 }}>Hệ thống tự nhận diện khách hàng &amp; số lượt quay</div>
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="numeric" placeholder="Số điện thoại"
            onKeyDown={e => e.key === 'Enter' && kiemTra()}
            style={{ width: '100%', padding: '16px 18px', fontSize: 22, textAlign: 'center', letterSpacing: 3, borderRadius: 14, border: `1.5px solid ${GOLD}`, outline: 'none', marginBottom: 16, boxSizing: 'border-box', fontWeight: 800, color: INK, background: '#FFFDF9' }} />
          <button onClick={kiemTra} disabled={phone.replace(/\D/g, '').length < 9 || loading}
            style={{ width: '100%', padding: 16, fontSize: 17, fontWeight: 800, color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer',
              background: 'linear-gradient(135deg,#C9A96E,#A0714F 55%,#7D5A3C)', opacity: (phone.replace(/\D/g, '').length < 9 || loading) ? 0.5 : 1 }}>
            {loading ? 'Đang kiểm tra…' : 'KIỂM TRA & QUAY →'}
          </button>
        </div>
      )}

      {/* CHƯA ĐỦ ĐIỀU KIỆN */}
      {buoc === 'khongdu' && (
        <div style={{ ...card, padding: 32, width: 'min(440px, 92vw)', textAlign: 'center' }}>
          <div style={{ fontSize: 50 }}>🙏</div>
          {kh?.ho_ten && <div style={{ fontSize: 19, fontWeight: 800, marginTop: 6 }}>Chào {kh.ho_ten}!</div>}
          {kh?.nguong ? (
            <div style={{ color: ESP, fontSize: 14.5, lineHeight: 1.6, marginTop: 8 }}>
              Chi tiêu hôm nay: <b style={{ color: INK }}>{fmt(kh.chi_tieu)}</b><br />
              Cần chi tiêu <b style={{ color: PRIMARY }}>mỗi {fmt(kh.nguong)}</b> để nhận <b>1 lượt quay</b>.<br />
              Quý khách chưa đủ điều kiện hôm nay.
            </div>
          ) : (
            <div style={{ color: ESP, fontSize: 14.5, marginTop: 8 }}>{msg || 'Chưa tìm thấy khách hàng'}</div>
          )}
          <button onClick={lamMoi} style={{ marginTop: 22, width: '100%', padding: 14, fontSize: 15, fontWeight: 800, color: PRIMARY, border: `1px solid ${GOLD}`, borderRadius: 14, cursor: 'pointer', background: '#fff' }}>← Nhập SĐT khác</button>
        </div>
      )}

      {/* QUAY */}
      {buoc === 'quay' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Chào {kh?.ho_ten} 👋 — </span>
            <span style={{ color: PRIMARY, fontWeight: 900, fontSize: 16 }}>còn {luotCon} lượt quay</span>
          </div>
          <LuckyWheel items={config} pickIndex={pickIndex} onResult={onResult} size={Math.min(520, window.innerWidth - 48)} />
          <button onClick={lamMoi} style={{ marginTop: 14, background: '#fff', border: `1px solid ${GOLD}`, color: PRIMARY, borderRadius: 10, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>← Khách khác</button>
        </>
      )}

      {/* KẾT QUẢ */}
      {buoc === 'ketqua' && ketqua && (
        <div style={{ ...card, padding: '34px 28px', width: 'min(460px, 92vw)', textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>{ketqua.loai === 'chuc' ? '🍀' : '🎉'}</div>
          <div style={{ color: ESP, fontSize: 15, marginTop: 6 }}>{ketqua.loai === 'chuc' ? 'Chúc bạn may mắn lần sau!' : 'Chúc mừng! Bạn nhận được'}</div>
          <div style={{ fontFamily: "'Lora',serif", color: PRIMARY, fontSize: 40, fontWeight: 800, margin: '4px 0 2px' }}>{ketqua.label}</div>
          {ketqua.mota && <div style={{ color: ESP, fontSize: 14 }}>{ketqua.mota}</div>}

          {voucher && (
            <div style={{ marginTop: 18, background: 'linear-gradient(135deg,#C9A96E,#A0714F 60%,#7D5A3C)', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 12.5 }}>Mã ưu đãi riêng — đọc cho lễ tân khi thanh toán</div>
              <div style={{ color: '#fff', fontSize: 30, fontWeight: 900, letterSpacing: 2, marginTop: 4 }}>{voucher}</div>
            </div>
          )}

          {ketqua.loai === 'them_luot'
            ? <div style={{ color: PRIMARY, fontWeight: 800, fontSize: 14, marginTop: 14 }}>🔄 Bạn được thêm 1 lượt!</div>
            : <div style={{ color: ESP, fontSize: 13.5, marginTop: 14 }}>Số lượt còn lại: <b>{luotCon}</b></div>}

          {luotCon > 0
            ? <button onClick={quayTiep} style={{ marginTop: 16, width: '100%', padding: 15, fontSize: 16, fontWeight: 800, color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', background: 'linear-gradient(135deg,#C9A96E,#A0714F 55%,#7D5A3C)' }}>🎡 Quay tiếp ({luotCon} lượt)</button>
            : <button onClick={lamMoi} style={{ marginTop: 16, width: '100%', padding: 15, fontSize: 16, fontWeight: 800, color: INK, border: 'none', borderRadius: 14, cursor: 'pointer', background: GOLD }}>Khách tiếp theo →</button>}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 12, color: 'rgba(125,90,60,.5)', fontSize: 11 }}>
        39 Nam Kỳ Khởi Nghĩa, Cần Thơ · Hannah Beauty &amp; Spa
      </div>
    </div>
  )
}
