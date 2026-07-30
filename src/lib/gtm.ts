declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const SCRIPT_ID = "google-tag-manager";

let initializedContainerId: string | undefined;

export function gtmContainerId(): string | undefined {
  const id = import.meta.env.VITE_GTM_ID?.trim();
  return id || undefined;
}

function ensureDataLayer(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
}

/** Injects the GTM bootstrap script. */
export function initGtm(containerId: string): void {
  if (typeof window === "undefined" || !containerId.trim()) return;
  if (initializedContainerId === containerId) return;

  ensureDataLayer();
  window.dataLayer?.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  if (typeof document !== "undefined" && !document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
    document.head.appendChild(script);
  }

  pushGtmPageView();
  initializedContainerId = containerId;
}

/** Pushes a virtual page view for SPA client-side navigations (after init). */
export function pushGtmPageView(pathname?: string): void {
  if (!initializedContainerId || typeof window === "undefined") return;

  ensureDataLayer();
  const path = pathname ?? window.location.pathname;
  window.dataLayer?.push({
    event: "page_view",
    page_path: path,
    page_location: `${window.location.origin}${path}${window.location.search}${window.location.hash}`,
    page_title: document.title,
  });
}
