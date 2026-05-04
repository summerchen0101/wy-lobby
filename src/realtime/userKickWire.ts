import * as protobuf from "protobufjs/light.js";
import schema from "../gen/gateway_wire.schema.js";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`user kick wire: missing message type ${name}`);
  }
  return t;
}

const UserKickBeforeReasonType = mustLookup("gateway.UserKickBeforeReason");

const wireToObjectOpts = {
  longs: String,
  defaults: true,
  enums: String,
} as const;

export type UserKickBeforeReasonWire = {
  reason?: string | number;
};

/**
 * 解 Gateway `USER_KICK_BEFORE` 之 `data` bytes。失敗時回 null。
 */
export function decodeUserKickBeforeReasonBytes(
  raw: Uint8Array,
): UserKickBeforeReasonWire | null {
  if (!(raw instanceof Uint8Array) || raw.byteLength === 0) return null;
  try {
    const decoded = UserKickBeforeReasonType.decode(raw);
    return UserKickBeforeReasonType.toObject(
      decoded,
      wireToObjectOpts,
    ) as UserKickBeforeReasonWire;
  } catch {
    return null;
  }
}

const REASON_NAME_TO_NUM: Record<string, 0 | 1 | 2 | 3> = {
  Default: 0,
  DuplicateConn: 1,
  GameIsClose: 2,
  AccountStatusDeleted: 3,
};

/**
 * 依 UserKickBeforeReason.reason 產生使用者可讀英文訊息（與其他 gateway alert 風格一致）。
 */
export function messageForUserKickReason(
  reason: string | number | undefined,
): string {
  if (reason === undefined) {
    return "Please log in again.";
  }

  let n: number;
  if (typeof reason === "number" && Number.isFinite(reason)) {
    n = reason;
  } else if (typeof reason === "string") {
    const trimmed = reason.trim();
    if (trimmed in REASON_NAME_TO_NUM) {
      n = REASON_NAME_TO_NUM[trimmed as keyof typeof REASON_NAME_TO_NUM];
    } else {
      const parsed = Number(trimmed);
      n = Number.isFinite(parsed) ? parsed : NaN;
    }
  } else {
    n = NaN;
  }

  switch (n) {
    case 0:
      return "Your session ended. Please log in again.";
    case 1:
      return "This account was signed in on another device. Please log in again.";
    case 2:
      return "The game is closed. Please log in again later.";
    case 3:
      return "This account has been deleted.";
    default:
      return "Please log in again.";
  }
}
