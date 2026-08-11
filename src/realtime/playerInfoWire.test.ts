import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import {
  decodeGetPlayerInfoResponseBytes,
  encodeGetPlayerInfoRequestBytes,
  hasPlayerFrontImageFromGetPlayerInfo,
} from "./playerInfoWire";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const GetPlayerInfoResponseType = root.lookupType("megaman.GetPlayerInfoResponse");

function encodeGetPlayerInfoResponse(playerInfo: Record<string, unknown>): Uint8Array {
  const msg = GetPlayerInfoResponseType.create({ playerInfo });
  return Uint8Array.from(GetPlayerInfoResponseType.encode(msg).finish());
}

describe("playerInfoWire", () => {
  it("roundtrips frontImage on GET_PLAYER_INFO response", () => {
    const data = encodeGetPlayerInfoResponse({
      frontImage: "https://cdn/id-front.jpg",
    });
    const decoded = decodeGetPlayerInfoResponseBytes(data);
    expect(decoded.playerInfo?.frontImage).toBe("https://cdn/id-front.jpg");
    expect(hasPlayerFrontImageFromGetPlayerInfo(decoded)).toBe(true);
  });

  it("encodes GetPlayerInfoRequest with userID", () => {
    const bytes = encodeGetPlayerInfoRequestBytes("12345");
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});
