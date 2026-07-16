import { FullScreenLoadingOverlay } from '../components/loading/FullScreenLoadingOverlay'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { resolvePostLoginRedirect } from './loginEntry'

export function RequireAuth() {
  const { ready, token, user } = useAuth()
  const location = useLocation()

  if (!ready) {
    return <FullScreenLoadingOverlay />
  }

  if (!token || !user) {
    const path = (location.pathname + location.search).trim()
    const q = new URLSearchParams()
    q.set('redirect', resolvePostLoginRedirect(path || undefined))
    q.set('auth', 'login')
    return <Navigate to={`/?${q.toString()}`} replace />
  }

  return <Outlet />
}
