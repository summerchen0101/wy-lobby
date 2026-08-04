import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDailyLoginAutoPopupSession,
  clearDailyLoginClaimRecord,
  hasClaimedDailyToday,
  markDailyClaimedToday,
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
    clearDailyLoginAutoPopupSession();
    clearDailyLoginClaimRecord("42");
    clearDailyLoginClaimRecord("99");
    vi.unstubAllGlobals();
  });

  it("tracks auto-popup per login session for the current user", () => {
    expect(wasDailyLoginAutoPopupShown("42")).toBe(false);
    markDailyLoginAutoPopupShown("42");
    expect(wasDailyLoginAutoPopupShown("42")).toBe(true);
    expect(wasDailyLoginAutoPopupShown("99")).toBe(false);
  });

  it("clears auto-popup on logout so re-login can auto-popup again", () => {
    markDailyLoginAutoPopupShown("42");
    expect(wasDailyLoginAutoPopupShown("42")).toBe(true);
    clearDailyLoginAutoPopupSession();
    expect(wasDailyLoginAutoPopupShown("42")).toBe(false);
  });

  it("tracks same-day daily claim cap in ET per user", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    expect(hasClaimedDailyToday("42", now)).toBe(false);
    markDailyClaimedToday("42", now);
    expect(hasClaimedDailyToday("42", now)).toBe(true);
    expect(hasClaimedDailyToday("42", now + 86400000)).toBe(false);
    expect(hasClaimedDailyToday("99", now)).toBe(false);
  });

  it("preserves same-day claim cap across logout", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    markDailyClaimedToday("42", now);
    expect(hasClaimedDailyToday("42", now)).toBe(true);
    clearDailyLoginAutoPopupSession();
    expect(hasClaimedDailyToday("42", now)).toBe(true);
  });

  it("uses America/New_York (ET) for same-day claim cap, not local/UTC midnight", () => {
    // 2026-07-16 03:30 UTC = 2026-07-15 23:30 ET (still July 15)
    const lateEtSameDay = Date.UTC(2026, 6, 16, 3, 30, 0);
    // 2026-07-16 05:00 UTC = 2026-07-16 01:00 ET (rolled to July 16)
    const nextEtDay = Date.UTC(2026, 6, 16, 5, 0, 0);

    markDailyClaimedToday("42", lateEtSameDay);
    expect(hasClaimedDailyToday("42", lateEtSameDay)).toBe(true);
    expect(hasClaimedDailyToday("42", nextEtDay)).toBe(false);
  });
});
