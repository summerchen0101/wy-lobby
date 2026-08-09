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

const DeletePlayerInfoReqType = mustLookup("megaman.DeletePlayerInfoReq");

/** 對齊 proto/megaman/playerinfo.proto OAuthProvider.PROVIDER_MEGA */
export const OAUTH_PROVIDER_MEGA = 1;

export function encodeDeletePlayerInfoRequest(params: {
  accessToken: string;
  provider?: number;
}): Uint8Array {
  const payload: Record<string, unknown> = {
    privoder: params.provider ?? OAUTH_PROVIDER_MEGA,
    accessToken: params.accessToken.trim(),
  };
  const err = DeletePlayerInfoReqType.verify(payload);
  if (err) throw new Error(`DeletePlayerInfoReq: ${err}`);
  const msg = DeletePlayerInfoReqType.create(payload);
  return DeletePlayerInfoReqType.encode(msg).finish();
}

export function decodeDeletePlayerInfoRequestForDevLog(
  data: Uint8Array,
): Record<string, unknown> {
  const msg = DeletePlayerInfoReqType.decode(data);
  return DeletePlayerInfoReqType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as Record<string, unknown>;
}
