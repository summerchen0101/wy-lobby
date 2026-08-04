import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SessionChromeShell } from './SessionChromeShell'
import { SessionRouteErrorBoundary } from './SessionRouteErrorBoundary'

/** Session tab 切換時重置主文件捲動，避免 Safari 保留 scroll 後底圖錯位 */
function useSessionRouteScrollReset() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])
}

export function SessionLayout() {
  useSessionRouteScrollReset()

  return (
    <SessionChromeShell>
      <SessionRouteErrorBoundary>
        <Outlet />
      </SessionRouteErrorBoundary>
    </SessionChromeShell>
  )
}
