import { describe, expect, it } from "vitest";
import {
  sortThirdPartyPlatforms,
  thirdPartyPlatformDisplayName,
} from "./thirdPartyPlatformDisplay";

describe("thirdPartyPlatformDisplayName", () => {
  it("maps MICROGAMING to M2PLAY", () => {
    expect(thirdPartyPlatformDisplayName("MICROGAMING")).toBe("M2PLAY");
    expect(thirdPartyPlatformDisplayName("microgaming")).toBe("M2PLAY");
  });

  it("returns unknown platforms unchanged", () => {
    expect(thirdPartyPlatformDisplayName("BGAMING")).toBe("BGAMING");
  });
});

describe("sortThirdPartyPlatforms", () => {
  it("sorts by display name: digits 0-9 before letters A-Z", () => {
    expect(
      sortThirdPartyPlatforms([
        "ZETA",
        "1GAME",
        "BGAMING",
        "9LUCK",
        "AMATIC",
      ]),
    ).toEqual(["1GAME", "9LUCK", "AMATIC", "BGAMING", "ZETA"]);
  });

  it("uses display name mapping when sorting", () => {
    expect(sortThirdPartyPlatforms(["ZETA", "MICROGAMING", "AMATIC"])).toEqual([
      "AMATIC",
      "MICROGAMING",
      "ZETA",
    ]);
  });
});
