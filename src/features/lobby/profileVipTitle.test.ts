import { describe, expect, it } from "vitest";
import { getWord } from "../../wordData/getWord";
import { resolveProfileVipTitle } from "./profileVipTitle";

describe("resolveProfileVipTitle", () => {
  it("maps vipLevel 0 to WordData ID 1000", () => {
    expect(resolveProfileVipTitle(0)).toBe(getWord(1000));
  });

  it("maps vipLevel 15 to WordData ID 1015", () => {
    expect(resolveProfileVipTitle(15)).toBe(getWord(1015));
  });

  it("floors fractional vip levels", () => {
    expect(resolveProfileVipTitle(2.9)).toBe(getWord(1002));
  });
});
