import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import {
  decodeCancelRedeemOrderRequestForDevLog,
  decodeCreateWithdrawOrderRequestForDevLog,
  decodeCreateWithdrawOrderResponseBytes,
  decodeListWithdrawOrdersRequestForDevLog,
  decodeListWithdrawOrdersResponseBytes,
  decodeWithdrawSuccessPushBytes,
  encodeCancelRedeemOrderRequestBytes,
  encodeCreateWithdrawOrderRequestBytes,
  encodeListWithdrawOrdersRequestBytes,
} from "./withdrawLobbyWire";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const WithdrawSuccessPushPb = root.lookupType(
  "megaman.WithdrawSuccessPush",
) as protobuf.Type;

describe("encodeListWithdrawOrdersRequestBytes", () => {
  it("帶入 userIDIn 與分頁欄位", () => {
    const raw = encodeListWithdrawOrdersRequestBytes(
      "2046952017814859776",
      1,
      4,
    );
    const o = decodeListWithdrawOrdersRequestForDevLog(raw);
    expect(o.userIDIn).toEqual(["2046952017814859776"]);
    expect(o.page).toBe("1");
    expect(o.perPage).toBe("4");
  });
});

describe("encodeCreateWithdrawOrderRequestBytes", () => {
  it("僅送 userID、amount 與 callback URLs", () => {
    const raw = encodeCreateWithdrawOrderRequestBytes({
      userID: "99",
      amount: "500000",
      successUrl: "https://example.com/redeem/callback?state=1",
      failUrl: "https://example.com/redeem/callback?state=2",
    });
    const o = decodeCreateWithdrawOrderRequestForDevLog(raw);
    expect(o.userID).toBe("99");
    expect(o.amount).toBe("500000");
    expect(String(o.paymentType)).toBe("0");
    expect(o.successUrl).toBe(
      "https://example.com/redeem/callback?state=1",
    );
    expect(o.failUrl).toBe("https://example.com/redeem/callback?state=2");
  });
});

const CreateWithdrawOrderRespPb = root.lookupType(
  "megaman.CreateWithdrawOrderResp",
) as protobuf.Type;
const ListWithdrawOrdersRespPb = root.lookupType(
  "megaman.ListWithdrawOrdersResp",
) as protobuf.Type;

describe("decodeListWithdrawOrdersResponseBytes", () => {
  it("解碼 createdAt、remark、uuu 與狀態碼", () => {
    const raw = Uint8Array.from(
      ListWithdrawOrdersRespPb.encode(
        ListWithdrawOrdersRespPb.create({
          total: "1",
          withdrawOrders: [
            {
              withdrawOrderUID: "wd-99",
              amount: "999",
              fee: "0.15",
              withdrawOrderPaymentStatus: 3,
              createdAtTimestampMillisecond: "1700000000000",
              remark: "> 60 Minutes",
              uuu: "https://pay.example/order/wd-99",
            },
          ],
        }),
      ).finish(),
    );
    const { orders, total } = decodeListWithdrawOrdersResponseBytes(raw);
    expect(total).toBe("1");
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      withdrawOrderUID: "wd-99",
      amount: "999",
      fee: "0.15",
      withdrawOrderPaymentStatus: 3,
      remark: "> 60 Minutes",
      createdAtTimestampMillisecond: "1700000000000",
      uuu: "https://pay.example/order/wd-99",
    });
    expect(orders[0]?.statusLabel).toBeTruthy();
  });
});

describe("encodeCancelRedeemOrderRequestBytes", () => {
  it("帶入 redeemOrderUID", () => {
    const raw = encodeCancelRedeemOrderRequestBytes("wd-cancel-1");
    const o = decodeCancelRedeemOrderRequestForDevLog(raw);
    expect(o.redeemOrderUID).toBe("wd-cancel-1");
  });
});

describe("decodeCreateWithdrawOrderResponseBytes", () => {
  it("解碼 withdrawOrderUID 與 paymentURL", () => {
    const raw = Uint8Array.from(
      CreateWithdrawOrderRespPb.encode(
        CreateWithdrawOrderRespPb.create({
          withdrawOrderUID: "wd-1",
          paymentURL: "https://pay.example/abc",
        }),
      ).finish(),
    );
    expect(decodeCreateWithdrawOrderResponseBytes(raw)).toEqual({
      withdrawOrderUID: "wd-1",
      paymentURL: "https://pay.example/abc",
    });
  });
});

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
