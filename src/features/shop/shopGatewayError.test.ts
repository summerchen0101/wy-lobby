import { describe, expect, it } from "vitest";
import { translateShopGatewayError } from "./shopGatewayError";

describe("translateShopGatewayError", () => {
  it("prefers server errMessage over WordData", () => {
    expect(
      translateShopGatewayError("400001", "Product unavailable", "fallback"),
    ).toBe("Product unavailable");
  });

  it("does not show password WordData for generic 400001 in shop", () => {
    expect(
      translateShopGatewayError("400001", null, "Purchase failed (400001)"),
    ).toBe("Purchase failed (400001)");
  });

  it("still maps other WordData codes", () => {
    expect(translateShopGatewayError("400006", null, "fallback")).toBe(
      "Payment failed",
    );
  });
});
