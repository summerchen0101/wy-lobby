import { GATEWAY_API_LOBBY_GET } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import type { GatewayWsRequestFn } from "../../realtime/gatewayWs";
import { translateGatewayError } from "../../i18n/apiErrorMessage";
import {
  decodeLobbyGetResponseBytes,
  redeemPlayerBindingFromLobby,
  type LobbyGetDecoded,
  type RedeemPlayerBindingState,
} from "../../realtime/lobbyDecode";
import type { RedeemBindingPrefill } from "./RedeemProtectAccountView";

export type RedeemBindingNextStep =
  | { kind: "full" }
  | { kind: "addressOnly" }
  | { kind: "amountModal" };

export function resolveRedeemBindingNextStep(
  binding: RedeemPlayerBindingState,
): RedeemBindingNextStep {
  if (!binding.hasCellPhone && !binding.hasAddress) {
    return { kind: "full" };
  }
  if (binding.hasCellPhone && !binding.hasAddress) {
    return { kind: "addressOnly" };
  }
  return { kind: "amountModal" };
}

function playerInfoString(
  lobbyGet: LobbyGetDecoded | null | undefined,
  key: "cellPhone" | "address",
): string {
  const p = lobbyGet?.playerInfo;
  if (!p || typeof p !== "object") return "";
  const raw = (p as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : "";
}

/** 提領綁定表單預填：優先 user，fallback LOBBY_GET playerInfo。 */
export function redeemBindingPrefillFromLobby(
  lobbyGet: LobbyGetDecoded | null | undefined,
  user?: {
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null,
): RedeemBindingPrefill {
  return {
    email: user?.email?.trim() || undefined,
    phone: user?.phone?.trim() || playerInfoString(lobbyGet, "cellPhone") || undefined,
    address:
      user?.address?.trim() || playerInfoString(lobbyGet, "address") || undefined,
  };
}

/** 提領綁定錯誤：優先顯示 server errMessage（如 sms send still cooling）。 */
export function translateRedeemBindingGatewayError(
  code: string | number | undefined | null,
  errMessage?: string | null,
): string {
  const serverMsg = errMessage?.trim();
  if (serverMsg) return serverMsg;
  return translateGatewayError(code, errMessage, "Binding failed");
}

/** 提現綁定閘道：以 LOBBY_GET 讀取最新 cellPhone / address。 */
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
