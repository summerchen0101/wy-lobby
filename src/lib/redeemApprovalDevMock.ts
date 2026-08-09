export const REDEEM_APPROVAL_DEV_PREVIEW_EVENT = "ffgt:redeem-approval:dev-preview";

/** Dev-only: comma-separated wire SC amounts, e.g. `1000000` or `500000,1200000`. */
export function getDevRedeemApprovalAmountsWire(): string[] | null {
  if (!import.meta.env.DEV) return null;
  const raw = (import.meta.env.VITE_DEV_WALLET_GET_REDEEM_SC_LIST ?? "").trim();
  if (!raw) return null;
  return raw
    .split(",")
    .map((v) => v.trim().replace(/,/g, ""))
    .filter((v) => /^\d+$/.test(v));
}

export function isRedeemApprovalDevMockEnabled(): boolean {
  return getDevRedeemApprovalAmountsWire() !== null;
}

export function dispatchRedeemApprovalDevPreview(amountsWire: string[]): void {
  window.dispatchEvent(
    new CustomEvent(REDEEM_APPROVAL_DEV_PREVIEW_EVENT, {
      detail: { amountsWire },
    }),
  );
}

export type RedeemApprovalDevApi = {
  preview: (amountsWire?: string[]) => void;
  reset: () => void;
  mockAmounts: () => string[] | null;
};

declare global {
  interface Window {
    __ffgtDevRedeemApproval?: RedeemApprovalDevApi;
  }
}

export function installRedeemApprovalDevMock(
  resetShown: () => void,
): void {
  if (!import.meta.env.DEV) return;

  const api: RedeemApprovalDevApi = {
    preview: (amountsWire) => {
      const list =
        amountsWire && amountsWire.length > 0
          ? amountsWire
          : getDevRedeemApprovalAmountsWire();
      if (!list || list.length === 0) {
        console.warn(
          "[dev][redeem-approval] preview() needs amounts or VITE_DEV_WALLET_GET_REDEEM_SC_LIST",
        );
        return;
      }
      dispatchRedeemApprovalDevPreview(list);
      console.info("[dev][redeem-approval] preview()", list);
    },
    reset: () => {
      resetShown();
      console.info("[dev][redeem-approval] reset()");
    },
    mockAmounts: () => getDevRedeemApprovalAmountsWire(),
  };

  window.__ffgtDevRedeemApproval = api;
}
