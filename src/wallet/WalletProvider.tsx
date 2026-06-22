import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  WalletContext,
  type ActiveWallet,
  readStoredWallet,
  writeStoredWallet,
} from './walletContext'

export function WalletProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [activeWallet, setActiveWalletState] = useState<ActiveWallet>(() => readStoredWallet())

  const setActiveWallet = useCallback((w: ActiveWallet) => {
    writeStoredWallet(w)
    setActiveWalletState(w)
  }, [])

  /** 登出後重設 GC，下次登入大廳 banner／header 預設一致。 */
  useEffect(() => {
    if (token?.trim()) return
    setActiveWallet('GC')
  }, [token, setActiveWallet])

  const value = useMemo(
    () => ({ activeWallet, setActiveWallet }),
    [activeWallet, setActiveWallet],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
