import { describe, expect, it } from "vitest";
import {
  fetchRedeemPlayerBindingFromGateway,
  redeemBindingPrefillFromLobby,
  resolveRedeemBindingNextStep,
  translateRedeemBindingGatewayError,
} from "./redeemBindingGate";
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

describe("resolveRedeemBindingNextStep", () => {
  it("requires both phone and address empty for full binding", () => {
    expect(
      resolveRedeemBindingNextStep({
        hasCellPhone: false,
        hasAddress: false,
        hasFrontImage: false,
        minTxWdrawRaw: undefined,
      }),
    ).toEqual({ kind: "full" });
  });

  it("opens address-only when phone exists but address is missing", () => {
    expect(
      resolveRedeemBindingNextStep({
        hasCellPhone: true,
        hasAddress: false,
        hasFrontImage: false,
        minTxWdrawRaw: undefined,
      }),
    ).toEqual({ kind: "addressOnly" });
  });

  it("opens amount modal when phone and address exist (KYC complete)", () => {
    expect(
      resolveRedeemBindingNextStep({
        hasCellPhone: true,
        hasAddress: true,
        hasFrontImage: true,
        minTxWdrawRaw: 50,
      }),
    ).toEqual({ kind: "amountModal" });
  });
});

describe("redeemBindingPrefillFromLobby", () => {
  it("falls back to LOBBY_GET cellPhone and address", () => {
    expect(
      redeemBindingPrefillFromLobby(
        {
          playerInfo: {
            cellPhone: "15551234567",
            address: "123 Main St",
          },
        },
        { email: "a@b.com" },
      ),
    ).toEqual({
      email: "a@b.com",
      phone: "15551234567",
      address: "123 Main St",
    });
  });
});

describe("translateRedeemBindingGatewayError", () => {
  it("prefers server errMessage over WordData code mapping", () => {
    expect(
      translateRedeemBindingGatewayError("1222", "sms send still cooling..."),
    ).toBe("sms send still cooling...");
  });
});

describe("fetchRedeemPlayerBindingFromGateway", () => {
  it("returns binding state from a successful LOBBY_GET", async () => {
    const data = encodeLobbyGet({
      cellPhone: "15551234567",
      address: "123 Main St",
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
  });

  it("returns empty binding when gateway request fails", async () => {
    const request = (async () => ({
      code: "500",
      data: new Uint8Array(0),
    })) as GatewayWsRequestFn;

    const binding = await fetchRedeemPlayerBindingFromGateway(request);
    expect(binding.hasAddress).toBe(false);
    expect(binding.hasCellPhone).toBe(false);
  });
});
