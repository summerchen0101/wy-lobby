import type { LobbyGetDecoded } from "../../realtime/lobbyDecode";
import {
  scTruncatedHundredthsFromRaw,
} from "../../wallet/formatWalletAmount";

function numFromWire(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * 文件：`LobbyGet.bag.coins[0].amount` / `redeemableAmount`。
 * Unplayed 顯示值 = 畫面上截斷後的 amount − redeemableAmount（與 Info popover 三列數字一致）。
 * 例：raw 7315047230（731504.7230）− 5907326430（590732.6430）→ 731504.72 − 590732.64 = 140772.08；
 * 勿對 raw 相減後再 format（1407720800 會因 JS 浮點顯示成 140772.07）。
 * SC 數值為後端「萬分之一」單位（與 withdraw wire / ScPointCurrency 一致）；顯示請用 `formatScFromRaw`／`scRawToDisplay`。
 * `redeemableAmount`：有 coin 且後端給 redeemableAmount 時採用之；無 bag／無 coin 列時視同可提額並採 fallback（與 amount 對齊，mock／無袋資訊用）。
 */
export function redeemScBalancesFromLobby(params: {
  lobbyGet: LobbyGetDecoded | null;
  sweepstakesFallback?: number;
}): {
  amount: number;
  redeemableAmount: number;
  unplayedHundredths: number;
} {
  const c0 = params.lobbyGet?.bag?.coins?.[0] as
    | { amount?: unknown; redeemableAmount?: unknown }
    | undefined;
  const hasLobbyScCoin = c0 != null && typeof c0 === "object";
  const fromCoinAmount = numFromWire(c0?.amount);
  const fromCoinRedeem = numFromWire(c0?.redeemableAmount);
  const amount =
    fromCoinAmount !== undefined
      ? fromCoinAmount
      : (params.sweepstakesFallback ?? 0);
  const redeemableAmount =
    fromCoinRedeem !== undefined
      ? fromCoinRedeem
      : !hasLobbyScCoin
        ? (params.sweepstakesFallback ?? 0)
        : 0;
  const unplayedHundredths =
    scTruncatedHundredthsFromRaw(amount) -
    scTruncatedHundredthsFromRaw(redeemableAmount);
  return { amount, redeemableAmount, unplayedHundredths };
}
