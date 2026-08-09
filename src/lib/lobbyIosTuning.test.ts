import { describe, expect, it, vi } from "vitest";

vi.mock("./iosGameFullscreen", () => ({
  isIOSWebKit: () => true,
}));

import {
  lobbyGamesPageSize,
  lobbyThumbIntersectionMargin,
} from "./lobbyIosTuning";

describe("lobbyIosTuning", () => {
  it("uses smaller batches and margins on iOS", () => {
    expect(lobbyGamesPageSize()).toBe(16);
    expect(lobbyThumbIntersectionMargin()).not.toContain("200px");
  });
});
