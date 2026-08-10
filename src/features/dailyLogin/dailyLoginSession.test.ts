import { afterEach, describe, expect, it } from "vitest";
import {
  clearDailyLoginAutoPopupSession,
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

  it("clears auto-popup on logout so re-login can auto-popup again", () => {
    markDailyLoginAutoPopupShown("42");
    expect(wasDailyLoginAutoPopupShown("42")).toBe(true);
    clearDailyLoginAutoPopupSession();
    expect(wasDailyLoginAutoPopupShown("42")).toBe(false);
  });
});
