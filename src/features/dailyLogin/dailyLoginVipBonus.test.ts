import { describe, expect, it } from "vitest";
import {
  applyDailyLoginVipBonus,
  dailyLoginVipMultiplier,
} from "./dailyLoginVipBonus";

describe("dailyLoginVipBonus", () => {
  it("applies GC multiplier from doc table", () => {
    expect(dailyLoginVipMultiplier("GC", 0)).toBe(1);
    expect(dailyLoginVipMultiplier("GC", 1)).toBe(1.05);
    expect(dailyLoginVipMultiplier("GC", 15)).toBe(10);
    expect(applyDailyLoginVipBonus(100000, 1, 1)).toBe(105000);
  });

  it("applies SC multiplier from doc table", () => {
    expect(dailyLoginVipMultiplier("SC", 0)).toBe(1);
    expect(dailyLoginVipMultiplier("SC", 5)).toBe(1.1);
    expect(dailyLoginVipMultiplier("SC", 15)).toBe(2.5);
    expect(applyDailyLoginVipBonus(10000, 2, 15)).toBe(25000);
  });
});
