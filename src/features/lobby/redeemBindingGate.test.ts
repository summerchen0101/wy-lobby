import { describe, expect, it } from "vitest";
import { fetchRedeemPlayerBindingFromGateway } from "./redeemBindingGate";
import { decodeLobbyGetResponseBytes } from "../../realtime/lobbyDecode";
import type { GatewayWsRequestFn } from "../../realtime/gatewayWs";
import * as protobuf from "protobufjs/light.js";
import schema from "../../gen/lobby_wire.schema.js";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const LobbyGetResponseType = root.lookupType("megaman.LobbyGetResponse");

function encodeLobbyGet(playerInfo: Record<string, unknown>): Uint8Array {
  const msg = LobbyGetResponseType.create({ playerInfo });
  return Uint8Array.from(LobbyGetResponseType.encode(msg).finish());
}

describe("fetchRedeemPlayerBindingFromGateway", () => {
  it("returns binding state from a successful LOBBY_GET", async () => {
    const data = encodeLobbyGet({
      cellPhone: "15551234567",
      address: "123 Main St",
      frontImage: "",
    });
    expect(
      decodeLobbyGetResponseBytes(data).playerInfo?.cellPhone,
    ).toBe("15551234567");

    const request = (async () => ({
      code: "200",
      data,
    })) as GatewayWsRequestFn;

    const binding = await fetchRedeemPlayerBindingFromGateway(request);
    expect(binding.hasCellPhone).toBe(true);
    expect(binding.hasAddress).toBe(true);
    expect(binding.hasFrontImage).toBe(false);
  });

  it("returns empty binding when gateway request fails", async () => {
    const request = (async () => ({
      code: "500",
      data: new Uint8Array(0),
    })) as GatewayWsRequestFn;

    const binding = await fetchRedeemPlayerBindingFromGateway(request);
    expect(binding.hasFrontImage).toBe(false);
    expect(binding.hasCellPhone).toBe(false);
  });
});
