import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import { wireUInt64Field } from "./wireUint64";
import { withdrawOrderPaymentStatusToLabel } from "../wordData/withdrawStatusWordData";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`withdraw wire: missing message type ${name}`);
  }
  return t;
}

const ListWithdrawOrdersReqType = mustLookup("megaman.ListWithdrawOrdersReq");
const ListWithdrawOrdersRespType = mustLookup("megaman.ListWithdrawOrdersResp");
const CreateWithdrawOrderReqType = mustLookup("megaman.CreateWithdrawOrderReq");
const CreateWithdrawOrderRespType = mustLookup(
  "megaman.CreateWithdrawOrderResp",
);
const CancelRedeemOrderReqType = mustLookup("megaman.CancelRedeemOrderReq");
const CancelRedeemOrderRespType = mustLookup("megaman.CancelRedeemOrderResp");
const WithdrawSuccessPushType = mustLookup("megaman.WithdrawSuccessPush");

/** @deprecated 新第三方提現改由 paymentURL 頁選方式；保留供舊 wire 測試參考。 */
export const WITHDRAW_PAYMENT_TYPE_REC = {
  PayPal: 13,
  CreditCard: 14,
  CashAPP: 15,
  ACH: 16,
} as const;

/** megaman WithdrawOrderPaymentStatus（對齊 payment.proto 0–8） */
export const WITHDRAW_ORDER_PAYMENT_STATUS = {
  Unknown: 0,
  Reviewing: 1,
  Passed: 2,
  Rejected: 3,
  Proccessing: 4,
  Success: 5,
  Failed: 6,
  ExpirationRejected: 7,
  Canceled: 8,
} as const;

/** megaman ListWithdrawOrdersReq.withdrawOrderPaymentStatusIn（對齊 payment.proto 0–8） */
export const ALL_WITHDRAW_ORDER_PAYMENT_STATUSES: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8,
];

const wireToObjectOpts = {
  longs: String,
  defaults: true,
  enums: String,
} as const;

export { withdrawOrderPaymentStatusToLabel } from "../wordData/withdrawStatusWordData";

export function encodeListWithdrawOrdersRequestBytes(
  userId: bigint | number | string,
  page: number,
  perPage: number,
): Uint8Array {
  const msg = {
    userIDIn: [wireUInt64Field(userId)],
    withdrawOrderPaymentStatusIn: [...ALL_WITHDRAW_ORDER_PAYMENT_STATUSES],
    startedAtTimestampMillisecond: 0,
    endedAtTimestampMillisecond: 0,
    page: Math.floor(page),
    perPage: Math.floor(perPage),
  };
  const err = ListWithdrawOrdersReqType.verify(msg);
  if (err) throw new Error(`ListWithdrawOrdersReq: ${err}`);
  const created = ListWithdrawOrdersReqType.create(msg);
  return Uint8Array.from(ListWithdrawOrdersReqType.encode(created).finish());
}

export type WithdrawOrderWireRow = {
  withdrawOrderUID: string;
  amount: string;
  fee: string;
  withdrawOrderPaymentStatus: number;
  statusLabel: string;
  remark: string;
  createdAtTimestampMillisecond: string;
  uuu: string;
};

export type ListWithdrawOrdersWireResult = {
  orders: WithdrawOrderWireRow[];
  total: string;
};

function parseWithdrawOrderStatusCode(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === "string") {
    const t = raw.trim();
    if (/^\d+$/.test(t)) return Number(t);
    const byName: Record<string, number> = {
      UnknownWithdrawOrderPaymentStatus: 0,
      Reviewing: 1,
      Passed: 2,
      Rejected: 3,
      Proccessing: 4,
      Processing: 4,
      Success: 5,
      Failed: 6,
      ExpirationRejected: 7,
      Canceled: 8,
    };
    if (byName[t] !== undefined) return byName[t];
  }
  return 0;
}

export function decodeListWithdrawOrdersResponseBytes(
  data: Uint8Array,
): ListWithdrawOrdersWireResult {
  const msg = ListWithdrawOrdersRespType.decode(data);
  const o = ListWithdrawOrdersRespType.toObject(msg, wireToObjectOpts) as {
    total?: string | number;
    withdrawOrders?: Array<{
      withdrawOrderUID?: string;
      amount?: string | number;
      fee?: string | number;
      withdrawOrderPaymentStatus?: string | number;
      remark?: string;
      createdAtTimestampMillisecond?: string | number;
      uuu?: string;
    }>;
  };
  const rows = o.withdrawOrders ?? [];
  const orders: WithdrawOrderWireRow[] = rows.map((row) => {
    const st = row.withdrawOrderPaymentStatus;
    const statusCode = parseWithdrawOrderStatusCode(st);
    return {
      withdrawOrderUID: String(row.withdrawOrderUID ?? ""),
      amount: String(row.amount ?? ""),
      fee: String(row.fee ?? ""),
      withdrawOrderPaymentStatus: statusCode,
      statusLabel: withdrawOrderPaymentStatusToLabel(st),
      remark: String(row.remark ?? "").trim(),
      createdAtTimestampMillisecond: String(
        row.createdAtTimestampMillisecond ?? "",
      ),
      uuu: String(row.uuu ?? "").trim(),
    };
  });
  const totalRaw = o.total;
  const total =
    totalRaw !== undefined && totalRaw !== null ? String(totalRaw) : "0";
  return { orders, total };
}

