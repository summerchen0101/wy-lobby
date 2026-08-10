import type { VipLevelBonusItem } from "../realtime/walletGetLobbyWire";

export const VIP_LEVEL_UP_DEV_PREVIEW_EVENT = "ffgt:vip-level-up:dev-preview";

type DevBonusInput = {
  vipLevel?: number;
  gcAmount?: number | string;
  scAmount?: number | string;
  /** Alias for gcAmount (console shorthand). */
  gc?: number | string;
  /** Alias for scAmount (console shorthand). */
  sc?: number | string;
};

const DEFAULT_DEV_VIP_BONUS: VipLevelBonusItem = {
  vipLevel: 6,
  gcAmountWire: "100000",
  scAmountWire: "100000",
};

function parseDevBonusEntry(raw: string): VipLevelBonusItem | null {
  const parts = raw.trim().split(":");
  if (parts.length < 3) return null;
  const vipLevel = Number(parts[0]);
  if (!Number.isFinite(vipLevel)) return null;
  const gcAmountWire = String(parts[1] ?? "").trim().replace(/,/g, "");
  const scAmountWire = String(parts[2] ?? "").trim().replace(/,/g, "");
  if (!/^\d+$/.test(gcAmountWire) || !/^\d+$/.test(scAmountWire)) return null;
  if (gcAmountWire === "0" && scAmountWire === "0") return null;
  return {
    vipLevel: Math.floor(vipLevel),
    gcAmountWire,
    scAmountWire,
  };
}

/** Dev-only: `vip:gc:sc` entries comma-separated, e.g. `2:50000:25000,5:200000:100000`. */
export function getDevVipLevelBonusList(): VipLevelBonusItem[] | null {
  if (!import.meta.env.DEV) return null;
  const raw = (import.meta.env.VITE_DEV_WALLET_GET_VIP_BONUS ?? "").trim();
  if (!raw) return null;
  const items = raw
    .split(",")
    .map(parseDevBonusEntry)
    .filter((item): item is VipLevelBonusItem => item !== null);
  return items.length > 0 ? items.sort((a, b) => a.vipLevel - b.vipLevel) : null;
}

export function dispatchVipLevelUpDevPreview(bonuses: VipLevelBonusItem[]): void {
  window.dispatchEvent(
    new CustomEvent(VIP_LEVEL_UP_DEV_PREVIEW_EVENT, {
      detail: { bonuses },
    }),
  );
}

function normalizeDevBonusInput(input: DevBonusInput): VipLevelBonusItem | null {
  const vipLevel = Number(input.vipLevel);
  if (!Number.isFinite(vipLevel)) return null;
  const gcRaw = input.gcAmount ?? input.gc ?? 0;
  const scRaw = input.scAmount ?? input.sc ?? 0;
  const gcAmountWire = String(gcRaw).trim().replace(/,/g, "");
  const scAmountWire = String(scRaw).trim().replace(/,/g, "");
  if (!/^\d+$/.test(gcAmountWire) || !/^\d+$/.test(scAmountWire)) return null;
  if (gcAmountWire === "0" && scAmountWire === "0") return null;
  return {
    vipLevel: Math.floor(vipLevel),
    gcAmountWire,
    scAmountWire,
  };
}

function resolveDevPreviewBonuses(
  bonuses?: DevBonusInput[],
): VipLevelBonusItem[] | null {
  if (bonuses && bonuses.length > 0) {
    const normalized = bonuses
      .map(normalizeDevBonusInput)
      .filter((item): item is VipLevelBonusItem => item !== null)
      .sort((a, b) => a.vipLevel - b.vipLevel);
    if (normalized.length > 0) return normalized;
  }
  const fromEnv = getDevVipLevelBonusList();
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return [DEFAULT_DEV_VIP_BONUS];
}

export type VipLevelUpDevApi = {
  preview: (bonuses?: DevBonusInput[]) => void;
  reset: () => void;
  mockBonuses: () => VipLevelBonusItem[] | null;
};

declare global {
  interface Window {
    __ffgtDevVipLevelUp?: VipLevelUpDevApi;
  }
}

export function installVipLevelUpDevMock(resetShown: () => void): void {
  if (!import.meta.env.DEV) return;

  const api: VipLevelUpDevApi = {
    preview: (bonuses) => {
      resetShown();
      const list = resolveDevPreviewBonuses(bonuses);
      if (!list || list.length === 0) {
        console.warn(
          "[dev][vip-level-up] preview() needs bonuses, VITE_DEV_WALLET_GET_VIP_BONUS, or use " +
            "preview({ vipLevel: 6, gc: 100000, sc: 100000 })",
        );
        return;
      }
      dispatchVipLevelUpDevPreview(list);
      console.info("[dev][vip-level-up] preview()", list);
    },
    reset: () => {
      resetShown();
      console.info("[dev][vip-level-up] reset()");
    },
    mockBonuses: () => getDevVipLevelBonusList(),
  };

  window.__ffgtDevVipLevelUp = api;
}
