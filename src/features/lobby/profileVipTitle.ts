import { VIP_DATA_BY_VIPLV } from "./vipData";
import { VIP_TITLE_WORD_DATA } from "./vipWordData";

const FALLBACK_TITLE = "—";

export function resolveProfileVipTitle(vipLevel?: number): string {
  if (vipLevel === undefined || !Number.isFinite(vipLevel)) {
    return FALLBACK_TITLE;
  }

  const row = VIP_DATA_BY_VIPLV.get(Math.floor(vipLevel));
  if (!row) {
    return FALLBACK_TITLE;
  }

  return VIP_TITLE_WORD_DATA[row.Name] ?? FALLBACK_TITLE;
}
