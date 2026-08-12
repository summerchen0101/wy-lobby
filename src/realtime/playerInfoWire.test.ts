import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import {
  decodeGetPlayerInfoRequestForDevLog,
  decodeGetPlayerInfoResponseBytes,
  decodeGetPlayerInfoResponseForDevLog,
  encodeGetPlayerInfoRequestBytes,
  hasPlayerFrontImageFromGetPlayerInfo,
  looksLikeGetInfoResponse,
} from "./playerInfoWire";
import { decodeGatewayResponseDataForDevLog } from "./gatewayResponseDevPayload";
import { GATEWAY_API_GET_PLAYER_INFO } from "./gatewayApi";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const GetPlayerInfoResponseType = root.lookupType("megaman.GetPlayerInfoResponse");
const GetInfoResponseType = root.lookupType("megaman.GetInfoResponse");

function encodeGetPlayerInfoResponse(playerInfo: Record<string, unknown>): Uint8Array {
  const msg = GetPlayerInfoResponseType.create({ playerInfo });
  return Uint8Array.from(GetPlayerInfoResponseType.encode(msg).finish());
}

function encodeGetInfoResponse(params: {
  bag?: Record<string, unknown>;
  playerInfo: Record<string, unknown>;
}): Uint8Array {
  const msg = GetInfoResponseType.create({
    bag: params.bag ?? { userID: "1" },
    playerInfo: { playerInfo: params.playerInfo },
  });
  return Uint8Array.from(GetInfoResponseType.encode(msg).finish());
}

describe("playerInfoWire", () => {
  it("roundtrips frontImageBase64 on GET_PLAYER_INFO response", () => {
    const data = encodeGetPlayerInfoResponse({
      frontImageBase64: "aGVsbG8=",
    });
    const decoded = decodeGetPlayerInfoResponseBytes(data);
    expect(decoded.playerInfo?.frontImageBase64).toBe("aGVsbG8=");
    expect(hasPlayerFrontImageFromGetPlayerInfo(decoded)).toBe(true);
  });

  it("unwraps megaman.GetInfoResponse wire used by Gateway type 20", () => {
    const frontImageBase64 = `data:image/jpeg;base64,${"A".repeat(1500)}`;
    const data = encodeGetInfoResponse({
      bag: { userID: "2084595942960222208" },
      playerInfo: {
        userID: "2084595942960222208",
        nickname: "kyc",
        frontImageBase64,
      },
    });
    expect(looksLikeGetInfoResponse(data)).toBe(true);
    // 若誤當裸 GetPlayerInfoResponse：field1=Bag 會被解成假 playerInfo，frontImageBase64 會丟
    const wrong = GetPlayerInfoResponseType.toObject(
      GetPlayerInfoResponseType.decode(data),
      { longs: String, defaults: true },
    ) as { playerInfo?: { frontImageBase64?: string; nickname?: string } };
    expect(wrong.playerInfo?.frontImageBase64 ?? "").toBe("");

    const decoded = decodeGetPlayerInfoResponseBytes(data);
    expect(decoded.playerInfo?.nickname).toBe("kyc");
    expect(decoded.playerInfo?.frontImageBase64).toBe(frontImageBase64);
    expect(hasPlayerFrontImageFromGetPlayerInfo(decoded)).toBe(true);

    const logged = decodeGetPlayerInfoResponseForDevLog(data);
    expect(logged.wire).toBe("GetInfoResponse");
    expect(logged).not.toHaveProperty("hexPreview");
  });

  it("still unwraps GetInfoResponse when trailing unknown fields follow field2", () => {
    const frontImageBase64 = `data:image/jpeg;base64,${"C".repeat(1500)}`;
    const base = encodeGetInfoResponse({
      playerInfo: { userID: "9", nickname: "trail", frontImageBase64 },
    });
    // 附加假的 field3 length-delimited，模擬 topSenders 等未建模欄位
    const junk = new Uint8Array([0x1a, 0x04, 0x08, 0x01, 0x10, 0x02]);
    const data = new Uint8Array(base.byteLength + junk.byteLength);
    data.set(base, 0);
    data.set(junk, base.byteLength);

    const decoded = decodeGetPlayerInfoResponseBytes(data);
    expect(decoded.playerInfo?.nickname).toBe("trail");
    expect(decoded.playerInfo?.frontImageBase64).toBe(frontImageBase64);
  });

  it("encodes GetPlayerInfoRequest with userID", () => {
    const bytes = encodeGetPlayerInfoRequestBytes("12345");
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(decodeGetPlayerInfoRequestForDevLog(bytes)).toMatchObject({
      userID: "12345",
    });
  });

  it("dev-log response returns parsed playerInfo, not hex", () => {
    const data = encodeGetPlayerInfoResponse({
      userID: "12345",
      nickname: "ruby",
      frontImageBase64: "aGVsbG8=",
    });
    const decoded = decodeGetPlayerInfoResponseForDevLog(data);
    expect(decoded).toMatchObject({
      wire: "GetPlayerInfoResponse",
      playerInfo: {
        userID: "12345",
        nickname: "ruby",
        frontImageBase64: "aGVsbG8=",
      },
    });
    expect(decoded).not.toHaveProperty("hexPreview");
  });

  it("dev-log response previews oversized frontImageBase64", () => {
    const frontImageBase64 = "A".repeat(200);
    const data = encodeGetPlayerInfoResponse({ frontImageBase64 });
    const decoded = decodeGetPlayerInfoResponseForDevLog(data);
    const preview = (decoded.playerInfo as { frontImageBase64?: string })
      ?.frontImageBase64;
    expect(preview).toMatch(/^A{120}…\(len=200\)$/);
  });

  it("treats empty frontImageBase64 as KYC image absent", () => {
    const data = encodeGetPlayerInfoResponse({
      socialIDPic1: "https://cdn/id.png",
    });
    expect(
      hasPlayerFrontImageFromGetPlayerInfo(decodeGetPlayerInfoResponseBytes(data)),
    ).toBe(false);
  });
});

describe("decodeGatewayResponseDataForDevLog GET_PLAYER_INFO", () => {
  it("decodes type 20 as GET_PLAYER_INFO instead of unknownType hex", () => {
    const data = encodeGetPlayerInfoResponse({
      userID: "99",
      nickname: "kyc",
      frontImageBase64: "aGVsbG8=",
    });
    const decoded = decodeGatewayResponseDataForDevLog(
      GATEWAY_API_GET_PLAYER_INFO,
      "200",
      data,
    );
    expect(decoded.kind).toBe("GET_PLAYER_INFO");
    expect(decoded).not.toHaveProperty("hexPreview");
    expect(decoded).toMatchObject({
      kind: "GET_PLAYER_INFO",
      data: {
        playerInfo: {
          userID: "99",
          nickname: "kyc",
          frontImageBase64: "aGVsbG8=",
        },
      },
    });
  });

  it("decodes GetInfoResponse-shaped type 20 body", () => {
    const frontImageBase64 = `x${"B".repeat(1200)}`;
    const data = encodeGetInfoResponse({
      playerInfo: { userID: "1", frontImageBase64 },
    });
    const decoded = decodeGatewayResponseDataForDevLog(
      GATEWAY_API_GET_PLAYER_INFO,
      "200",
      data,
    );
    expect(decoded.kind).toBe("GET_PLAYER_INFO");
    expect(decoded).not.toHaveProperty("hexPreview");
    expect(decoded).toMatchObject({
      data: {
        wire: "GetInfoResponse",
        playerInfo: { userID: "1" },
      },
    });
  });
});
