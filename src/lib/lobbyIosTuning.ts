import { isIOSWebKit } from "./iosGameFullscreen";

/** iPhone 大廳：較小批次，降低轉屏時同時解碼縮圖的記憶體尖峰。 */
export function lobbyGamesPageSize(): number {
  return isIOSWebKit() ? 16 : 50;
}

export function lobbyGridLoadRootMargin(): string {
  return isIOSWebKit() ? "48px 0px 64px 0px" : "200px 0px 280px 0px";
}

export function lobbyThumbIntersectionMargin(): string {
  return isIOSWebKit() ? "48px 0px 64px 0px" : "200px 0px 220px 0px";
}

export function lobbyTrackLoadRootMargin(): string {
  return isIOSWebKit() ? "0px 80px 0px 0px" : "0px 240px 0px 0px";
}
