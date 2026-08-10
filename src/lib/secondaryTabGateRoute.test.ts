import { describe, expect, it } from "vitest";
import { isSecondaryTabGateExemptRoute } from "./secondaryTabGateRoute";

describe("isSecondaryTabGateExemptRoute", () => {
  it("exempts game popout, play, legal, and payment callbacks", () => {
    expect(isSecondaryTabGateExemptRoute("/game-popout")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/play")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/privacy")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/payment/callback")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/redeem/callback")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/game/callback")).toBe(true);
  });

  it("blocks main lobby routes", () => {
    expect(isSecondaryTabGateExemptRoute("/")).toBe(false);
    expect(isSecondaryTabGateExemptRoute("/shop")).toBe(false);
    expect(isSecondaryTabGateExemptRoute("/profile")).toBe(false);
  });
});
