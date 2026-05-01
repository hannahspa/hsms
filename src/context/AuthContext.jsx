import { createContext, useContext, useState } from 'react'
import { MOCK_USERS } from '../constants/enums'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Tạm dùng mock — sau này thay bằng Supabase Auth
  const [user] = useState(MOCK_USERS.admin)

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
