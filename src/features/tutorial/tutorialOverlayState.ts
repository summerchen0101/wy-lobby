let tutorialOverlayOpen = false;
let newbieTutorialCompletedThisSession = false;
let sessionUserId: string | null = null;

export const TUTORIAL_OVERLAY_STATE_EVENT = "luklok-tutorial-overlay-state";

export function syncNewbieTutorialSessionUser(userId: string | undefined): void {
  const id = userId?.trim() || null;
  if (sessionUserId === id) return;
  sessionUserId = id;
  newbieTutorialCompletedThisSession = false;
}

export function markNewbieTutorialCompletedThisSession(): void {
  if (newbieTutorialCompletedThisSession) return;
  newbieTutorialCompletedThisSession = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TUTORIAL_OVERLAY_STATE_EVENT));
  }
}

export function isNewbieTutorialCompletedThisSession(): boolean {
  return newbieTutorialCompletedThisSession;
}

export function setTutorialOverlayOpen(open: boolean): void {
  if (tutorialOverlayOpen === open) return;
  tutorialOverlayOpen = open;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TUTORIAL_OVERLAY_STATE_EVENT));
  }
}

export function isTutorialOverlayOpen(): boolean {
  return tutorialOverlayOpen;
}
