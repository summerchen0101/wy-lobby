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
    expect(readCachedDailyLoginActivity()).toBeNull();
    writeCachedDailyLoginActivity(sampleActivity);
    expect(readCachedDailyLoginActivityId()).toBe("9001");
    expect(readCachedDailyLoginActivity()).toEqual(sampleActivity);
    clearCachedDailyLoginActivity();
    expect(readCachedDailyLoginActivity()).toBeNull();
    expect(readCachedDailyLoginActivityId()).toBeNull();
  });
});
