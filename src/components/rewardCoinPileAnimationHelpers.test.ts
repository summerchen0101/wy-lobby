import { describe, expect, it } from "vitest";
import {
  flyOriginRectFromPiles,
  rewardCoinPileFlyDelayMs,
} from "./rewardCoinPileAnimationHelpers";

describe("rewardCoinPileFlyDelayMs", () => {
  it("starts coin fly after sequential pile exit (GC only)", () => {
    expect(rewardCoinPileFlyDelayMs(false)).toBe(1440);
  });

  it("starts coin fly after both piles exit when SC bonus exists", () => {
    expect(rewardCoinPileFlyDelayMs(true)).toBe(1940);
  });
});

describe("flyOriginRectFromPiles", () => {
  const rect = (x: number, y: number, w: number, h: number): DOMRect =>
    ({
      x,
      y,
      left: x,
      top: y,
      width: w,
      height: h,
      right: x + w,
      bottom: y + h,
    }) as DOMRect;

  it("uses midpoint between two coin pile rects", () => {
    const origin = flyOriginRectFromPiles(rect(100, 200, 80, 80), rect(220, 200, 80, 80))!;
    expect(origin.left + origin.width / 2).toBe(200);
    expect(origin.top + origin.height / 2).toBe(240);
  });

  it("falls back to the single pile rect when SC is absent", () => {
    const gc = rect(100, 200, 80, 80);
    expect(flyOriginRectFromPiles(gc, undefined)).toBe(gc);
  });
});
