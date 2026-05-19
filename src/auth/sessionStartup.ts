import {
  getStoredAccessExpiresAtMs,
  getStoredAccessToken,
  getStoredRefreshToken,
} from "./sessionPersist";
import {
  isWithinRefreshLeadWindow,
  tokenRefreshLeadSecFromEnv,
} from "./tokenExpiry";

/**
 * 啟動時是否應以 refresh 換發／驗證 session（storage 有 access 時）。
 * - 無 access：由 bootstrap 另判斷
 * - 無 expiresAt：需打 /token
 * - access 已進入換發窗口或已過期：需打 /token
 */
export function shouldRefreshStoredSessionOnStartup(
  nowMs: number = Date.now(),
): boolean {
  const rt = getStoredRefreshToken()?.trim();
  if (!rt) return false;
  const access = getStoredAccessToken()?.trim();
  if (!access) return true;

  const expiresAtMs = getStoredAccessExpiresAtMs();
  if (expiresAtMs == null) return true;

  return isWithinRefreshLeadWindow(
    expiresAtMs,
    tokenRefreshLeadSecFromEnv(),
    nowMs,
  );
}
