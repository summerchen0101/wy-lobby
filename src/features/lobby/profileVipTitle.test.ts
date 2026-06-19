import { describe, expect, it } from "vitest";
import { resolveProfileVipTitle } from "./profileVipTitle";
import { VIP_TITLE_WORD_DATA } from "./vipWordData";

describe("resolveProfileVipTitle", () => {
  it("maps vipLevel 0 to WordData ID 1000", () => {
    expect(resolveProfileVipTitle(0)).toBe(VIP_TITLE_WORD_DATA[1000]);
  });

  it("maps vipLevel 15 to WordData ID 1015", () => {
    expect(resolveProfileVipTitle(15)).toBe(VIP_TITLE_WORD_DATA[1015]);
  });

  it("floors fractional vipLevel", () => {
    expect(resolveProfileVipTitle(2.9)).toBe(VIP_TITLE_WORD_DATA[1002]);
  });

  it("returns em dash for unknown vipLevel", () => {
    expect(resolveProfileVipTitle(99)).toBe("—");
  });

  it("returns em dash when vipLevel is undefined", () => {
    expect(resolveProfileVipTitle(undefined)).toBe("—");
  });

  it("returns em dash when vipLevel is not finite", () => {
    expect(resolveProfileVipTitle(Number.NaN)).toBe("—");
  });
});
