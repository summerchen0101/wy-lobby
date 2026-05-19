/** Default seconds before access expiry to call POST /api/v1/token. */
export const DEFAULT_TOKEN_REFRESH_LEAD_SEC = 300;

export function tokenRefreshLeadSecFromEnv(): number {
  const raw = import.meta.env.VITE_TOKEN_REFRESH_LEAD_SEC?.trim();
  if (!raw) return DEFAULT_TOKEN_REFRESH_LEAD_SEC;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_TOKEN_REFRESH_LEAD_SEC;
  return Math.floor(n);
}

/** Absolute expiry (ms) from OAuth-style `expiresIn` seconds. */
export function computeExpiresAtMs(
  expiresInSec: number,
  nowMs: number = Date.now(),
): number {
  if (!Number.isFinite(expiresInSec) || expiresInSec <= 0) {
    return nowMs;
  }
  return nowMs + expiresInSec * 1000;
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
