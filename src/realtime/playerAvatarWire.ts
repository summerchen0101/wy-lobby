import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`lobby wire: missing message type ${name}`);
  }
  return t;
}

const ListPlayerAvatarsResponseType = mustLookup(
  "megaman.ListPlayerAvatarsResponse",
);
const PlayerAvatarsInfoType = mustLookup("megaman.PlayerAvatarsInfo");
const UpdatePlayerCurrentAvatarRequestType = mustLookup(
  "megaman.UpdatePlayerCurrentAvatarRequest",
);
const GetThirdPartyGameInfoRequestType = mustLookup(
  "megaman.GetThirdPartyGameInfoRequest",
);
const GetThirdPartyGameInfoResponseType = mustLookup(
  "megaman.GetThirdPartyGameInfoResponse",
);

export type PlayerAvatarRowDecoded = {
  avatarID?: string | number;
  avatarUrl?: string;
  goodState?: string;
};

export function decodeListPlayerAvatarsResponseBytes(data: Uint8Array) {
  const msg = ListPlayerAvatarsResponseType.decode(data);
  return ListPlayerAvatarsResponseType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as { avatarsInfo?: PlayerAvatarRowDecoded[] };
}

/** UPDATE_PLAYER_AVATAR(23) response body — `PlayerAvatarsInfo`. */
export function decodePlayerAvatarsInfoBytes(data: Uint8Array) {
  const msg = PlayerAvatarsInfoType.decode(data);
  return PlayerAvatarsInfoType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as PlayerAvatarRowDecoded;
}

export function encodeUpdatePlayerCurrentAvatarRequest(params: {
  avatarID: number | string;
  avatarURL?: string;
  isFBAvatar?: boolean;
}): Uint8Array {
  const payload: Record<string, unknown> = {
    avatarID:
      typeof params.avatarID === "string"
        ? Number(params.avatarID)
        : params.avatarID,
    avatarURL: params.avatarURL ?? "",
    isFBAvatar: params.isFBAvatar ? 1 : 0,
  };
  const err = UpdatePlayerCurrentAvatarRequestType.verify(payload);
  if (err) throw new Error(`UpdatePlayerCurrentAvatarRequest: ${err}`);
  const msg = UpdatePlayerCurrentAvatarRequestType.create(payload);
  return UpdatePlayerCurrentAvatarRequestType.encode(msg).finish();
}

export function encodeGetThirdPartyGameInfoRequest(
  platform: string,
  gameUID: string,
  callbackUrls?: { successUrl?: string; failUrl?: string },
): Uint8Array {
  const payload = {
    platform,
    gameUID,
    successUrl: callbackUrls?.successUrl?.trim() ?? "",
    failUrl: callbackUrls?.failUrl?.trim() ?? "",
  };
  const err = GetThirdPartyGameInfoRequestType.verify(payload);
  if (err) throw new Error(`GetThirdPartyGameInfoRequest: ${err}`);
  const msg = GetThirdPartyGameInfoRequestType.create(payload);
  return GetThirdPartyGameInfoRequestType.encode(msg).finish();
}

export function decodeGetThirdPartyGameInfoRequestForDevLog(
  data: Uint8Array,
): Record<string, unknown> {
  const msg = GetThirdPartyGameInfoRequestType.decode(data);
  return GetThirdPartyGameInfoRequestType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as Record<string, unknown>;
}

export type ThirdPartyGameInfoDecoded = {
  platform?: string;
  gameType?: string;
  gameName?: string;
  gameUID?: string;
  status?: string;
  gameLaunchURL?: string;
};

export function decodeGetThirdPartyGameInfoResponseBytes(data: Uint8Array): {
  thirdPartyGameInfo?: ThirdPartyGameInfoDecoded;
} {
  const msg = GetThirdPartyGameInfoResponseType.decode(data);
  return GetThirdPartyGameInfoResponseType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as { thirdPartyGameInfo?: ThirdPartyGameInfoDecoded };
}
