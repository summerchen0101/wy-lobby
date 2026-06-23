import { MIN_REDEEM_SC_RAW } from "../../wallet/formatWalletAmount";
import {
  redeemPlayerBindingFromLobby,
  type LobbyGetDecoded,
} from "../../realtime/lobbyDecode";
import type { User } from "../../lib/api/types";

/** 可提領下限（後端 wire 原始單位）；LobbyGet minTxWdraw 優先，否則 50 SC。 */
export function resolveMinRedeemRaw(
  lobbyGet: LobbyGetDecoded | null | undefined,
  user?: User | null,
): number {
  const fromLobby = redeemPlayerBindingFromLobby(lobbyGet).minTxWdrawRaw;
  if (fromLobby !== undefined && fromLobby > 0) return fromLobby;
  const fromUser = user?.minTxWdraw;
  if (fromUser !== undefined && fromUser > 0) return fromUser;
  return MIN_REDEEM_SC_RAW;
}

export function resolveMinRedeemDisplay(
  lobbyGet: LobbyGetDecoded | null | undefined,
  user?: User | null,
): number {
  const raw = resolveMinRedeemRaw(lobbyGet, user);
  return Math.max(1, Math.floor(raw / 10_000));
}
