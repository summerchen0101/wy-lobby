/** Dispatched when login welcome voice gate opens (tutorial may proceed). */
export const LOBBY_WELCOME_VOICE_GATE_EVENT = "luklok-lobby-welcome-voice-gate";

let welcomeVoiceGateOpen = true;

export function isWelcomeVoiceGateOpen(): boolean {
  return welcomeVoiceGateOpen;
}

export function setWelcomeVoiceGateOpen(open: boolean): void {
  if (welcomeVoiceGateOpen === open) return;
  welcomeVoiceGateOpen = open;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOBBY_WELCOME_VOICE_GATE_EVENT));
}

/** 使用者主動登入／註冊／OAuth 成功時同步關 gate，避免教學 overlay 搶跑。 */
export function markFreshLoginWelcomeVoicePending(): void {
  setWelcomeVoiceGateOpen(false);
}

/** iOS BFCache／歡迎語 hang 後 gate 可能卡在 false；歡迎語未在播時強制重開。 */
export function reopenWelcomeVoiceGateIfIdle(): void {
  setWelcomeVoiceGateOpen(true);
}
