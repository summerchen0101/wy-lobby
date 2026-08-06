import * as protobuf from "protobufjs/light.js";
import { describe, expect, it } from "vitest";
import schema from "../gen/lobby_wire.schema.js";
import { decodeMegaAccountBindingResponseBytes } from "./shopLobbyWire";
import {
  redeemPlayerBindingFromLobby,
  type LobbyGetDecoded,
} from "./lobbyDecode";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const MegaAccountBindingResponseType = root.lookupType(
  "megaman.MegaAccountBindingResponse",
);

describe("decodeMegaAccountBindingResponseBytes", () => {
  it("decodes docvTransactionToken", () => {
    const msg = MegaAccountBindingResponseType.create({
      needSMSAnswer: 0,
      phoneNum: "15551234567",
      docvTransactionToken: "txn-abc-123",
    });
    const bytes = Uint8Array.from(
      MegaAccountBindingResponseType.encode(msg).finish(),
    );
    const decoded = decodeMegaAccountBindingResponseBytes(bytes);
    expect(decoded.needSMSAnswer).toBe(false);
    expect(decoded.phoneNum).toBe("15551234567");
    expect(decoded.docvTransactionToken).toBe("txn-abc-123");
  });
});

describe("redeemPlayerBindingFromLobby", () => {
  it("reports hasAddress when playerInfo.address is set", () => {
    const lobbyGet = {
      playerInfo: {
        cellPhone: "1-5551234567",
        address: "123 Main St",
      },
    } as unknown as LobbyGetDecoded;
    expect(redeemPlayerBindingFromLobby(lobbyGet)).toEqual({
      hasCellPhone: true,
      hasAddress: true,
      minTxWdrawRaw: undefined,
    });
  });

  it("reports hasAddress false when address is empty", () => {
    const lobbyGet = {
      playerInfo: {
        cellPhone: "1-5551234567",
        address: "",
      },
    } as unknown as LobbyGetDecoded;
    expect(redeemPlayerBindingFromLobby(lobbyGet).hasAddress).toBe(false);
  });
});
