import type { ReactNode } from 'react'
import { useWallet } from '../../wallet/walletContext'
import { SessionFooter } from './SessionFooter'
import { SessionHeader } from './SessionHeader'
import { SupportFab } from './SupportFab'
import './SessionChrome.css'

type SessionChromeShellProps = {
  children: ReactNode
  /** 大廳專用：header 疊在頂圖上，內嵌頁勿開 */
  headerOverHero?: boolean
}

export function SessionChromeShell({ children, headerOverHero = false }: SessionChromeShellProps) {
  const { activeWallet } = useWallet()
  return (
    <div
      className={
        'session-layout' + (headerOverHero ? ' session-layout--hero-overlay' : '')
      }
      data-active-wallet={activeWallet}
    >
      <SessionHeader />
      <div className="session-layout__main">{children}</div>
      <SessionFooter />
      <SupportFab />
    </div>
  )
}
