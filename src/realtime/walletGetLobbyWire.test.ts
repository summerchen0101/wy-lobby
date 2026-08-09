import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import {
  decodeWalletGetResponseBytes,
  encodeWalletGetRequestBytes,
  encodeWalletGetResponseBytes,
  parseRedeemSCList,
  parseSubsidyAmount,
} from "./walletGetLobbyWire";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const WalletGetResponsePb = root.lookupType(
  "megaman.WalletGetResponse",
) as protobuf.Type;

describe("encodeWalletGetRequestBytes", () => {
  it("encodes GC walletType as 1", () => {
    const raw = encodeWalletGetRequestBytes("GC");
    const reqPb = root.lookupType("megaman.WalletGetRequest") as protobuf.Type;
    const decoded = reqPb.decode(raw);
    const o = reqPb.toObject(decoded, { enums: Number }) as {
      walletType: number;
    };
    expect(o.walletType).toBe(1);
  });

  it("encodes SC walletType as 2", () => {
    const raw = encodeWalletGetRequestBytes("SC");
    const reqPb = root.lookupType("megaman.WalletGetRequest") as protobuf.Type;
    const decoded = reqPb.decode(raw);
    const o = reqPb.toObject(decoded, { enums: Number }) as {
      walletType: number;
    };
    expect(o.walletType).toBe(2);
  });
});

describe("decodeWalletGetResponseBytes", () => {
  it("decodes subsidyAmount field 2", () => {
    const msg = WalletGetResponsePb.create({ subsidyAmount: 100000 });
    const raw = Uint8Array.from(WalletGetResponsePb.encode(msg).finish());
    const decoded = decodeWalletGetResponseBytes(raw);
    expect(parseSubsidyAmount(decoded.subsidyAmount)).toBe(100000);
  });

  it("defaults subsidyAmount to 0 when absent", () => {
    const msg = WalletGetResponsePb.create({});
    const raw = Uint8Array.from(WalletGetResponsePb.encode(msg).finish());
    const decoded = decodeWalletGetResponseBytes(raw);
    expect(parseSubsidyAmount(decoded.subsidyAmount)).toBe(0);
  });

  it("decodes redeemSCList field 3", () => {
    const msg = WalletGetResponsePb.create({
      redeemSCList: ["1000000", "2500000"],
    });
    const raw = Uint8Array.from(WalletGetResponsePb.encode(msg).finish());
    const decoded = decodeWalletGetResponseBytes(raw);
    expect(parseRedeemSCList(decoded.redeemSCList)).toEqual([
      "1000000",
      "2500000",
    ]);
  });
});

describe("encodeWalletGetResponseBytes", () => {
  it("round-trips subsidyAmount", () => {
    const raw = encodeWalletGetResponseBytes(100000);
    const decoded = decodeWalletGetResponseBytes(raw);
    expect(parseSubsidyAmount(decoded.subsidyAmount)).toBe(100000);
  });
});

describe("parseRedeemSCList", () => {
  it("filters invalid entries", () => {
    expect(parseRedeemSCList(["100", "bad", "200"])).toEqual(["100", "200"]);
    expect(parseRedeemSCList(null)).toEqual([]);
  });
});

describe("parseSubsidyAmount", () => {
  it("handles string and large values", () => {
    expect(parseSubsidyAmount("100000")).toBe(100000);
    expect(parseSubsidyAmount(0)).toBe(0);
    expect(parseSubsidyAmount(undefined)).toBe(0);
    expect(parseSubsidyAmount("not-a-number")).toBe(0);
  });
});
