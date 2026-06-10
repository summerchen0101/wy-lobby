import type { User } from "../../lib/api/types";

const VIP_PROGRESS_FALLBACK_MAX = 500;

export type ProfileVipProgress = {
  useServerVipBar: boolean;
  current: number;
  required: number;
  fillPct: number;
};

export function profileVipProgress(
  user:
    | Pick<User, "vipCurrentLevelExp" | "vipCurrentLevelExpRequired">
    | null
    | undefined,
): ProfileVipProgress {
  const expReq = user?.vipCurrentLevelExpRequired;
  const expCurrent = user?.vipCurrentLevelExp;
  const useServerVipBar = expReq !== undefined && expReq > 0;
  const required = useServerVipBar ? expReq! : VIP_PROGRESS_FALLBACK_MAX;
  const current = useServerVipBar
    ? Math.min(expReq!, Math.max(0, expCurrent ?? 0))
    : 0;
  const fillPct = useServerVipBar
    ? Math.min(100, Math.round(((expCurrent ?? 0) / expReq!) * 100))
    : 0;
  return { useServerVipBar, current, required, fillPct };
}
