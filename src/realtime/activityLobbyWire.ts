import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import { wireUInt64Field } from "./wireUint64";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`activity wire: missing message type ${name}`);
  }
  return t;
}

const ListActivitiesRequestType = mustLookup("megaman.ListActivitiesRequest");
const ListActivitiesResponseType = mustLookup("megaman.ListActivitiesResponse");
const GetActivityRequestType = mustLookup("megaman.GetActivityRequest");
const GetActivityResponseType = mustLookup("megaman.GetActivityResponse");
const ActivityCollectRewardReqType = mustLookup(
  "megaman.ActivityCollectRewardReq",
);
const ActivityCollectRewardRespType = mustLookup(
  "megaman.ActivityCollectRewardResp",
);

export type UserDailyMissionDecoded = {
  activityID?: string | number;
  dailyMissionID?: string | number;
  date?: string | number;
  dailyMissionType?: number;
  gameIDs?: Array<string | number>;
  minVIPLevel?: string | number;
  actionTimes?: string | number;
  minBetAmount?: string | number;
  minGainAmount?: string | number;
  totalBetAmount?: string | number;
  totalGainAmount?: string | number;
  creditAmount?: string | number;
  itemID?: string | number;
  itemAmount?: string | number;
  achievedActionTimes?: string | number;
  achievedBetAmount?: string | number;
  achievedGainAmount?: string | number;
  isCollected?: boolean;
  sort?: string | number;
};

export type UserDailyMissionsByDateDecoded = {
  date?: string | number;
  userDailyMissions?: UserDailyMissionDecoded[];
};

export type DailyMissionCreditRewardDecoded = {
  requiredCreditAmount?: string | number;
  itemID?: string | number;
  itemAmount?: string | number;
  isCollected?: boolean;
};

export type ActivityDataDecoded = {
  activityID?: string | number;
  activityType?: string | number;
  activityName?: string;
  sort?: string | number;
  displayStartTime?: string | number;
  displayEndTime?: string | number;
  dailyMissionCreditRewards?: DailyMissionCreditRewardDecoded[];
  UserDailyMissionsByDates?: Record<string, UserDailyMissionsByDateDecoded>;
  achievedCreditAmount?: string | number;
};

export type ListActivitiesResponseDecoded = {
  activities?: ActivityDataDecoded[];
};

export type GetActivityResponseDecoded = {
  activity?: ActivityDataDecoded;
};

const toObjectOpts = {
  longs: String,
  defaults: true,
  enums: String,
} as const;

export function encodeListActivitiesRequestBytes(): Uint8Array {
  const msg = ListActivitiesRequestType.create({});
  return Uint8Array.from(ListActivitiesRequestType.encode(msg).finish());
}

export function decodeListActivitiesResponseBytes(
  data: Uint8Array,
): ListActivitiesResponseDecoded {
  const msg = ListActivitiesResponseType.decode(data);
  return ListActivitiesResponseType.toObject(
    msg,
    toObjectOpts,
  ) as ListActivitiesResponseDecoded;
}

export function encodeGetActivityRequestBytes(
  activityID: bigint | number | string,
): Uint8Array {
  const msg = GetActivityRequestType.create({
    activityID: wireUInt64Field(activityID),
  });
  return Uint8Array.from(GetActivityRequestType.encode(msg).finish());
}

export function decodeGetActivityResponseBytes(
  data: Uint8Array,
): GetActivityResponseDecoded {
  const msg = GetActivityResponseType.decode(data);
  return GetActivityResponseType.toObject(
    msg,
    toObjectOpts,
  ) as GetActivityResponseDecoded;
}

export type ActivityCollectRewardFields = {
  activityID: bigint | number | string;
  /** Daily mission claim: mission id; cumulative claim: 0 per API spec. */
  dailyMissionID?: bigint | number | string;
  /** Cumulative credit claim: threshold; daily claim: 0 per API spec. */
  requiredCreditAmount?: bigint | number | string;
};

export function encodeActivityCollectRewardReqBytes(
  fields: ActivityCollectRewardFields,
): Uint8Array {
  const msg = ActivityCollectRewardReqType.create({
    activityID: wireUInt64Field(fields.activityID),
    dailyMissionID: wireUInt64Field(fields.dailyMissionID ?? 0),
    requiredCreditAmount: wireUInt64Field(fields.requiredCreditAmount ?? 0),
  });
  return Uint8Array.from(ActivityCollectRewardReqType.encode(msg).finish());
}

export function decodeActivityCollectRewardRespBytes(data: Uint8Array): Record<
  string,
  never
> {
  const msg = ActivityCollectRewardRespType.decode(data);
  return ActivityCollectRewardRespType.toObject(msg, toObjectOpts) as Record<
    string,
    never
  >;
}

export function decodeGetActivityRequestForDevLog(
  raw: Uint8Array,
): Record<string, unknown> {
  const msg = GetActivityRequestType.decode(raw);
  return GetActivityRequestType.toObject(msg, toObjectOpts) as Record<
    string,
    unknown
  >;
}

export function decodeActivityCollectRewardReqForDevLog(
  raw: Uint8Array,
): Record<string, unknown> {
  const msg = ActivityCollectRewardReqType.decode(raw);
  return ActivityCollectRewardReqType.toObject(msg, toObjectOpts) as Record<
    string,
    unknown
  >;
}

export const DAILY_SIGN_IN_ACTIVITY_TYPE = "DailySignIn";

export function isDailySignInActivityType(
  activityType: string | number | undefined,
): boolean {
  if (activityType === undefined || activityType === null) return false;
  const s = String(activityType);
  return s === DAILY_SIGN_IN_ACTIVITY_TYPE || s === "5";
}

export function parseWireInt64(v: string | number | undefined): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Wire int64 timestamps may arrive as seconds or milliseconds. */
export function normalizeWireTimestampToMs(
  v: string | number | undefined,
): number | null {
  const n = parseWireInt64(v);
  if (n === null || n <= 0) return null;
  if (n < 1_000_000_000_000) return n * 1000;
  return n;
}

/** Activity display window fields are documented as Unix seconds. */
export function normalizeWireTimestampToSec(
  v: string | number | undefined,
): number | null {
  const n = parseWireInt64(v);
  if (n === null || n <= 0) return null;
  if (n >= 1_000_000_000_000) return Math.floor(n / 1000);
  return n;
}

export function itemIdToWalletLabel(itemID: number): "GC" | "SC" {
  return itemID === 2 ? "SC" : "GC";
}

export function formatItemAmountForDisplay(
  itemID: number,
  itemAmount: number,
): number {
  if (itemID === 2) return itemAmount / 10000;
  return itemAmount;
}
