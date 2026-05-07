import { LUX } from '../../constants/lux'
import FABMenu from '../shared/FABMenu'

const TABS_ADMIN = [
  { id: 'tong-quan', icon: '🏠', label: 'Tổng Quan' },
  { id: 'tai-khoan', icon: '💳', label: 'Tài Khoản' },
  { id: '__fab__',   icon: null,  label: ''          },
  { id: 'bao-cao',   icon: '📊', label: 'Báo Cáo'  },
  { id: 'cai-dat',   icon: '⚙️', label: 'Cài Đặt'  },
]

const TABS_LETHAN = [
  { id: 'doi-soat',  icon: '📋', label: 'Đối Soát'  },
  { id: null,        icon: null,  label: ''          },
  { id: '__fab__',   icon: null,  label: ''          },
  { id: null,        icon: null,  label: ''          },
  { id: 'cai-dat',   icon: '⚙️', label: 'Cài Đặt'  },
]

export default function BottomNav({ active, onChange, onOpenForm, user }) {
  const TABS = user?.vai_tro === 'admin' ? TABS_ADMIN : TABS_LETHAN
  return (
    <div style={{
      position: 'fixed', bottom: '12px',
      left: '50%', transform: 'translateX(-50%)',
      width: '388px', maxWidth: '94%',
      background: LUX.heroGrad, borderRadius: '32px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '10px 8px 12px',
      boxShadow: '0 12px 40px rgba(60,40,25,0.35), 0 2px 8px rgba(60,40,25,0.15)',
      border: '1px solid rgba(255,255,255,0.08)',
      zIndex: 100,
      backdropFilter: 'blur(10px)',
    }}>
      {TABS.map((item, i) => (
        item.id === null ? (
          <div key={i} style={{ minWidth: '60px' }} />
        ) : item.id === '__fab__' ? (
          <div key={i} style={{ position: 'relative', width: '60px', display: 'flex', justifyContent: 'center' }}>
            <FABMenu onSelect={onOpenForm} />
          </div>
        ) : (
          <button key={item.id} onClick={() => onChange(item.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '3px', background: 'none', border: 'none', cursor: 'pointer',
            minWidth: '60px', padding: '2px 0',
            transition: 'all 0.2s ease',
            opacity: active === item.id ? 1 : 0.55
          }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.88)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '21px', filter: active === item.id ? 'none' : 'grayscale(30%)' }}>{item.icon}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: active === item.id ? '600' : '400',
              color: active === item.id ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
              letterSpacing: '0.3px',
              fontFamily: LUX.fontSans,
            }}>{item.label}</span>
            {active === item.id && (
              <div style={{ width: '18px', height: '2px', backgroundColor: LUX.gold, borderRadius: '2px', marginTop: '1px' }} />
            )}
          </button>
        )
      ))}
    </div>
  )
}
