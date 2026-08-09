import { describe, expect, it } from "vitest";
import {
  buildRedeemPaymentReturnUrl,
  parseRedeemPaymentState,
  redeemPaymentReturnPath,
  stripRedeemPaymentStateParam,
} from "./redeemPaymentReturn";

describe("redeemPaymentReturn", () => {
  it("parses paymentState query values", () => {
    expect(parseRedeemPaymentState("1")).toBe(1);
    expect(parseRedeemPaymentState("2")).toBe(2);
    expect(parseRedeemPaymentState("0")).toBeNull();
    expect(parseRedeemPaymentState(null)).toBeNull();
  });

  it("builds redeem return path and URL", () => {
    expect(redeemPaymentReturnPath(1)).toBe("/redeem?paymentState=1");
    expect(buildRedeemPaymentReturnUrl(2, "https://example.com")).toBe(
      "https://example.com/redeem?paymentState=2",
    );
  });

  it("strips paymentState from search params", () => {
    const params = new URLSearchParams("paymentState=1&foo=bar");
    const next = stripRedeemPaymentStateParam(params);
    expect(next.get("paymentState")).toBeNull();
    expect(next.get("foo")).toBe("bar");
  });
});
