import { describe, expect, it } from "vitest";
import {
  formatScFromRaw,
  formatScFromTruncatedHundredths,
} from "../../wallet/formatWalletAmount";
import { redeemScBalancesFromLobby } from "./redeemBalances";

describe("redeemScBalancesFromLobby", () => {
  it("unplayed 顯示值 = 截斷後 amount − redeemable（UID 2034470198206316544 後端案例）", () => {
    // 後端 raw（萬分之一）：731504.7230、590732.6430 → 畫面截斷 731504.72、590732.64
    const amount = 7_315_047_230;
    const redeemableAmount = 5_907_326_430;
    const { unplayedHundredths } = redeemScBalancesFromLobby({
      lobbyGet: {
        bag: { coins: [{ amount, redeemableAmount }] },
      } as never,
    });

    expect(formatScFromRaw(amount)).toBe("731,504.72");
    expect(formatScFromRaw(redeemableAmount)).toBe("590,732.64");
    expect(formatScFromTruncatedHundredths(unplayedHundredths)).toBe(
      "140,772.08",
    );
    // raw 相減 1407720800（140772.0800）經 formatScFromRaw 會因浮點誤差變成 140772.07
    expect(amount - redeemableAmount).toBe(1_407_720_800);
  });

  it("redeemable=0 時 total 與 unplayed 皆為 2.30（raw=23000）", () => {
    const amount = 23_000;
    const { redeemableAmount, unplayedHundredths } = redeemScBalancesFromLobby({
      lobbyGet: {
        bag: { coins: [{ amount, redeemableAmount: 0 }] },
      } as never,
    });

    expect(redeemableAmount).toBe(0);
    expect(formatScFromRaw(amount)).toBe("2.30");
    expect(formatScFromTruncatedHundredths(unplayedHundredths)).toBe("2.30");
  });
});
