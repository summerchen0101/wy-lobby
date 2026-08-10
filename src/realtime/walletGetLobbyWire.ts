import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import type { ActiveWallet } from "../wallet/walletContext";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`lobby wire: missing message type ${name}`);
  }
  return t;
}

const WalletGetRequestType = mustLookup("megaman.WalletGetRequest");
const WalletGetResponseType = mustLookup("megaman.WalletGetResponse");

export type VipLevelBonusItem = {
  vipLevel: number;
  gcAmountWire: string;
  scAmountWire: string;
};

export type WalletGetResponseDecoded = {
  bag?: Record<string, unknown>;
  subsidyAmount?: string | number;
  vipLevelBonusList?: Array<{
    vipLevel?: string | number;
    gcAmount?: string | number;
    scAmount?: string | number;
  }>;
  reKYC?: boolean;
  redeemSCList?: Array<{
    scAmount?: string | number;
  }>;
};

/** WalletType.GC = 1, SC = 2 */
export function encodeWalletGetRequestBytes(
  activeWallet: ActiveWallet,
): Uint8Array {
  const walletType = activeWallet === "SC" ? 2 : 1;
  const err = WalletGetRequestType.verify({ walletType });
  if (err) throw new Error(`WalletGetRequest: ${err}`);
  const msg = WalletGetRequestType.create({ walletType });
  return Uint8Array.from(WalletGetRequestType.encode(msg).finish());
}

export function decodeWalletGetResponseBytes(
  data: Uint8Array,
): WalletGetResponseDecoded {
  const msg = WalletGetResponseType.decode(data);
  return WalletGetResponseType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as WalletGetResponseDecoded;
}

function normalizeWireInteger(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null) return "0";
  const s = String(raw).trim().replace(/,/g, "");
  return /^\d+$/.test(s) ? s : "0";
}

export function parseRedeemSCList(
  raw:
    | WalletGetResponseDecoded["redeemSCList"]
    | string[]
    | undefined
    | null,
): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return normalizeWireInteger(entry);
      }
      if (entry && typeof entry === "object") {
        return normalizeWireInteger(entry.scAmount);
      }
      return "0";
    })
    .filter((v) => v !== "0" && /^\d+$/.test(v));
}

export function parseVipLevelBonusList(
  raw: WalletGetResponseDecoded["vipLevelBonusList"] | undefined | null,
): VipLevelBonusItem[] {
  if (!Array.isArray(raw)) return [];
  const items: VipLevelBonusItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const vipLevel = Number(normalizeWireInteger(entry.vipLevel));
    if (!Number.isFinite(vipLevel)) continue;
    const gcAmountWire = normalizeWireInteger(entry.gcAmount);
    const scAmountWire = normalizeWireInteger(entry.scAmount);
    if (gcAmountWire === "0" && scAmountWire === "0") continue;
    items.push({
      vipLevel: Math.floor(vipLevel),
      gcAmountWire,
      scAmountWire,
    });
  }
  return items.sort((a, b) => a.vipLevel - b.vipLevel);
}

export function parseSubsidyAmount(
  raw: string | number | undefined | null,
): number {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : 0;
}

export function encodeWalletGetResponseBytes(subsidyAmount: number): Uint8Array {
  const err = WalletGetResponseType.verify({ subsidyAmount });
  if (err) throw new Error(`WalletGetResponse: ${err}`);
  const msg = WalletGetResponseType.create({ subsidyAmount });
  return Uint8Array.from(WalletGetResponseType.encode(msg).finish());
}
