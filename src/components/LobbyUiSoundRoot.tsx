import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isPaymentFeaturesEnabled } from "../lib/env";
import {
  isLobbySoundEnabled,
  playLobbySfx,
  warmLobbySfx,
} from "../lib/lobbySound";

const LOBBY_SFX_PATHS = new Set([
  "/",
  ...(isPaymentFeaturesEnabled() ? ["/shop", "/redeem"] : []),
  "/promo",
  "/profile",
]);

function isLobbySfxRoute(pathname: string): boolean {
  return LOBBY_SFX_PATHS.has(pathname);
}

function resolveLobbySfxFromTarget(el: Element): "btn" | "menu" | null {
  if (el.closest(".game-overlay")) return null;

  const footerLink = el.closest(
    "nav.session-footer a.session-footer__link",
  );
  if (footerLink) return "menu";

  const hit = el.closest(
    'button, [role="button"], a[href], input[type="button"], input[type="submit"], input[type="reset"]',
  );
  if (hit) return "btn";
  return null;
}

/**
 * Document-level capture listeners so portaled modals (body) still get lobby SFX.
 * pointerdown fires before the synthesized click on touch devices, reducing perceived latency.
 */
export function LobbyUiSoundRoot() {
  const { pathname } = useLocation();
  const skipNextClickRef = useRef(false);

  useEffect(() => {
    if (isLobbySfxRoute(pathname)) {
      warmLobbySfx();
    }
  }, [pathname]);

  useEffect(() => {
    const targetElement = (e: Event): Element | null => {
      const node = e.target;
      if (!(node instanceof Node)) return null;
      return node instanceof Element ? node : node.parentElement;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!isLobbySfxRoute(pathname) || !isLobbySoundEnabled()) return;
      if (e.button !== 0) return;
      const el = targetElement(e);
      if (!el) return;
      const kind = resolveLobbySfxFromTarget(el);
      if (!kind) return;
      playLobbySfx(kind);
      skipNextClickRef.current = true;
    };

    const onClick = (e: MouseEvent) => {
      if (skipNextClickRef.current) {
        skipNextClickRef.current = false;
        return;
      }
      if (!isLobbySfxRoute(pathname) || !isLobbySoundEnabled()) return;
      const el = targetElement(e);
      if (!el) return;
      const kind = resolveLobbySfxFromTarget(el);
      if (kind) playLobbySfx(kind);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname]);

  return null;
}
