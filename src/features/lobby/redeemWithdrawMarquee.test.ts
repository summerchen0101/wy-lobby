import { describe, expect, it } from "vitest";
import { getWord } from "../../wordData/getWord";
import {
  buildWithdrawMarqueeLine,
  generateWeightedWithdrawAmountWire,
  generateWithdrawMarqueeSeed,
  maskWithdrawNickname,
} from "./redeemWithdrawMarquee";

describe("maskWithdrawNickname", () => {
  it("masks with **** and a numeric suffix", () => {
    expect(maskWithdrawNickname("Aaron", () => 0.567)).toBe("Aaron****568");
  });

  it("falls back to Player for empty nicknames", () => {
    expect(maskWithdrawNickname("  ", () => 0)).toBe("Player****1");
  });
});

describe("generateWeightedWithdrawAmountWire", () => {
  it("returns low-tier values for rolls under 70", () => {
    const amount = generateWeightedWithdrawAmountWire(() => 0.1);
    expect(amount).toBeGreaterThanOrEqual(6);
    expect(amount).toBeLessThanOrEqual(500);
  });

  it("returns mid-tier values for rolls between 70 and 98", () => {
    const amount = generateWeightedWithdrawAmountWire(() => 0.8);
    expect(amount).toBeGreaterThanOrEqual(501);
    expect(amount).toBeLessThanOrEqual(3000);
  });

  it("returns high-tier values for rolls at or above 98", () => {
    const amount = generateWeightedWithdrawAmountWire(() => 0.99);
    expect(amount).toBeGreaterThanOrEqual(3001);
    expect(amount).toBeLessThanOrEqual(10000);
  });
});

describe("buildWithdrawMarqueeLine", () => {
  it("uses WordData 510468 placeholders", () => {
    const line = buildWithdrawMarqueeLine(getWord, "Sam", "1000000", () => 0);
    expect(line).toContain("Sam****1");
    expect(line).toContain("100");
    expect(line).toMatch(/^Congrats!/);
  });
});

describe("generateWithdrawMarqueeSeed", () => {
  it("returns the requested number of unique seed lines", () => {
    const lines = generateWithdrawMarqueeSeed(20, () => Math.random());
    expect(lines).toHaveLength(20);
    expect(new Set(lines).size).toBe(20);
  });
});
