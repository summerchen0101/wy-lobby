import { type FormEvent, useMemo, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { readLastLoginAccount } from '../../auth/lastLoginAccount'
import { resolvePostLoginRedirect } from '../../auth/loginEntry'
import { MarketingTopBar } from '../../components/MarketingTopBar'
import { ApiError } from '../../lib/api/client'
import { ClientVersionError } from '../../lib/api/clientVersionError'
import { presentClientVersionError } from '../../lib/clientVersionUi'
import { useWordData } from '../../wordData/useWordData'
import { AuthClearableInputWrap } from './AuthClearableInputWrap'
import { AuthFieldError } from './AuthFieldError'
import {
  clearFieldError,
  hasFieldErrors,
  type LoginFieldErrors,
  validateLoginFields,
} from './authFormValidation'
import './AuthPages.css'

export function LoginPage() {
  const w = useWordData()
  const { login, user, ready } = useAuth()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const redirectTo = resolvePostLoginRedirect(search.get('redirect'))
  const forgotPasswordHref = useMemo(() => {
    const rd = search.get('redirect')
    if (!rd) return '/forgot-password'
    const q = new URLSearchParams()
    q.set('redirect', rd)
    return `/forgot-password?${q.toString()}`
  }, [search])
  const [account, setAccount] = useState(() => readLastLoginAccount())
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && user) {
      navigate(redirectTo, { replace: true })
    }
  }, [ready, user, redirectTo, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const nextFieldErrors = validateLoginFields({
      account,
      password,
    })
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await login(account.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err instanceof ClientVersionError) {
        setError(presentClientVersionError(err))
        return
      }
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Sign-in failed'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <MarketingTopBar
        primary={{ to: '/register', label: 'Register' }}
        secondary={{ to: '/login', label: 'Log in' }}
      />
      <div className="page-container auth-page">
        <h1 className="auth-page__title">{w(3)}</h1>
        <p className="auth-page__lede">{w(29)}</p>
        <form className="auth-form auth-form--card" onSubmit={onSubmit} noValidate>
          <fieldset disabled={submitting} className="auth-form-fieldset-reset">
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="login-account">
                {w(6)}
              </label>
              <AuthClearableInputWrap
                variant="page"
                value={account}
                onClear={() => {
                  setAccount('')
                  setFieldErrors((prev) => clearFieldError(prev, 'account'))
                }}
                clearAriaLabel="Clear account"
              >
                <input
                  id="login-account"
                  className="auth-form__input"
                  name="account"
                  autoComplete="username"
                  value={account}
                  onChange={(e) => {
                    setAccount(e.target.value)
                    setFieldErrors((prev) => clearFieldError(prev, 'account'))
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.account)}
                />
              </AuthClearableInputWrap>
              <AuthFieldError message={fieldErrors.account} variant="page" />
            </div>
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="login-password">
                {w(8)}
              </label>
              <AuthClearableInputWrap
                variant="page"
                value={password}
                onClear={() => {
                  setPassword('')
                  setFieldErrors((prev) => clearFieldError(prev, 'password'))
                }}
                clearAriaLabel="Clear password"
              >
                <input
                  id="login-password"
                  className="auth-form__input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setFieldErrors((prev) => clearFieldError(prev, 'password'))
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.password)}
                />
              </AuthClearableInputWrap>
              <AuthFieldError message={fieldErrors.password} variant="page" />
            </div>
            {error ? <p className="auth-form__error">{error}</p> : null}
            <div className="auth-form__actions">
              <button type="submit" className="btn-crown-primary auth-form__submit" disabled={submitting}>
                {submitting ? '…' : w(3)}
              </button>
            </div>
          </fieldset>
        </form>
        <p className="auth-page__link">
          <Link to={forgotPasswordHref}>{w(11)}</Link>
          {' · '}
          {w(31)} <Link to="/register">{w(32)}</Link>
        </p>
      </div>
    </div>
  )
}
