import { fetchWalletGetLobbyExtras } from "../../realtime/walletGetGateway";
import type { GatewayWsRequestFn } from "../../realtime/gatewayWs";

/** 第三方提領返回成功後觸發（先刷新列表，再 WALLET_GET）。 */
export const REDEEM_WITHDRAW_RETURN_SUCCESS_EVENT =
  "ffgt:redeem-withdraw-return-success";

export function dispatchRedeemWithdrawReturnSuccess(): void {
  window.dispatchEvent(new CustomEvent(REDEEM_WITHDRAW_RETURN_SUCCESS_EVENT));
}

/** WalletGet (12) — 讀取待提示的 RedeemSCList。 */
export async function fetchRedeemSCListFromGateway(
  request: GatewayWsRequestFn,
  options?: { force?: boolean },
): Promise<string[]> {
  const extras = await fetchWalletGetLobbyExtras(request, options);
  return extras.redeemSCList;
}
