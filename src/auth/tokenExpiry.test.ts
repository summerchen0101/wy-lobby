import { describe, expect, it } from "vitest";
import {
  computeRefreshDelayMs,
  isWithinRefreshLeadWindow,
  resolveAccessExpiresAtMs,
} from "./tokenExpiry";

describe("resolveAccessExpiresAtMs", () => {
  const now = 1_771_360_000_000; // ~2026-05-19

  it("treats IAM expiresIn as absolute Unix seconds", () => {
    const expiresIn = 1_779_420_046; // 2026-05-22T03:20:46Z
    expect(resolveAccessExpiresAtMs(expiresIn, now)).toBe(expiresIn * 1000);
  });

  it("treats large values as absolute Unix milliseconds", () => {
    const expiresAtMs = 1_779_420_046_000;
    expect(resolveAccessExpiresAtMs(expiresAtMs, now)).toBe(expiresAtMs);
  });

  it("treats small values as OAuth remaining lifetime seconds (mock)", () => {
    expect(resolveAccessExpiresAtMs(3600, now)).toBe(now + 3_600_000);
  });

  it("returns now for invalid expiresIn", () => {
    expect(resolveAccessExpiresAtMs(0, now)).toBe(now);
    expect(resolveAccessExpiresAtMs(-1, now)).toBe(now);
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
