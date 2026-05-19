import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REFRESH_TOKEN_STORAGE_KEY } from "./storage";

const refreshAccessToken = vi.fn();

vi.mock("../lib/api/auth", () => ({
  refreshAccessToken: (...args: unknown[]) => refreshAccessToken(...args),
}));

function createLocalStorageMock(): Storage {
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

describe("refreshSession", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", createLocalStorageMock());
    refreshAccessToken.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("notifies handler when refresh API fails", async () => {
    const onFailed = vi.fn();
    const { setOnSessionRefreshFailedHandler } = await import(
      "./sessionRefreshNotify"
    );
    const { refreshSession } = await import("./refreshSession");

    setOnSessionRefreshFailedHandler(onFailed);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "bad-refresh");
    refreshAccessToken.mockRejectedValue(new Error("401"));

    const res = await refreshSession();
    expect(res).toBeNull();
    expect(onFailed).toHaveBeenCalledTimes(1);

    setOnSessionRefreshFailedHandler(null);
  });
});
