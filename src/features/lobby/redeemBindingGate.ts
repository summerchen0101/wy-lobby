import { GATEWAY_API_LOBBY_GET } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import type { GatewayWsRequestFn } from "../../realtime/gatewayWs";
import {
  decodeLobbyGetResponseBytes,
  redeemPlayerBindingFromLobby,
  type RedeemPlayerBindingState,
} from "../../realtime/lobbyDecode";

/** 提現綁定閘道：以 LOBBY_GET 讀取最新 cellPhone / address / frontImage。 */
export async function fetchRedeemPlayerBindingFromGateway(
  request: GatewayWsRequestFn,
): Promise<RedeemPlayerBindingState> {
  try {
    const r = await request({
      type: GATEWAY_API_LOBBY_GET,
      data: new Uint8Array(0),
      debugLabel: "LOBBY_GET_REDEEM_BINDING_GATE",
    });
    const code = String(r.code ?? "");
    if (!isGatewaySuccessCode(code)) {
      return redeemPlayerBindingFromLobby(null);
    }
    const raw = r.data;
    if (!(raw instanceof Uint8Array) || raw.byteLength === 0) {
      return redeemPlayerBindingFromLobby(null);
    }
    return redeemPlayerBindingFromLobby(decodeLobbyGetResponseBytes(raw));
  } catch {
    return redeemPlayerBindingFromLobby(null);
  }
}
