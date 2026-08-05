import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingShopOrder,
  createPendingShopOrder,
  isPaymentPushFailure,
  paymentPushFailureMessage,
  persistPendingShopOrder,
  readPendingShopOrder,
  SHOP_PENDING_ORDER_STORAGE_KEY,
  shouldAcceptPaymentComplete,
} from "./shopPaymentSession";
import type { ShopPack } from "./types";

function installSessionStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  });
}

const samplePack: ShopPack = {
  id: "pack-1",
  productID: "1001",
  gcLabel: "12M",
  bonusSc: 60,
  price: "$59.99",
  originalPrice: "$59.99",
  coinPile: 3,
  paymentTypes: ["14"],
  vipExp: 100,
};

afterEach(() => {
  clearPendingShopOrder();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  installSessionStorageMock();
});

describe("shopPaymentSession", () => {
  it("persists and reads pending shop order from sessionStorage", () => {
    const order = createPendingShopOrder("order-abc", samplePack, 1_700_000_000);
    persistPendingShopOrder(order);
    expect(readPendingShopOrder()).toEqual(order);
  });

  it("clears pending shop order", () => {
    persistPendingShopOrder(createPendingShopOrder("order-abc", samplePack));
    clearPendingShopOrder();
    expect(sessionStorage.getItem(SHOP_PENDING_ORDER_STORAGE_KEY)).toBeNull();
    expect(readPendingShopOrder()).toBeNull();
  });

  it("returns null for invalid persisted payload", () => {
    sessionStorage.setItem(
      SHOP_PENDING_ORDER_STORAGE_KEY,
      JSON.stringify({ orderID: "", pack: samplePack, startedAt: 1 }),
    );
    expect(readPendingShopOrder()).toBeNull();
  });

  it("detects payment push failure from errorMsg or reason", () => {
    expect(isPaymentPushFailure({ errorMsg: "failed" })).toBe(true);
    expect(isPaymentPushFailure({ reason: "declined" })).toBe(true);
    expect(isPaymentPushFailure({ errorMsg: "", reason: "" })).toBe(false);
  });

  it("builds payment push failure message with fallback", () => {
    expect(paymentPushFailureMessage({ errorMsg: "Card declined" })).toBe(
      "Card declined",
    );
    expect(paymentPushFailureMessage({ reason: "Timeout" })).toBe("Timeout");
    expect(paymentPushFailureMessage({})).toBe("Payment failed");
  });

  it("dedupes payment completion handling", () => {
    expect(shouldAcceptPaymentComplete(false)).toBe(true);
    expect(shouldAcceptPaymentComplete(true)).toBe(false);
  });
});
