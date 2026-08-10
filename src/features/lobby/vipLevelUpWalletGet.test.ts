import { describe, expect, it } from "vitest";
import {
  vipLevelBonusFingerprint,
  vipLevelBonusItemFingerprint,
} from "./vipLevelUpWalletGet";

describe("vipLevelBonusFingerprint", () => {
  it("joins bonus fields with pipe separators", () => {
    expect(
      vipLevelBonusFingerprint([
        { vipLevel: 2, gcAmountWire: "50000", scAmountWire: "25000" },
        { vipLevel: 5, gcAmountWire: "200000", scAmountWire: "100000" },
      ]),
    ).toBe("2:50000:25000|5:200000:100000");
  });
});

describe("vipLevelBonusItemFingerprint", () => {
  it("formats a single bonus entry", () => {
    expect(
      vipLevelBonusItemFingerprint({
        vipLevel: 6,
        gcAmountWire: "100000",
        scAmountWire: "100000",
      }),
    ).toBe("6:100000:100000");
  });
});
