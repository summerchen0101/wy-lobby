import { describe, expect, it } from "vitest";
import { LOBBY_BANNER_DESKTOP_MQ } from "./useLobbyBannerViewport";

describe("useLobbyBannerViewport", () => {
  it("requires fine pointer so phone landscape does not switch to pc banner video", () => {
    expect(LOBBY_BANNER_DESKTOP_MQ).toContain("(hover: hover)");
    expect(LOBBY_BANNER_DESKTOP_MQ).toContain("(pointer: fine)");
  });
});
