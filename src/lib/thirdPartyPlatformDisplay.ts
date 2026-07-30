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

function displayNameFirstCharRank(ch: string): number {
  if (/\d/.test(ch)) return 0;
  if (/[A-Za-z]/.test(ch)) return 1;
  return 2;
}

/** 大廳第三方廠商排序：顯示名首字先數字 0–9，再英文 A–Z。 */
export function compareThirdPartyPlatformsByDisplayName(
  a: string,
  b: string,
): number {
  const da = thirdPartyPlatformDisplayName(a);
  const db = thirdPartyPlatformDisplayName(b);
  const ca = da.charAt(0);
  const cb = db.charAt(0);
  const ra = displayNameFirstCharRank(ca);
  const rb = displayNameFirstCharRank(cb);
  if (ra !== rb) return ra - rb;
  const first = ca.localeCompare(cb, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (first !== 0) return first;
  return da.localeCompare(db, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/** 回傳依顯示名排序後的 platform 列表（不變更原陣列）。 */
export function sortThirdPartyPlatforms(platforms: readonly string[]): string[] {
  return [...platforms].sort(compareThirdPartyPlatformsByDisplayName);
}
