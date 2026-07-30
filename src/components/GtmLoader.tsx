import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { gtmContainerId, initGtm, pushGtmPageView } from "../lib/gtm";

/**
 * Loads Google Tag Manager when `VITE_GTM_ID` is set.
 * Pushes `page_view` on initial load and on each client-side route change.
 */
export function GtmLoader() {
  const { pathname } = useLocation();
  const isFirstPageView = useRef(true);

  useEffect(() => {
    const containerId = gtmContainerId();
    if (!containerId) return;
    initGtm(containerId);
  }, []);

  useEffect(() => {
    if (isFirstPageView.current) {
      isFirstPageView.current = false;
      return;
    }
    pushGtmPageView(pathname);
  }, [pathname]);

  return null;
}
