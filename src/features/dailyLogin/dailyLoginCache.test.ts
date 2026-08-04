import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityDataDecoded } from "../../realtime/activityLobbyWire";
import {
  clearCachedDailyLoginActivity,
  readCachedDailyLoginActivity,
  readCachedDailyLoginActivityId,
  writeCachedDailyLoginActivity,
} from "./dailyLoginCache";

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

const sampleActivity: ActivityDataDecoded = {
  activityID: "9001",
  activityType: "DailySignIn",
  achievedCreditAmount: "3",
};

describe("dailyLoginCache", () => {
  beforeEach(() => {
    installSessionStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists activity snapshot and id for instant reopen after refresh", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    expect(readCachedDailyLoginActivity(now)).toBeNull();
    writeCachedDailyLoginActivity(sampleActivity, now);
    expect(readCachedDailyLoginActivityId()).toBe("9001");
    expect(readCachedDailyLoginActivity(now)).toEqual(sampleActivity);
    clearCachedDailyLoginActivity();
    expect(readCachedDailyLoginActivity(now)).toBeNull();
    expect(readCachedDailyLoginActivityId()).toBeNull();
  });

  it("discards snapshot from a previous ET calendar day", () => {
    const dayOne = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayTwo = Date.UTC(2026, 6, 16, 12, 0, 0);
    writeCachedDailyLoginActivity(sampleActivity, dayOne);
    expect(readCachedDailyLoginActivity(dayOne)).toEqual(sampleActivity);
    expect(readCachedDailyLoginActivity(dayTwo)).toBeNull();
  });
});
