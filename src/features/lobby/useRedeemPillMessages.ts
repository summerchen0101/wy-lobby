import { useMemo } from "react";
import { sanitizePillMessages } from "./redeemPillMessages";

export function useRedeemPillMessages(
  liveMessages: readonly string[] = [],
): string[] {
  return useMemo(
    () => sanitizePillMessages([...liveMessages]),
    [liveMessages],
  );
}
