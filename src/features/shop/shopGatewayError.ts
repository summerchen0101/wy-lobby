import { translateGatewayError } from "../../i18n/apiErrorMessage";

/**
 * WordData for these codes is auth/profile-specific; do not show in shop checkout.
 * @see WordData 400001 — password format (also reused as generic validation elsewhere).
 */
const SKIP_WORDDATA_CODES = new Set(["400001"]);

/** Shop gateway errors: prefer server errMessage, then WordData, with shop-safe fallbacks. */
export function translateShopGatewayError(
  code: string | number | undefined | null,
  errMessage?: string | null,
  fallback = "Something went wrong. Please try again.",
): string {
  const serverMsg = errMessage?.trim();
  if (serverMsg) return serverMsg;
  const codeStr =
    code === undefined || code === null ? "" : String(code).trim();
  if (codeStr && SKIP_WORDDATA_CODES.has(codeStr)) {
    return fallback;
  }
  return translateGatewayError(code, errMessage, fallback);
}
