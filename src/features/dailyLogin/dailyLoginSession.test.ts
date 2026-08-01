import { afterEach, describe, expect, it } from "vitest";
import {
  clearDailyLoginAutoPopupSession,
  hasClaimedDailyToday,
  markDailyClaimedToday,
  markDailyLoginAutoPopupShown,
  wasDailyLoginAutoPopupShown,
} from "./dailyLoginSession";

describe("dailyLoginSession", () => {
  afterEach(() => {
    clearDailyLoginAutoPopupSession();
  });

  it("tracks auto-popup per login session for the current user", () => {
    expect(wasDailyLoginAutoPopupShown("42")).toBe(false);
    markDailyLoginAutoPopupShown("42");
    expect(wasDailyLoginAutoPopupShown("42")).toBe(true);
    expect(wasDailyLoginAutoPopupShown("99")).toBe(false);
  });

  it("clears on logout so re-login can auto-popup again", () => {
    markDailyLoginAutoPopupShown("42");
    expect(wasDailyLoginAutoPopupShown("42")).toBe(true);
    clearDailyLoginAutoPopupSession();
    expect(wasDailyLoginAutoPopupShown("42")).toBe(false);
  });

  it("tracks same-day daily claim cap in ET", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    expect(hasClaimedDailyToday(now)).toBe(false);
    markDailyClaimedToday(now);
    expect(hasClaimedDailyToday(now)).toBe(true);
    expect(hasClaimedDailyToday(now + 86400000)).toBe(false);
    clearDailyLoginAutoPopupSession();
    expect(hasClaimedDailyToday(now)).toBe(false);
  });
});
