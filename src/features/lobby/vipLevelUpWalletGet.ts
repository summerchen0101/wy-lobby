import { fetchWalletGetLobbyExtras } from "../../realtime/walletGetGateway";
import type { GatewayWsRequestFn } from "../../realtime/gatewayWs";
import type { VipLevelBonusItem } from "../../realtime/walletGetLobbyWire";

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
  options?: { force?: boolean },
): Promise<VipLevelBonusItem[]> {
  const extras = await fetchWalletGetLobbyExtras(request, options);
  return extras.vipLevelBonusList;
}
