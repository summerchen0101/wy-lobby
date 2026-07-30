import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  facebookPixelId,
  initFacebookPixel,
  trackFacebookPageView,
} from "../lib/facebookPixel";

/**
 * Loads Facebook Pixel when `VITE_FB_PIXEL_ID` is set.
 * Tracks PageView on initial load and on each client-side route change.
 */
export function FacebookPixelLoader() {
  const { pathname } = useLocation();
  const isFirstPageView = useRef(true);

  useEffect(() => {
    const pixelId = facebookPixelId();
    if (!pixelId) return;
    initFacebookPixel(pixelId);
  }, []);

  useEffect(() => {
    if (isFirstPageView.current) {
      isFirstPageView.current = false;
      return;
    }
    trackFacebookPageView();
  }, [pathname]);

  return null;
}
