import { useState } from 'react'
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
import FormDoanhThu from './thu-chi/forms/FormDoanhThu'
import FormChiPhi from './thu-chi/forms/FormChiPhi'
import FormChuyenKhoan from './thu-chi/forms/FormChuyenKhoan'

export default function InternalApp() {
  const [splash, setSplash] = useState(true)
  const [tab,    setTab]    = useState('tong-quan')
  const { user }            = useAuth()
  const { viList, loading } = useVi()
  const { toast, showToast, form, openForm, closeForm } = useApp()

  const handleOpenForm = (type) => {
    if (type === 'bc') { setTab('bao-cao'); return }
    openForm(type)
  }

  return (
    <div style={{ backgroundColor: '#FAF7F4', minHeight: '100vh', maxWidth: '420px', margin: '0 auto', fontFamily: "'Segoe UI', sans-serif", position: 'relative', overflow: 'hidden' }}>

      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      {toast  && <Toast msg={toast.msg} type={toast.type} onClose={() => showToast(null)} />}

      {form === 'thu' && <FormDoanhThu  viList={viList} onClose={closeForm} onSaved={showToast} />}
      {form === 'chi' && <FormChiPhi    viList={viList} onClose={closeForm} onSaved={showToast} />}
      {form === 'ck'  && <FormChuyenKhoan viList={viList} onClose={closeForm} onSaved={showToast} />}

      <div style={{ paddingBottom: '80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#B8A898' }}>
            <div style={{ fontSize: '13px' }}>Đang tải...</div>
          </div>
        ) : (
          <>
            {tab === 'tong-quan' && <TongQuanPage viList={viList} user={user} onOpenForm={handleOpenForm} />}
            {tab === 'tai-khoan' && <TaiKhoanPage viList={viList} user={user} />}
            {tab === 'nhap-lieu' && <NhapLieuPage onOpenForm={handleOpenForm} />}
            {tab === 'bao-cao'   && <BaoCaoPage />}
            {tab === 'cai-dat'   && <CaiDatPage user={user} />}
          </>
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} onOpenForm={handleOpenForm} user={user} />
    </div>
  )
}
