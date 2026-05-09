import { useState } from 'react'
import { LUX } from '../../../constants/lux'
import { useAuth } from '../../../context/AuthContext'
import BaoCaoNgay from './components/BaoCaoNgay'
import BaoCaoTuan from './components/BaoCaoTuan'
import BaoCaoThang from './components/BaoCaoThang'
import BaoCaoNam from './components/BaoCaoNam'
import PhanTichDoanhThu from './components/PhanTichDoanhThu'
import PhanTichChiPhi from './components/PhanTichChiPhi'
import BaoCaoDongTien from './components/BaoCaoDongTien'
import LichSuNopTienMat from './components/LichSuNopTienMat'
import { getNowVN } from '../../../lib/utils'

function MiniBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.thu, d.chi)), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '60px', padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', background: '#2D7A4F', borderRadius: '3px 3px 0 0', height: `${(d.thu / maxVal) * 100}%`, minHeight: d.thu > 0 ? '4px' : '0' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', background: '#C0392B', borderRadius: '3px 3px 0 0', height: `${(d.chi / maxVal) * 100}%`, minHeight: d.chi > 0 ? '4px' : '0' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Dashboard({ onNavigate }) {
  const last5Months = Array.from({ length: 5 }, (_, i) => {
    const d = getNowVN()
    d.setMonth(d.getMonth() - (4 - i))
    return { label: `T${d.getMonth()+1}`, thu: 0, chi: 0 }
  })

  const baoCaoItems = [
    { id: 'bao-cao-ngay',  icon: '📋', label: 'Báo Cáo Ngày',  desc: 'Chi tiết thu chi từng ngày',      bg: '#FFF8F0', border: LUX.champagne },
    { id: 'bao-cao-tuan',  icon: '📅', label: 'Báo Cáo Tuần',  desc: 'Tổng hợp 7 ngày trong tuần',     bg: '#EFF6FF', border: '#7FA9D0' },
    { id: 'bao-cao-thang', icon: '📆', label: 'Báo Cáo Tháng', desc: 'Biểu đồ và phân tích theo tháng', bg: '#F0FDF4', border: '#7ABA8A' },
    { id: 'bao-cao-nam',   icon: '🗓️', label: 'Báo Cáo Năm',   desc: 'Tổng kết 12 tháng trong năm',    bg: '#FDF4FF', border: '#B87ABA' },
  ]

  const phanTichItems = [
    { id: 'bao-cao-dong-tien',     icon: '💵', label: 'Báo Cáo Dòng Tiền',  desc: 'Lưu chuyển tiền tệ chuẩn quốc tế', bg: '#FDF4FF', border: '#B87ABA' },
    { id: 'phan-tich-chi-phi',    icon: '📉', label: 'Phân Tích Chi Phí',   desc: 'Theo nhóm & hạng mục', bg: '#FEF2F2', border: '#E59898' },
    { id: 'phan-tich-doanh-thu',  icon: '📈', label: 'Phân Tích Doanh Thu', desc: 'Theo hình thức thu',   bg: '#F0FDF4', border: '#7ABA8A' },
    { id: 'lich-su-nop-tien-mat', icon: '🏦', label: 'Lịch Sử Nộp Tiền Mặt', desc: 'TM → MB Bank từng ngày', bg: '#EFF6FF', border: '#7FA9D0' },
  ]

  return (
    <div style={{ padding: '24px 16px', paddingBottom: '100px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: LUX.ink, marginBottom: '20px', fontFamily: LUX.fontSerif }}>Báo Cáo</h2>

      {/* Mini chart */}
      <div style={{ background: LUX.surface2, borderRadius: LUX.radiusLg, padding: '20px', marginBottom: '16px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: LUX.ink, fontFamily: LUX.fontSerif }}>Tình hình Thu Chi</div>
            <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '2px', fontFamily: LUX.fontSans }}>5 tháng gần nhất</div>
          </div>
          <button onClick={() => onNavigate('bao-cao-thang')} style={{ fontSize: '12px', color: LUX.taupe, fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontFamily: LUX.fontSans }}>
            Xem chi tiết →
          </button>
        </div>
        <MiniBarChart data={last5Months} />
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2D7A4F' }} />
            <span style={{ fontSize: '11px', color: LUX.ink2, fontFamily: LUX.fontSans }}>Thu</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#C0392B' }} />
            <span style={{ fontSize: '11px', color: LUX.ink2, fontFamily: LUX.fontSans }}>Chi</span>
          </div>
        </div>
      </div>

      {/* Báo cáo theo kỳ */}
      <div style={{ fontSize: '10px', letterSpacing: '1px', color: LUX.ink3, textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px', paddingLeft: '4px', fontFamily: LUX.fontSans }}>
        Báo Cáo Theo Kỳ
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {baoCaoItems.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            background: item.bg, border: `1px solid ${item.border}20`,
            borderRadius: LUX.radius, padding: '16px', cursor: 'pointer',
            textAlign: 'left', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = LUX.shadow }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <span style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</span>
            <div style={{ fontWeight: '600', fontSize: '13px', color: LUX.ink, marginBottom: '2px', fontFamily: LUX.fontSans }}>{item.label}</div>
            <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{item.desc}</div>
          </button>
        ))}
      </div>

      {/* Phân tích */}
      <div style={{ fontSize: '10px', letterSpacing: '1px', color: LUX.ink3, textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px', paddingLeft: '4px', fontFamily: LUX.fontSans }}>
        Phân Tích
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {phanTichItems.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: LUX.surface2, border: `1px solid ${LUX.line}`,
            borderRadius: LUX.radius, padding: '16px 20px', width: '100%',
            cursor: 'pointer', textAlign: 'left',
            boxShadow: LUX.shadowSm, transition: 'all 0.2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = LUX.shadow }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = LUX.shadowSm }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: LUX.ink, marginBottom: '2px', fontFamily: LUX.fontSans }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{item.desc}</div>
            </div>
            <span style={{ color: LUX.gold, fontSize: '20px' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BaoCaoPage() {
  const { user } = useAuth()
  const [view, setView] = useState('dashboard')
  const handleBack = () => setView('dashboard')

  if (user?.vai_tro !== 'admin') return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
      <div style={{ fontWeight: '700', fontSize: '18px', color: LUX.ink, marginBottom: '8px', fontFamily: LUX.fontSerif }}>Chỉ dành cho Admin</div>
      <div style={{ fontSize: '13px', color: LUX.ink3, lineHeight: '1.6', fontFamily: LUX.fontSans }}>
        Báo cáo tài chính chỉ Quản trị viên mới được xem.
        <br />Nếu cần xem báo cáo, liên hệ anh Nam.
      </div>
    </div>
  )

  return (
    <div>
      {view === 'dashboard'          && <Dashboard onNavigate={setView} />}
      {view === 'bao-cao-ngay'       && <BaoCaoNgay       onBack={handleBack} />}
      {view === 'bao-cao-tuan'       && <BaoCaoTuan       onBack={handleBack} />}
      {view === 'bao-cao-thang'      && <BaoCaoThang      onBack={handleBack} />}
      {view === 'bao-cao-nam'        && <BaoCaoNam        onBack={handleBack} />}
      {view === 'phan-tich-doanh-thu' && <PhanTichDoanhThu onBack={handleBack} />}
      {view === 'phan-tich-chi-phi'  && <PhanTichChiPhi  onBack={handleBack} />}
      {view === 'bao-cao-dong-tien'   && <BaoCaoDongTien  onBack={handleBack} />}
      {view === 'lich-su-nop-tien-mat' && <LichSuNopTienMat onBack={handleBack} />}
    </div>
  )
}
