import { useState } from 'react'
import { COLORS } from '../../../constants/colors'
import TabTongQuan from './components/TabTongQuan'
import TabXetDuyet from './components/TabXetDuyet'
import TabLichDieuDong from './components/TabLichDieuDong'
import TabHoSo from './components/TabHoSo'

export default function AdminNhanSuPage() {
  const [activeTab, setActiveTab] = useState(1) // Mặc định mở Tab Xét Duyệt (index 1)

  const TABS =[
    { id: 0, label: 'Tổng Quan', icon: '📊' },
    { id: 1, label: 'Xét Duyệt', icon: '📥' },
    { id: 2, label: 'Lịch Làm', icon: '🗓️' },
    { id: 3, label: 'Hồ Sơ', icon: '👥' }
  ]

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: '80px' }}>
      
      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '40px 20px 20px', borderRadius: '0 0 24px 24px', boxShadow: COLORS.shadow }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '22px' }}>Quản Trị Nhân Sự</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '4px' }}>
          Command Center • Hannah Spa
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', padding: '16px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                padding: '10px 16px', borderRadius: '16px',
                background: isActive ? COLORS.primary : COLORS.card,
                color: isActive ? 'white' : COLORS.textMute,
                fontWeight: isActive ? '700' : '600', fontSize: '13px',
                boxShadow: isActive ? '0 4px 12px rgba(160,113,79,0.2)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s',
                border: isActive ? 'none' : `1px solid ${COLORS.border}`
              }}>
              <span style={{ fontSize: '16px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '0 20px' }}>
        {activeTab === 0 && <TabTongQuan />}
        {activeTab === 1 && <TabXetDuyet />}
        {activeTab === 2 && <TabLichDieuDong />}
        {activeTab === 3 && <TabHoSo />}
      </div>

    </div>
  )
}
