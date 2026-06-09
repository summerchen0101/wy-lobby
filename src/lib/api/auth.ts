import { buildAppMetaPayload, getOrCreateWebDeviceId, LOGIN_V1_TYPE } from '../appMeta'
import { apiRequest, ApiError } from './client'

export { ClientVersionError } from './client'
import { normalizeAuthResponse, parseSignupResponse } from './authParse'
import { getApiPaths } from './paths'
import type {
  AuthResponse,
  LoginBody,
  PasswordResetInfoRequest,
  PasswordResetRequest,
  SignupResult,
  SignUpRequest,
} from './types'

function buildV1LoginBody(body: LoginBody) {
  return {
    email: body.account.trim(),
    password: body.password,
    type: LOGIN_V1_TYPE,
    app_meta: buildAppMetaPayload(),
    deviceID: getOrCreateWebDeviceId(),
  }
}

/**
 * 換發 body：與登入相同帶 `deviceID`／`app_meta`（IAM 常要求）；`refreshToken` 為必填。
 * 部分環境另認 `aRefreshToken`，一併帶相同值以相容。
 */
function buildV1RefreshBody(refreshToken: string) {
  const rt = refreshToken.trim()
  if (!rt) {
    throw new ApiError('Missing refresh token', 400)
  }
  return {
    refreshToken: rt,
    aRefreshToken: rt,
    deviceID: getOrCreateWebDeviceId(),
    app_meta: buildAppMetaPayload(),
  }
}

export async function signUp(body: SignUpRequest): Promise<SignupResult> {
  const data = await apiRequest<unknown>(getApiPaths().register, {
    method: 'POST',
    body,
    largeSafeUserIdsInJson: true,
  })
  return parseSignupResponse(data, body)
}

/** 第二階註冊（已填 `answer`）或後端不須驗證而直接回 token 時，取回 `AuthResponse`。 */
export async function completeSignUp(body: SignUpRequest): Promise<AuthResponse> {
  const s = await signUp(body)
  if (s.auth) return s.auth
  if (s.needSMSAnswer) {
    throw new ApiError('Sign-up incomplete: enter the verification code or try again', 400)
  }
  if (body.answer?.trim()) {
    return login({ account: body.email, password: body.password })
  }
  throw new ApiError('Sign-up incomplete: enter the verification code or try again', 400)
}

export async function refreshAccessToken(
  refreshToken: string,
  /** 若後端要求，可帶目前 access 作為 Bearer（文件未強制；IAM 實務常需要）。 */
  accessToken?: string | null,
): Promise<AuthResponse> {
  const bearer = accessToken?.trim() || null
  const data = await apiRequest<unknown>(getApiPaths().token, {
    method: 'POST',
    body: buildV1RefreshBody(refreshToken),
    token: bearer,
    skipUnauthorizedOn401: true,
    largeSafeUserIdsInJson: true,
  })
  return normalizeAuthResponse(data)
}

export async function login(body: LoginBody): Promise<AuthResponse> {
  const data = await apiRequest<unknown>(getApiPaths().login, {
    method: 'POST',
    body: buildV1LoginBody(body),
    largeSafeUserIdsInJson: true,
  })
  return normalizeAuthResponse(data)
}

export async function requestPasswordReset(body: PasswordResetRequest): Promise<void> {
  await apiRequest<unknown>(getApiPaths().passwordReset, {
    method: 'POST',
    body: { email: body.email.trim() },
  })
}

export async function completePasswordReset(body: PasswordResetInfoRequest): Promise<void> {
  await apiRequest<unknown>(getApiPaths().passwordResetInfo, {
    method: 'POST',
    body: {
      email: body.email.trim(),
      password: body.password,
      code: body.code.trim(),
    },
  })
}
