import { Outlet } from 'react-router-dom'
import { SessionChromeShell } from './SessionChromeShell'
import { SessionRouteErrorBoundary } from './SessionRouteErrorBoundary'

export function SessionLayout() {
  return (
    <SessionChromeShell>
      <SessionRouteErrorBoundary>
        <Outlet />
      </SessionRouteErrorBoundary>
    </SessionChromeShell>
  )
}