export type CreateWithdrawOrderWireFields = {
  userID: bigint | number | string;
  /** 整數 SC 字串（megaman amount 為 string，後端萬分之一單位） */
  amount: bigint | number | string;
  successUrl?: string;
  failUrl?: string;
};

function amountToWireString(amount: bigint | number | string): string {
  if (typeof amount === "bigint") return amount.toString();
  if (typeof amount === "number" && Number.isFinite(amount))
    return String(Math.trunc(amount));
  const t = String(amount ?? "")
    .trim()
    .replace(/,/g, "");
  return t;
}

export function encodeCreateWithdrawOrderRequestBytes(
  fields: CreateWithdrawOrderWireFields,
): Uint8Array {
  const amtStr = amountToWireString(fields.amount);
  const uid = wireUInt64Field(fields.userID);
  const msg: Record<string, unknown> = {
    userID: uid,
    amount: amtStr,
    paymentType: 0,
    successUrl: fields.successUrl?.trim() ?? "",
    failUrl: fields.failUrl?.trim() ?? "",
  };
  const err = CreateWithdrawOrderReqType.verify(msg);
  if (err) throw new Error(`CreateWithdrawOrderReq: ${err}`);
  const created = CreateWithdrawOrderReqType.create(msg);
  return Uint8Array.from(CreateWithdrawOrderReqType.encode(created).finish());
}

export type CreateWithdrawOrderWireResult = {
  withdrawOrderUID: string;
  paymentURL: string;
};

export function decodeCreateWithdrawOrderResponseBytes(
  data: Uint8Array,
): CreateWithdrawOrderWireResult {
  const msg = CreateWithdrawOrderRespType.decode(data);
  const o = CreateWithdrawOrderRespType.toObject(msg, wireToObjectOpts) as {
    withdrawOrderUID?: string;
    paymentURL?: string;
  };
  return {
    withdrawOrderUID: String(o.withdrawOrderUID ?? ""),
    paymentURL: String(o.paymentURL ?? "").trim(),
  };
}

export function encodeCancelRedeemOrderRequestBytes(
  redeemOrderUID: string,
): Uint8Array {
  const uid = redeemOrderUID.trim();
  const err = CancelRedeemOrderReqType.verify({ redeemOrderUID: uid });
  if (err) throw new Error(`CancelRedeemOrderReq: ${err}`);
  const created = CancelRedeemOrderReqType.create({ redeemOrderUID: uid });
  return Uint8Array.from(CancelRedeemOrderReqType.encode(created).finish());
}

export function decodeCancelRedeemOrderResponseBytes(
  data: Uint8Array,
): Record<string, unknown> {
  if (!(data instanceof Uint8Array) || data.byteLength === 0) return {};
  const msg = CancelRedeemOrderRespType.decode(data);
  return CancelRedeemOrderRespType.toObject(msg, wireToObjectOpts) as Record<
    string,
    unknown
  >;
}

export type WithdrawSuccessPushWire = {
  userID?: string;
  nickname: string;
  /** Proto `actualAmount` string：整數 SC 原始單位（與 Lobby bag 一致，見 {@link SC_POINT_SCALE}）。 */
  actualAmountWire: string;
};

export function decodeWithdrawSuccessPushBytes(
  data: Uint8Array,
): WithdrawSuccessPushWire | null {
  if (!(data instanceof Uint8Array) || data.byteLength === 0) return null;
  try {
    const msg = WithdrawSuccessPushType.decode(data);
    const o = WithdrawSuccessPushType.toObject(msg, wireToObjectOpts) as {
      userID?: string | number;
      nickname?: string;
      actualAmount?: string | number;
    };
    const uidRaw = o.userID;
    const userID =
      uidRaw !== undefined && uidRaw !== null ? String(uidRaw) : undefined;
    const nick = String(o.nickname ?? "").trim();
    const amtRaw = o.actualAmount;
    let amtStr =
      typeof amtRaw === "string"
        ? amtRaw.trim()
        : amtRaw !== undefined && amtRaw !== null
          ? String(amtRaw)
          : "";
    amtStr = amtStr.replace(/,/g, "");
    if (!/^\d+$/.test(amtStr)) return null;
    try {
      void BigInt(amtStr);
    } catch {
      return null;
    }
    return {
      userID,
      nickname: nick || "Someone",
      actualAmountWire: amtStr,
    };
  } catch {
    return null;
  }
}

export function decodeListWithdrawOrdersRequestForDevLog(
  raw: Uint8Array,
): Record<string, unknown> {
  const msg = ListWithdrawOrdersReqType.decode(raw);
  return ListWithdrawOrdersReqType.toObject(msg, wireToObjectOpts) as Record<
    string,
    unknown
  >;
}

export function decodeCreateWithdrawOrderRequestForDevLog(
  raw: Uint8Array,
): Record<string, unknown> {
  const msg = CreateWithdrawOrderReqType.decode(raw);
  return CreateWithdrawOrderReqType.toObject(msg, wireToObjectOpts) as Record<
    string,
    unknown
  >;
}

export function decodeCancelRedeemOrderRequestForDevLog(
  raw: Uint8Array,
): Record<string, unknown> {
  const msg = CancelRedeemOrderReqType.decode(raw);
  return CancelRedeemOrderReqType.toObject(msg, wireToObjectOpts) as Record<
    string,
    unknown
  >;
}
