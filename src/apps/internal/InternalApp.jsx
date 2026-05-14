import { useState, useEffect } from 'react'
import { useVi } from '../../hooks/useVi'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import BottomNav from '../../components/layout/BottomNav'
import Toast from '../../components/ui/Toast'
import TongQuanPage from './tong-quan/TongQuanPage'
import NhapLieuPage from './thu-chi/NhapLieuPage'
import BaoCaoPage from './bao-cao/BaoCaoPage'
import CaiDatPage from './cai-dat/CaiDatPage'
import DoiSoatPage from './thu-chi/DoiSoatPage'
import FormDoanhThu from './thu-chi/forms/FormDoanhThu'
import FormChiPhi from './thu-chi/forms/FormChiPhi'
import FormChuyenKhoan from './thu-chi/forms/FormChuyenKhoan'
import PheDuyetThuChi from './cai-dat/components/PheDuyetThuChi'

const BREAKPOINT = 768

const PATH_TO_TAB = {
  '/SoThuChi': 'tong-quan',
  '/SoThuChi/doi-soat': 'doi-soat',
  '/SoThuChi/bao-cao': 'bao-cao',
  '/SoThuChi/nhap-lieu': 'nhap-lieu',
  '/SoThuChi/cai-dat': 'cai-dat',
}
const TAB_TO_PATH = {
  'tong-quan': '/SoThuChi',
  'doi-soat': '/SoThuChi/doi-soat',
  'bao-cao': '/SoThuChi/bao-cao',
  'nhap-lieu': '/SoThuChi/nhap-lieu',
  'cai-dat': '/SoThuChi/cai-dat',
}

function getTabFromPath() {
  const path = window.location.pathname
  // Khớp chính xác trước
  if (PATH_TO_TAB[path]) return PATH_TO_TAB[path]
  // Khớp prefix (cho path như /SoThuChi/doi-soat)
  for (const [p, t] of Object.entries(PATH_TO_TAB)) {
    if (path.startsWith(p) && p !== '/SoThuChi') return t
  }
  // Default
  return 'tong-quan'
}

export default function InternalApp() {
  const { user }            = useAuth()
  const [tab,    setTab]    = useState(getTabFromPath)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= BREAKPOINT)
  const { viList, loading } = useVi()
  const { toast, showToast, form, openForm, closeForm } = useApp()
  const [refreshKey, setRefreshKey] = useState(0)
  const [pheDuyetOpen, setPheDuyetOpen] = useState(false)

  const handleSaved = (type, msg) => {
    showToast(type, msg)
    if (type === 'success') setRefreshKey(k => k + 1)
  }

  // Sync URL khi tab thay đổi
  const setTabAndUrl = (newTab) => {
    setTab(newTab)
    const newPath = TAB_TO_PATH[newTab] || '/SoThuChi'
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath)
    }
  }

  // Lắng nghe popstate (nút back/forward trình duyệt)
  useEffect(() => {
    const onPopState = () => setTab(getTabFromPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Đồng bộ tab với URL khi mount (tránh miss nếu path thay đổi từ bên ngoài)
  useEffect(() => {
    const pathTab = getTabFromPath()
    if (pathTab !== tab) setTab(pathTab)
  }, [])

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Lễ Tân bị giới hạn tab — admin xem được tất cả
  const isLeTan = user?.vai_tro === 'le_tan'
  const leTanAllowed = ['doi-soat', 'cai-dat']
  const effectiveTab = isLeTan && !leTanAllowed.includes(tab) ? 'doi-soat' : tab

  const handleOpenForm = (type) => {
    if (type === 'bc') { setTabAndUrl('bao-cao'); return }
    openForm(type)
  }

  return (
    <>
      {/* Animation keyframes */}
      <style>{`
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

        /* BottomNav chỉ hiển thị trên mobile — desktop dùng sidebar */
        @media (min-width: 769px) {
          .bottom-nav-wrapper { display: none; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        width: '100%',
        fontFamily: 'var(--sans)',
        position: 'relative',
        overflowX: 'hidden',
      }}>
        {toast  && <Toast msg={toast.msg} type={toast.type} onClose={() => showToast(null)} />}

        {form === 'thu' && <FormDoanhThu  viList={viList} user={user} onClose={closeForm} onSaved={handleSaved} />}
        {form === 'chi' && <FormChiPhi    viList={viList} user={user} onClose={closeForm} onSaved={handleSaved} />}
        {form === 'ck'  && <FormChuyenKhoan viList={viList} user={user} onClose={closeForm} onSaved={handleSaved} />}
        {pheDuyetOpen && <PheDuyetThuChi onClose={() => setPheDuyetOpen(false)} onUpdated={() => setRefreshKey(k => k + 1)} />}

        <div style={{ paddingBottom: isLeTan ? '0px' : '80px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🌸</div>
              <div style={{ fontSize: '13px' }}>Đang tải...</div>
            </div>
          ) : (
            <>
              {effectiveTab === 'tong-quan' && <TongQuanPage viList={viList} user={user} onOpenForm={handleOpenForm} isDesktop={isDesktop} onOpenPheDuyet={() => setPheDuyetOpen(true)} />}
              {effectiveTab === 'doi-soat'  && <DoiSoatPage user={user} onOpenForm={handleOpenForm} onSettings={() => setTabAndUrl('cai-dat')} refreshKey={refreshKey} />}
              {effectiveTab === 'nhap-lieu' && <NhapLieuPage onOpenForm={handleOpenForm} isDesktop={isDesktop} user={user} />}
              {effectiveTab === 'bao-cao'   && <BaoCaoPage isDesktop={isDesktop} />}
              {effectiveTab === 'cai-dat'   && (
                <>
                  {isLeTan && (
                    <button onClick={() => setTabAndUrl('doi-soat')}
                      style={{ position: 'fixed', top: '12px', left: '12px', zIndex: 1001, width: '36px', height: '36px', borderRadius: '10px', background: 'var(--surface2)', border: `1px solid ${'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', color: 'var(--ink)', boxShadow: 'var(--sh-1)' }}>
                      ←
                    </button>
                  )}
                  <CaiDatPage user={user} isDesktop={isDesktop} />
                </>
              )}
            </>
          )}
        </div>

        {!isLeTan && (
          <div className="bottom-nav-wrapper">
            <BottomNav active={effectiveTab} onChange={setTabAndUrl} onOpenForm={handleOpenForm} user={user} />
          </div>
        )}
      </div>
    </>
  )
}
