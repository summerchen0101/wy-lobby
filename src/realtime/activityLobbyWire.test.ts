import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import {
  decodeActivityCollectRewardReqForDevLog,
  decodeGetActivityResponseBytes,
  encodeActivityCollectRewardReqBytes,
  normalizeProtobufInt64MapKey,
} from "./activityLobbyWire";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const ActivityDataType = root.lookup("megaman.ActivityData") as protobuf.Type;
const GetActivityResponseType = root.lookup(
  "megaman.GetActivityResponse",
) as protobuf.Type;

function encodeGetActivityResponseBytesFromActivity(
  activity: protobuf.Message<object>,
): Uint8Array {
  const msg = GetActivityResponseType.create({ activity });
  return Uint8Array.from(GetActivityResponseType.encode(msg).finish());
}

describe("normalizeProtobufInt64MapKey", () => {
  it("converts protobufjs int64 map hash keys to decimal strings", () => {
    const hash = protobuf.util.LongBits.fromNumber(1735689600000, false).toHash();
    expect(normalizeProtobufInt64MapKey(hash)).toBe("1735689600000");
    expect(normalizeProtobufInt64MapKey("1735689600")).toBe("1735689600");
  });
});

describe("decodeGetActivityResponseBytes", () => {
  it("round-trips UserDailyMissionsByDates map<int64, UserDailyMissionsByDate>", () => {
    const dateKeyMs = 1735689600000;
    const activity = ActivityDataType.create({
      activityID: 9001,
      activityType: 5,
      UserDailyMissionsByDates: {
        [dateKeyMs]: {
          date: dateKeyMs,
          userDailyMissions: [
            {
              dailyMissionID: 1001,
              date: dateKeyMs,
              actionTimes: 1,
              achievedActionTimes: 1,
              itemID: 1,
              itemAmount: 10000,
              isCollected: false,
              sort: 0,
            },
          ],
        },
      },
    });

    const { activity: decoded } = decodeGetActivityResponseBytes(
      encodeGetActivityResponseBytesFromActivity(activity),
    );

    expect(decoded?.UserDailyMissionsByDates).toBeDefined();
    const map = decoded!.UserDailyMissionsByDates!;
    expect(Object.keys(map)).toEqual([String(dateKeyMs)]);
    expect(map[String(dateKeyMs)]?.date).toBe(String(dateKeyMs));
    expect(map[String(dateKeyMs)]?.userDailyMissions).toHaveLength(1);
    expect(map[String(dateKeyMs)]?.userDailyMissions?.[0]?.dailyMissionID).toBe(
      "1001",
    );
  });

  it("preserves seconds-based map keys from the wire", () => {
    const dateKeySec = 1735689600;
    const dateMs = 1735689600000;
    const activity = ActivityDataType.create({
      activityID: 9001,
      UserDailyMissionsByDates: {
        [dateKeySec]: {
          date: dateMs,
          userDailyMissions: [
            {
              dailyMissionID: 1,
              date: dateMs,
              actionTimes: 1,
              achievedActionTimes: 1,
              itemID: 1,
              itemAmount: 1,
              isCollected: false,
              sort: 0,
            },
          ],
        },
      },
    });

    const { activity: decoded } = decodeGetActivityResponseBytes(
      encodeGetActivityResponseBytesFromActivity(activity),
    );
    const map = decoded!.UserDailyMissionsByDates!;

    expect(Object.keys(map)).toEqual([String(dateKeySec)]);
    expect(map[String(dateKeySec)]?.date).toBe(String(dateMs));
  });
});

describe("encodeActivityCollectRewardReqBytes", () => {
  it("sends daily mission claims with requiredCreditAmount=0 per API spec", () => {
    const bytes = encodeActivityCollectRewardReqBytes({
      activityID: 42,
      dailyMissionID: 3,
      requiredCreditAmount: 0,
    });
    expect(decodeActivityCollectRewardReqForDevLog(bytes)).toEqual({
      activityID: "42",
      dailyMissionID: "3",
      requiredCreditAmount: "0",
    });
  });

  it("sends cumulative credit claims with dailyMissionID=0 per API spec", () => {
    const bytes = encodeActivityCollectRewardReqBytes({
      activityID: 42,
      dailyMissionID: 0,
      requiredCreditAmount: 8,
    });
    expect(decodeActivityCollectRewardReqForDevLog(bytes)).toEqual({
      activityID: "42",
      dailyMissionID: "0",
      requiredCreditAmount: "8",
    });
  });

  it("defaults unused fields to 0 when omitted", () => {
    const dailyBytes = encodeActivityCollectRewardReqBytes({
      activityID: 42,
      dailyMissionID: 3,
    });
    expect(decodeActivityCollectRewardReqForDevLog(dailyBytes)).toEqual({
      activityID: "42",
      dailyMissionID: "3",
      requiredCreditAmount: "0",
    });

    const creditBytes = encodeActivityCollectRewardReqBytes({
      activityID: 42,
      requiredCreditAmount: 15,
    });
    expect(decodeActivityCollectRewardReqForDevLog(creditBytes)).toEqual({
      activityID: "42",
      dailyMissionID: "0",
      requiredCreditAmount: "15",
    });
  });
});
