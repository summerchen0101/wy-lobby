import { DEFAULT_LANGUAGE } from "./constants";
import i18n from "./i18n";

/**
 * Locale for `Intl.NumberFormat`, `Intl.DateTimeFormat`, etc.
 * Not wired to URL; follows current i18next language.
 */
export function getActiveLocale(): string {
  const resolved = i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LANGUAGE;
  if (resolved === "zh-TW" || resolved.startsWith("zh-TW")) return "zh-TW";
  return "en-US";
}
