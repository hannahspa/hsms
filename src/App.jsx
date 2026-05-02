import { AuthProvider } from './context/AuthContext'
import { AppProvider }  from './context/AppContext'
import InternalApp from './apps/internal/InternalApp'
import CheckinApp from './apps/checkin/CheckinApp'

export default function App() {
  const path = window.location.pathname

  if (path.startsWith('/checkin')) {
    return <CheckinApp />
  }

  return (
    <AuthProvider>
      <AppProvider>
        <InternalApp />
      </AppProvider>
    </AuthProvider>
  )
}