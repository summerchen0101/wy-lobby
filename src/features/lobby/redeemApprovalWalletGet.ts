import { getDevRedeemApprovalAmountsWire } from "../../lib/redeemApprovalDevMock";
import { GATEWAY_API_WALLET_GET } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import type { GatewayWsRequestFn } from "../../realtime/gatewayWs";
import {
  decodeWalletGetResponseBytes,
  encodeWalletGetRequestBytes,
  parseRedeemSCList,
} from "../../realtime/walletGetLobbyWire";

/** 第三方提領返回成功後觸發（先刷新列表，再 WALLET_GET）。 */
export const REDEEM_WITHDRAW_RETURN_SUCCESS_EVENT =
  "ffgt:redeem-withdraw-return-success";

export function dispatchRedeemWithdrawReturnSuccess(): void {
  window.dispatchEvent(new CustomEvent(REDEEM_WITHDRAW_RETURN_SUCCESS_EVENT));
}

/** WalletGet (12) — 讀取待提示的 RedeemSCList。 */
export async function fetchRedeemSCListFromGateway(
  request: GatewayWsRequestFn,
): Promise<string[]> {
  const devMock = getDevRedeemApprovalAmountsWire();
  if (devMock !== null) return devMock;

  const r = await request({
    type: GATEWAY_API_WALLET_GET,
    data: encodeWalletGetRequestBytes("SC"),
    debugLabel: "WALLET_GET_REDEEM_APPROVAL",
  });
  const code = String(r.code ?? "");
  if (!isGatewaySuccessCode(code) || !(r.data instanceof Uint8Array)) {
    return [];
  }
  const decoded = decodeWalletGetResponseBytes(r.data);
  return parseRedeemSCList(decoded.redeemSCList);
}
