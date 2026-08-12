import { describe, expect, it } from "vitest";
import { isSecondaryTabGateExemptRoute } from "./secondaryTabGateRoute";

describe("isSecondaryTabGateExemptRoute", () => {
  it("exempts game popout, legal, and payment callbacks", () => {
    expect(isSecondaryTabGateExemptRoute("/game-popout")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/play")).toBe(false);
    expect(isSecondaryTabGateExemptRoute("/privacy")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/payment/callback")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/redeem/callback")).toBe(true);
    expect(isSecondaryTabGateExemptRoute("/game/callback")).toBe(true);
  });

  it("blocks main lobby routes and /play", () => {
    expect(isSecondaryTabGateExemptRoute("/")).toBe(false);
    expect(isSecondaryTabGateExemptRoute("/play")).toBe(false);
    expect(isSecondaryTabGateExemptRoute("/shop")).toBe(false);
    expect(isSecondaryTabGateExemptRoute("/profile")).toBe(false);
  });
});
