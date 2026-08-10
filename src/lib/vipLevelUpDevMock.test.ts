import { afterEach, describe, expect, it, vi } from "vitest";
import { getDevVipLevelBonusList } from "./vipLevelUpDevMock";

describe("vipLevelUpDevMock", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses VITE_DEV_WALLET_GET_VIP_BONUS env shape", () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_DEV_WALLET_GET_VIP_BONUS", "6:100000:100000");
    expect(getDevVipLevelBonusList()).toEqual([
      { vipLevel: 6, gcAmountWire: "100000", scAmountWire: "100000" },
    ]);
  });
});
