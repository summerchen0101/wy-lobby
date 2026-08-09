import { describe, expect, it } from "vitest";
import {
  decodeActivityCollectRewardReqForDevLog,
  encodeActivityCollectRewardReqBytes,
} from "./activityLobbyWire";

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
