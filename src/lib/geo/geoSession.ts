/**
 * Whether a userId transition should trigger trackVerified().
 * Geo checks and blocks only run after login (authenticated userId present).
 * - Login / session restore: undefined → userId
 * - Switch account: userA → userB
 * - Access token refresh (same user): skip
 * - Logout: userId → undefined → skip (caller clears to allowed)
 */
export function shouldVerifyOnUserChange(
  prevUserId: string | undefined,
  currentUserId: string | undefined,
): boolean {
  const current = currentUserId?.trim() || undefined;
  if (!current) return false;
  const prev = prevUserId?.trim() || undefined;
  return prev !== current;
}
