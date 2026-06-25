import type { VipDataRow } from "./vipData";
import { VIP_DATA, VIP_DATA_BY_VIPLV } from "./vipData";
import { VIP_BENEFIT_WORD_DATA } from "./vipBenefitWordData";
import { resolveProfileVipTitle } from "./profileVipTitle";

export const VIP_LEVEL_COUNT = VIP_DATA.length;
export const VIP_MIN_LEVEL = 0;
export const VIP_MAX_LEVEL = VIP_LEVEL_COUNT - 1;

export function parseVipWordDataIds(raw: number | string): number[] {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? [Math.floor(raw)] : [];
  }
  return raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => Number.isFinite(id));
}

export function vipRowForLevel(vipLevel: number): VipDataRow | undefined {
  if (!Number.isFinite(vipLevel)) return undefined;
  return VIP_DATA_BY_VIPLV.get(Math.floor(vipLevel));
}

export function resolveVipBenefits(row: VipDataRow | undefined): string[] {
  if (!row) return [];
  return parseVipWordDataIds(row.WordDataIDs)
    .map((id) => VIP_BENEFIT_WORD_DATA[id])
    .filter((text): text is string => Boolean(text?.trim()));
}

export function clampVipViewLevel(vipLevel: number | undefined): number {
  const level = Number.isFinite(vipLevel) ? Math.floor(vipLevel!) : VIP_MIN_LEVEL;
  return Math.min(VIP_MAX_LEVEL, Math.max(VIP_MIN_LEVEL, level));
}

export function isVipLevelUpBonusClaimed(
  displayedLevel: number,
  playerVipLevel: number | undefined,
): boolean {
  const playerLevel = clampVipViewLevel(playerVipLevel);
  return displayedLevel <= playerLevel;
}

/** Compact reward label (e.g. 50K, 1M). */
export function formatVipRewardCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) {
    const x = n / 1_000_000;
    const s = (Math.round(x * 10) / 10).toString();
    return `${s.replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    const x = n / 1000;
    const s = (Math.round(x * 10) / 10).toString();
    return `${s.replace(/\.0$/, "")}K`;
  }
  return String(Math.floor(n));
}

export function formatVipPoints(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.floor(n).toLocaleString("en-US");
}

export function vipTitleForLevel(vipLevel: number): string {
  return resolveProfileVipTitle(vipLevel);
}
