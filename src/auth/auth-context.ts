import { createContext } from 'react'
import type { AuthResponse, RegisterBody, SignupResult, User } from '../lib/api/types'

export type AuthContextValue = {
  user: User | null
  token: string | null
  ready: boolean
  login: (account: string, password: string) => Promise<void>
  /** 第一階或第二階註冊；第二階需帶 `answer` */
  signUp: (body: RegisterBody) => Promise<SignupResult>
  register: (body: RegisterBody) => Promise<void>
  /** 已取得的 `AuthResponse`（如註冊首輪即回 token）寫入 session */
  ingestAuthResponse: (res: AuthResponse) => void
  logout: (options?: { redirectTo?: 'home' | 'login' }) => void
  /** 清除 session 並導向 `/?auth=login`（refresh 失效、WS 拒絕等）。 */
  invalidateSessionToLogin: () => void
  refreshUser: () => Promise<void>
  /** 與 LOBBY_GET 等來源合併玩家欄位並持久化 */
  mergeUser: (patch: Partial<User>) => void
  /** 開局前以 refresh 換新 access；失敗回 null（已清 session 並導向登入） */
  ensureFreshAccessForGame: () => Promise<string | null>
  /**
   * 以 refresh token 換發 access 並寫入 session；成功回 true。
   * 失敗回 false（`refreshSession` 會觸發 `invalidateSessionToLogin`）。
   */
  tryRefreshSession: () => Promise<boolean>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
