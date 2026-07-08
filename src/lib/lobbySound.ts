/** localStorage key — shared with Profile sound toggle */
export const LOBBY_SOUND_PREF_STORAGE_KEY = "luklok_profile_sound_on";

/** Dispatched on same tab when the user toggles sound in Profile */
export const LOBBY_SOUND_PREF_EVENT = "luklok-lobby-sound-pref";

/** Dispatched when lobby BGM should pause for overlays (e.g. game shell). */
export const LOBBY_BGM_SUPPRESS_EVENT = "luklok-lobby-bgm-suppress";

/** Dispatched when lobby BGM duck level changes (e.g. newbie tutorial clip 7). */
export const LOBBY_BGM_DUCK_EVENT = "luklok-lobby-bgm-duck";

/** Dispatched when lobby hero banner video should mute (e.g. newbie tutorial). */
export const LOBBY_BANNER_MUTE_EVENT = "luklok-lobby-banner-mute";

export const LOBBY_BGM_DUCK_VOLUME = 0.25;
export const LOBBY_BGM_NORMAL_VOLUME = 1;

/** Clip index 6 → deploy 7.mp4 (source 4_click.mp4) — duck lobby BGM during this clip. */
export const TUTORIAL_BGM_DUCK_CLIP_INDEX = 6;

let lobbyBgmSuppressed = false;

export function isLobbyBgmSuppressed(): boolean {
  return lobbyBgmSuppressed;
}

export function setLobbyBgmSuppressed(suppressed: boolean): void {
  if (lobbyBgmSuppressed === suppressed) return;
  lobbyBgmSuppressed = suppressed;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOBBY_BGM_SUPPRESS_EVENT));
}

let lobbyBannerMuted = false;

export function isLobbyBannerMuted(): boolean {
  return lobbyBannerMuted;
}

export function setLobbyBannerMuted(muted: boolean): void {
  if (lobbyBannerMuted === muted) return;
  lobbyBannerMuted = muted;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOBBY_BANNER_MUTE_EVENT));
}

export const LOBBY_SFX_BTN_SRC = "/voices/Btn.mp3";
export const LOBBY_SFX_MENU_SRC = "/voices/US_MenuBtn.mp3";

export const LOBBY_BGM_VARIANTS = ["/voices/lobbybpm106_loop.mp3"] as const;

export const LOBBY_WELCOME_VOICE_FEMALE = [
  "/voices/Us_LobbyVoice_F1.mp3",
  "/voices/Us_LobbyVoice_F3.mp3",
] as const;

export const LOBBY_WELCOME_VOICE_MALE = [
  "/voices/Us_LobbyVoice_M1.mp3",
  "/voices/Us_LobbyVoice_M3.mp3",
] as const;

/** @deprecated use pickAlternatingWelcomeVoiceSrc */
export const LOBBY_WELCOME_VOICE_VARIANTS = LOBBY_WELCOME_VOICE_FEMALE;

const LOBBY_WELCOME_VOICE_LAST_GENDER_KEY =
  "luklok_lobby_welcome_voice_last_gender";

export function pickAlternatingWelcomeVoiceSrc(): string {
  let last: string | null = null;
  if (typeof window !== "undefined") {
    try {
      last = window.localStorage.getItem(LOBBY_WELCOME_VOICE_LAST_GENDER_KEY);
    } catch {
      /* ignore */
    }
  }
  const useMale = last !== "M";
  const gender = useMale ? "M" : "F";
  const pool =
    gender === "M" ? LOBBY_WELCOME_VOICE_MALE : LOBBY_WELCOME_VOICE_FEMALE;
  const src = pool[Math.floor(Math.random() * pool.length)]!;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOBBY_WELCOME_VOICE_LAST_GENDER_KEY, gender);
    } catch {
      /* ignore */
    }
  }
  return src;
}

export function pickLobbyBgmSrc(): string {
  const i = Math.floor(Math.random() * LOBBY_BGM_VARIANTS.length);
  return LOBBY_BGM_VARIANTS[i]!;
}

export function pickLobbyWelcomeVoiceSrc(): string {
  return pickAlternatingWelcomeVoiceSrc();
}

export function assignLobbyBgm(audio: HTMLAudioElement): void {
  audio.src = pickLobbyBgmSrc();
  audio.load();
  applyLobbyBgmVolume(audio);
}

let lobbyBgmDuckLevel = LOBBY_BGM_NORMAL_VOLUME;

export function getLobbyBgmDuckLevel(): number {
  return lobbyBgmDuckLevel;
}

export function setLobbyBgmDuckLevel(level: number): void {
  const next = Math.max(0, Math.min(1, level));
  if (lobbyBgmDuckLevel === next) return;
  lobbyBgmDuckLevel = next;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOBBY_BGM_DUCK_EVENT));
}

export function applyLobbyBgmVolume(audio: HTMLAudioElement): void {
  audio.volume = lobbyBgmDuckLevel;
}

export function getTutorialBgmDuckLevelForClip(clipIndex: number): number {
  return clipIndex === TUTORIAL_BGM_DUCK_CLIP_INDEX
    ? LOBBY_BGM_DUCK_VOLUME
    : LOBBY_BGM_NORMAL_VOLUME;
}

