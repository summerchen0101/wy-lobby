import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api/client'
import { getWord } from '../../wordData/getWord'
import {
  hasFieldErrors,
  isValidEmail,
  translateVerificationCodeSubmitError,
  validateForgotPasswordEmail,
  validateForgotPasswordReset,
  validateLoginFields,
  validateOtpCode,
  validateRegisterFields,
} from './authFormValidation'

describe('isValidEmail', () => {
  it('accepts a simple valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })

  it('rejects missing @ or domain', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('user')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('user@domain')).toBe(false)
  })
})

describe('validateRegisterFields', () => {
  it('returns all field errors for invalid register input', () => {
    const errors = validateRegisterFields({
      email: 'bad',
      password: '123',
      passwordConfirm: '456',
    })
    expect(errors.email).toBeTruthy()
    expect(errors.password).toBeTruthy()
    expect(errors.passwordConfirm).toBeTruthy()
    expect(hasFieldErrors(errors)).toBe(true)
  })

  it('returns empty object when valid', () => {
    const errors = validateRegisterFields({
      email: 'user@example.com',
      password: '123456',
      passwordConfirm: '123456',
    })
    expect(hasFieldErrors(errors)).toBe(false)
  })

  it('flags password over max length', () => {
    const errors = validateRegisterFields({
      email: 'user@example.com',
      password: '1234567890123',
      passwordConfirm: '1234567890123',
    })
    expect(errors.password).toBeTruthy()
    expect(errors.passwordConfirm).toBeUndefined()
  })
})

describe('validateLoginFields', () => {
  it('requires valid email and non-empty password', () => {
    const errors = validateLoginFields({ account: 'bad', password: '' })
    expect(errors.account).toBeTruthy()
    expect(errors.password).toBeTruthy()
  })
})

describe('validateForgotPasswordEmail', () => {
  it('flags invalid email', () => {
    expect(validateForgotPasswordEmail('')).toEqual({ email: expect.any(String) })
  })
})

describe('validateForgotPasswordReset', () => {
  it('flags otp, password, and mismatch', () => {
    const errors = validateForgotPasswordReset({
      code: '1',
      password: '123',
      passwordConfirm: '456',
    })
    expect(errors.code).toBeTruthy()
    expect(errors.password).toBeTruthy()
    expect(errors.passwordConfirm).toBeTruthy()
  })
})

describe('validateOtpCode', () => {
  it('flags short otp', () => {
    expect(validateOtpCode('12')).toEqual({ code: expect.any(String) })
  })

  it('accepts 4-6 digit code', () => {
    expect(validateOtpCode('1234')).toEqual({})
    expect(validateOtpCode('123456')).toEqual({})
  })
})

describe('translateVerificationCodeSubmitError', () => {
  it('maps generic 403 to WordData 553', () => {
    const err = new ApiError(
      'The request is understood, but it has been refused or access is not allowed.',
      403,
    )
    expect(translateVerificationCodeSubmitError(err)).toBe(getWord(553))
  })

  it('maps verification API codes to WordData 553', () => {
    expect(translateVerificationCodeSubmitError(new ApiError('x', 403, '500002'))).toBe(
      getWord(553),
    )
  })

  it('preserves registration limit message', () => {
    const err = new ApiError('limit', 403, '403012')
    expect(translateVerificationCodeSubmitError(err)).toBe(getWord(403012))
  })
})
