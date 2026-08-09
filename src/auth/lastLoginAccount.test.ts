import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LAST_LOGIN_ACCOUNT_STORAGE_KEY } from "./storage";
import { readLastLoginAccount, saveLastLoginAccount } from "./lastLoginAccount";

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe("lastLoginAccount", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty string when nothing is stored", () => {
    expect(readLastLoginAccount()).toBe("");
  });

  it("saves trimmed email and reads it back", () => {
    saveLastLoginAccount("  user@example.com  ");
    expect(localStorage.getItem(LAST_LOGIN_ACCOUNT_STORAGE_KEY)).toBe(
      "user@example.com",
    );
    expect(readLastLoginAccount()).toBe("user@example.com");
  });

  it("ignores blank saves", () => {
    saveLastLoginAccount("   ");
    expect(readLastLoginAccount()).toBe("");
  });
});
