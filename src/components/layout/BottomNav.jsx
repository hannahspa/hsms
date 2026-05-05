import { COLORS } from '../../constants/colors'
import FABMenu from '../shared/FABMenu'

const TABS_ADMIN = [
  { id: 'tong-quan', icon: '🏠', label: 'Tổng Quan' },
  { id: 'tai-khoan', icon: '💳', label: 'Tài Khoản' },
  { id: '__fab__',   icon: null,  label: ''          },
  { id: 'bao-cao',   icon: '📊', label: 'Báo Cáo'  },
  { id: 'cai-dat',   icon: '⚙️', label: 'Cài Đặt'  },
]

const TABS_LETHAN = [
  { id: 'tong-quan', icon: '🏠', label: 'Tổng Quan' },
  { id: 'tai-khoan', icon: '💳', label: 'Tài Khoản' },
  { id: '__fab__',   icon: null,  label: ''          },
  { id: 'nhap-lieu', icon: '✏️', label: 'Nhập Liệu' },
  { id: 'cai-dat',   icon: '⚙️', label: 'Cài Đặt'  },
]

export default function BottomNav({ active, onChange, onOpenForm, user }) {
  const TABS = user?.vai_tro === 'admin' ? TABS_ADMIN : TABS_LETHAN
  return (
    <div style={{
      position: 'fixed', bottom: '12px',
      left: '50%', transform: 'translateX(-50%)',
      width: '388px', maxWidth: '94%',
      background: COLORS.grad, borderRadius: '32px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '10px 8px 12px',
      boxShadow: '0 8px 32px rgba(139,94,60,0.4)', zIndex: 100
    }}>
      {TABS.map((item, i) => (
        item.id === '__fab__' ? (
          <div key={i} style={{ position: 'relative', width: '60px', display: 'flex', justifyContent: 'center' }}>
            <FABMenu onSelect={onOpenForm} />
          </div>
        ) : (
          <button key={item.id} onClick={() => onChange(item.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '3px', background: 'none', border: 'none', cursor: 'pointer',
            minWidth: '60px', padding: '2px 0',
            transition: 'transform 0.15s',
            opacity: active === item.id ? 1 : 0.6
          }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.88)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '21px' }}>{item.icon}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: active === item.id ? '700' : '500',
              color: active === item.id ? 'white' : 'rgba(255,255,255,0.7)'
            }}>{item.label}</span>
            {active === item.id && (
              <div style={{ width: '16px', height: '2px', backgroundColor: COLORS.gold, borderRadius: '2px' }} />
            )}
          </button>
        )
      ))}
    </div>
  )
}
