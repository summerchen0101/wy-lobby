import type { PaymentPushWire } from "../../realtime/shopLobbyWire";
import type { ShopPack } from "./types";

export const SHOP_PENDING_ORDER_STORAGE_KEY = "shop-pending-order";

export type PendingShopOrder = {
  orderID: string;
  pack: ShopPack;
  startedAt: number;
};

function isShopPack(value: unknown): value is ShopPack {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.productID === "string" &&
    typeof o.gcLabel === "string" &&
    typeof o.bonusSc === "number" &&
    typeof o.price === "string" &&
    typeof o.originalPrice === "string" &&
    typeof o.coinPile === "number" &&
    Array.isArray(o.paymentTypes) &&
    typeof o.vipExp === "number"
  );
}

export function persistPendingShopOrder(order: PendingShopOrder): void {
  try {
    sessionStorage.setItem(
      SHOP_PENDING_ORDER_STORAGE_KEY,
      JSON.stringify(order),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPendingShopOrder(): PendingShopOrder | null {
  try {
    const raw = sessionStorage.getItem(SHOP_PENDING_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingShopOrder>;
    if (
      typeof parsed.orderID !== "string" ||
      !parsed.orderID.trim() ||
      typeof parsed.startedAt !== "number" ||
      !Number.isFinite(parsed.startedAt) ||
      !isShopPack(parsed.pack)
    ) {
      return null;
    }
    return {
      orderID: parsed.orderID.trim(),
      pack: parsed.pack,
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingShopOrder(): void {
  try {
    sessionStorage.removeItem(SHOP_PENDING_ORDER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isPaymentPushFailure(push: PaymentPushWire): boolean {
  const err = String(push.errorMsg ?? "").trim();
  const reason = String(push.reason ?? "").trim();
  return Boolean(err || reason);
}

export function paymentPushFailureMessage(push: PaymentPushWire): string {
  const err = String(push.errorMsg ?? "").trim();
  const reason = String(push.reason ?? "").trim();
  return err || reason || "Payment failed";
}

/** Returns true when this completion event should be handled (first success only). */
export function shouldAcceptPaymentComplete(alreadyHandled: boolean): boolean {
  return !alreadyHandled;
}

export function createPendingShopOrder(
  orderID: string,
  pack: ShopPack,
  startedAt = Date.now(),
): PendingShopOrder {
  return {
    orderID: orderID.trim(),
    pack,
    startedAt,
  };
}
