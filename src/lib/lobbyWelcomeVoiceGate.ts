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
