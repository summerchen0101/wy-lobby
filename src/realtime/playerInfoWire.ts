import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import { wireUInt64Field } from "./wireUint64";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`lobby wire: missing message type ${name}`);
  }
  return t;
}

const GetPlayerInfoRequestType = mustLookup("megaman.GetPlayerInfoRequest");
const GetPlayerInfoResponseType = mustLookup("megaman.GetPlayerInfoResponse");

export function encodeGetPlayerInfoRequestBytes(userID: string | number): Uint8Array {
  const payload = {
    userID: wireUInt64Field(userID),
    isFake: 0,
    versionName: "",
    nickName: "",
    notNeedPreload: false,
  };
  const err = GetPlayerInfoRequestType.verify(payload);
  if (err) throw new Error(`GetPlayerInfoRequest: ${err}`);
  const msg = GetPlayerInfoRequestType.create(payload);
  return GetPlayerInfoRequestType.encode(msg).finish();
}

export function decodeGetPlayerInfoResponseBytes(data: Uint8Array): {
  playerInfo?: { frontImage?: string };
} {
  const msg = GetPlayerInfoResponseType.decode(data);
  return GetPlayerInfoResponseType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as { playerInfo?: { frontImage?: string } };
}

/** KYC 證件已上傳（GET_PLAYER_INFO playerInfo.frontImage 有值）。 */
export function hasPlayerFrontImageFromGetPlayerInfo(
  decoded: { playerInfo?: { frontImage?: unknown } } | null | undefined,
): boolean {
  const raw = decoded?.playerInfo?.frontImage;
  return typeof raw === "string" && raw.trim().length > 0;
}
