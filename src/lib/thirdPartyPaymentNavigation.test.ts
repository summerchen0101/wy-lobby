import { afterEach, describe, expect, it, vi } from "vitest";
import { navigateToThirdPartyPayment } from "./thirdPartyPaymentNavigation";

describe("navigateToThirdPartyPayment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("assigns same-window navigation for non-empty URL", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    expect(navigateToThirdPartyPayment("https://pay.example/checkout")).toBe(
      true,
    );
    expect(assign).toHaveBeenCalledWith("https://pay.example/checkout");
  });

  it("returns false for empty URL", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    expect(navigateToThirdPartyPayment("  ")).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
