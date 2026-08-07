import * as protobuf from "protobufjs/light.js";
import { describe, expect, it } from "vitest";
import schema from "../gen/lobby_wire.schema.js";
import {
  decodeMegaAccountBindingRequestForDevLog,
  decodeMegaAccountBindingResponseBytes,
  encodeMegaAccountBindingRequestBytes,
} from "./shopLobbyWire";
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

describe("encodeMegaAccountBindingRequestBytes", () => {
  it("includes ID image fields in wire payload", () => {
    const frontBase64 = "aGVsbG8=";
    const backBase64 = "d29ybGQ=";
    const bytes = encodeMegaAccountBindingRequestBytes({
      userID: "12345",
      countryCode: "1",
      phone: "4155550199",
      email: "test@example.com",
      answer: "",
      firstName: "Jane",
      lastName: "Doe",
      birthday: "1990-01-01",
      address: "123 Main St",
      addressLine1: "123 Main St",
      country: "US",
      city: "SF",
      state: "CA",
      zip: "94102",
      language: "en",
      documentType: 1,
      documentNumber: "D1234567",
      frontImageContentType: "image/jpg",
      backImageContentType: "image/png",
      frontImageBase64: frontBase64,
      backImageBase64: backBase64,
      socureDiSessionToken: "",
    });
    const logged = decodeMegaAccountBindingRequestForDevLog(bytes);
    expect(logged.frontImageContentType).toBe("image/jpg");
    expect(logged.backImageContentType).toBe("image/png");
    expect(logged.frontImageBase64).toBe(`${frontBase64.length} chars`);
    expect(logged.backImageBase64).toBe(`${backBase64.length} chars`);
    expect(logged.documentType).toBe(1);
    expect(logged.documentNumber).toBe("D1234567");
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
      hasFrontImage: false,
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
