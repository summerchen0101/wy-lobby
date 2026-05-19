/** Default seconds before access expiry to call POST /api/v1/token. */
export const DEFAULT_TOKEN_REFRESH_LEAD_SEC = 300;

/** Values below this are treated as OAuth-style remaining lifetime (seconds). */
export const ABSOLUTE_EXPIRY_UNIX_SEC_THRESHOLD = 1_000_000_000;

export function tokenRefreshLeadSecFromEnv(): number {
  const raw = import.meta.env.VITE_TOKEN_REFRESH_LEAD_SEC?.trim();
  if (!raw) return DEFAULT_TOKEN_REFRESH_LEAD_SEC;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_TOKEN_REFRESH_LEAD_SEC;
  return Math.floor(n);
}

/**
 * Map login/refresh `expiresIn` to absolute expiry (ms).
 *
 * - IAM / production API: **Unix expiry in seconds** (e.g. `1779420046`).
 * - Values >= 1e12: treated as Unix expiry in **milliseconds**.
 * - Small values (e.g. mock `3600`): OAuth-style **remaining lifetime in seconds**.
 */
export function resolveAccessExpiresAtMs(
  expiresIn: number,
  nowMs: number = Date.now(),
): number {
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    return nowMs;
  }
  if (expiresIn >= 1_000_000_000_000) {
    return expiresIn;
  }
  if (expiresIn >= ABSOLUTE_EXPIRY_UNIX_SEC_THRESHOLD) {
    return expiresIn * 1000;
  }
  return nowMs + expiresIn * 1000;
}

/**
 * Delay until proactive refresh should run (ms).
 * Refresh fires when `now + delay >= expiresAtMs - leadMs`.
 */
export function computeRefreshDelayMs(
  expiresAtMs: number,
  leadSec: number,
  nowMs: number = Date.now(),
): number {
  const leadMs = Math.max(0, leadSec) * 1000;
  return Math.max(0, expiresAtMs - leadMs - nowMs);
}

/** True when access is inside the proactive refresh window (or already expired). */
export function isWithinRefreshLeadWindow(
  expiresAtMs: number,
  leadSec: number,
  nowMs: number = Date.now(),
): boolean {
  return computeRefreshDelayMs(expiresAtMs, leadSec, nowMs) === 0;
}
