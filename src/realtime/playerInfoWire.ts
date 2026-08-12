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
const PlayerInfoType = mustLookup("megaman.PlayerInfo");

const wireToObjectOpts = {
  longs: String,
  defaults: true,
  enums: String,
} as const;

const DEV_LOG_STRING_MAX = 120;

export type GetPlayerInfoDecoded = {
  playerInfo?: Record<string, unknown>;
};

/**
 * 讀 protobuf varint。不可用 `<<`（超過 32-bit 會壞掉）；type 20 的 field2 長度可到數 MB。
 */
export function readVarint(
  u8: Uint8Array,
  offset: number,
): { value: number; next: number } {
  let value = 0;
  let factor = 1;
  let pos = offset;
  while (pos < u8.byteLength) {
    const b = u8[pos]!;
    pos += 1;
    value += (b & 0x7f) * factor;
    if ((b & 0x80) === 0) return { value, next: pos };
    factor *= 128;
    if (factor > Number.MAX_SAFE_INTEGER) break;
  }
  return { value: 0, next: offset };
}

/** 取出第一個符合 fieldNumber 的 length-delimited payload（不遞迴解內層）。 */
export function extractLengthDelimitedField(
  data: Uint8Array,
  fieldNumber: number,
): Uint8Array | null {
  let pos = 0;
  while (pos < data.byteLength) {
    const { value: tag, next: afterTag } = readVarint(data, pos);
    if (afterTag <= pos) return null;
    pos = afterTag;
    const fn = tag >>> 3;
    const wt = tag & 7;
    if (wt === 0) {
      const r = readVarint(data, pos);
      if (r.next <= pos) return null;
      pos = r.next;
      continue;
    }
    if (wt === 1) {
      pos += 8;
      continue;
    }
    if (wt === 5) {
      pos += 4;
      continue;
    }
    if (wt === 2) {
      const { value: len, next } = readVarint(data, pos);
      if (next <= pos || len < 0 || next + len > data.byteLength) return null;
      pos = next;
      if (fn === fieldNumber) {
        return data.subarray(pos, pos + len);
      }
      pos += len;
      continue;
    }
    // wt 3/4（deprecated group）或非法 wt 6/7：無法安全繼續
    return null;
  }
  return null;
}

/**
 * Gateway type 20 實測：開頭常為小包 field1（Bag），總長遠大於該包 → megaman.GetInfoResponse。
 * 裸 GetPlayerInfoResponse 則 field1（PlayerInfo）通常佔大部分長度。
 */
export function looksLikeGetInfoResponse(data: Uint8Array): boolean {
  if (data.byteLength < 4 || data[0] !== 0x0a) return false;
  const { value: len, next } = readVarint(data, 1);
  if (len <= 0 || next + len > data.byteLength) return false;
  return len < 512 && data.byteLength > next + len + 1024;
}

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

function playerInfoToObject(msg: protobuf.Message): Record<string, unknown> {
  return PlayerInfoType.toObject(msg, wireToObjectOpts) as Record<string, unknown>;
}

function decodeGetPlayerInfoResponseMessage(
  msg: protobuf.Message,
): GetPlayerInfoDecoded {
  return GetPlayerInfoResponseType.toObject(msg, wireToObjectOpts) as GetPlayerInfoDecoded;
}

function decodePlayerInfoBytes(raw: Uint8Array): Record<string, unknown> {
  return playerInfoToObject(PlayerInfoType.decode(raw));
}

/**
 * 只抽 GetInfoResponse.field2（GetPlayerInfoResponse）再解，避開 bag / topSenders 等其餘欄位。
 */
function decodeViaGetInfoResponseField2(data: Uint8Array): GetPlayerInfoDecoded | null {
  const field2 = extractLengthDelimitedField(data, 2);
  if (!field2 || field2.byteLength === 0) return null;

  try {
    return decodeGetPlayerInfoResponseMessage(
      GetPlayerInfoResponseType.decode(field2),
    );
  } catch {
    // field2 若其實是裸 PlayerInfo（少一層），或 GetPlayerInfoResponse 解失敗，改抽 field1
    const inner = extractLengthDelimitedField(field2, 1);
    if (inner && inner.byteLength > 0) {
      try {
        return { playerInfo: decodePlayerInfoBytes(inner) };
      } catch {
        /* fall through */
      }
    }
    try {
      return { playerInfo: decodePlayerInfoBytes(field2) };
    } catch {
      return null;
    }
  }
}

/**
 * 解 Gateway GET_PLAYER_INFO(20) 的 data：
 * - 形如 GetInfoResponse 時只抽 field2，不整包 decode（避免 topSenders 等把 reader 帶歪）
 * - 否則當 GetPlayerInfoResponse
 */
export function decodeGetPlayerInfoResponseBytes(data: Uint8Array): GetPlayerInfoDecoded {
  if (looksLikeGetInfoResponse(data)) {
    const fromField2 = decodeViaGetInfoResponseField2(data);
    if (fromField2?.playerInfo) return fromField2;
  }

  try {
    return decodeGetPlayerInfoResponseMessage(
      GetPlayerInfoResponseType.decode(data),
    );
  } catch (bareErr) {
    const fromField2 = decodeViaGetInfoResponseField2(data);
    if (fromField2?.playerInfo) return fromField2;
    throw bareErr;
  }
}

/** Dev log: decode GetPlayerInfoRequest inner `data` bytes. */
export function decodeGetPlayerInfoRequestForDevLog(
  raw: Uint8Array,
): Record<string, unknown> {
  const msg = GetPlayerInfoRequestType.decode(raw);
  return GetPlayerInfoRequestType.toObject(msg, wireToObjectOpts) as Record<
    string,
    unknown
  >;
}

function previewLongStrings(value: unknown): unknown {
  if (typeof value === "string" && value.length > DEV_LOG_STRING_MAX) {
    return `${value.slice(0, DEV_LOG_STRING_MAX)}…(len=${value.length})`;
  }
  if (Array.isArray(value)) return value.map(previewLongStrings);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = previewLongStrings(v);
    }
    return out;
  }
  return value;
}

/** Dev log: decode type 20 body；超長字串改預覽以免塞爆 console。 */
export function decodeGetPlayerInfoResponseForDevLog(
  raw: Uint8Array,
): Record<string, unknown> {
  const decoded = decodeGetPlayerInfoResponseBytes(raw);
  const wrapped = {
    wire: looksLikeGetInfoResponse(raw) ? "GetInfoResponse" : "GetPlayerInfoResponse",
    ...decoded,
  };
  return previewLongStrings(wrapped) as Record<string, unknown>;
}

/** KYC 證件已上傳（playerInfo.frontImageBase64；對齊 model.proto field 103）。 */
export function hasPlayerFrontImageFromGetPlayerInfo(
  decoded:
    | { playerInfo?: { frontImageBase64?: unknown } }
    | null
    | undefined,
): boolean {
  const p = decoded?.playerInfo;
  if (!p || typeof p !== "object") return false;
  const raw = p.frontImageBase64;
  return typeof raw === "string" && raw.trim().length > 0;
}
