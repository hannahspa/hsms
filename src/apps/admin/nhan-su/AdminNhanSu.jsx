import { useState } from 'react'
import { COLORS } from '../../../constants/colors'
import TongQuan from './TongQuan'
import DuyetYeuCau from './DuyetYeuCau'
import LichThangAdmin from './LichThangAdmin'

const TABS = [
  { id:'tong-quan',   label:'Tổng Quan',      icon:'📊' },
  { id:'duyet',       label:'Duyệt',           icon:'✅' },
  { id:'lich-thang',  label:'Lịch Tháng',      icon:'📅' },
]

export default function AdminNhanSu() {
  const [tab, setTab] = useState('tong-quan')

  return (
    <div>
      {/* Sub tab */}
      <div style={{ background:COLORS.card, borderBottom:`1px solid ${COLORS.border}`, padding:'0 16px', display:'flex', gap:'4px', overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'14px 16px', border:'none', background:'transparent', color: tab===t.id ? COLORS.primary : COLORS.textMute, fontWeight: tab===t.id ? '800' : '500', fontSize:'13px', cursor:'pointer', borderBottom: tab===t.id ? `3px solid ${COLORS.primary}` : '3px solid transparent', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'6px' }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'tong-quan'  && <TongQuan />}
      {tab === 'duyet'      && <DuyetYeuCau />}
      {tab === 'lich-thang' && <LichThangAdmin />}
    </div>
  )
}