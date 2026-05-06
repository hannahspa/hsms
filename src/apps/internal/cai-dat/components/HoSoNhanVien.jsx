import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency } from '../../../../lib/utils'

export default function HoSoNhanVien({ onClose }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('nhan_vien')
        .select('ho_ten, vi_tri, luong_cung, trang_thai, gioi_han_off_thang')
        .order('ho_ten')
      if (data) setList(data)
      setLoading(false)
    }
    load()
  }, [])

  const viTriLabel = (vt) => {
    const map = { ktv: 'KTV', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ' }
    return map[vt] || vt
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 600 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Hồ Sơ Nhân Viên</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>
        <p style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '16px', fontFamily: LUX.fontSans }}>
          {list.length} nhân viên — chỉnh sửa trong Admin Dashboard
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
        ) : list.map((nv, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: nv.trang_thai === 'dang_lam' ? '#F0FDF4' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: nv.trang_thai === 'dang_lam' ? '#2D7A4F' : '#C0392B', fontFamily: LUX.fontSans }}>
                {nv.ho_ten?.charAt(0) || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSans }}>{nv.ho_ten}</div>
                <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                  {viTriLabel(nv.vi_tri)} • Lương cứng {formatCurrency(nv.luong_cung)} • OFF {nv.gioi_han_off_thang || 3} ngày/tháng
                </div>
              </div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: nv.trang_thai === 'dang_lam' ? '#86EFAC' : '#FCA5A5' }} />
            </div>
            {i < list.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
