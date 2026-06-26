import React from 'react'
import { App, ZMPRouter, AnimationRoutes, Route, SnackbarProvider } from 'zmp-ui'
import HomePage from './pages/HomePage'
import UuDaiPage from './pages/UuDaiPage'
import DatLichPage from './pages/DatLichPage'
import ChatPage from './pages/ChatPage'
import TaiKhoanPage from './pages/TaiKhoanPage'
import ThePage from './pages/ThePage'
import VoucherPage from './pages/VoucherPage'
import VongQuayPage from './pages/VongQuayPage'
import LichHenCuaToiPage from './pages/LichHenCuaToiPage'
import LichSuPage from './pages/LichSuPage'
import DanhGiaPage from './pages/DanhGiaPage'

export default function MyApp() {
  return (
    <App theme="light">
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />} />
            <Route path="/uu-dai" element={<UuDaiPage />} />
            <Route path="/dat-lich" element={<DatLichPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/tai-khoan" element={<TaiKhoanPage />} />
            <Route path="/the" element={<ThePage />} />
            <Route path="/voucher" element={<VoucherPage />} />
            <Route path="/vong-quay" element={<VongQuayPage />} />
            <Route path="/lich-hen" element={<LichHenCuaToiPage />} />
            <Route path="/lich-su" element={<LichSuPage />} />
            <Route path="/danh-gia" element={<DanhGiaPage />} />
          </AnimationRoutes>
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  )
}
