import { describe, expect, it } from "vitest";
import { profileVipProgress } from "./profileVipProgress";
import { VIP_MAX_LEVEL } from "./vipHelpers";

describe("profileVipProgress", () => {
  it("shows MAX and full bar at max VIP level when exp required is 0", () => {
    expect(
      profileVipProgress({
        vipLevel: VIP_MAX_LEVEL,
        vipCurrentLevelExp: 0,
        vipCurrentLevelExpRequired: 0,
      }),
    ).toEqual({
      useServerVipBar: true,
      isMaxLevel: true,
      current: 0,
      required: 0,
      fillPct: 100,
    });
  });

  it("shows MAX and full bar at max VIP level even if exp required is missing", () => {
    expect(
      profileVipProgress({
        vipLevel: VIP_MAX_LEVEL,
        vipCurrentLevelExp: 120,
      }),
    ).toMatchObject({
      isMaxLevel: true,
      fillPct: 100,
    });
  });

  it("uses server exp values below max VIP level", () => {
    expect(
      profileVipProgress({
        vipLevel: VIP_MAX_LEVEL - 1,
        vipCurrentLevelExp: 250,
        vipCurrentLevelExpRequired: 500,
      }),
    ).toEqual({
      useServerVipBar: true,
      isMaxLevel: false,
      current: 250,
      required: 500,
      fillPct: 50,
    });
  });

  it("falls back when exp required is 0 below max VIP level", () => {
    expect(
      profileVipProgress({
        vipLevel: VIP_MAX_LEVEL - 1,
        vipCurrentLevelExp: 0,
        vipCurrentLevelExpRequired: 0,
      }),
    ).toEqual({
      useServerVipBar: false,
      isMaxLevel: false,
      current: 0,
      required: 500,
      fillPct: 0,
    });
  });
});
