/** 第三方遊戲商後端 `platform` → 前端顯示品牌名（key 為大寫）。 */
const THIRD_PARTY_PLATFORM_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  MICROGAMING: "M2PLAY",
};

/** 將後端 `platform` 轉為大廳／卡片上顯示的品牌名；未對應則原樣回傳。 */
export function thirdPartyPlatformDisplayName(platform: string): string {
  const raw = platform.trim();
  if (!raw) return platform;
  return THIRD_PARTY_PLATFORM_DISPLAY_NAMES[raw.toUpperCase()] ?? raw;
}
