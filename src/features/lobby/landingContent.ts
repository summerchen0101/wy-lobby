import type { Game } from "../../lib/api/types";
import { publicImageUrl } from "../../lib/publicImageUrl";
import type { ActiveWallet } from "../../wallet/walletContext";

const G = "https://static.crowncoinscasino.com/production/assets/games";

/** 直向大廳 Panel 背景（public） */
export const PANEL_VERTICAL_LOBBY_BG_BASE = publicImageUrl("/images/lobby/bg");

export const PANEL_BG_UNLOGIN = `${PANEL_VERTICAL_LOBBY_BG_BASE}/tmp_unLoginBg.png`;
export const PANEL_BG_GC = `${PANEL_VERTICAL_LOBBY_BG_BASE}/tmp_GCbg.png`;
export const PANEL_BG_SC = `${PANEL_VERTICAL_LOBBY_BG_BASE}/tmp_SCbg.png`;
export const PANEL_PATTERN_BG = `${PANEL_VERTICAL_LOBBY_BG_BASE}/Pattern_bg.png`;

/** 已登入大廳 banner 分層（v2） */
export const LOBBY_BANNER_BASE = publicImageUrl("/images/lobby/banner");
export const LOBBY_BANNER_TITLE = `${LOBBY_BANNER_BASE}/title.png`;
export const LOBBY_BANNER_SUBTITLE = `${LOBBY_BANNER_BASE}/subtitle.png`;
export const LOBBY_BANNER_SUBTITLE_ANIM = `${LOBBY_BANNER_BASE}/subtitle_anim.png`;

/** 訪客落地頁裝飾圖 */
export const GUEST_DECOR_BASE = publicImageUrl("/images/lobby/guest");
export const GUEST_FOOT_PAGE_BG = `${GUEST_DECOR_BASE}/img_footPage_2x.png`;

const DEFAULT_UNITY_DEMO_URL =
  "https://unityweb-alpha.ffglobaltech.com/0000/Single1/index.html";

export function unityDemoGameUrl(): string {
  return import.meta.env.VITE_UNITY_DEMO_URL?.trim() || DEFAULT_UNITY_DEMO_URL;
}

/** 本地遊戲卡圖（放於 public/images/games/entry）；檔名：entry_slot{N}_L.png */
export const GAME_ENTRY_BASE = publicImageUrl("/images/games/entry");

/** 未登入大廳第二列固定試玩（由 LOBBY_GET 同批清單依 id 對應，缺漏時以 placeholder 顯示卡圖） */
export const GUEST_DEMO_SLOT_IDS: readonly [number, number, number] = [
  52, 85, 144,
];

/** 與 public/images/games/entry 內檔案對齊，依 slot 編號數字排序（不含 entry_slotLoading_L 等）。 */
const GAME_ENTRY_SLOT_IDS: number[] = [
  1, 2, 4, 8, 15, 16, 18, 20, 21, 35, 41, 42, 43, 45, 46, 47, 50, 51, 52, 55,
  56, 57, 58, 59, 60, 62, 63, 65, 66, 67, 68, 69, 70, 71, 72, 74, 75, 76, 77,
  78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96,
  97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112,
  113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127,
  128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 141, 142, 143,
  144, 145, 238, 249,
];

export const GAME_ENTRY_CARD_IMAGES: string[] = GAME_ENTRY_SLOT_IDS.map(
  (n) => `${GAME_ENTRY_BASE}/entry_slot${n}_L.png`,
);

/**
 * 大廳／訪客卡片縮圖：有設定本地清單時優先使用，否則用 API 或靜態 fallback。
 */
export function gameEntryThumbnail(
  index: number,
  fallback?: string,
): string | undefined {
  if (GAME_ENTRY_CARD_IMAGES.length === 0) return fallback;
  return GAME_ENTRY_CARD_IMAGES[index % GAME_ENTRY_CARD_IMAGES.length];
}

const NUMERIC_GAME_ID = /^\d+$/;

/**
 * 大廳卡片背景：`public/images/games/entry/entry_slot{gameId}_L.png`（gameId 為純數字時）。
 * 其餘沿用輪播本地圖或遠端縮圖。
 */
export function lobbyGameCardThumbnail(
  gameId: string,
  indexFallback: number,
  remoteFallback?: string,
): string | undefined {
  if (NUMERIC_GAME_ID.test(gameId)) {
    return `${GAME_ENTRY_BASE}/entry_slot${gameId}_L.png`;
  }
  return gameEntryThumbnail(indexFallback, remoteFallback);
}

/**
 * 第三方遊戲入口圖：`{VITE_THIRD_PARTY_GAME_THUMB_BASE}/{platform}/{gameUID}.png`。
 * 未設定基底或欄位為空時回傳 undefined（見 docs/gateway-proto-api.md §3）。
 */
export function thirdPartyGameEntryThumbnailUrl(
  platform: string,
  gameUID: string,
): string | undefined {
  const base = (import.meta.env.VITE_THIRD_PARTY_GAME_THUMB_BASE ?? "")
    .trim()
    .replace(/\/+$/, "");
  const p = platform.trim();
  const uid = gameUID.trim();
  if (!base || !p || !uid) return undefined;
  return `${base}/${encodeURIComponent(p)}/${encodeURIComponent(uid)}.png`;
}

/**
 * 「Our Top Games」內用於 Unity WebGL iframe 試玩之遊戲卡（與訪客首列 Olympia 為同一筆體感）。
 * 已登入時會再插入 API 回傳列表前方，方便同區塊測試。
 */
export const UNITY_DEMO_LOBBY_GAME: Game = {
  id: "ffgt-unity-webgl-demo",
  title: "Olympia",
  subtitle: "WebGL (Alpha)",
  launchUrl: unityDemoGameUrl(),
  openInNewWindow: false,
  thumbnailUrl: `${G}/crownslots/olympics-alternate-all-KXkAo.webp`,
};

/** 已登入大廳 banner 影片（v2）；走 app origin `/public`，不走 image CDN。 */
export const LOBBY_BANNER_VIDEO_BASE = "/videos/lobby";
export const LOBBY_BANNER_VIDEO_SC = `${LOBBY_BANNER_VIDEO_BASE}/Export_WebMp4_SC.mp4`;
export const LOBBY_BANNER_VIDEO_GC = `${LOBBY_BANNER_VIDEO_BASE}/Export_WebMp4_GC.mp4`;

/**
 * 已登入大廳 banner：依目前選中錢包 GC/SC 切圖；`VITE_LOBBY_HERO_IMAGE` 若設定則覆寫兩者。
 */
export function getSessionLobbyBannerImage(activeWallet: ActiveWallet): string {
  const u = import.meta.env.VITE_LOBBY_HERO_IMAGE?.trim();
  if (u) return u;
  return activeWallet === "SC" ? PANEL_BG_SC : PANEL_BG_GC;
}

/** 已登入大廳 banner 影片：依目前選中錢包 GC/SC 切換。 */
export function getSessionLobbyBannerVideo(activeWallet: ActiveWallet): string {
  return activeWallet === "SC" ? LOBBY_BANNER_VIDEO_SC : LOBBY_BANNER_VIDEO_GC;
}

/** 訪客 hero：預設未登入 Panel 圖；`VITE_GUEST_HERO_IMAGE` 可覆寫。 */
export function getGuestHeroImage(): string {
  const u = import.meta.env.VITE_GUEST_HERO_IMAGE?.trim();
  return u || PANEL_BG_UNLOGIN;
}

export const FLOATING_CTA_IMAGE = publicImageUrl("/images/lobby/gift_box.png");
