/** From docs/每日登入.docx — GC daily bonus multipliers by VIP level (V0–V15). */
export const DAILY_LOGIN_GC_VIP_MULTIPLIERS = [
  1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.7, 2, 3, 5, 10,
] as const;

/** From docs/每日登入.docx — SC daily bonus multipliers by VIP level (V0–V15). */
export const DAILY_LOGIN_SC_VIP_MULTIPLIERS = [
  1, 1, 1, 1, 1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.2, 1.2, 1.2, 1.5, 1.5, 2.5,
] as const;

export function dailyLoginVipMultiplier(
  wallet: "GC" | "SC",
  vipLevel: number,
): number {
  const table =
    wallet === "SC"
      ? DAILY_LOGIN_SC_VIP_MULTIPLIERS
      : DAILY_LOGIN_GC_VIP_MULTIPLIERS;
  const idx = Math.min(
    Math.max(0, Math.floor(vipLevel)),
    table.length - 1,
  );
  return table[idx] ?? 1;
}

export function applyDailyLoginVipBonus(
  itemAmount: number,
  itemID: number,
  vipLevel: number,
): number {
  const wallet = itemID === 2 ? "SC" : "GC";
  const multiplier = dailyLoginVipMultiplier(wallet, vipLevel);
  return Math.floor(itemAmount * multiplier);
}
