import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function stubBrowserGlobals(socureSdk?: unknown) {
  vi.stubGlobal("document", {
    head: { appendChild: vi.fn(), innerHTML: "" },
    querySelector: vi.fn(() => null),
    createElement: vi.fn(),
  });
  vi.stubGlobal("window", { SocureDocVSDK: socureSdk });
}

describe("socureDocv", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_SOCURE_DOCV_SDK_KEY", "");
    stubBrowserGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("isSocureDocvEnabled is false without key", async () => {
    const { isSocureDocvEnabled } = await import("./socureDocv");
    expect(isSocureDocvEnabled()).toBe(false);
  });

  it("launchSocureDocv returns error when key missing", async () => {
    const { launchSocureDocv } = await import("./socureDocv");
    const result = await launchSocureDocv("token-123");
    expect(result).toEqual({
      result: "error",
      errorMessage: "DocV SDK key is not configured",
    });
  });

  it("launchSocureDocv calls SocureDocVSDK.launch when SDK is present", async () => {
    vi.stubEnv("VITE_SOCURE_DOCV_SDK_KEY", "docv-test-key");
    const launch = vi.fn().mockResolvedValue({ result: "success" });
    const reset = vi.fn();
    stubBrowserGlobals({ launch, reset });

    const { launchSocureDocv } = await import("./socureDocv");
    const result = await launchSocureDocv("txn-token-abc", {
      onSuccess: vi.fn(),
    });

    expect(result).toEqual({ result: "success" });
    expect(launch).toHaveBeenCalledWith(
      "docv-test-key",
      "txn-token-abc",
      "#socure-docv-root",
      expect.objectContaining({
        qrCodeNeeded: true,
        autoOpenTabOnMobile: true,
      }),
    );
  });

  it("resetSocureDocv calls SocureDocVSDK.reset", async () => {
    const reset = vi.fn();
    stubBrowserGlobals({ launch: vi.fn(), reset });
    const { resetSocureDocv } = await import("./socureDocv");
    resetSocureDocv();
    expect(reset).toHaveBeenCalled();
  });
});
