import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initialize = vi.fn();
const getSessionToken = vi.fn();
const setNavigationContext = vi.fn();

vi.mock("@socure-inc/device-risk-sdk", () => ({
  default: {
    initialize,
    getSessionToken,
    setNavigationContext,
  },
}));

describe("socureDevice", () => {
  beforeEach(() => {
    vi.resetModules();
    initialize.mockReset();
    getSessionToken.mockReset();
    setNavigationContext.mockReset();
    setNavigationContext.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when SDK key is not configured", async () => {
    vi.stubEnv("VITE_SOCURE_SDK_KEY", "");
    const { getSocureDiSessionToken, isSocureDeviceEnabled } = await import(
      "./socureDevice"
    );
    expect(isSocureDeviceEnabled()).toBe(false);
    await expect(getSocureDiSessionToken()).resolves.toBeUndefined();
    expect(initialize).not.toHaveBeenCalled();
  });

  it("initializes once and returns session token", async () => {
    vi.stubEnv("VITE_SOCURE_SDK_KEY", "test-sdk-key");
    getSessionToken.mockResolvedValue("sess-token-123");

    const mod = await import("./socureDevice");
    await expect(mod.getSocureDiSessionToken()).resolves.toBe("sess-token-123");
    await expect(mod.getSocureDiSessionToken()).resolves.toBe("sess-token-123");

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith({ sdkKey: "test-sdk-key" });
    expect(getSessionToken).toHaveBeenCalledTimes(2);
  });

  it("returns undefined when getSessionToken fails", async () => {
    vi.stubEnv("VITE_SOCURE_SDK_KEY", "test-sdk-key");
    getSessionToken.mockRejectedValue(new Error("sdk error"));

    const { getSocureDiSessionToken } = await import("./socureDevice");
    await expect(getSocureDiSessionToken()).resolves.toBeUndefined();
  });

  it("sets account_binding navigation context when enabled", async () => {
    vi.stubEnv("VITE_SOCURE_SDK_KEY", "test-sdk-key");

    const { setSocureBindingNavigationContext } = await import("./socureDevice");
    await setSocureBindingNavigationContext();

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(setNavigationContext).toHaveBeenCalledWith("account_binding");
  });
});
