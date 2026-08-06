import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { clearStaleSafariRepaintTransform } from '../../lib/forceSafariRepaint'
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

/** Session tab 切換時重置捲動，並清掉會讓 fixed chrome 失效的 Safari repaint transform。 */
function useSessionChromeRouteSync() {
  const { pathname } = useLocation()

  useEffect(() => {
    clearStaleSafariRepaintTransform()
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])
}

export function SessionChromeShell({ children, headerOverHero = false }: SessionChromeShellProps) {
  const { activeWallet } = useWallet()
  useSessionChromeRouteSync()

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
