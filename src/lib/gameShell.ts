import { openGamesInNewWindowDefault } from "./env";
import { createShellQuitMessage } from "./gameShellMessages";

const GAME_POPOUT_STORAGE_PREFIX = "ffgt:gamePopout:v1:";

/** 僅允許 http(s)，供遊戲 iframe／新分頁外殼辨識可載入之外部網址。 */
export function parseSafeHttpGameUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u.toString();
}

export function gamePopoutStorageKey(id: string): string {
  return `${GAME_POPOUT_STORAGE_PREFIX}${id.trim()}`;
}

/**
 * 寫入待開啟的遊戲 URL，回傳 query 用的短 id；localStorage 失敗時回傳 null。
 */
export function storeGamePopoutUrl(gameUrl: string): string | null {
  const safe = parseSafeHttpGameUrl(gameUrl);
  if (!safe) return null;
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(gamePopoutStorageKey(id), safe);
  } catch {
    return null;
  }
  return id;
}

/** 讀取暫存（不刪除）；若內容非安全 http(s) 則回傳 null。 */
export function readGamePopoutUrlByKey(id: string): string | null {
  const key = gamePopoutStorageKey(id);
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  return parseSafeHttpGameUrl(raw);
}

export function clearGamePopoutUrlByKey(id: string): void {
  try {
    localStorage.removeItem(gamePopoutStorageKey(id.trim()));
  } catch {
    /* ignore */
  }
}

/**
 * 組出 `/game-popout` 路徑 query：優先 localStorage handoff，失敗則回落 `url=`。
 */
export function buildGamePopoutPathQuery(gameUrl: string): string | null {
  const safe = parseSafeHttpGameUrl(gameUrl);
  if (!safe) return null;
  const id = storeGamePopoutUrl(safe);
  if (id) return `k=${encodeURIComponent(id)}`;
  return `url=${encodeURIComponent(safe)}`;
}

/** 與舊 `index.html` 相近：iOS 或 PWA 獨立模式 */
export function isIOSorStandalonePWA(): boolean {
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  const standalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === "function" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches));
  return isIos || !!standalone;
}

/** 與根目錄 `index.html` 內遊戲/金流 iframe 一致 */
const ALLOW_NON_PAYMENT = "fullscreen *; screen-wake-lock *";
const ALLOW_PAYMENT = `payment *; fullscreen *; screen-wake-lock *; clipboard-read *; clipboard-write *`;

export function buildIframeAllow(isPayment: boolean | undefined): string {
  return isPayment ? ALLOW_PAYMENT : ALLOW_NON_PAYMENT;
}

/** 對遊戲 iframe 送出 Unity Quit（與卸載前清理相同邏輯）。 */
export function postQuitToGameIframe(el: HTMLIFrameElement | null): void {
  if (!el) return;
  const src = el.src;
  try {
    const w = el.contentWindow;
    if (w && src && src !== "about:blank") {
      let targetOrigin = "*";
      try {
        targetOrigin = new URL(src).origin;
      } catch {
        /* ignore */
      }
      w.postMessage(createShellQuitMessage(), targetOrigin);
    }
  } catch {
    /* ignore */
  }
}

/**
 * 遊戲是否以新分頁開啟。後端可傳 `openInNewWindow`；未傳則讀
 * `VITE_OPEN_GAMES_IN_NEW_WINDOW`（對應舊的 `OPEN_GAMES_IN_NEW_WINDOW_DEFAULT`）。
 */
export function shouldOpenInNewWindow(explicit: boolean | undefined): boolean {
  if (explicit === true) return true;
  if (explicit === false) return false;
  return openGamesInNewWindowDefault();
}
