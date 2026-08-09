import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as iosOrientation from "./iosOrientationStabilizer";
import {
  isChunkLoadError,
  reloadForStaleChunk,
  registerChunkLoadRecoveryHandlers,
} from "./chunkLoadRecovery";

function installSessionStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe("chunkLoadRecovery", () => {
  beforeEach(() => {
    installSessionStorageMock();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("detects common stale chunk import errors", () => {
    expect(
      isChunkLoadError(
        new Error(
          "Failed to fetch dynamically imported module: https://example.com/assets/ShopPage-abc.js",
        ),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(
      true,
    );
    expect(isChunkLoadError(new Error("network timeout"))).toBe(false);
  });

  it("reloads once and respects cooldown", () => {
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });

    expect(reloadForStaleChunk("lazy-import")).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    expect(reloadForStaleChunk("lazy-import")).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_001);
    expect(reloadForStaleChunk("lazy-import")).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("skips reload during ios orientation grace", () => {
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });
    vi.spyOn(iosOrientation, "isWithinIosOrientationGrace").mockReturnValue(
      true,
    );

    expect(reloadForStaleChunk("lazy-import")).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("registers vite preload and unhandledrejection handlers", () => {
    const listeners = new Map<string, EventListener>();
    vi.stubGlobal("window", {
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, listener);
      },
      location: { reload: vi.fn() },
    });

    registerChunkLoadRecoveryHandlers();

    const preload = listeners.get("vite:preloadError") as EventListener & {
      (event: { preventDefault: () => void }): void;
    };
    const preventDefault = vi.fn();
    preload({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalledTimes(1);

    const rejection = listeners.get("unhandledrejection") as EventListener & {
      (event: { reason: unknown; preventDefault: () => void }): void;
    };
    const rejectPreventDefault = vi.fn();
    rejection({
      reason: new Error("Failed to fetch dynamically imported module: /a.js"),
      preventDefault: rejectPreventDefault,
    });
    expect(rejectPreventDefault).toHaveBeenCalled();
  });
});
