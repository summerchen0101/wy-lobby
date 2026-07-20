import { describe, expect, it } from "vitest";
import { shouldVerifyOnUserChange } from "./geoSession";

describe("shouldVerifyOnUserChange", () => {
  it("returns true on login / session restore (undefined → userId)", () => {
    expect(shouldVerifyOnUserChange(undefined, "player-1")).toBe(true);
  });

  it("returns true when switching accounts", () => {
    expect(shouldVerifyOnUserChange("player-1", "player-2")).toBe(true);
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
});
