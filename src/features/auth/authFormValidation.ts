import { ApiError } from '../../lib/api/client'
import { getWord } from '../../wordData/getWord'

const VERIFICATION_CODE_API_CODES = new Set(['500002', '1224', '553', '107'])

function isGenericForbiddenMessage(message: string): boolean {
  const m = message.trim().toLowerCase()
  if (!m) return true
  return (
    m === 'forbidden' ||
    m.includes('refused or access is not allowed') ||
    m.includes('understood, but it has been refused')
  )
}

/** Maps register / reset OTP submit failures to WordData 553. */
export function translateVerificationCodeSubmitError(
  err: unknown,
  fallback = 'Request failed',
): string {
  if (err instanceof ApiError) {
    const code = err.code?.trim()
    if (code === '403012') return getWord(403012)
    if (code && VERIFICATION_CODE_API_CODES.has(code)) return getWord(553)
    if (err.status === 403 && isGenericForbiddenMessage(err.message)) return getWord(553)
    return err.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 12
export const OTP_MIN_LEN = 4
export const OTP_MAX_LEN = 6

export type RegisterFieldKey = 'email' | 'password' | 'passwordConfirm'
export type RegisterFieldErrors = Partial<Record<RegisterFieldKey, string>>

export type LoginFieldKey = 'account' | 'password'
export type LoginFieldErrors = Partial<Record<LoginFieldKey, string>>

export type ForgotPasswordEmailFieldErrors = Partial<{ email: string }>

export type ForgotPasswordResetFieldKey = 'code' | 'password' | 'passwordConfirm'
export type ForgotPasswordResetFieldErrors = Partial<
  Record<ForgotPasswordResetFieldKey, string>
>

export type OtpFieldErrors = Partial<{ code: string }>

/** Lightweight email check aligned with app client validation. */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  const at = trimmed.indexOf('@')
  if (at <= 0) return false
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  return local.length > 0 && domain.length > 0 && domain.includes('.')
}

export function validateRegisterFields(fields: {
  email: string
  password: string
  passwordConfirm: string
}): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {}
  if (!isValidEmail(fields.email)) {
    errors.email = getWord(550)
  }
  if (fields.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = getWord(551)
  } else if (fields.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = getWord(2500)
  }
  if (fields.password !== fields.passwordConfirm) {
    errors.passwordConfirm = getWord(552)
  }
  return errors
}

export function hasFieldErrors<T extends object>(errors: T): boolean {
  return Object.keys(errors).length > 0
}

export function validateLoginFields(fields: {
  account: string
  password: string
}): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  if (!isValidEmail(fields.account)) {
    errors.account = getWord(550)
  }
  if (!fields.password) {
    errors.password = getWord(551)
  }
  return errors
}

export function validateForgotPasswordEmail(email: string): ForgotPasswordEmailFieldErrors {
  const errors: ForgotPasswordEmailFieldErrors = {}
  if (!isValidEmail(email)) {
    errors.email = getWord(550)
  }
  return errors
}

export function validateForgotPasswordReset(fields: {
  code: string
  password: string
  passwordConfirm: string
}): ForgotPasswordResetFieldErrors {
  const errors: ForgotPasswordResetFieldErrors = {}
  const c = fields.code.replace(/\s/g, '')
  if (c.length < OTP_MIN_LEN || c.length > OTP_MAX_LEN) {
    errors.code = getWord(553)
  }
  if (fields.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = getWord(551)
  } else if (fields.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = getWord(2500)
  }
  if (fields.password !== fields.passwordConfirm) {
    errors.passwordConfirm = getWord(552)
  }
  return errors
}

export function validateOtpCode(code: string): OtpFieldErrors {
  const errors: OtpFieldErrors = {}
  const c = code.replace(/\s/g, '')
  if (c.length < OTP_MIN_LEN || c.length > OTP_MAX_LEN) {
    errors.code = getWord(553)
  }
  return errors
}

export function clearFieldError<K extends string>(
  errors: Partial<Record<K, string>>,
  key: K,
): Partial<Record<K, string>> {
  if (!errors[key]) return errors
  const next = { ...errors }
  delete next[key]
  return next
}
