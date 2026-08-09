import { useMemo } from "react";
import { generateWithdrawMarqueeSeed } from "./redeemWithdrawMarquee";
import { sanitizePillMessages } from "./redeemPillMessages";

const SEED_MESSAGES = generateWithdrawMarqueeSeed();

export function useRedeemPillMessages(
  liveMessages: readonly string[] = [],
): string[] {
  return useMemo(() => {
    const merged = sanitizePillMessages([...liveMessages, ...SEED_MESSAGES]);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const line of merged) {
      if (seen.has(line)) continue;
      seen.add(line);
      unique.push(line);
    }
    return unique.length > 0 ? unique : SEED_MESSAGES;
  }, [liveMessages]);
}
