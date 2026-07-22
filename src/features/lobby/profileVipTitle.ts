import { VIP_DATA_BY_VIPLV } from "./vipData";
import { getWord } from "../../wordData/getWord";

const FALLBACK_TITLE = "—";

export function resolveProfileVipTitle(vipLevel?: number): string {
  if (vipLevel === undefined || !Number.isFinite(vipLevel)) {
    return FALLBACK_TITLE;
  }

  const row = VIP_DATA_BY_VIPLV.get(Math.floor(vipLevel));
  if (!row) {
    return FALLBACK_TITLE;
  }

  const title = getWord(row.Name);
  return title || FALLBACK_TITLE;
}
