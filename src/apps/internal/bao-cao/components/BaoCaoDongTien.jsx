import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, getNowVN, formatDateInput } from '../../../../lib/utils'

export default function BaoCaoDongTien({ onBack }) {
  const now = getNowVN()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(currentMonth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [year, m] = month.split('-')
        const start = `${year}-${m}-01`
        const lastDay = new Date(parseInt(year), parseInt(m), 0).getDate()
        const end = `${year}-${m}-${String(lastDay).padStart(2, '0')}`

        const [{ data: dtData }, { data: cpData }] = await Promise.all([
          supabase.from('doanh_thu').select('so_tien, hinh_thuc').gte('ngay', start).lte('ngay', end),
          supabase.from('chi_phi').select('so_tien, danh_muc_id, phan_loai_dong_tien').gte('ngay', start).lte('ngay', end),
        ])

        const thucThu = (dtData || []).filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + r.so_tien, 0)

        // Group chi phí by phan_loai (default to 'hoat_dong')
        const groups = { hoat_dong: 0, dau_tu: 0, tai_chinh: 0 }
        ;(cpData || []).forEach(r => {
          const loai = r.phan_loai_dong_tien || 'hoat_dong'
          if (groups[loai] !== undefined) groups[loai] += r.so_tien
          else groups.hoat_dong += r.so_tien
        })

        const hdkd = thucThu - groups.hoat_dong
        const hddt = -groups.dau_tu
        const hdtc = -groups.tai_chinh
        const tong = hdkd + hddt + hdtc

        setData({ thucThu, chiHoatDong: groups.hoat_dong, chiDauTu: groups.dau_tu, chiTaiChinh: groups.tai_chinh, hdkd, hddt, hdtc, tong })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [month])

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-')
    return `Tháng ${parseInt(m)}/${y}`
  }, [month])

  const months = useMemo(() => {
    const list = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return list
  }, [])

  const Section = ({ title, rows, subtotal, subtotalLabel, color }) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontWeight: '700', fontSize: '12px', color: LUX.taupe, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontFamily: LUX.fontSans }}>
        {title}
      </div>
      <div style={{ background: LUX.surface2, borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${LUX.line}` : 'none' }}>
            <span style={{ fontSize: '13px', color: LUX.ink, fontFamily: LUX.fontSans }}>{row.label}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', color: row.amount >= 0 ? '#2D7A4F' : '#C0392B', fontFamily: LUX.fontMono }}>
              {row.amount >= 0 ? '+' : ''}{formatCurrency(row.amount)}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: color || '#FFF9F0', borderTop: `2px solid ${LUX.line}` }}>
          <span style={{ fontWeight: '800', fontSize: '13px', color: LUX.ink, fontFamily: LUX.fontSans }}>{subtotalLabel || 'Lưu chuyển thuần'}</span>
          <span style={{ fontWeight: '800', fontSize: '15px', color: subtotal >= 0 ? '#2D7A4F' : '#C0392B', fontFamily: LUX.fontMono }}>
            {subtotal >= 0 ? '+' : ''}{formatCurrency(subtotal)}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '24px 16px', paddingBottom: '100px', background: LUX.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ width: '36px', height: '36px', borderRadius: '50%', background: LUX.surface2, border: `1px solid ${LUX.line}`, color: LUX.ink, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Báo Cáo Dòng Tiền</h2>
          <p style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Cash Flow Statement (Direct Method)</p>
        </div>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {months.map(m => (
          <button key={m} onClick={() => setMonth(m)}
            style={{ padding: '6px 14px', borderRadius: '20px', border: month === m ? `2px solid ${LUX.taupe}` : `1px solid ${LUX.line}`, background: month === m ? LUX.surface : LUX.surface2, fontWeight: month === m ? '700' : '500', fontSize: '12px', color: month === m ? LUX.taupe : LUX.ink3, cursor: 'pointer', fontFamily: LUX.fontSans }}>
            T{parseInt(m.split('-')[1])}/{m.split('-')[0].slice(2)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải dữ liệu...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Không có dữ liệu</div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', color: LUX.ink3, textTransform: 'uppercase', fontFamily: LUX.fontSans }}>{monthLabel}</div>
          </div>

          <Section
            title="I. Dòng Tiền Từ Hoạt Động Kinh Doanh"
            rows={[
              { label: '(+) Doanh thu thực thu', amount: data.thucThu },
              { label: '(-) Chi phí hoạt động', amount: -data.chiHoatDong },
            ]}
            subtotal={data.hdkd}
            subtotalLabel="(=) Lưu chuyển thuần từ HĐKD"
            color="#F0FDF4"
          />

          <Section
            title="II. Dòng Tiền Từ Hoạt Động Đầu Tư"
            rows={[
              { label: '(-) Chi mua sắm, đầu tư', amount: -data.chiDauTu },
            ]}
            subtotal={data.hddt}
            subtotalLabel="(=) Lưu chuyển thuần từ HĐĐT"
            color="#EFF6FF"
          />

          <Section
            title="III. Dòng Tiền Từ Hoạt Động Tài Chính"
            rows={[
              { label: '(-) Chi tài chính, chuyển tiền', amount: -data.chiTaiChinh },
            ]}
            subtotal={data.hdtc}
            subtotalLabel="(=) Lưu chuyển thuần từ HĐTC"
            color="#FDF4FF"
          />

          {/* Tổng */}
          <div style={{ background: LUX.heroGrad, borderRadius: LUX.radiusLg, padding: '20px', color: 'white', textAlign: 'center', boxShadow: LUX.shadow }}>
            <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px', fontFamily: LUX.fontSans }}>
              IV. Tổng Lưu Chuyển Tiền Thuần
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', fontFamily: LUX.fontMono }}>
              {data.tong >= 0 ? '+' : ''}{formatCurrency(data.tong)}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px', fontFamily: LUX.fontSans }}>
              {data.tong >= 0 ? 'Dòng tiền dương — Doanh nghiệp đang tạo ra tiền mặt' : 'Dòng tiền âm — Cần kiểm soát chi tiêu'}
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: '#FFF9F0', borderRadius: '12px', border: '1px solid #F0C080' }}>
            <div style={{ fontSize: '11px', color: '#8B6914', fontFamily: LUX.fontSans }}>
              💡 <b>Ghi chú:</b> Chi phí mặc định phân loại "Hoạt động". Để phân loại Đầu tư/Tài chính, cập nhật cột <code>phan_loai_dong_tien</code> trong bảng <code>danh_muc_chi_phi</code>.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
