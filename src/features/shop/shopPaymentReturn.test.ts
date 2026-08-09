import { describe, expect, it } from "vitest";
import {
  buildShopPaymentReturnUrl,
  parseShopPaymentState,
  shopPaymentReturnPath,
  stripShopPaymentStateParam,
} from "./shopPaymentReturn";

describe("shopPaymentReturn", () => {
  it("parses paymentState query values", () => {
    expect(parseShopPaymentState("1")).toBe(1);
    expect(parseShopPaymentState("2")).toBe(2);
    expect(parseShopPaymentState(" 1 ")).toBe(1);
    expect(parseShopPaymentState(null)).toBeNull();
    expect(parseShopPaymentState("0")).toBeNull();
  });

  it("builds shop return path and URL", () => {
    expect(shopPaymentReturnPath(1)).toBe("/shop?paymentState=1");
    expect(buildShopPaymentReturnUrl(1, "https://example.com")).toBe(
      "https://example.com/shop?paymentState=1",
    );
  });

  it("strips paymentState from search params", () => {
    const params = new URLSearchParams("paymentState=1&foo=bar");
    const next = stripShopPaymentStateParam(params);
    expect(next.get("paymentState")).toBeNull();
    expect(next.get("foo")).toBe("bar");
  });
});
