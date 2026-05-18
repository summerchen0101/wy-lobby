import * as protobuf from "protobufjs/light.js";
import { formatWalletScAmountForDisplay } from "../wallet/formatWalletAmount";
import schema from "../gen/lobby_wire.schema.js";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`lobby wire: missing message type ${name}`);
  }
  return t;
}

const GetReferralInfoRespType = mustLookup("megaman.GetReferralInfoResp");
const ClaimReferralRewardRespType = mustLookup(
  "megaman.ClaimReferralRewardResp",
);

export type ReferralRewardDecoded = {
  walletType?: string;
  amount?: string | number;
};

export type ReferralInfoDecoded = {
  rewards?: ReferralRewardDecoded[];
  DepositThreshold?: string;
  CurrencyCode?: string;
};

export type GetReferralInfoRespDecoded = {
  referralInfo?: ReferralInfoDecoded;
  myReferrerCode?: { value?: string };
  registerReferredCnt?: string | number;
  qualifiedReferredCnt?: string | number;
};

export function decodeGetReferralInfoRespBytes(
  data: Uint8Array,
): GetReferralInfoRespDecoded {
  const msg = GetReferralInfoRespType.decode(data);
  return GetReferralInfoRespType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as GetReferralInfoRespDecoded;
}

export function decodeClaimReferralRewardRespBytes(data: Uint8Array): {
  rewards?: ReferralRewardDecoded[];
} {
  const msg = ClaimReferralRewardRespType.decode(data);
  return ClaimReferralRewardRespType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as { rewards?: ReferralRewardDecoded[] };
}

function parseWireInt64(v: string | number | undefined): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** GC：後端 amount 直接顯示（不除以 10000）。 */
export function referralGcDisplayAmount(
  rewards: ReferralRewardDecoded[] | undefined,
): number | null {
  if (!rewards?.length) return null;
  const row = rewards.find((r) => r.walletType === "GC");
  return parseWireInt64(row?.amount);
}

/** SC：amount / 10000 後顯示。 */
export function referralScDisplayAmount(
  rewards: ReferralRewardDecoded[] | undefined,
): number | null {
  if (!rewards?.length) return null;
  const row = rewards.find((r) => r.walletType === "SC");
  const raw = parseWireInt64(row?.amount);
  if (raw === null) return null;
  return raw / 10000;
}

/** ClaimReferralReward / proto：有回傳列即視為「有 rewards 資料」（空 repeated 為 []）。 */
export function hasReferralRewardEntries(
  rewards: ReferralRewardDecoded[] | undefined,
): boolean {
  return Array.isArray(rewards) && rewards.length > 0;
}

export function formatReferralRewardAmountsForMessage(
  rewards: ReferralRewardDecoded[] | undefined,
): string {
  const gc = referralGcDisplayAmount(rewards);
  const sc = referralScDisplayAmount(rewards);
  const parts: string[] = [];
  if (gc !== null) parts.push(`${gc} GC`);
  if (sc !== null)
    parts.push(`${formatWalletScAmountForDisplay(sc)} SC`);
  return parts.length ? parts.join(", ") : "Rewards claimed";
}

/** Toast文案：541 回應 `rewards` 非空時，明確標示取得的 GC / SC。 */
export function formatClaimedReferralRewardsMessage(
  rewards: ReferralRewardDecoded[] | undefined,
): string {
  const gc = referralGcDisplayAmount(rewards);
  const sc = referralScDisplayAmount(rewards);
  const parts: string[] = [];
  if (gc !== null) parts.push(`${gc} GC`);
  if (sc !== null)
    parts.push(`${formatWalletScAmountForDisplay(sc)} SC`);
  if (parts.length === 1) return `You received ${parts[0]}.`;
  if (parts.length === 2) return `You received ${parts[0]} and ${parts[1]}.`;
  return "You received rewards.";
}
