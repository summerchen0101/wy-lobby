import { describe, expect, it } from "vitest";
import {
  computeExpiresAtMs,
  computeRefreshDelayMs,
  isWithinRefreshLeadWindow,
} from "./tokenExpiry";

describe("computeExpiresAtMs", () => {
  it("adds expiresIn seconds to now", () => {
    const now = 1_000_000;
    expect(computeExpiresAtMs(3600, now)).toBe(now + 3_600_000);
  });

  it("returns now for invalid expiresIn", () => {
    const now = 1_000_000;
    expect(computeExpiresAtMs(0, now)).toBe(now);
    expect(computeExpiresAtMs(-1, now)).toBe(now);
  });
});

describe("computeRefreshDelayMs", () => {
  const now = 1_000_000;
  const leadSec = 300;

  it("returns 0 when already inside lead window", () => {
    const expiresAt = now + 200_000; // 200s left, lead is 300s
    expect(computeRefreshDelayMs(expiresAt, leadSec, now)).toBe(0);
  });

  it("returns 0 when access already expired", () => {
    expect(computeRefreshDelayMs(now - 1, leadSec, now)).toBe(0);
  });

  it("schedules before lead window", () => {
    const expiresAt = now + 600_000; // 600s left, lead 300s → refresh in 300s
    expect(computeRefreshDelayMs(expiresAt, leadSec, now)).toBe(300_000);
  });
});

describe("isWithinRefreshLeadWindow", () => {
  const now = 1_000_000;

  it("is true inside lead and false when far from expiry", () => {
    expect(isWithinRefreshLeadWindow(now + 200_000, 300, now)).toBe(true);
    expect(isWithinRefreshLeadWindow(now + 600_000, 300, now)).toBe(false);
  });
});
