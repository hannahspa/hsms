import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import LuckyWheel from '../../components/shared/LuckyWheel'

// ═══════════════════════════════════════════════════════════════════════
// Trang KHÁCH QUAY — mở trên iPad tại quầy. Nhập SĐT → quay → trúng gì lưu
// (gán khách), voucher sinh mã riêng + lưu CRM. Route /quay (public).
// ═══════════════════════════════════════════════════════════════════════

const GOLD = '#C9A96E', ESP = '#1A1209'

export default function CustomerWheelApp() {
  const [config, setConfig] = useState([])
  const [buoc, setBuoc] = useState('nhap')        // nhap | quay | ketqua
  const [phone, setPhone] = useState('')
  const [ten, setTen] = useState('')
  const [ketqua, setKetqua] = useState(null)
  const [voucher, setVoucher] = useState(null)
  const [dangGhi, setDangGhi] = useState(false)
  const tongRef = useRef(0)

  useEffect(() => {
    supabase.rpc('vong_quay_lay_config').then(({ data }) => {
      const arr = Array.isArray(data) ? data : []
      setConfig(arr)
      tongRef.current = arr.reduce((s, it) => s + (+it.ty_le || 0), 0)
    })
  }, [])

  const pickIndex = useCallback(() => {
    const items = config, tong = tongRef.current || 1
    let r = Math.random() * tong
    for (let i = 0; i < items.length; i++) { r -= (+items[i].ty_le || 0); if (r <= 0) return i }
    return items.length - 1
  }, [config])

  const onResult = useCallback(async (item) => {
    setKetqua(item); setVoucher(null)
    if (item.loai === 'them_luot') { setBuoc('themluot'); return }
    setDangGhi(true)
    try {
      const { data } = await supabase.rpc('vong_quay_ghi', {
        p_phone: phone, p_ten: ten || null, p_label: item.label,
        p_loai: item.loai, p_nhom: item.nhom || null, p_phan_tram: item.phan_tram || null,
      })
      if (data?.voucher_code) setVoucher(data.voucher_code)
    } catch (e) { /* vẫn hiện kết quả */ }
    setDangGhi(false); setBuoc('ketqua')
  }, [phone, ten])

  const batDau = () => {
    const p = phone.replace(/\D/g, '')
    if (p.length < 9) return
    setBuoc('quay')
  }
  const lamMoi = () => { setPhone(''); setTen(''); setKetqua(null); setVoucher(null); setBuoc('nhap') }
  const quayTiep = () => { setKetqua(null); setBuoc('quay') }

  const wrap = {
    minHeight: '100vh', width: '100%',
    background: `radial-gradient(120% 80% at 50% 0%, #2A1A0F 0%, ${ESP} 60%, #0E0905 100%)`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 24, boxSizing: 'border-box', fontFamily: "'Inter',-apple-system,sans-serif",
  }

  return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: "'Lora','Playfair Display',serif", fontSize: 34, fontWeight: 700, color: '#F5EDE0', letterSpacing: '.5px' }}>
          Hannah Beauty &amp; Spa
        </div>
        <div style={{ color: GOLD, fontSize: 16, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>
          🎡 Vòng Quay May Mắn
        </div>
      </div>

      {/* BƯỚC NHẬP SĐT */}
      {buoc === 'nhap' && (
        <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(201,169,110,.35)`, borderRadius: 22, padding: 30, width: 'min(440px, 92vw)', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
          <div style={{ color: '#F5EDE0', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Mời quý khách nhập số điện thoại</div>
          <div style={{ color: 'rgba(245,237,224,.6)', fontSize: 13, marginBottom: 18 }}>Để Hannah lưu phần quà may mắn cho bạn</div>
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="numeric" placeholder="Số điện thoại"
            style={{ width: '100%', padding: '15px 18px', fontSize: 20, textAlign: 'center', letterSpacing: 2, borderRadius: 14, border: 'none', outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontWeight: 700, color: ESP }} />
          <input value={ten} onChange={e => setTen(e.target.value)} placeholder="Tên (không bắt buộc)"
            style={{ width: '100%', padding: '13px 18px', fontSize: 15, textAlign: 'center', borderRadius: 14, border: 'none', outline: 'none', marginBottom: 18, boxSizing: 'border-box', color: ESP }} />
          <button onClick={batDau} disabled={phone.replace(/\D/g, '').length < 9}
            style={{ width: '100%', padding: 16, fontSize: 17, fontWeight: 800, color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer',
              background: 'linear-gradient(135deg,#C9A96E,#A0714F 55%,#7D5A3C)', opacity: phone.replace(/\D/g, '').length < 9 ? 0.5 : 1 }}>
            BẮT ĐẦU QUAY →
          </button>
        </div>
      )}

      {/* BƯỚC QUAY */}
      {(buoc === 'quay' || buoc === 'themluot') && (
        <>
          <LuckyWheel items={config} pickIndex={pickIndex} onResult={onResult} size={Math.min(520, window.innerWidth - 48)} />
          <div style={{ marginTop: 14, color: 'rgba(245,237,224,.7)', fontSize: 14 }}>
            {dangGhi ? 'Đang lưu phần quà…' : buoc === 'themluot' ? '🔄 Bạn được THÊM 1 LƯỢT — quay tiếp nhé!' : `SĐT: ${phone}  ·  Bấm QUAY ở giữa`}
          </div>
          {buoc === 'quay' && <button onClick={lamMoi} style={{ marginTop: 12, background: 'none', border: '1px solid rgba(201,169,110,.4)', color: GOLD, borderRadius: 10, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>← Khách khác</button>}
        </>
      )}

      {/* BƯỚC KẾT QUẢ */}
      {buoc === 'ketqua' && ketqua && (
        <div style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(201,169,110,.4)`, borderRadius: 24, padding: '34px 28px', width: 'min(460px, 92vw)', textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>{ketqua.loai === 'chuc' ? '🍀' : '🎉'}</div>
          <div style={{ color: 'rgba(245,237,224,.75)', fontSize: 15, marginTop: 6 }}>
            {ketqua.loai === 'chuc' ? 'Chúc bạn may mắn lần sau!' : 'Chúc mừng! Bạn nhận được'}
          </div>
          <div style={{ fontFamily: "'Lora',serif", color: GOLD, fontSize: 40, fontWeight: 800, margin: '4px 0 2px' }}>{ketqua.label}</div>
          {ketqua.mota && <div style={{ color: 'rgba(245,237,224,.6)', fontSize: 14 }}>{ketqua.mota}</div>}

          {voucher && (
            <div style={{ marginTop: 20, background: 'linear-gradient(135deg,#C9A96E,#A0714F 60%,#7D5A3C)', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 12.5 }}>Mã ưu đãi riêng của bạn — đọc cho lễ tân khi thanh toán</div>
              <div style={{ color: '#fff', fontSize: 30, fontWeight: 900, letterSpacing: 2, marginTop: 4 }}>{voucher}</div>
            </div>
          )}

          <button onClick={lamMoi} style={{ marginTop: 22, width: '100%', padding: 15, fontSize: 16, fontWeight: 800, color: ESP, border: 'none', borderRadius: 14, cursor: 'pointer', background: GOLD }}>
            Khách tiếp theo →
          </button>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 12, color: 'rgba(245,237,224,.35)', fontSize: 11 }}>
        39 Nam Kỳ Khởi Nghĩa, Cần Thơ · Hannah Beauty &amp; Spa
      </div>
    </div>
  )
}
