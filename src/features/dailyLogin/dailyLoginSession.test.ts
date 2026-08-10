import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMockDailyLoginActivity } from "./dailyLoginLogic";
import {
  clearDailyLoginAutoPopupSession,
  clearDailyLoginClaimRecord,
  getInitialCollectableCount,
  hasClaimedDailyToday,
  markDailyClaimedToday,
  markDailyLoginAutoPopupShown,
  recordInitialCollectableCount,
  resolveClaimedDailyToday,
  wasDailyLoginAutoPopupShown,
} from "./dailyLoginSession";

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

describe("dailyLoginSession", () => {
  beforeEach(() => {
    installLocalStorageMock();
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

  it("tracks same-day daily claim cap in ET per user via localStorage", () => {
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
    const lateEtSameDay = Date.UTC(2026, 6, 16, 3, 30, 0);
    const nextEtDay = Date.UTC(2026, 6, 16, 5, 0, 0);

    markDailyClaimedToday("42", lateEtSameDay);
    expect(hasClaimedDailyToday("42", lateEtSameDay)).toBe(true);
    expect(hasClaimedDailyToday("42", nextEtDay)).toBe(false);
  });

  it("records initial collectable count once per ET day", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    expect(getInitialCollectableCount("42", now)).toBeNull();
    recordInitialCollectableCount("42", 2, now);
    expect(getInitialCollectableCount("42", now)).toBe(2);
    recordInitialCollectableCount("42", 5, now);
    expect(getInitialCollectableCount("42", now)).toBe(2);
    expect(getInitialCollectableCount("42", now + 86400000)).toBeNull();
  });

  it("resolveClaimedDailyToday restores same-day cap from GET_ACTIVITY when storage is empty", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions: Record<string, { date: string; userDailyMissions: unknown[] }> =
      {};
    for (let i = 0; i < 3; i++) {
      const dateMs = now - (2 - i) * dayMs;
      const key = String(dateMs);
      missions[key] = {
        date: key,
        userDailyMissions: [
          {
            dailyMissionID: String(1000 + i),
            date: key,
            actionTimes: i < 2 ? 1 : 0,
            achievedActionTimes: 1,
            isCollected: i < 2,
            itemID: 1,
            itemAmount: 1000,
            sort: "0",
          },
        ],
      };
    }
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });

    expect(hasClaimedDailyToday("42", now)).toBe(false);
    expect(
      resolveClaimedDailyToday("42", activity, { nowMs: now, syncStorage: true }),
    ).toBe(true);
    expect(hasClaimedDailyToday("42", now)).toBe(true);
  });

  it("resolveClaimedDailyToday uses LOBBY_GET daily reward timestamp across browsers", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const activity = buildMockDailyLoginActivity();
    const lobbyGet = {
      campaign: {
        dailyRewardRecivedAtMs: String(now - 3_600_000),
      },
    };

    expect(
      resolveClaimedDailyToday("42", activity, {
        nowMs: now,
        lobbyGet,
        syncStorage: true,
      }),
    ).toBe(true);
    expect(hasClaimedDailyToday("42", now)).toBe(true);
  });
});
