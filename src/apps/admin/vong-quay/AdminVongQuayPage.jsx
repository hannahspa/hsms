import { useState, useCallback, useEffect } from 'react'
import { C } from '../../../constants/colors'
import { supabase } from '../../../lib/supabase'
import LuckyWheel from '../../../components/shared/LuckyWheel'

// Phần thưởng dựng theo CTKM thật của Hannah (voucher Da/Thư giãn/Triệt + ưu đãi phụ).
// Voucher giá trị cao → tỷ lệ thấp; may mắn/thêm lượt/giảm nhẹ → tỷ lệ cao (cân đối chi phí).
const buildPT = (da = 50, thu = 40, triet = 70) => [
  { label: `Giảm ${da}%`, mota: 'Chăm Sóc Da',           loai: 'voucher', nhom: 'cham_soc_da', phan_tram: da,  ty_le: 8 },
  { label: 'May mắn',     mota: 'Chúc may mắn lần sau',   loai: 'chuc',                                       ty_le: 24 },
  { label: `Giảm ${thu}%`, mota: 'Thư Giãn · Gội / Massage', loai: 'voucher', nhom: 'thu_gian', phan_tram: thu, ty_le: 12 },
  { label: 'Voucher 100K', mota: 'Trừ trực tiếp hóa đơn', loai: 'tien', gia_tri: 100000,                      ty_le: 5 },
  { label: `Giảm ${triet}%`, mota: 'Triệt Lông',          loai: 'voucher', nhom: 'triet_long', phan_tram: triet, ty_le: 4 },
  { label: 'Thêm lượt',   mota: 'Quay thêm 1 lần',        loai: 'them_luot',                                  ty_le: 16 },
  { label: 'Giảm 20%',    mota: 'Áp dụng mọi dịch vụ',    loai: 'voucher', nhom: 'thu_gian', phan_tram: 20,    ty_le: 22 },
  { label: 'Quà tặng',    mota: 'Quà nhỏ tặng tại spa',   loai: 'qua',                                        ty_le: 9 },
]

