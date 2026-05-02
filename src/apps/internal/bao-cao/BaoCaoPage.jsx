import { useState } from 'react'
import { COLORS } from '../../../constants/colors'
import BaoCaoNgay from './components/BaoCaoNgay'
import BaoCaoTuan from './components/BaoCaoTuan'
import BaoCaoThang from './components/BaoCaoThang'
import BaoCaoNam from './components/BaoCaoNam'
import PhanTichDoanhThu from './components/PhanTichDoanhThu'
import PhanTichChiPhi from './components/PhanTichChiPhi'

function IconChart() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="12" width="4" height="9" rx="1" fill="#2D7A4F" opacity="0.8"/>
      <rect x="10" y="7" width="4" height="14" rx="1" fill="#2D7A4F"/>
      <rect x="17" y="4" width="4" height="17" rx="1" fill="#2D7A4F" opacity="0.6"/>
    </svg>
  )
}

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
    const d = new Date()
    d.setMonth(d.getMonth() - (4 - i))
    return { label: `T${d.getMonth()+1}`, thu: 0, chi: 0 }
  })

  const baoCaoItems = [
    { id: 'bao-cao-ngay',  icon: '📋', label: 'Báo Cáo Ngày',  desc: 'Chi tiết thu chi từng ngày',      bg: 'linear-gradient(135deg,#FFF8F0,#F5EDE6)', border: 'rgba(160,113,79,0.2)'  },
    { id: 'bao-cao-tuan',  icon: '📅', label: 'Báo Cáo Tuần',  desc: 'Tổng hợp 7 ngày trong tuần',     bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: 'rgba(59,130,246,0.2)'  },
    { id: 'bao-cao-thang', icon: '📆', label: 'Báo Cáo Tháng', desc: 'Biểu đồ và phân tích theo tháng', bg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: 'rgba(45,122,79,0.2)'   },
    { id: 'bao-cao-nam',   icon: '🗓️', label: 'Báo Cáo Năm',   desc: 'Tổng kết 12 tháng trong năm',    bg: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', border: 'rgba(168,85,247,0.2)'  },
  ]

  const phanTichItems = [
    { id: 'phan-tich-chi-phi',    icon: '📉', label: 'Phân Tích Chi Phí',   desc: 'Theo nhóm & hạng mục', bg: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', border: 'rgba(192,57,43,0.15)' },
    { id: 'phan-tich-doanh-thu',  icon: '📈', label: 'Phân Tích Doanh Thu', desc: 'Theo hình thức thu',   bg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: 'rgba(45,122,79,0.15)'  },
  ]

  return (
    <div style={{ padding: '24px 16px', paddingBottom: '100px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '800', color: COLORS.text, marginBottom: '20px' }}>Báo Cáo</h2>

      {/* Mini chart */}
      <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', marginBottom: '16px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: COLORS.text }}>Tình hình Thu Chi</div>
            <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>5 tháng gần nhất</div>
          </div>
          <button onClick={() => onNavigate('bao-cao-thang')} style={{ fontSize: '12px', color: COLORS.primary, fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>
            Xem chi tiết →
          </button>
        </div>
        <MiniBarChart data={last5Months} />
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2D7A4F' }} />
            <span style={{ fontSize: '11px', color: COLORS.textSub }}>Thu</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#C0392B' }} />
            <span style={{ fontSize: '11px', color: COLORS.textSub }}>Chi</span>
          </div>
        </div>
      </div>

      {/* Báo cáo theo kỳ */}
      <div style={{ fontSize: '11px', letterSpacing: '1px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px', paddingLeft: '4px' }}>
        Báo Cáo Theo Kỳ
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {baoCaoItems.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            background: item.bg, border: `1px solid ${item.border}`,
            borderRadius: '20px', padding: '16px', cursor: 'pointer',
            textAlign: 'left', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <span style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</span>
            <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text, marginBottom: '2px' }}>{item.label}</div>
            <div style={{ fontSize: '11px', color: COLORS.textMute }}>{item.desc}</div>
          </button>
        ))}
      </div>

      {/* Phân tích */}
      <div style={{ fontSize: '11px', letterSpacing: '1px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px', paddingLeft: '4px' }}>
        Phân Tích
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {phanTichItems.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: '20px', padding: '16px 20px', width: '100%',
            cursor: 'pointer', textAlign: 'left',
            boxShadow: COLORS.shadow, transition: 'all 0.2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(160,113,79,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = COLORS.shadow }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: item.bg, border: `1px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text, marginBottom: '2px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: COLORS.textMute }}>{item.desc}</div>
            </div>
            <span style={{ color: COLORS.gold, fontSize: '20px' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BaoCaoPage() {
  const [view, setView] = useState('dashboard')
  const handleBack = () => setView('dashboard')

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {view === 'dashboard'          && <Dashboard onNavigate={setView} />}
      {view === 'bao-cao-ngay'       && <BaoCaoNgay       onBack={handleBack} />}
      {view === 'bao-cao-tuan'       && <BaoCaoTuan       onBack={handleBack} />}
      {view === 'bao-cao-thang'      && <BaoCaoThang      onBack={handleBack} />}
      {view === 'bao-cao-nam'        && <BaoCaoNam        onBack={handleBack} />}
      {view === 'phan-tich-doanh-thu' && <PhanTichDoanhThu onBack={handleBack} />}
      {view === 'phan-tich-chi-phi'  && <PhanTichChiPhi  onBack={handleBack} />}
    </div>
  )
}