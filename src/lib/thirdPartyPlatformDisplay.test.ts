import { describe, expect, it } from "vitest";
import { thirdPartyPlatformDisplayName } from "./thirdPartyPlatformDisplay";

describe("thirdPartyPlatformDisplayName", () => {
  it("maps MICROGAMING to M2PLAY", () => {
    expect(thirdPartyPlatformDisplayName("MICROGAMING")).toBe("M2PLAY");
    expect(thirdPartyPlatformDisplayName("microgaming")).toBe("M2PLAY");
  });

  it("returns unknown platforms unchanged", () => {
    expect(thirdPartyPlatformDisplayName("BGAMING")).toBe("BGAMING");
  });
});
