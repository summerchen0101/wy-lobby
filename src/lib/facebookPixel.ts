declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

type FbqFn = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: FbqFn;
  loaded: boolean;
  version: string;
};

const SCRIPT_ID = "facebook-pixel-fbevents";

let initializedPixelId: string | undefined;

export function facebookPixelId(): string | undefined {
  const id = import.meta.env.VITE_FB_PIXEL_ID?.trim();
  return id || undefined;
}

function ensureFbqBootstrap(): void {
  if (typeof window === "undefined" || window.fbq) return;

  const n: FbqFn = function fbq(...args: unknown[]) {
    if (n.callMethod) {
      n.callMethod(...args);
    } else {
      n.queue.push(args);
    }
  } as FbqFn;

  if (!window._fbq) window._fbq = n;
  window.fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];

  if (typeof document === "undefined" || document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = document.getElementsByTagName("script")[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);
}

/** Injects the Facebook pixel bootstrap and fires the first PageView. */
export function initFacebookPixel(pixelId: string): void {
  if (typeof window === "undefined" || !pixelId.trim()) return;
  if (initializedPixelId === pixelId) return;

  ensureFbqBootstrap();
  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
  initializedPixelId = pixelId;
}

/** Fires PageView on SPA client-side navigations (after init). */
export function trackFacebookPageView(): void {
  if (!initializedPixelId || typeof window === "undefined") return;
  window.fbq?.("track", "PageView");
}
