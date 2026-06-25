/**
 * Whether a token transition should trigger trackVerified().
 * - Session restore / first auth: undefined → token
 * - Active login after guest: null → token
 * - Access token refresh: tokenA → tokenB → skip
 */
export function shouldVerifyOnTokenChange(
  prev: string | null | undefined,
  current: string | null,
): boolean {
  if (!current) return false;
  return prev === undefined || prev === null;
}
