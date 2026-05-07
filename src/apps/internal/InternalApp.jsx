import { useState, useEffect } from 'react'
import { LUX } from '../../constants/lux'
import { useVi } from '../../hooks/useVi'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import SplashScreen from '../../components/layout/SplashScreen'
import BottomNav from '../../components/layout/BottomNav'
import Toast from '../../components/ui/Toast'
import TongQuanPage from './tong-quan/TongQuanPage'
import TaiKhoanPage from './tai-khoan/TaiKhoanPage'
import NhapLieuPage from './thu-chi/NhapLieuPage'
import BaoCaoPage from './bao-cao/BaoCaoPage'
import CaiDatPage from './cai-dat/CaiDatPage'
import DoiSoatPage from './thu-chi/DoiSoatPage'
import FormDoanhThu from './thu-chi/forms/FormDoanhThu'
import FormChiPhi from './thu-chi/forms/FormChiPhi'
import FormChuyenKhoan from './thu-chi/forms/FormChuyenKhoan'

const BREAKPOINT = 768

export default function InternalApp() {
  const [splash, setSplash] = useState(true)
  const { user }            = useAuth()
  const [tab,    setTab]    = useState(user?.vai_tro === 'le_tan' ? 'doi-soat' : 'tong-quan')
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= BREAKPOINT)
  const { viList, loading } = useVi()
  const { toast, showToast, form, openForm, closeForm } = useApp()

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Redirect Lễ Tân from admin tabs
  const isLeTan = user?.vai_tro === 'le_tan'
  const effectiveTab = isLeTan && ['tong-quan', 'tai-khoan', 'bao-cao', 'nhap-lieu'].includes(tab) ? 'doi-soat' : tab

  const handleOpenForm = (type) => {
    if (type === 'bc') { setTab('bao-cao'); return }
    openForm(type)
  }

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Dancing+Script:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes hsms-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hsms-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .hsms-stagger > * {
          opacity: 0;
          animation: hsms-fade-up 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        .hsms-stagger > *:nth-child(1) { animation-delay: 0.04s; }
        .hsms-stagger > *:nth-child(2) { animation-delay: 0.10s; }
        .hsms-stagger > *:nth-child(3) { animation-delay: 0.16s; }
        .hsms-stagger > *:nth-child(4) { animation-delay: 0.22s; }
        .hsms-stagger > *:nth-child(5) { animation-delay: 0.28s; }
        .hsms-stagger > *:nth-child(6) { animation-delay: 0.34s; }
        .hsms-stagger > *:nth-child(7) { animation-delay: 0.40s; }
        .hsms-stagger > *:nth-child(8) { animation-delay: 0.46s; }
        .hsms-stagger > *:nth-child(9) { animation-delay: 0.52s; }
        .hsms-stagger > *:nth-child(10){ animation-delay: 0.58s; }
      `}</style>

      <div style={{
        backgroundColor: LUX.bg,
        minHeight: '100vh',
        maxWidth: isDesktop ? '520px' : '100%',
        width: '100%',
        margin: '0 auto',
        fontFamily: LUX.fontSans,
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxShadow: isDesktop ? LUX.shadowLg : 'none',
      }}>
        {splash && <SplashScreen onDone={() => setSplash(false)} />}
        {toast  && <Toast msg={toast.msg} type={toast.type} onClose={() => showToast(null)} />}

        {form === 'thu' && <FormDoanhThu  viList={viList} user={user} onClose={closeForm} onSaved={showToast} />}
        {form === 'chi' && <FormChiPhi    viList={viList} user={user} onClose={closeForm} onSaved={showToast} />}
        {form === 'ck'  && <FormChuyenKhoan viList={viList} user={user} onClose={closeForm} onSaved={showToast} />}

        <div style={{ paddingBottom: isLeTan ? '0px' : '80px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: LUX.ink3 }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🌸</div>
              <div style={{ fontSize: '13px', fontFamily: LUX.fontSans }}>Đang tải...</div>
            </div>
          ) : (
            <>
              {effectiveTab === 'tong-quan' && <TongQuanPage viList={viList} user={user} onOpenForm={handleOpenForm} isDesktop={isDesktop} />}
              {effectiveTab === 'tai-khoan' && <TaiKhoanPage viList={viList} user={user} isDesktop={isDesktop} />}
              {effectiveTab === 'doi-soat'  && <DoiSoatPage user={user} onOpenForm={handleOpenForm} onSettings={() => setTab('cai-dat')} />}
              {effectiveTab === 'nhap-lieu' && <NhapLieuPage onOpenForm={handleOpenForm} isDesktop={isDesktop} />}
              {effectiveTab === 'bao-cao'   && <BaoCaoPage isDesktop={isDesktop} />}
              {effectiveTab === 'cai-dat'   && (
                <>
                  {isLeTan && (
                    <button onClick={() => setTab('doi-soat')}
                      style={{ position: 'fixed', top: '12px', left: '12px', zIndex: 1001, width: '36px', height: '36px', borderRadius: '10px', background: LUX.surface2, border: `1px solid ${LUX.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', color: LUX.ink, boxShadow: LUX.shadowSm }}>
                      ←
                    </button>
                  )}
                  <CaiDatPage user={user} isDesktop={isDesktop} />
                </>
              )}
            </>
          )}
        </div>

        {!isLeTan && <BottomNav active={effectiveTab} onChange={setTab} onOpenForm={handleOpenForm} user={user} />}
      </div>
    </>
  )
}
