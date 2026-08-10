import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearWalletGetLobbyExtrasCacheForTests,
  fetchWalletGetLobbyExtras,
} from "./walletGetGateway";
import { encodeWalletGetResponseBytes } from "./walletGetLobbyWire";
import type { GatewayWsRequestFn } from "./gatewayWs";

describe("fetchWalletGetLobbyExtras", () => {
  beforeEach(() => {
    clearWalletGetLobbyExtrasCacheForTests();
    vi.stubEnv("VITE_DEV_WALLET_GET_SUBSIDY", "");
    vi.stubEnv("VITE_DEV_WALLET_GET_REDEEM_SC_LIST", "");
    vi.stubEnv("VITE_DEV_WALLET_GET_VIP_BONUS", "");
  });

  it("dedupes concurrent requests into one gateway call", async () => {
    const request = vi.fn<GatewayWsRequestFn>(async () => ({
      code: "200",
      data: encodeWalletGetResponseBytes(100000),
    }));

    const [a, b] = await Promise.all([
      fetchWalletGetLobbyExtras(request),
      fetchWalletGetLobbyExtras(request),
    ]);

    expect(request).toHaveBeenCalledTimes(1);
    expect(a.subsidyAmount).toBe(100000);
    expect(b.subsidyAmount).toBe(100000);
  });

  it("coalesces sequential calls within the cache window", async () => {
    const request = vi.fn<GatewayWsRequestFn>(async () => ({
      code: "200",
      data: encodeWalletGetResponseBytes(50000),
    }));

    await fetchWalletGetLobbyExtras(request);
    await fetchWalletGetLobbyExtras(request);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache when force is true", async () => {
    const request = vi.fn<GatewayWsRequestFn>(async () => ({
      code: "200",
      data: encodeWalletGetResponseBytes(50000),
    }));

    await fetchWalletGetLobbyExtras(request);
    await fetchWalletGetLobbyExtras(request, { force: true });

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("still calls gateway when only one dev mock env is set", async () => {
    vi.stubEnv("VITE_DEV_WALLET_GET_SUBSIDY", "100000");
    const request = vi.fn<GatewayWsRequestFn>(async () => ({
      code: "200",
      data: encodeWalletGetResponseBytes(0),
    }));

    const extras = await fetchWalletGetLobbyExtras(request);

    expect(request).toHaveBeenCalledTimes(1);
    expect(extras.subsidyAmount).toBe(100000);
  });
});
