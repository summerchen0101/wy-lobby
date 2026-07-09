import { describe, expect, it } from "vitest";
import {
  formatClaimedReferralRewardsMessage,
  hasReferralRewardEntries,
} from "./referralLobbyWire";

describe("hasReferralRewardEntries", () => {
  it("is false for undefined, non-array, or empty array", () => {
    expect(hasReferralRewardEntries(undefined)).toBe(false);
    expect(hasReferralRewardEntries([])).toBe(false);
  });

  it("is true when at least one reward row exists", () => {
    expect(hasReferralRewardEntries([{ walletType: "GC", amount: "100" }])).toBe(
      true,
    );
  });
});

describe("formatClaimedReferralRewardsMessage", () => {
  it("formats GC only", () => {
    expect(
      formatClaimedReferralRewardsMessage([
        { walletType: "GC", amount: "400000" },
      ]),
    ).toMatch(/^You received [\d,]+ GC\.$/);
  });

  it("formats SC with scale /10000 and fixed decimals", () => {
    const msg = formatClaimedReferralRewardsMessage([
      { walletType: "SC", amount: "200000" },
    ]);
    expect(msg).toBe("You received 20.00 SC.");
  });

  it("formats GC and SC together", () => {
    const msg = formatClaimedReferralRewardsMessage([
      { walletType: "GC", amount: "100" },
      { walletType: "SC", amount: "50000" },
    ]);
    expect(msg).toContain(" GC");
    expect(msg).toContain(" SC");
    expect(msg.startsWith("You received ")).toBe(true);
    expect(msg.endsWith(".")).toBe(true);
  });

  it("falls back when rows exist but no GC/SC amounts parse", () => {
    expect(
      formatClaimedReferralRewardsMessage([
        { walletType: "OTHER", amount: "1" },
      ]),
    ).toBe("You received rewards.");
  });
});
