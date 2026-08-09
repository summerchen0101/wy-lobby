import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as iosGameFullscreen from "./iosGameFullscreen";
import { LOBBY_SOUND_PREF_STORAGE_KEY } from "./lobbySound";
import { appendGameLaunchQueryParams } from "./gameShell";

function installLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

beforeEach(() => {
  const storage = installLocalStorageMock();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
  vi.spyOn(iosGameFullscreen, "isDesktopLikeBrowser").mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("appendGameLaunchQueryParams", () => {
  const base = "https://example.com/WebGL_Build_WebEntry/index.html?game_id=85";

  it("volume=1 when lobby sound is on", () => {
    localStorage.setItem(LOBBY_SOUND_PREF_STORAGE_KEY, "1");
    const u = appendGameLaunchQueryParams(base);
    expect(new URL(u).searchParams.get("volume")).toBe("1");
  });

  it("volume=0 when lobby sound is off", () => {
    localStorage.setItem(LOBBY_SOUND_PREF_STORAGE_KEY, "0");
    const u = appendGameLaunchQueryParams(base);
    expect(new URL(u).searchParams.get("volume")).toBe("0");
  });

  it("defaults to volume=1 when preference is unset", () => {
    const u = appendGameLaunchQueryParams(base);
    expect(new URL(u).searchParams.get("volume")).toBe("1");
  });

  it("returns original string for invalid URLs", () => {
    expect(appendGameLaunchQueryParams("not-a-url")).toBe("not-a-url");
  });

  it("adds isPC=1 on desktop web", () => {
    vi.mocked(iosGameFullscreen.isDesktopLikeBrowser).mockReturnValue(true);
    const u = appendGameLaunchQueryParams(base);
    expect(new URL(u).searchParams.get("isPC")).toBe("1");
  });

  it("omits isPC on mobile web", () => {
    vi.mocked(iosGameFullscreen.isDesktopLikeBrowser).mockReturnValue(false);
    const u = appendGameLaunchQueryParams(base);
    expect(new URL(u).searchParams.has("isPC")).toBe(false);
  });
});
