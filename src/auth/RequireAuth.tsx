import { FullScreenLoadingOverlay } from '../components/loading/FullScreenLoadingOverlay'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { guestLandingPath } from './loginEntry'

export function RequireAuth() {
  const { ready, token, user } = useAuth()
  const location = useLocation()

  if (!ready) {
    return <FullScreenLoadingOverlay />
  }

  if (!token || !user) {
    const path = (location.pathname + location.search).trim()
    return <Navigate to={guestLandingPath(path || undefined)} replace />
  }

  return <Outlet />
}
