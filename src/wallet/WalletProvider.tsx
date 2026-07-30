import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  WalletContext,
  type ActiveWallet,
  readStoredWallet,
  writeStoredWallet,
} from './walletContext'

export function WalletProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  const [activeWallet, setActiveWalletState] = useState<ActiveWallet>(() => readStoredWallet())

  const setActiveWallet = useCallback((w: ActiveWallet) => {
    writeStoredWallet(w)
    setActiveWalletState(w)
  }, [])

  /** 登出後重設 GC；登入後由 LOBBY_GET `playerInfo.walletType` 經 mergeUser 還原。 */
  useEffect(() => {
    if (token?.trim()) return
    setActiveWallet('GC')
  }, [token, setActiveWallet])

  /**
   * LOBBY_GET 更新 `user.lobbyWalletType` 時對齊 header／開局 mode。
   * 僅依 lobbyWalletType 變更觸發，避免手動 WALLET_USE 後、下一輪 LOBBY_GET 前被舊值蓋回。
   */
  useEffect(() => {
    if (!token?.trim()) return
    const lwt = user?.lobbyWalletType
    if (lwt !== 'GC' && lwt !== 'SC') return
    setActiveWallet(lwt)
  }, [token, user?.lobbyWalletType, setActiveWallet])

  const value = useMemo(
    () => ({ activeWallet, setActiveWallet }),
    [activeWallet, setActiveWallet],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
