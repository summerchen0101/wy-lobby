import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import { decodeWithdrawSuccessPushBytes } from "./withdrawLobbyWire";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const WithdrawSuccessPushPb = root.lookupType(
  "megaman.WithdrawSuccessPush",
) as protobuf.Type;

describe("decodeWithdrawSuccessPushBytes", () => {
  function encodePush(fields: {
    userID: string | number;
    actualAmount: string;
    nickname: string;
  }): Uint8Array {
    const err = WithdrawSuccessPushPb.verify(fields);
    if (err) throw new Error(err);
    return Uint8Array.from(
      WithdrawSuccessPushPb.encode(WithdrawSuccessPushPb.create(fields)).finish(),
    );
  }

  it("解碼 megaman.WithdrawSuccessPush 並保留 actualAmountWire 字串", () => {
    const raw = encodePush({
      userID: 99,
      actualAmount: "750000",
      nickname: "Alice",
    });
    const got = decodeWithdrawSuccessPushBytes(raw);
    expect(got).toEqual({
      userID: "99",
      nickname: "Alice",
      actualAmountWire: "750000",
    });
  });

  it("空暱稱時 fallback Someone", () => {
    const raw = encodePush({
      userID: 1,
      actualAmount: "10000",
      nickname: "",
    });
    const got = decodeWithdrawSuccessPushBytes(raw);
    expect(got?.nickname).toBe("Someone");
    expect(got?.actualAmountWire).toBe("10000");
  });

  it("非整數 actualAmount 時回傳 null", () => {
    const raw = encodePush({
      userID: 1,
      actualAmount: "10.5",
      nickname: "x",
    });
    expect(decodeWithdrawSuccessPushBytes(raw)).toBeNull();
  });
});
