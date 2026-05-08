/** localStorage key — shared with Profile sound toggle */
export const LOBBY_SOUND_PREF_STORAGE_KEY = "wynoco_profile_sound_on";

/** Dispatched on same tab when the user toggles sound in Profile */
export const LOBBY_SOUND_PREF_EVENT = "wynoco-lobby-sound-pref";

export const LOBBY_SFX_BTN_SRC = "/voices/Btn.mp3";
export const LOBBY_SFX_MENU_SRC = "/voices/US_MenuBtn.mp3";
export const LOBBY_BGM_SRC = "/voices/Us_LobbyVoice_F1.mp3";

export function isLobbySoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(LOBBY_SOUND_PREF_STORAGE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
    return true;
  } catch {
    return true;
  }
}

export function notifyLobbySoundPreferenceChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOBBY_SOUND_PREF_EVENT));
}

let sfxBtn: HTMLAudioElement | null = null;
let sfxMenu: HTMLAudioElement | null = null;

function getSfx(kind: "btn" | "menu"): HTMLAudioElement {
  if (kind === "menu") {
    if (!sfxMenu) {
      sfxMenu = new Audio(LOBBY_SFX_MENU_SRC);
      sfxMenu.preload = "auto";
    }
    return sfxMenu;
  }
  if (!sfxBtn) {
    sfxBtn = new Audio(LOBBY_SFX_BTN_SRC);
    sfxBtn.preload = "auto";
  }
  return sfxBtn;
}

export function playLobbySfx(kind: "btn" | "menu"): void {
  if (!isLobbySoundEnabled()) return;
  try {
    const a = getSfx(kind);
    a.currentTime = 0;
    void a.play().catch(() => {
      /* autoplay / decode */
    });
  } catch {
    /* ignore */
  }
}
