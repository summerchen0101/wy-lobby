import { describe, expect, it } from "vitest";
import { translateShopGatewayError } from "./shopGatewayError";

describe("translateShopGatewayError", () => {
  it("prefers server errMessage", () => {
    expect(
      translateShopGatewayError("400001", "Product unavailable", "fallback"),
    ).toBe("Product unavailable");
  });

  it("falls back when errMessage missing", () => {
    expect(
      translateShopGatewayError("400001", null, "Purchase failed (400001)"),
    ).toBe("Purchase failed (400001)");
    expect(translateShopGatewayError("400006", null, "Payment failed")).toBe(
      "Payment failed",
    );
  });
});
