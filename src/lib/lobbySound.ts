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

/* --- Web Audio (lower tap-to-sound latency than HTMLAudioElement on many mobile browsers) --- */

let sfxCtx: AudioContext | null = null;
let bufBtn: AudioBuffer | null = null;
let bufMenu: AudioBuffer | null = null;
let sfxDecodePromise: Promise<void> | null = null;

function getSfxAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sfxCtx) {
    const Ctor =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!Ctor) return null;
    sfxCtx = new Ctor({ latencyHint: "interactive" });
  }
  return sfxCtx;
}

function startSfxDecode(): void {
  if (bufBtn && bufMenu) return;
  if (sfxDecodePromise) return;
  const ctx = getSfxAudioContext();
  if (!ctx) return;

  sfxDecodePromise = (async () => {
    try {
      const [rBtn, rMenu] = await Promise.all([
        fetch(LOBBY_SFX_BTN_SRC),
        fetch(LOBBY_SFX_MENU_SRC),
      ]);
      const [abBtn, abMenu] = await Promise.all([
        rBtn.arrayBuffer(),
        rMenu.arrayBuffer(),
      ]);
      const [bBtn, bMenu] = await Promise.all([
        ctx.decodeAudioData(abBtn.slice(0)),
        ctx.decodeAudioData(abMenu.slice(0)),
      ]);
      bufBtn = bBtn;
      bufMenu = bMenu;
    } catch {
      sfxDecodePromise = null;
    }
  })();
}

function playLobbySfxWebAudio(kind: "btn" | "menu"): boolean {
  const buf = kind === "menu" ? bufMenu : bufBtn;
  const ctx = sfxCtx;
  if (!buf || !ctx) return false;

  const startSource = () => {
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  };

  /* resume() must be reached from the same user gesture stack; avoid extra delay when already running */
  if (ctx.state === "running") {
    startSource();
  } else {
    void ctx.resume().then(startSource);
  }
  return true;
}

function playLobbySfxFallback(kind: "btn" | "menu"): void {
  const a = getSfx(kind);
  a.currentTime = 0;
  void a.play().catch(() => {
    /* autoplay / decode */
  });
}

export function playLobbySfx(kind: "btn" | "menu"): void {
  if (!isLobbySoundEnabled()) return;
  try {
    startSfxDecode();
    if (playLobbySfxWebAudio(kind)) return;
    playLobbySfxFallback(kind);
  } catch {
    try {
      playLobbySfxFallback(kind);
    } catch {
      /* ignore */
    }
  }
}

/** Prime fetch+decode so the first tap only pays resume()+startSource (Web Audio path). */
export function warmLobbySfx(): void {
  if (typeof window === "undefined") return;
  try {
    startSfxDecode();
    getSfx("btn").load();
    getSfx("menu").load();
  } catch {
    /* ignore */
  }
}
