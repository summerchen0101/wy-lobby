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

export type WalletGetResponseDecoded = {
  bag?: Record<string, unknown>;
  subsidyAmount?: string | number;
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
