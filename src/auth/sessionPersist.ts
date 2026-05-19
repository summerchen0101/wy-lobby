import type { AuthResponse } from "../lib/api/types";
import {
  ACCESS_EXPIRES_AT_MS_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from "./storage";
import { resolveAccessExpiresAtMs } from "./tokenExpiry";
import { writePersistedUser } from "./userPersist";

export function getStoredAccessToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function getStoredAccessExpiresAtMs(): number | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(ACCESS_EXPIRES_AT_MS_KEY);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function persistAuthResponse(res: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken);
  if (res.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.refreshToken);
  }
  if (res.expiresIn != null && Number.isFinite(res.expiresIn) && res.expiresIn > 0) {
    const expiresAtMs = resolveAccessExpiresAtMs(res.expiresIn);
    localStorage.setItem(ACCESS_EXPIRES_AT_MS_KEY, String(expiresAtMs));
  } else {
    localStorage.removeItem(ACCESS_EXPIRES_AT_MS_KEY);
    if (import.meta.env.DEV) {
      console.warn(
        "[auth] auth response missing expiresIn; proactive token refresh disabled",
      );
    }
  }
}

export function persistAuthResponseFull(res: AuthResponse): void {
  persistAuthResponse(res);
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_AT_MS_KEY);
  writePersistedUser(null);
}
