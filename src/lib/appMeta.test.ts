import { describe, expect, it } from "vitest";

import { deviceTypeFromUserAgent, normalizeAppMetaApk } from "./appMeta";

describe("normalizeAppMetaApk", () => {
  it("defaults to web for empty", () => {
    expect(normalizeAppMetaApk(undefined)).toBe("web");
    expect(normalizeAppMetaApk("")).toBe("web");
  });

  it("passes through ios web google", () => {
    expect(normalizeAppMetaApk("ios")).toBe("ios");
    expect(normalizeAppMetaApk("WEB")).toBe("web");
    expect(normalizeAppMetaApk(" Google ")).toBe("google");
  });

  it("maps legacy apk strings", () => {
    expect(normalizeAppMetaApk("megarich")).toBe("ios");
    expect(normalizeAppMetaApk("megarich_web")).toBe("web");
    expect(normalizeAppMetaApk("megarich_google")).toBe("google");
  });

  it("unknown value falls back to web", () => {
    expect(normalizeAppMetaApk("totally_unknown")).toBe("web");
  });
});

describe("deviceTypeFromUserAgent", () => {
  it("iPhone UA → ios", () => {
    expect(
      deviceTypeFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("ios");
  });

  it("Android UA → android", () => {
    expect(
      deviceTypeFromUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0",
      ),
    ).toBe("android");
  });

  it("desktop Chrome → pc", () => {
    expect(
      deviceTypeFromUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
      ),
    ).toBe("pc");
  });

  it("iPadOS desktop mode → ios", () => {
    expect(
      deviceTypeFromUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
        { platform: "MacIntel", maxTouchPoints: 5 },
      ),
    ).toBe("ios");
  });
});
