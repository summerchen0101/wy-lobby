export const REDEEM_PENDING_ORDER_STORAGE_KEY = "redeem-pending-order";

export type PendingRedeemOrder = {
  withdrawOrderUID: string;
  pickAmount: string;
  paymentUrl: string;
  startedAt: number;
};

export function persistPendingRedeemOrder(order: PendingRedeemOrder): void {
  try {
    sessionStorage.setItem(
      REDEEM_PENDING_ORDER_STORAGE_KEY,
      JSON.stringify(order),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPendingRedeemOrder(): PendingRedeemOrder | null {
  try {
    const raw = sessionStorage.getItem(REDEEM_PENDING_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingRedeemOrder>;
    if (
      typeof parsed.withdrawOrderUID !== "string" ||
      typeof parsed.pickAmount !== "string" ||
      typeof parsed.paymentUrl !== "string" ||
      typeof parsed.startedAt !== "number" ||
      !Number.isFinite(parsed.startedAt)
    ) {
      return null;
    }
    return {
      withdrawOrderUID: parsed.withdrawOrderUID,
      pickAmount: parsed.pickAmount,
      paymentUrl: parsed.paymentUrl,
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingRedeemOrder(): void {
  try {
    sessionStorage.removeItem(REDEEM_PENDING_ORDER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function createPendingRedeemOrder(
  withdrawOrderUID: string,
  pickAmount: string,
  paymentUrl: string,
  startedAt = Date.now(),
): PendingRedeemOrder {
  return {
    withdrawOrderUID: withdrawOrderUID.trim() || "—",
    pickAmount: pickAmount.trim(),
    paymentUrl: paymentUrl.trim(),
    startedAt,
  };
}
