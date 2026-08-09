import i18n from "./i18n";

/**
 * Maps backend/API error codes to localized copy. Add keys under `errors` namespace JSON;
 * unknown codes fall back to `errors:unknown`.
 */
export function translateApiErrorCode(code: string | undefined | null): string {
  const trimmed = code?.trim();
  if (trimmed) {
    const key = `errors:${trimmed}`;
    if (i18n.exists(key)) return i18n.t(key);
  }
  return i18n.t("errors:unknown");
}

/**
 * Gateway / API error display: server errMessage → i18n errors:key → fallback.
 * Gateway `code` is not a WordData ID; do not map numeric codes to WordData.
 */
export function translateGatewayError(
  code: string | number | undefined | null,
  errMessage?: string | null,
  fallback = "Something went wrong. Please try again.",
): string {
  const serverMsg = errMessage?.trim();
  if (serverMsg) return serverMsg;
  const codeStr =
    code === undefined || code === null ? "" : String(code).trim();
  if (codeStr) {
    const fromI18n = translateApiErrorCode(codeStr);
    if (fromI18n !== i18n.t("errors:unknown")) return fromI18n;
  }
  return fallback;
}
