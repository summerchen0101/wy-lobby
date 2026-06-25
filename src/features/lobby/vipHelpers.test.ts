import { describe, expect, it } from "vitest";
import { VIP_DATA_BY_VIPLV } from "./vipData";
import {
  clampVipViewLevel,
  formatVipPoints,
  formatVipRewardCompact,
  isVipLevelUpBonusClaimed,
  parseVipWordDataIds,
  resolveVipBenefits,
  VIP_MAX_LEVEL,
  VIP_MIN_LEVEL,
  vipRowForLevel,
} from "./vipHelpers";

describe("parseVipWordDataIds", () => {
  it("parses comma-separated ids", () => {
    expect(parseVipWordDataIds("2001,2002,2003")).toEqual([2001, 2002, 2003]);
  });

  it("parses a single numeric id", () => {
    expect(parseVipWordDataIds(2000)).toEqual([2000]);
  });
});

describe("vipRowForLevel", () => {
  it("returns the row for a known vip level", () => {
    expect(vipRowForLevel(2)).toEqual(VIP_DATA_BY_VIPLV.get(2));
  });
});

describe("resolveVipBenefits", () => {
  it("maps WordDataIDs to benefit strings", () => {
    const row = VIP_DATA_BY_VIPLV.get(1);
    const benefits = resolveVipBenefits(row);
    expect(benefits.length).toBeGreaterThan(0);
    expect(benefits.every((text) => text.length > 0)).toBe(true);
  });
});

describe("clampVipViewLevel", () => {
  it("clamps below minimum to 0", () => {
    expect(clampVipViewLevel(-3)).toBe(VIP_MIN_LEVEL);
  });

  it("clamps above maximum to 15", () => {
    expect(clampVipViewLevel(99)).toBe(VIP_MAX_LEVEL);
  });
});

describe("isVipLevelUpBonusClaimed", () => {
  it("marks current and lower tiers as claimed", () => {
    expect(isVipLevelUpBonusClaimed(0, 2)).toBe(true);
    expect(isVipLevelUpBonusClaimed(2, 2)).toBe(true);
    expect(isVipLevelUpBonusClaimed(3, 2)).toBe(false);
  });
});

describe("formatVipRewardCompact", () => {
  it("formats thousands and millions", () => {
    expect(formatVipRewardCompact(50_000)).toBe("50K");
    expect(formatVipRewardCompact(1_000_000)).toBe("1M");
  });
});

describe("formatVipPoints", () => {
  it("formats points with grouping separators", () => {
    expect(formatVipPoints(1500)).toBe("1,500");
  });
});
