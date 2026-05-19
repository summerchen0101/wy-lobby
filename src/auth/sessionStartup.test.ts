import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_EXPIRES_AT_MS_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from "./storage";
import { shouldRefreshStoredSessionOnStartup } from "./sessionStartup";

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

describe("shouldRefreshStoredSessionOnStartup", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    vi.stubEnv("VITE_TOKEN_REFRESH_LEAD_SEC", "300");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns false when no refresh token", () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "access");
    expect(shouldRefreshStoredSessionOnStartup()).toBe(false);
  });

  it("returns true when refresh exists but no access", () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh");
    expect(shouldRefreshStoredSessionOnStartup()).toBe(true);
  });

  it("returns true when access exists but expiresAt is missing", () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh");
    expect(shouldRefreshStoredSessionOnStartup()).toBe(true);
  });

  it("returns true when access is inside refresh lead window", () => {
    const now = 1_700_000_000_000;
    localStorage.setItem(TOKEN_STORAGE_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh");
    localStorage.setItem(
      ACCESS_EXPIRES_AT_MS_KEY,
      String(now + 60_000),
    );
    expect(shouldRefreshStoredSessionOnStartup(now)).toBe(true);
  });

  it("returns false when access expiry is far in the future", () => {
    const now = 1_700_000_000_000;
    localStorage.setItem(TOKEN_STORAGE_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh");
    localStorage.setItem(
      ACCESS_EXPIRES_AT_MS_KEY,
      String(now + 3_600_000),
    );
    expect(shouldRefreshStoredSessionOnStartup(now)).toBe(false);
  });
});