export default function AdminVongQuayPage() {
  const [items, setItems] = useState(buildPT())
  const [ketqua, setKetqua] = useState(null)
  const [lichSu, setLichSu] = useState([])
  const [nguong, setNguong] = useState(1000000)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // Lấy % voucher thật + ngưỡng chi tiêu đã lưu
  useEffect(() => {
    supabase.from('voucher_nhom_config').select('nhom, phan_tram').then(({ data }) => {
      if (!data?.length) return
      const m = Object.fromEntries(data.map(d => [d.nhom, d.phan_tram]))
      setItems(buildPT(m.cham_soc_da ?? 50, m.thu_gian ?? 40, m.triet_long ?? 70))
    })
    supabase.from('marketing_ai_config').select('value').eq('key', 'vong_quay_nguong').maybeSingle()
      .then(({ data }) => { if (data?.value) setNguong(+data.value) })
    supabase.from('marketing_ai_config').select('value').eq('key', 'vong_quay_config').maybeSingle()
      .then(({ data }) => { try { const a = JSON.parse(data?.value); if (Array.isArray(a) && a.length) setItems(a) } catch {} })
  }, [])

  const luuCauHinh = async () => {
    setSaving(true)
    const clean = items.map(({ label, mota, loai, nhom, phan_tram, gia_tri, ty_le }) => ({ label, mota, loai, nhom, phan_tram, gia_tri, ty_le }))
    const { error } = await supabase.from('marketing_ai_config').upsert([
      { key: 'vong_quay_config', value: JSON.stringify(clean) },
      { key: 'vong_quay_nguong', value: String(nguong) },
    ], { onConflict: 'key' })
    setSaving(false)
    setToast(error ? '❌ Lỗi: ' + error.message : '✅ Đã lưu cấu hình vòng quay!')
    setTimeout(() => setToast(''), 2800)
  }

  const tongTyLe = items.reduce((s, it) => s + (+it.ty_le || 0), 0)

  const pickIndex = useCallback(() => {
    let r = Math.random() * tongTyLe
    for (let i = 0; i < items.length; i++) { r -= (+items[i].ty_le || 0); if (r <= 0) return i }
    return items.length - 1
  }, [items, tongTyLe])

  const onResult = useCallback((item) => {
    setKetqua(item)
    setLichSu(ls => [{ ...item, luc: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }, ...ls].slice(0, 8))
  }, [])

  const setO = (i, k, v) => setItems(arr => arr.map((it, j) => j === i ? { ...it, [k]: v } : it))

  return (
    <>
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Vòng Quay May Mắn 🎡</div>
          <div className="sub">Khách quay trên iPad tại quầy · trúng voucher sinh mã riêng lưu hồ sơ. Mở cho khách: <b>hannahspa.vn/quay</b></div>
        </div>
        <div className="acts" style={{ display: 'flex', gap: 10 }}>
          <a href="/quay" target="_blank" rel="noreferrer" className="btn" style={{ textDecoration: 'none' }}>↗ Mở trang khách</a>
          <button className="btn gold" onClick={luuCauHinh} disabled={saving}>{saving ? 'Đang lưu…' : '💾 Lưu cấu hình'}</button>
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
                <span style={{ color: C.gold, fontWeight: 800, fontSize: 16 }}>{ketqua.label}</span>
                {ketqua.mota && <span style={{ color: 'rgba(245,237,224,.7)', fontSize: 12 }}> · {ketqua.mota}</span>}
              </div>
            ) : (
              <div style={{ color: 'rgba(245,237,224,.55)', fontSize: 12.5 }}>Bấm QUAY ở giữa bánh xe để thử</div>
            )}
          </div>
        </div>

        {/* ── Cấu hình ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Điều kiện tham gia */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10 }}>🎯 Điều kiện tham gia</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: C.textSub }}>Khách chi tiêu trong ngày mỗi</span>
              <input type="number" value={nguong} onChange={e => setNguong(+e.target.value)} step={100000}
                style={{ width: 130, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, background: '#fff', color: C.text, outline: 'none', textAlign: 'right' }} />
              <span style={{ fontSize: 14, color: C.textSub }}>đ → <b style={{ color: C.primary }}>1 lượt quay</b></span>
            </div>
            <div style={{ fontSize: 11.5, color: C.textMute, marginTop: 8 }}>
              VD ngưỡng {new Intl.NumberFormat('vi-VN').format(nguong)}đ: khách chi {new Intl.NumberFormat('vi-VN').format(nguong * 2)}đ trong ngày → <b>2 lượt</b>. Nhập SĐT, hệ thống tự tính chi tiêu hôm nay &amp; số lượt.
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Phần thưởng &amp; tỷ lệ trúng</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: Math.round(tongTyLe) === 100 ? C.thu : C.warn }}>
                Tổng tỷ lệ: {tongTyLe}%
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: C.bg, borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input value={it.label} onChange={e => setO(i, 'label', e.target.value)}
                      style={{ width: '100%', padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13.5, fontWeight: 600, background: '#fff', color: C.text, outline: 'none' }} />
                    {it.mota && <div style={{ fontSize: 11, color: C.textMute, marginTop: 3, paddingLeft: 2 }}>{it.mota}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" value={it.ty_le} onChange={e => setO(i, 'ty_le', e.target.value)}
                      style={{ width: 58, padding: '7px 8px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: '#fff', color: C.text, outline: 'none', textAlign: 'center' }} />
                    <span style={{ fontSize: 12, color: C.textSub }}>%</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: C.textMute, marginTop: 10, lineHeight: 1.5 }}>
              % voucher (Da/Thư giãn/Triệt) lấy theo cấu hình ở <b>Khuyến Mãi → Voucher</b>. Voucher giá trị cao để tỷ lệ thấp, ô "may mắn / thêm lượt / giảm nhẹ" tỷ lệ cao để cân đối chi phí. Ô voucher khi trúng sẽ sinh <b>mã riêng cho khách</b> và lưu hồ sơ CRM.
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10 }}>🕘 Lượt quay thử gần đây</div>
            {!lichSu.length ? (
              <div style={{ fontSize: 13, color: C.textMute }}>Chưa có lượt quay nào.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lichSu.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ color: C.text, fontWeight: 600 }}>{l.label} <span style={{ color: C.textMute, fontWeight: 400 }}>{l.mota ? '· ' + l.mota : ''}</span></span>
                    <span style={{ color: C.textMute }}>{l.luc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(201,169,110,0.10)', border: `1px solid ${C.gold}`, borderRadius: 12, padding: '12px 16px', fontSize: 12.5, color: C.primaryDark, lineHeight: 1.6 }}>
            🔜 <b>Bước tiếp theo</b>: lưu cấu hình vào DB · gắn POS (khách mua thẻ → tặng 1 lượt quay) · trúng voucher → sinh mã riêng lưu hồ sơ khách · khi khách quay lại, POS gợi ý Lễ Tân "khách có mã KM đặc biệt".
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--espresso, #1A1209)', color: '#f5ede0', padding: '12px 24px', borderRadius: 999, fontWeight: 700, fontSize: 14, zIndex: 999, boxShadow: C.shadowLg }}>
          {toast}
        </div>
      )}
    </>
  )
}
