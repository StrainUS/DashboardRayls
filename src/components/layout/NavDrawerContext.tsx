import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type NavDrawerContextValue = {
  open: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

const NavDrawerContext = createContext<NavDrawerContextValue | null>(null)

export function NavDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openDrawer = useCallback(() => setOpen(true), [])
  const closeDrawer = useCallback(() => setOpen(false), [])
  const toggleDrawer = useCallback(() => setOpen((v) => !v), [])
  const value = useMemo(
    () => ({ open, openDrawer, closeDrawer, toggleDrawer }),
    [open, openDrawer, closeDrawer, toggleDrawer],
  )
  return <NavDrawerContext.Provider value={value}>{children}</NavDrawerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with NavDrawerProvider
export function useNavDrawer(): NavDrawerContextValue {
  const ctx = useContext(NavDrawerContext)
  if (ctx == null) {
    throw new Error('useNavDrawer must be used within NavDrawerProvider')
  }
  return ctx
}
