import { describe, expect, it } from "vitest";
import { isGatewayWsSuppressedRoute } from "./gatewayWsRoute";

describe("gatewayWsRoute", () => {
  it("suppresses WS on legal static routes", () => {
    expect(isGatewayWsSuppressedRoute("/invite-terms")).toBe(true);
    expect(isGatewayWsSuppressedRoute("/privacy")).toBe(true);
    expect(isGatewayWsSuppressedRoute("/terms")).toBe(true);
  });

  it("allows WS on lobby routes", () => {
    expect(isGatewayWsSuppressedRoute("/")).toBe(false);
    expect(isGatewayWsSuppressedRoute("/promo")).toBe(false);
    expect(isGatewayWsSuppressedRoute("/shop")).toBe(false);
  });
});
