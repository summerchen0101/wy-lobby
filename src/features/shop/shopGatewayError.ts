import { translateGatewayError } from "../../i18n/apiErrorMessage";

/** Shop gateway errors: prefer server errMessage, then i18n / fallback. */
export function translateShopGatewayError(
  code: string | number | undefined | null,
  errMessage?: string | null,
  fallback = "Something went wrong. Please try again.",
): string {
  return translateGatewayError(code, errMessage, fallback);
}
