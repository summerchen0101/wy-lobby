import { Navigate, useSearchParams } from 'react-router-dom'
import { guestLandingPath } from '../../auth/loginEntry'

export function LoginRedirect() {
  const [searchParams] = useSearchParams()
  // Guest landing only — do not set `auth=login` (no auto login popup).
  return <Navigate to={guestLandingPath(searchParams.get('redirect'))} replace />
}

export function RegisterRedirect() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const q = new URLSearchParams()
  if (redirect) q.set('redirect', redirect)
  q.set('auth', 'register')
  return <Navigate to={`/?${q.toString()}`} replace />
}

export function ForgotPasswordRedirect() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const q = new URLSearchParams()
  if (redirect) q.set('redirect', redirect)
  q.set('auth', 'forgot')
  return <Navigate to={`/?${q.toString()}`} replace />
}
