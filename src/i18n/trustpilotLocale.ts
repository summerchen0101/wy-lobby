/** Trustpilot widget `data-locale` / review filter alignment with app language. */
export function trustpilotDataLocale(appLng: string): string {
  return appLng === "zh-TW" || appLng.startsWith("zh-TW") ? "zh-TW" : "en-US";
}

export function trustpilotReviewLanguages(appLng: string): string {
  return appLng === "zh-TW" || appLng.startsWith("zh-TW") ? "zh" : "en";
}
