import { AuthProvider } from './context/AuthContext'
import { AppProvider }  from './context/AppContext'
import InternalApp from './apps/internal/InternalApp'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <InternalApp />
      </AppProvider>
    </AuthProvider>
  )
}
