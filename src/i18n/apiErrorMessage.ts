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
