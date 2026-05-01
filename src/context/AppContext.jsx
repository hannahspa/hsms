import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [form,  setForm]  = useState(null)

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const openForm  = (type) => setForm(type)
  const closeForm = ()     => setForm(null)

  return (
    <AppContext.Provider value={{ toast, showToast, form, openForm, closeForm }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
