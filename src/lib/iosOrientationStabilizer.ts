import { isIOSWebKit } from "./iosGameFullscreen";

/** Grace after orientationchange — skip chunk auto-reload and defer heavy media resume. */
export const IOS_ORIENTATION_GRACE_MS = 1_500;

/** Hide fixed compositing layers while WebKit relayouts after rotation. */
export const IOS_ORIENTATION_STABILIZE_MS = 1_200;

export const IOS_ORIENTATION_STABLE_EVENT = "ffgt-ios-orientation-stable";

let lastIosOrientationAt = 0;
let stabilizeTimer: number | undefined;

export function markIosOrientationChange(): void {
  if (!isIOSWebKit() || typeof window === "undefined") return;
  lastIosOrientationAt = Date.now();

  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("ios-orientation-stabilizing");
  if (stabilizeTimer !== undefined) {
    window.clearTimeout(stabilizeTimer);
  }
  stabilizeTimer = window.setTimeout(() => {
    stabilizeTimer = undefined;
    root.classList.remove("ios-orientation-stabilizing");
    window.dispatchEvent(new Event(IOS_ORIENTATION_STABLE_EVENT));
  }, IOS_ORIENTATION_STABILIZE_MS);
}

export function isWithinIosOrientationGrace(now = Date.now()): boolean {
  if (!isIOSWebKit()) return false;
  return (
    lastIosOrientationAt > 0 && now - lastIosOrientationAt < IOS_ORIENTATION_GRACE_MS
  );
}

/** Call once at app bootstrap (main.tsx). */
export function registerIosOrientationChangeMarker(): () => void {
  if (!isIOSWebKit() || typeof window === "undefined") return () => {};
  const handler = () => markIosOrientationChange();
  window.addEventListener("orientationchange", handler);
  return () => window.removeEventListener("orientationchange", handler);
}
