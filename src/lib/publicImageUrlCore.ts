/**
 * Pure join for browser-origin paths under `/images/...`.
 * Shared by Vite config (HTML/manifest) and the client bundle.
 */
export function joinPublicImageUrl(cdnBase: string, path: string): string {
  const base = cdnBase.trim().replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
