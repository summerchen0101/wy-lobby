import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isLobbySoundEnabled, playLobbySfx } from "../lib/lobbySound";

const LOBBY_SFX_PATHS = new Set([
  "/",
  "/shop",
  "/redeem",
  "/promo",
  "/profile",
]);

function isLobbySfxRoute(pathname: string): boolean {
  return LOBBY_SFX_PATHS.has(pathname);
}

/**
 * Document-level click capture so portaled modals (body) still get lobby SFX.
 */
export function LobbyUiSoundRoot() {
  const { pathname } = useLocation();

  useEffect(() => {
    const onCap = (e: MouseEvent) => {
      if (!isLobbySfxRoute(pathname) || !isLobbySoundEnabled()) return;
      const node = e.target;
      if (!(node instanceof Node)) return;
      const el = node instanceof Element ? node : node.parentElement;
      if (!el) return;

      if (el.closest(".game-overlay")) return;

      const footerLink = el.closest(
        "nav.session-footer a.session-footer__link",
      );
      if (footerLink) {
        playLobbySfx("menu");
        return;
      }

      const hit = el.closest(
        'button, [role="button"], a[href], input[type="button"], input[type="submit"], input[type="reset"]',
      );
      if (hit) playLobbySfx("btn");
    };

    document.addEventListener("click", onCap, true);
    return () => document.removeEventListener("click", onCap, true);
  }, [pathname]);

  return null;
}
