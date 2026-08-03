import type { User } from "../../lib/api/types";
import { VIP_MAX_LEVEL } from "./vipHelpers";

const VIP_PROGRESS_FALLBACK_MAX = 500;

export type ProfileVipProgress = {
  useServerVipBar: boolean;
  isMaxLevel: boolean;
  current: number;
  required: number;
  fillPct: number;
};

function isVipMaxLevel(vipLevel: number | undefined): boolean {
  if (vipLevel === undefined || !Number.isFinite(vipLevel)) return false;
  return Math.floor(vipLevel) >= VIP_MAX_LEVEL;
}

export function profileVipProgress(
  user:
    | Pick<
        User,
        "vipLevel" | "vipCurrentLevelExp" | "vipCurrentLevelExpRequired"
      >
    | null
    | undefined,
): ProfileVipProgress {
  const expReq = user?.vipCurrentLevelExpRequired;
  const expCurrent = user?.vipCurrentLevelExp;
  const isMaxLevel = isVipMaxLevel(user?.vipLevel);

  if (isMaxLevel) {
    return {
      useServerVipBar: true,
      isMaxLevel: true,
      current: 0,
      required: 0,
      fillPct: 100,
    };
  }

  const useServerVipBar = expReq !== undefined && expReq > 0;
  const required = useServerVipBar ? expReq! : VIP_PROGRESS_FALLBACK_MAX;
  const current = useServerVipBar
    ? Math.min(expReq!, Math.max(0, expCurrent ?? 0))
    : 0;
  const fillPct = useServerVipBar
    ? Math.min(100, Math.round(((expCurrent ?? 0) / expReq!) * 100))
    : 0;
  return {
    useServerVipBar,
    isMaxLevel: false,
    current,
    required,
    fillPct,
  };
}
