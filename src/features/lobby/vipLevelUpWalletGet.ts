import { getDevVipLevelBonusList } from "../../lib/vipLevelUpDevMock";
import { GATEWAY_API_WALLET_GET } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import type { GatewayWsRequestFn } from "../../realtime/gatewayWs";
import {
  decodeWalletGetResponseBytes,
  encodeWalletGetRequestBytes,
  parseVipLevelBonusList,
  type VipLevelBonusItem,
} from "../../realtime/walletGetLobbyWire";

export function vipLevelBonusFingerprint(bonuses: VipLevelBonusItem[]): string {
  return bonuses
    .map((b) => `${b.vipLevel}:${b.gcAmountWire}:${b.scAmountWire}`)
    .join("|");
}

export function vipLevelBonusItemFingerprint(bonus: VipLevelBonusItem): string {
  return `${bonus.vipLevel}:${bonus.gcAmountWire}:${bonus.scAmountWire}`;
}

/** WalletGet (12) — read pending VIP level-up bonuses. */
export async function fetchVipLevelBonusListFromGateway(
  request: GatewayWsRequestFn,
): Promise<VipLevelBonusItem[]> {
  const devMock = getDevVipLevelBonusList();
  if (devMock !== null) return devMock;

  const r = await request({
    type: GATEWAY_API_WALLET_GET,
    data: encodeWalletGetRequestBytes("GC"),
    debugLabel: "WALLET_GET_VIP_LEVEL_UP",
  });
  const code = String(r.code ?? "");
  if (!isGatewaySuccessCode(code) || !(r.data instanceof Uint8Array)) {
    return [];
  }
  const decoded = decodeWalletGetResponseBytes(r.data);
  return parseVipLevelBonusList(decoded.vipLevelBonusList);
}
