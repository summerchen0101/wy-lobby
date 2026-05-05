import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/gateway_wire.schema.js";
import {
  decodeUserKickBeforeReasonBytes,
  messageForUserKickReason,
  userKickLikelyStaleSurvivorConnNoise,
  userKickReasonOrdinal,
} from "./userKickWire";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const UserKickBeforeReasonPb = root.lookupType(
  "gateway.UserKickBeforeReason",
) as protobuf.Type;

describe("decodeUserKickBeforeReasonBytes", () => {
  function encodeReason(reason: number): Uint8Array {
    const fields = { reason };
    const err = UserKickBeforeReasonPb.verify(fields);
    if (err) throw new Error(err);
    return Uint8Array.from(
      UserKickBeforeReasonPb.encode(
        UserKickBeforeReasonPb.create(fields),
      ).finish(),
    );
  }

  it("解碼各 reason 數值", () => {
    for (const n of [0, 1, 2, 3] as const) {
      const raw = encodeReason(n);
      expect(decodeUserKickBeforeReasonBytes(raw)?.reason).toBeDefined();
    }
  });

  it("空 bytes 回 null", () => {
    expect(decodeUserKickBeforeReasonBytes(new Uint8Array(0))).toBeNull();
  });
});

describe("messageForUserKickReason", () => {
  it("依數值與列舉名稱對應文案", () => {
    expect(messageForUserKickReason(0)).toContain("session ended");
    expect(messageForUserKickReason(1)).toContain("another device");
    expect(messageForUserKickReason(2)).toContain("game is closed");
    expect(messageForUserKickReason(3)).toContain("deleted");
    expect(messageForUserKickReason("DuplicateConn")).toContain("another device");
    expect(messageForUserKickReason("GameIsClose")).toContain("game is closed");
    expect(messageForUserKickReason("AccountStatusDeleted")).toContain(
      "deleted",
    );
    expect(messageForUserKickReason("Default")).toContain("session ended");
  });

  it("undefined 為通用登入提示", () => {
    expect(messageForUserKickReason(undefined)).toBe("Please log in again.");
  });
});

describe("userKickReasonOrdinal", () => {
  it("對應 0–3 與列舉名", () => {
    expect(userKickReasonOrdinal(1)).toBe(1);
    expect(userKickReasonOrdinal("DuplicateConn")).toBe(1);
    expect(Number.isNaN(userKickReasonOrdinal(undefined))).toBe(true);
  });
});

describe("userKickLikelyStaleSurvivorConnNoise", () => {
  it("僅對 Default／Duplicate／NaN 視為接替端無害類型", () => {
    expect(userKickLikelyStaleSurvivorConnNoise(Number.NaN)).toBe(true);
    expect(userKickLikelyStaleSurvivorConnNoise(0)).toBe(true);
    expect(userKickLikelyStaleSurvivorConnNoise(1)).toBe(true);
    expect(userKickLikelyStaleSurvivorConnNoise(2)).toBe(false);
    expect(userKickLikelyStaleSurvivorConnNoise(3)).toBe(false);
  });
});
