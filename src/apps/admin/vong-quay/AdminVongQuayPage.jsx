import { useState, useCallback } from 'react'
import { C } from '../../../constants/colors'
import LuckyWheel from '../../../components/shared/LuckyWheel'

// Phần thưởng mặc định (8 ô) — gắn với hệ voucher Hannah. Sẽ lưu DB + gán POS ở bước sau.
const O_MAC_DINH = [
  { icon: '💧', label: 'Giảm 50%',   loai: 'voucher', nhom: 'cham_soc_da', phan_tram: 50, ty_le: 12 },
  { icon: '🍀', label: 'May mắn',    loai: 'chuc',                          ty_le: 22 },
  { icon: '💆', label: 'Giảm 40%',   loai: 'voucher', nhom: 'thu_gian',    phan_tram: 40, ty_le: 16 },
  { icon: '🎁', label: 'Voucher 100K', loai: 'tien',  gia_tri: 100000,      ty_le: 6 },
  { icon: '✨', label: 'Giảm 70%',   loai: 'voucher', nhom: 'triet_long',  phan_tram: 70, ty_le: 5 },
  { icon: '🔄', label: 'Thêm lượt',  loai: 'them_luot',                     ty_le: 14 },
  { icon: '💎', label: 'Giảm 20%',   loai: 'voucher', nhom: 'thu_gian',    phan_tram: 20, ty_le: 18 },
  { icon: '🎀', label: 'Quà bí mật', loai: 'qua',                           ty_le: 7 },
]

export default function AdminVongQuayPage() {
  const [items, setItems] = useState(O_MAC_DINH)
  const [ketqua, setKetqua] = useState(null)
  const [lichSu, setLichSu] = useState([])

  const tongTyLe = items.reduce((s, it) => s + (+it.ty_le || 0), 0)

  // Chọn ô trúng theo tỷ lệ % cấu hình
  const pickIndex = useCallback(() => {
    let r = Math.random() * tongTyLe
    for (let i = 0; i < items.length; i++) { r -= (+items[i].ty_le || 0); if (r <= 0) return i }
    return items.length - 1
  }, [items, tongTyLe])

  const onResult = useCallback((item, idx) => {
    setKetqua(item)
    setLichSu(ls => [{ ...item, luc: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }, ...ls].slice(0, 8))
  }, [])

  const setO = (i, k, v) => setItems(arr => arr.map((it, j) => j === i ? { ...it, [k]: v } : it))

  return (
    <>
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Vòng Quay May Mắn 🎡</div>
          <div className="sub">Bánh xe quà tặng — thu hút khách & tặng voucher riêng. Sắp tới gắn vào POS (mua thẻ → tặng lượt quay)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(440px, 1fr) 1fr', gap: 24, alignItems: 'start' }}>
        {/* ── Bánh xe ── */}
        <div style={{ background: C.heroGrad, borderRadius: 24, padding: '30px 20px 26px', textAlign: 'center', boxShadow: C.shadowLg }}>
          <div style={{ fontFamily: 'var(--serif, serif)', fontSize: 24, fontWeight: 700, color: '#F5EDE0', letterSpacing: '.4px' }}>
            Hannah Lucky Wheel
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(245,237,224,.7)', marginBottom: 22 }}>Quay là trúng — ưu đãi mỗi ngày</div>

          <LuckyWheel items={items} pickIndex={pickIndex} onResult={onResult} size={420} />

          <div style={{ marginTop: 22, minHeight: 30 }}>
            {ketqua ? (
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(201,169,110,.4)', borderRadius: 14, padding: '10px 22px' }}>
                <span style={{ color: '#F5EDE0', fontSize: 13 }}>🎉 Khách trúng: </span>
                <span style={{ color: C.gold, fontWeight: 800, fontSize: 16 }}>{ketqua.icon} {ketqua.label}</span>
              </div>
            ) : (
              <div style={{ color: 'rgba(245,237,224,.55)', fontSize: 12.5 }}>Bấm QUAY ở giữa bánh xe để thử</div>
            )}
          </div>
        </div>

        {/* ── Cấu hình phần thưởng ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>⚙️ Phần thưởng & tỷ lệ trúng</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: Math.round(tongTyLe) === 100 ? C.thu : C.warn }}>
                Tổng tỷ lệ: {tongTyLe}%
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.bg, borderRadius: 10 }}>
                  <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{it.icon}</span>
                  <input value={it.label} onChange={e => setO(i, 'label', e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: '#fff', color: C.text, outline: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" value={it.ty_le} onChange={e => setO(i, 'ty_le', e.target.value)}
                      style={{ width: 58, padding: '7px 8px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: '#fff', color: C.text, outline: 'none', textAlign: 'center' }} />
                    <span style={{ fontSize: 12, color: C.textSub }}>%</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: C.textMute, marginTop: 10, lineHeight: 1.5 }}>
              Tỷ lệ % quyết định khả năng trúng từng ô (admin tự chỉnh — vòng quay "có kiểm soát", không hên xui). Ô voucher khi trúng sẽ sinh <b>mã riêng cho khách</b> và lưu vào hồ sơ CRM.
            </div>
          </div>

          {/* Lịch sử quay (demo phiên hiện tại) */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10 }}>🕘 Lượt quay thử gần đây</div>
            {!lichSu.length ? (
              <div style={{ fontSize: 13, color: C.textMute }}>Chưa có lượt quay nào.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lichSu.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ color: C.text, fontWeight: 600 }}>{l.icon} {l.label}</span>
                    <span style={{ color: C.textMute }}>{l.luc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(201,169,110,0.10)', border: `1px solid ${C.gold}`, borderRadius: 12, padding: '12px 16px', fontSize: 12.5, color: C.primaryDark, lineHeight: 1.6 }}>
            🔜 <b>Bước tiếp theo</b> (sau khi anh duyệt giao diện): lưu cấu hình vào DB · gắn vào POS (khách mua thẻ → tặng 1 lượt quay) · trúng voucher → sinh mã riêng lưu hồ sơ khách · khi khách quay lại, POS gợi ý Lễ Tân "khách có mã KM đặc biệt".
          </div>
        </div>
      </div>
    </>
  )
}
