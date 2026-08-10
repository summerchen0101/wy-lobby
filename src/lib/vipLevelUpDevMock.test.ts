import { describe, expect, it } from "vitest";
import { getDevVipLevelBonusList } from "./vipLevelUpDevMock";

describe("vipLevelUpDevMock", () => {
  it("parses VITE_DEV_WALLET_GET_VIP_BONUS env shape", () => {
    const prev = import.meta.env.VITE_DEV_WALLET_GET_VIP_BONUS;
    import.meta.env.VITE_DEV_WALLET_GET_VIP_BONUS = "6:100000:100000";
    expect(getDevVipLevelBonusList()).toEqual([
      { vipLevel: 6, gcAmountWire: "100000", scAmountWire: "100000" },
    ]);
    import.meta.env.VITE_DEV_WALLET_GET_VIP_BONUS = prev;
  });
});
