import React from 'react'
import { App, ZMPRouter, AnimationRoutes, Route, SnackbarProvider } from 'zmp-ui'
import HomePage from './pages/HomePage'
import ThePage from './pages/ThePage'
import DatLichPage from './pages/DatLichPage'
import VoucherPage from './pages/VoucherPage'
import VongQuayPage from './pages/VongQuayPage'

export default function MyApp() {
  return (
    <App theme="light">
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />} />
            <Route path="/the" element={<ThePage />} />
            <Route path="/dat-lich" element={<DatLichPage />} />
            <Route path="/voucher" element={<VoucherPage />} />
            <Route path="/vong-quay" element={<VongQuayPage />} />
          </AnimationRoutes>
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  )
}
