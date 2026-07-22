import * as protobuf from "protobufjs/light.js";
import schema from "../gen/gateway_wire.schema.js";
import { getWord, getWordPlain } from "../wordData/getWord";

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

/** 對應 `UserKickBeforeReason.Reason`，與伺服器 Proto / C# 一致 */
export const USER_KICK_REASON_DEFAULT = 0;
/** 對應 `DuplicateConn` — 另一裝置／重複連線接替 */
export const USER_KICK_REASON_DUPLICATE_CONN = 1;

/**
 * `UserKickBeforeReason.reason`（數字或列舉字串）轉為 0–3；未知或無欄位則為 NaN。
 */
export function userKickReasonOrdinal(
  reason: string | number | undefined,
): number {
  if (reason === undefined) {
    return NaN;
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

  return n;
}

const REASON_NUM_TO_NAME: Record<0 | 1 | 2 | 3, keyof typeof REASON_NAME_TO_NUM> =
  {
    0: "Default",
    1: "DuplicateConn",
    2: "GameIsClose",
    3: "AccountStatusDeleted",
  };

/**
 * wire 上的 reason 是否為已知 enum（0–3 數字，或 OriginalName 字串）。
 * 收到 USER_KICK_BEFORE 且 reason 為已知 enum 時應一律踢出。
 */
export function userKickReasonIsKnownEnum(
  reason: string | number | undefined,
): boolean {
  const ordinal = userKickReasonOrdinal(reason);
  return (
    Number.isFinite(ordinal) &&
    ordinal >= 0 &&
    ordinal <= 3 &&
    REASON_NUM_TO_NAME[ordinal as 0 | 1 | 2 | 3] !== undefined
  );
}

/**
 * 依 `gateway.UserKickBeforeReason.reason` 產生使用者可讀英文訊息（與其他 gateway alert 風格一致）。
 * Reason：Default | DuplicateConn | GameIsClose | AccountStatusDeleted（與伺服器 Proto / C# 枚舉一致）。
 */
export function messageForUserKickReason(
  reason: string | number | undefined,
): string {
  if (reason === undefined) {
    return getWord(401004) || "Please log in again.";
  }

  const n = userKickReasonOrdinal(reason);

  switch (n) {
    case 0:
      return getWordPlain(400023) || getWord(401004) || "Please log in again.";
    case 1:
      return getWord(1019) || "Account repeated login";
    case 2:
      return getWord(400022) || "The game is closed.";
    case 3:
      return getWord(1623) || "This account has been deleted.";
    default:
      return getWord(1018) || getWord(401004) || "Please log in again.";
  }
}
