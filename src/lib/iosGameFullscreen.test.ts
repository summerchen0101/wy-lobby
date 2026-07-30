import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isDesktopLikeBrowser,
  isMobileBrowser,
  shouldUseTapToBrowserFullscreen,
} from "./iosGameFullscreen";

type EnvOptions = {
  ua: string;
  platform?: string;
  maxTouchPoints?: number;
  matchMedia?: (query: string) => MediaQueryList;
  fullscreenEnabled?: boolean;
};

function installEnv({
  ua,
  platform = "Win32",
  maxTouchPoints = 0,
  matchMedia,
  fullscreenEnabled = true,
}: EnvOptions): void {
  const defaultMatchMedia = (query: string): MediaQueryList => ({
    matches:
      query === "(hover: hover) and (pointer: fine)"
        ? false
        : query === "(pointer: coarse)",
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });

  const resolvedMatchMedia = matchMedia ?? defaultMatchMedia;

  vi.stubGlobal("navigator", {
    userAgent: ua,
    platform,
    maxTouchPoints,
    standalone: false,
  });
  vi.stubGlobal("window", {
    matchMedia: resolvedMatchMedia,
  });
  vi.stubGlobal("matchMedia", resolvedMatchMedia);
  vi.stubGlobal("document", {
    fullscreenEnabled,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isMobileBrowser", () => {
  it("returns false for desktop Chrome on Windows", () => {
    installEnv({
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(isMobileBrowser()).toBe(false);
  });

  it("returns true for Android phone", () => {
    installEnv({
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    });
    expect(isMobileBrowser()).toBe(true);
  });

  it("returns true for iPad desktop-site UA", () => {
    installEnv({
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    });
    expect(isMobileBrowser()).toBe(true);
  });
});

describe("isDesktopLikeBrowser", () => {
  it("returns true for desktop Firefox UA without fine pointer media", () => {
    installEnv({
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0",
      matchMedia: () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    expect(isDesktopLikeBrowser()).toBe(true);
  });

  it("returns false for Android mobile UA", () => {
    installEnv({
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    });
    expect(isDesktopLikeBrowser()).toBe(false);
  });
});

describe("shouldUseTapToBrowserFullscreen", () => {
  it("returns false for desktop Chrome", () => {
    installEnv({
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(shouldUseTapToBrowserFullscreen()).toBe(false);
  });

  it("returns false for desktop Firefox", () => {
    installEnv({
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0",
    });
    expect(shouldUseTapToBrowserFullscreen()).toBe(false);
  });

  it("returns false for touchscreen laptop with coarse pointer only", () => {
    installEnv({
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      maxTouchPoints: 10,
      matchMedia: (query) => ({
        matches: query === "(pointer: coarse)",
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    expect(shouldUseTapToBrowserFullscreen()).toBe(false);
  });

  it("returns true for Android phone when fullscreen is supported", () => {
    installEnv({
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    });
    expect(shouldUseTapToBrowserFullscreen()).toBe(true);
  });

  it("returns true for iPad", () => {
    installEnv({
      ua: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPad",
      maxTouchPoints: 5,
    });
    expect(shouldUseTapToBrowserFullscreen()).toBe(true);
  });

  it("returns false for iPhone (uses swipe-up workaround instead)", () => {
    installEnv({
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(shouldUseTapToBrowserFullscreen()).toBe(false);
  });

  it("returns false when fullscreen API is unavailable", () => {
    installEnv({
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      fullscreenEnabled: false,
    });
    expect(shouldUseTapToBrowserFullscreen()).toBe(false);
  });
});
