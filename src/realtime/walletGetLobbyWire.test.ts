import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import {
  decodeWalletGetResponseBytes,
  decodeWalletGetRequestForDevLog,
  decodeWalletGetResponseForDevLog,
  encodeWalletGetRequestBytes,
  encodeWalletGetResponseBytes,
  parseRedeemSCList,
  parseSubsidyAmount,
  parseVipLevelBonusList,
} from "./walletGetLobbyWire";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const WalletGetResponsePb = root.lookupType(
  "megaman.WalletGetResponse",
) as protobuf.Type;
const WalletGetResponseRedeemSCPb = root.lookupType(
  "megaman.WalletGetResponseRedeemSC",
) as protobuf.Type;
const WalletGetResponseVIPLevelBonusPb = root.lookupType(
  "megaman.WalletGetResponseVIPLevelBonus",
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

  it("decodes redeemSCList field 5", () => {
    const msg = WalletGetResponsePb.create({
      redeemSCList: [
        WalletGetResponseRedeemSCPb.create({ scAmount: 1000000 }),
        WalletGetResponseRedeemSCPb.create({ scAmount: 2500000 }),
      ],
    });
    const raw = Uint8Array.from(WalletGetResponsePb.encode(msg).finish());
    const decoded = decodeWalletGetResponseBytes(raw);
    expect(parseRedeemSCList(decoded.redeemSCList)).toEqual([
      "1000000",
      "2500000",
    ]);
  });

  it("decodes vipLevelBonusList field 3 and sorts by vipLevel", () => {
    const msg = WalletGetResponsePb.create({
      vipLevelBonusList: [
        WalletGetResponseVIPLevelBonusPb.create({
          vipLevel: 5,
          gcAmount: 200000,
          scAmount: 100000,
        }),
        WalletGetResponseVIPLevelBonusPb.create({
          vipLevel: 2,
          gcAmount: 50000,
          scAmount: 25000,
        }),
      ],
    });
    const raw = Uint8Array.from(WalletGetResponsePb.encode(msg).finish());
    const decoded = decodeWalletGetResponseBytes(raw);
    expect(parseVipLevelBonusList(decoded.vipLevelBonusList)).toEqual([
      { vipLevel: 2, gcAmountWire: "50000", scAmountWire: "25000" },
      { vipLevel: 5, gcAmountWire: "200000", scAmountWire: "100000" },
    ]);
  });
});

describe("decodeWalletGetRequestForDevLog", () => {
  it("labels GC and SC wallet types", () => {
    expect(
      decodeWalletGetRequestForDevLog(encodeWalletGetRequestBytes("GC")),
    ).toMatchObject({ walletType: "GC" });
    expect(
      decodeWalletGetRequestForDevLog(encodeWalletGetRequestBytes("SC")),
    ).toMatchObject({ walletType: "SC" });
  });
});

describe("decodeWalletGetResponseForDevLog", () => {
  it("returns parsed lobby extras for dev console", () => {
    const msg = WalletGetResponsePb.create({
      subsidyAmount: 100000,
      redeemSCList: [WalletGetResponseRedeemSCPb.create({ scAmount: 1000000 })],
      vipLevelBonusList: [
        WalletGetResponseVIPLevelBonusPb.create({
          vipLevel: 6,
          gcAmount: 100000,
          scAmount: 100000,
        }),
      ],
    });
    const raw = Uint8Array.from(WalletGetResponsePb.encode(msg).finish());
    expect(decodeWalletGetResponseForDevLog(raw)).toEqual({
      subsidyAmount: 100000,
      vipLevelBonusList: [
        { vipLevel: 6, gcAmountWire: "100000", scAmountWire: "100000" },
      ],
      redeemSCList: ["1000000"],
      reKYC: false,
      hasBag: false,
    });
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

  it("parses message entries from field 5", () => {
    expect(
      parseRedeemSCList([
        { scAmount: "100" },
        { scAmount: 0 },
        { scAmount: "200" },
      ]),
    ).toEqual(["100", "200"]);
  });
});

describe("parseVipLevelBonusList", () => {
  it("returns empty for null or empty input", () => {
    expect(parseVipLevelBonusList(null)).toEqual([]);
    expect(parseVipLevelBonusList([])).toEqual([]);
  });

  it("skips entries with zero gc and sc", () => {
    expect(
      parseVipLevelBonusList([
        { vipLevel: 1, gcAmount: 0, scAmount: 0 },
        { vipLevel: 2, gcAmount: 100, scAmount: 0 },
      ]),
    ).toEqual([{ vipLevel: 2, gcAmountWire: "100", scAmountWire: "0" }]);
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
