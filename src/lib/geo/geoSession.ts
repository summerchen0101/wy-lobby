/**
 * Auth may briefly use placeholder id `"0"` until LOBBY_GET merges the real
 * snowflake. That value must not be sent to Radar (Bypass rules match real ids).
 */
export function isRadarUserId(userId: string | undefined): boolean {
  const trimmed = userId?.trim();
  return Boolean(trimmed && trimmed !== "0");
}

/**
 * Whether a userId transition should trigger trackVerified().
 * Geo checks and blocks only run after login (authenticated userId present).
 * - Login / session restore: undefined → userId
 * - Switch account: userA → userB
 * - Access token refresh (same user): skip
 * - Logout: userId → undefined → skip (caller clears to allowed)
 * - Placeholder `"0"`: skip until a real id arrives
 */
export function shouldVerifyOnUserChange(
  prevUserId: string | undefined,
  currentUserId: string | undefined,
): boolean {
  const current = currentUserId?.trim() || undefined;
  if (!isRadarUserId(current)) return false;
  const prev = prevUserId?.trim() || undefined;
  return prev !== current;
}
