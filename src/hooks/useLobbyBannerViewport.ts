import { useEffect, useState } from "react";

/**
 * Desktop lobby banner assets — exclude phones rotated to landscape:
 * iPhone横屏常 >48rem，若僅用 min-width 會誤切 pc 版 hero 影片並整段重載解碼，易導致 Safari crash。
 */
export const LOBBY_BANNER_DESKTOP_MQ =
  "(min-width: 48rem) and (hover: hover) and (pointer: fine)";

export type LobbyBannerViewport = "mb" | "pc";

function viewportFromMatch(isDesktop: boolean): LobbyBannerViewport {
  return isDesktop ? "pc" : "mb";
}

export function useLobbyBannerViewport(): LobbyBannerViewport {
  const [viewport, setViewport] = useState<LobbyBannerViewport>(() => {
    if (typeof window === "undefined") return "mb";
    return viewportFromMatch(
      window.matchMedia(LOBBY_BANNER_DESKTOP_MQ).matches,
    );
  });

  useEffect(() => {
    const mq = window.matchMedia(LOBBY_BANNER_DESKTOP_MQ);
    const onChange = (event: MediaQueryListEvent) => {
      setViewport(viewportFromMatch(event.matches));
    };

    setViewport(viewportFromMatch(mq.matches));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return viewport;
}
