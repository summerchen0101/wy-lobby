import { describe, expect, it } from "vitest";
import { shouldVerifyOnTokenChange } from "./geoSession";

describe("shouldVerifyOnTokenChange", () => {
  it("returns true on session restore (undefined → token)", () => {
    expect(shouldVerifyOnTokenChange(undefined, "access-token")).toBe(true);
  });

  it("returns true on active login (null → token)", () => {
    expect(shouldVerifyOnTokenChange(null, "access-token")).toBe(true);
  });

  it("returns false on access token refresh (tokenA → tokenB)", () => {
    expect(shouldVerifyOnTokenChange("token-a", "token-b")).toBe(false);
  });

  it("returns false when current token is absent", () => {
    expect(shouldVerifyOnTokenChange(undefined, null)).toBe(false);
    expect(shouldVerifyOnTokenChange("token-a", null)).toBe(false);
  });

  it("returns false when token is unchanged", () => {
    expect(shouldVerifyOnTokenChange("token-a", "token-a")).toBe(false);
  });
});
