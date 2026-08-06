import { setWelcomeVoiceGateOpen } from "./lobbyWelcomeVoiceGate";

/** Dispatched when session eviction should close lobby onboarding overlays. */
export const LOBBY_SESSION_OVERLAYS_DISMISS_EVENT =
  "luklok-lobby-session-overlays-dismiss";

let sessionEvicted = false;

export function isLobbySessionEvicted(): boolean {
  return sessionEvicted;
}

/**
 * 被踢／登出／session 失效導向未登入頁前：關閉每日登入與新手教學，並阻止自動再開。
 */
export function dismissLobbySessionOverlays(): void {
  sessionEvicted = true;
  setWelcomeVoiceGateOpen(false);
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOBBY_SESSION_OVERLAYS_DISMISS_EVENT));
}

/** 成功建立新登入 session 後恢復 gate（允許每日登入／教學正常運作）。 */
export function clearLobbySessionEviction(): void {
  sessionEvicted = false;
}
