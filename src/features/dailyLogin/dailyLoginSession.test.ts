import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  markDailyLoginAutoPopupShown,
  wasDailyLoginAutoPopupShown,
} from "./dailyLoginSession";

function installSessionStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
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

describe("dailyLoginSession", () => {
  beforeEach(() => {
    installSessionStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks auto-popup per user within the browser tab session", () => {
    expect(wasDailyLoginAutoPopupShown("42")).toBe(false);
    markDailyLoginAutoPopupShown("42");
    expect(wasDailyLoginAutoPopupShown("42")).toBe(true);
    expect(wasDailyLoginAutoPopupShown("99")).toBe(false);
  });
});
