import { refreshAccessToken } from "../lib/api/auth";
import type { AuthResponse } from "../lib/api/types";
import { notifySessionRefreshFailed } from "./sessionRefreshNotify";
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  persistAuthResponseFull,
} from "./sessionPersist";

let refreshInFlight: Promise<AuthResponse | null> | null = null;

/**
 * Exchange stored refresh token for a new session (single-flight).
 * Persists access/refresh/expiry to localStorage on success.
 */
export async function refreshSession(): Promise<AuthResponse | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  const rt = getStoredRefreshToken();
  if (!rt?.trim()) {
    notifySessionRefreshFailed();
    return null;
  }
  refreshInFlight = (async () => {
    try {
      const res = await refreshAccessToken(rt, getStoredAccessToken());
      persistAuthResponseFull(res);
      return res;
    } catch {
      notifySessionRefreshFailed();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