async function waitForMediaCanPlay(media: HTMLMediaElement): Promise<void> {
  if (media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      media.removeEventListener("canplay", onCanPlay);
      media.removeEventListener("error", onError);
    };
    const onCanPlay = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("[lobby-sound] media load failed"));
    };
    media.addEventListener("canplay", onCanPlay, { once: true });
    media.addEventListener("error", onError, { once: true });
  });
}

/** 等 canplay 再 play；供大廳 BGM 避免 load 未完成就 play 失敗後無聲。 */
export async function resumeLobbyBgm(audio: HTMLAudioElement): Promise<void> {
  if (!isLobbySoundEnabled()) {
    audio.pause();
    return;
  }
  if (
    typeof document !== "undefined" &&
    document.visibilityState !== "visible"
  ) {
    audio.pause();
    return;
  }
  if (audio.ended) return;

  try {
    await waitForMediaCanPlay(audio);
    applyLobbyBgmVolume(audio);
    await audio.play();
  } catch {
    /* autoplay policy / decode */
  }
}

let welcomeVoice: HTMLAudioElement | null = null;
let welcomeVoicePendingRetry = false;

function getWelcomeVoiceAudio(): HTMLAudioElement {
  if (!welcomeVoice) {
    welcomeVoice = new Audio();
    welcomeVoice.preload = "auto";
    welcomeVoice.loop = false;
  }
  return welcomeVoice;
}

export function isLobbyWelcomeVoicePendingRetry(): boolean {
  return welcomeVoicePendingRetry;
}

export function stopLobbyWelcomeVoice(): void {
  welcomeVoicePendingRetry = false;
  if (!welcomeVoice) return;
  welcomeVoice.pause();
  welcomeVoice.currentTime = 0;
}

function waitForAudioEnded(audio: HTMLAudioElement): Promise<void> {
  if (audio.ended) return Promise.resolve();
  return new Promise((resolve) => {
    audio.addEventListener("ended", () => resolve(), { once: true });
  });
}

/**
 * 在登入／註冊按鈕的 user gesture 內同步呼叫 play()，避免 API 回來後 autoplay 被擋。
 * 須在 await login/register/signUp 之前呼叫。
 */
export function kickstartLobbyWelcomeVoiceFromUserGesture(): void {
  if (!isLobbySoundEnabled()) return;
  const a = getWelcomeVoiceAudio();
  a.src = pickAlternatingWelcomeVoiceSrc();
  a.currentTime = 0;
  a.load();
  welcomeVoicePendingRetry = false;
  void a.play().catch(() => {
    welcomeVoicePendingRetry = true;
  });
}

export function isLobbyWelcomeVoiceStarted(): boolean {
  const a = welcomeVoice;
  if (!a?.src) return false;
  if (welcomeVoicePendingRetry) return false;
  return !a.ended;
}

/** 等已在播放（或 kickstart）的歡迎語播完。 */
export async function waitForLobbyWelcomeVoiceEnd(): Promise<void> {
  if (!isLobbySoundEnabled()) return;
  const a = getWelcomeVoiceAudio();
  if (!a.src || a.ended) return;
  try {
    if (a.paused) {
      await waitForMediaCanPlay(a);
      await a.play();
      welcomeVoicePendingRetry = false;
    }
    await waitForAudioEnded(a);
  } catch {
    welcomeVoicePendingRetry = true;
    throw new Error("[lobby-sound] welcome voice play failed");
  }
}

/** 播完歡迎語（F1/F3 或 M1/M3 隨機擇一，男女交替）才 resolve；autoplay 失敗則 reject 並設 pending retry。 */
export async function playLobbyWelcomeVoice(): Promise<void> {
  if (!isLobbySoundEnabled()) return;
  if (isLobbyWelcomeVoiceStarted()) {
    await waitForLobbyWelcomeVoiceEnd();
    return;
  }
  const a = getWelcomeVoiceAudio();
  a.src = pickAlternatingWelcomeVoiceSrc();
  a.currentTime = 0;
  a.load();
  try {
    await waitForMediaCanPlay(a);
    await a.play();
    welcomeVoicePendingRetry = false;
    await waitForAudioEnded(a);
  } catch {
    welcomeVoicePendingRetry = true;
    throw new Error("[lobby-sound] welcome voice play failed");
  }
}

/** autoplay 被擋時，等手勢重試播完或逾時。 */
export function waitForPendingWelcomeVoiceEnd(
  timeoutMs = 60_000,
): Promise<void> {
  if (!welcomeVoicePendingRetry) return Promise.resolve();
  if (typeof window === "undefined") return Promise.resolve();
  const audio = getWelcomeVoiceAudio();
  return new Promise((resolve) => {
    const finish = () => {
      cleanup();
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    const onEnded = () => finish();
    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("ended", onEnded);
    };
    audio.addEventListener("ended", onEnded);
  });
}

export function retryPendingLobbyWelcomeVoice(): void {
  if (!welcomeVoicePendingRetry) return;
  void playLobbyWelcomeVoice();
}

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
