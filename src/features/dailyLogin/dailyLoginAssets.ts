import { publicImageUrl } from "../../lib/publicImageUrl";

const DAILY_BONUS = publicImageUrl("/images/shop/daily-bonus");

/** Window-relative day art: day1–day6, day7 uses gc/sc sides. */
export function dailyBonusDayArtSrc(
  dayNumber: number,
  side?: "gc" | "sc",
): string {
  if (dayNumber >= 7) {
    return side === "sc" ? `${DAILY_BONUS}/day7-2.png` : `${DAILY_BONUS}/day7-1.png`;
  }
  const n = Math.min(6, Math.max(1, dayNumber));
  return `${DAILY_BONUS}/day${n}.png`;
}
