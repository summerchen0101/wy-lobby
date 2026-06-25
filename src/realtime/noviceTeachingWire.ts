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

const UpdateNoviceTeachingType = mustLookup("megaman.UpdateNoviceTeaching");

export function encodeUpdateNoviceTeachingRequest(params: {
  userID: number | string;
  noviceTeaching: { general: number };
}): Uint8Array {
  const userID =
    typeof params.userID === "string"
      ? Number(params.userID)
      : params.userID;
  const payload: Record<string, unknown> = {
    userID,
    noviceTeaching: {
      general: params.noviceTeaching.general,
    },
  };
  const err = UpdateNoviceTeachingType.verify(payload);
  if (err) throw new Error(`UpdateNoviceTeaching: ${err}`);
  const msg = UpdateNoviceTeachingType.create(payload);
  return UpdateNoviceTeachingType.encode(msg).finish();
}

export function decodeUpdateNoviceTeachingRequestForDevLog(
  data: Uint8Array,
): Record<string, unknown> {
  const msg = UpdateNoviceTeachingType.decode(data);
  return UpdateNoviceTeachingType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as Record<string, unknown>;
}
