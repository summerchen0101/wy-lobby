export const I18N_STORAGE_KEY = "wynoco-ui-locale";

export const SUPPORTED_LANGUAGES = ["en", "zh-TW"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: AppLanguage = "en";

/** BCP 47 for `<html lang>`. */
export function htmlLangFromAppLanguage(lng: string): string {
  if (lng === "zh-TW" || lng.startsWith("zh-TW")) return "zh-TW";
  return "en-US";
}
