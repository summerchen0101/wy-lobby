import { describe, expect, it } from "vitest";
import { mapListProductToShopPack } from "./mapListProductToShopPack";
import type { ListProductsWireProduct } from "../../realtime/shopLobbyWire";

function makeProduct(
  overrides: Partial<ListProductsWireProduct> = {},
): ListProductsWireProduct {
  return {
    productID: "101",
    originalPrice: "$9.99",
    price: "$4.99",
    paymentTypes: ["11", "14"],
    productContents: [
      { itemID: 1, amount: 600000 },
      { itemID: 2, amount: 50000 },
    ],
    vipExp: 0,
    ...overrides,
  };
}

describe("mapListProductToShopPack", () => {
  it("maps vipExp from wire product", () => {
    const pack = mapListProductToShopPack(makeProduct({ vipExp: 1500 }));
    expect(pack.vipExp).toBe(1500);
  });

  it("defaults vipExp to 0 when missing", () => {
    const pack = mapListProductToShopPack(makeProduct({ vipExp: 0 }));
    expect(pack.vipExp).toBe(0);
  });

  it("maps GC label and bonus SC", () => {
    const pack = mapListProductToShopPack(makeProduct());
    expect(pack.gcLabel).toBe("600K");
    expect(pack.bonusSc).toBe(5);
    expect(pack.price).toBe("$4.99");
  });
});
