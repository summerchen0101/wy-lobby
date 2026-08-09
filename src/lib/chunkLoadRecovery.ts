import { isWithinIosOrientationGrace } from "./iosOrientationStabilizer";

const CHUNK_RELOAD_TS_KEY = "ffgt:chunk-reload-ts";
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

function chunkReloadCooldownRemainingMs(now = Date.now()): number {
  if (typeof sessionStorage === "undefined") return 0;
  const raw = sessionStorage.getItem(CHUNK_RELOAD_TS_KEY);
  if (!raw) return 0;
  const lastReload = Number(raw);
  if (!Number.isFinite(lastReload)) return 0;
  return Math.max(0, CHUNK_RELOAD_COOLDOWN_MS - (now - lastReload));
}

/** Detect stale-bundle dynamic import failures after a new deploy. */
export function isChunkLoadError(error: unknown): boolean {
  const message = errorMessage(error);
  if (!message) return false;

  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "";
}

/**
 * Reload once when a hashed chunk is missing (old cached entry bundle).
 * Cooldown avoids infinite reload loops if the asset is genuinely broken.
 */
export function reloadForStaleChunk(reason: string): boolean {
  if (typeof window === "undefined") return false;

  if (isWithinIosOrientationGrace()) {
    console.warn(
      `[chunk-load] skipped reload (${reason}); ios orientation grace`,
    );
    return false;
  }

  const remainingMs = chunkReloadCooldownRemainingMs();
  if (remainingMs > 0) {
    console.warn(
      `[chunk-load] skipped reload (${reason}); cooldown ${remainingMs}ms`,
    );
    return false;
  }

  try {
    sessionStorage.setItem(CHUNK_RELOAD_TS_KEY, String(Date.now()));
  } catch {
    // Ignore quota / private-mode errors; still attempt one reload.
  }

  console.warn(`[chunk-load] reloading for stale bundle (${reason})`);
  window.location.reload();
  return true;
}

/** Global handlers for Vite preload and uncaught lazy-import rejections. */
export function registerChunkLoadRecoveryHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadForStaleChunk("vite:preloadError");
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    reloadForStaleChunk("unhandledrejection");
  });
}
