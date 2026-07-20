import { describe, expect, it } from "vitest";
import { isRadarUserId, shouldVerifyOnUserChange } from "./geoSession";

describe("isRadarUserId", () => {
  it("rejects empty / whitespace", () => {
    expect(isRadarUserId(undefined)).toBe(false);
    expect(isRadarUserId("")).toBe(false);
    expect(isRadarUserId("   ")).toBe(false);
  });

  it("rejects auth placeholder id \"0\"", () => {
    expect(isRadarUserId("0")).toBe(false);
    expect(isRadarUserId(" 0 ")).toBe(false);
  });

  it("accepts real player ids", () => {
    expect(isRadarUserId("player-1")).toBe(true);
    expect(isRadarUserId("2046952017814859776")).toBe(true);
  });
});

describe("shouldVerifyOnUserChange", () => {
  it("returns true on login / session restore (undefined → userId)", () => {
    expect(shouldVerifyOnUserChange(undefined, "player-1")).toBe(true);
  });

  it("returns true when switching accounts", () => {
    expect(shouldVerifyOnUserChange("player-1", "player-2")).toBe(true);
  });

  it("returns true when placeholder upgrades to a real id", () => {
    expect(shouldVerifyOnUserChange("0", "2046952017814859776")).toBe(true);
  });

  it("returns false when userId is unchanged (e.g. token refresh)", () => {
    expect(shouldVerifyOnUserChange("player-1", "player-1")).toBe(false);
  });

  it("returns false on logout or when not logged in", () => {
    expect(shouldVerifyOnUserChange("player-1", undefined)).toBe(false);
    expect(shouldVerifyOnUserChange(undefined, undefined)).toBe(false);
    expect(shouldVerifyOnUserChange("player-1", "")).toBe(false);
    expect(shouldVerifyOnUserChange("player-1", "   ")).toBe(false);
  });

  it("returns false for placeholder id \"0\"", () => {
    expect(shouldVerifyOnUserChange(undefined, "0")).toBe(false);
    expect(shouldVerifyOnUserChange("player-1", "0")).toBe(false);
  });
});
