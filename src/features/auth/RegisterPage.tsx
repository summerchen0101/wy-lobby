import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { MarketingTopBar } from '../../components/MarketingTopBar'
import { ApiError, ClientVersionError } from '../../lib/api/client'
import { buildAppMetaForAuthRequest, getOrCreateWebDeviceId, nicknameFromEmail } from '../../lib/appMeta'
import type { SignUpRequest } from '../../lib/api/types'
import {
  kickstartLobbyWelcomeVoiceFromUserGesture,
  stopLobbyWelcomeVoice,
} from '../../lib/lobbySound'
import { AuthClearableInputWrap } from './AuthClearableInputWrap'
import { AuthFieldError } from './AuthFieldError'
import {
  clearFieldError,
  hasFieldErrors,
  OTP_MAX_LEN,
  PASSWORD_MAX_LENGTH,
  type OtpFieldErrors,
  type RegisterFieldErrors,
  validateOtpCode,
  validateRegisterFields,
} from './authFormValidation'
import { useWordData } from '../../wordData/useWordData'
import './AuthPages.css'

function buildRequest(params: { email: string; password: string; rePassword: string }): SignUpRequest {
  const em = params.email.trim()
  return {
    nickname: nicknameFromEmail(em),
    password: params.password,
    rePassword: params.rePassword,
    answer: '',
    app_meta: buildAppMetaForAuthRequest(),
    email: em,
    deviceID: getOrCreateWebDeviceId(),
  }
}

export function RegisterPage() {
  const w = useWordData()
  const { signUp, register, ingestAuthResponse, user, ready } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [answer, setAnswer] = useState('')
  const [pending, setPending] = useState<SignUpRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
  const [otpFieldErrors, setOtpFieldErrors] = useState<OtpFieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && user) {
      navigate('/', { replace: true })
    }
  }, [ready, user, navigate])

  async function onSubmitFirst(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const nextFieldErrors = validateRegisterFields({
      email,
      password,
      passwordConfirm: password2,
    })
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors)
      return
    }
    setFieldErrors({})
    kickstartLobbyWelcomeVoiceFromUserGesture()
    setSubmitting(true)
    const body = buildRequest({ email, password, rePassword: password2 })
    try {
      const result = await signUp(body)
      if (result.auth) {
        ingestAuthResponse(result.auth)
        navigate('/', { replace: true })
        return
      }
      if (result.needSMSAnswer) {
        stopLobbyWelcomeVoice()
        setPending(body)
        return
      }
    } catch (err) {
      stopLobbyWelcomeVoice()
      if (err instanceof ClientVersionError) {
        window.open(err.updateUrl, '_blank', 'noopener,noreferrer')
        setError('A new version is required. A download page was opened in a new tab.')
        return
      }
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault()
    if (!pending) return
    setError(null)
    const nextOtpErrors = validateOtpCode(answer)
    if (hasFieldErrors(nextOtpErrors)) {
      setOtpFieldErrors(nextOtpErrors)
      return
    }
    setOtpFieldErrors({})
    setSubmitting(true)
    try {
      await register({ ...pending, answer: answer.replace(/\s/g, '') })
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ClientVersionError) {
        window.open(err.updateUrl, '_blank', 'noopener,noreferrer')
        setError('A new version is required. A download page was opened in a new tab.')
        return
      }
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (pending) {
    return (
      <div className="auth-layout">
        <MarketingTopBar primary={{ to: '/login', label: 'Log in' }} />
        <div className="page-container auth-page">
          <h1 className="auth-page__title">{w(43)}</h1>
          <p className="auth-page__lede">{w(46)} {pending.email}</p>
          <form className="auth-form auth-form--card" onSubmit={onSubmitCode} noValidate>
            <fieldset disabled={submitting} className="auth-form-fieldset-reset">
              <div className="auth-form__field">
                <label className="auth-form__label" htmlFor="reg-code">
                  {w(35)}
                </label>
                <AuthFieldError message={otpFieldErrors.code} variant="page" />
                <AuthClearableInputWrap
                  variant="page"
                  value={answer}
                  onClear={() => {
                    setAnswer('')
                    setOtpFieldErrors((prev) => clearFieldError(prev, 'code'))
                  }}
                  clearAriaLabel="Clear verification code"
                >
                  <input
                    id="reg-code"
                    className="auth-form__input"
                    name="code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value.replace(/\D/g, '').slice(0, OTP_MAX_LEN))
                      setOtpFieldErrors((prev) => clearFieldError(prev, 'code'))
                    }}
                    required
                    aria-invalid={Boolean(otpFieldErrors.code)}
                  />
                </AuthClearableInputWrap>
              </div>
              {error ? <p className="auth-form__error">{error}</p> : null}
              <div className="auth-form__actions">
                <button type="submit" className="btn-crown-primary auth-form__submit" disabled={submitting}>
                  {submitting ? '…' : w(45)}
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-layout">
      <MarketingTopBar primary={{ to: '/login', label: 'Log in' }} />
      <div className="page-container auth-page">
        <h1 className="auth-page__title">{w(18)}</h1>
        <p className="auth-page__lede">{w(14)}</p>
        <form className="auth-form auth-form--card" onSubmit={onSubmitFirst} noValidate>
          <fieldset disabled={submitting} className="auth-form-fieldset-reset">
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="reg-email">
                {w(6)}
              </label>
              <AuthFieldError message={fieldErrors.email} variant="page" />
              <AuthClearableInputWrap
                variant="page"
                value={email}
                onClear={() => {
                  setEmail('')
                  setFieldErrors((prev) => clearFieldError(prev, 'email'))
                }}
                clearAriaLabel="Clear email"
              >
                <input
                  id="reg-email"
                  className="auth-form__input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setFieldErrors((prev) => clearFieldError(prev, 'email'))
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                />
              </AuthClearableInputWrap>
            </div>
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="reg-password">
                {w(8)}
              </label>
              <AuthFieldError message={fieldErrors.password} variant="page" />
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
                  id="reg-password"
                  className="auth-form__input"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setFieldErrors((prev) => clearFieldError(prev, 'password'))
                  }}
                  required
                  minLength={6}
                  maxLength={PASSWORD_MAX_LENGTH}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
              </AuthClearableInputWrap>
            </div>
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="reg-password2">
                {w(21)}
              </label>
              <AuthFieldError message={fieldErrors.passwordConfirm} variant="page" />
              <AuthClearableInputWrap
                variant="page"
                value={password2}
                onClear={() => {
                  setPassword2('')
                  setFieldErrors((prev) => clearFieldError(prev, 'passwordConfirm'))
                }}
                clearAriaLabel="Clear confirm password"
              >
                <input
                  id="reg-password2"
                  className="auth-form__input"
                  name="password2"
                  type="password"
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => {
                    setPassword2(e.target.value)
                    setFieldErrors((prev) => clearFieldError(prev, 'passwordConfirm'))
                  }}
                  required
                  minLength={6}
                  maxLength={PASSWORD_MAX_LENGTH}
                  aria-invalid={Boolean(fieldErrors.passwordConfirm)}
                />
              </AuthClearableInputWrap>
            </div>
            {error ? <p className="auth-form__error">{error}</p> : null}
            <div className="auth-form__actions">
              <button type="submit" className="btn-crown-primary auth-form__submit" disabled={submitting}>
                {submitting ? '…' : w(23)}
              </button>
            </div>
          </fieldset>
        </form>
        <p className="auth-page__link">
          {w(24)} <Link to="/login">{w(25)}</Link>
        </p>
      </div>
    </div>
  )
}
