/** Dispatched when welcome gift overlay open state or claim state changes. */
export const WELCOME_GIFT_STATE_EVENT = "luklok-welcome-gift-state";

const CLAIMED_KEY = "ffgt:welcomeGiftClaimed";

let welcomeGiftOverlayOpen = false;

function readClaimedUserIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(CLAIMED_KEY);
    if (!raw) return new Set();
    return new Set(raw.split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

function writeClaimedUserIds(ids: Set<string>): void {
  try {
    if (ids.size === 0) {
      sessionStorage.removeItem(CLAIMED_KEY);
      return;
    }
    sessionStorage.setItem(CLAIMED_KEY, [...ids].join(","));
  } catch {
    /* ignore */
  }
}

export function wasWelcomeGiftClaimed(userId: string): boolean {
  const id = userId.trim();
  if (!id || id === "0") return false;
  return readClaimedUserIds().has(id);
}

export function markWelcomeGiftClaimed(userId: string): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  const ids = readClaimedUserIds();
  if (ids.has(id)) return;
  ids.add(id);
  writeClaimedUserIds(ids);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WELCOME_GIFT_STATE_EVENT));
  }
}

export function clearWelcomeGiftSession(): void {
  welcomeGiftOverlayOpen = false;
}

export function setWelcomeGiftOverlayOpen(open: boolean): void {
  if (welcomeGiftOverlayOpen === open) return;
  welcomeGiftOverlayOpen = open;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WELCOME_GIFT_STATE_EVENT));
  }
}

export function isWelcomeGiftOverlayOpen(): boolean {
  return welcomeGiftOverlayOpen;
}

/** Test helper — clears sessionStorage claim flags. */
export function clearWelcomeGiftClaimedForTests(): void {
  try {
    sessionStorage.removeItem(CLAIMED_KEY);
  } catch {
    /* ignore */
  }
}
