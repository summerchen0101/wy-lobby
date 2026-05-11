import { joinPublicImageUrl } from "./publicImageUrlCore";

export function getPublicImageCdnBase(): string {
  return (import.meta.env.VITE_PUBLIC_IMAGE_CDN_BASE ?? "")
    .trim()
    .replace(/\/+$/, "");
}

export function publicImageUrl(path: string): string {
  return joinPublicImageUrl(getPublicImageCdnBase(), path);
}

const SITE_PATTERN_TILE_PATH = "/images/lobby/bg/Pattern_bg.png";

/** Set before importing `site-background.css`. */
export function initSitePatternTileCssVar(): void {
  if (typeof document === "undefined") return;
  const u = publicImageUrl(SITE_PATTERN_TILE_PATH);
  document.documentElement.style.setProperty(
    "--site-pattern-tile-url",
    `url("${u}")`,
  );
}
