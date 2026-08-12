import { describe, expect, it, vi } from "vitest";
import {
  appendAppMetaToOAuthUrl,
  buildAppleAuthRedirectUri,
} from "./oauth";
import { encodeAppMetaBase64 } from "../appMeta";

describe("appendAppMetaToOAuthUrl", () => {
  it("appends app_meta as base64 query on link URL", () => {
    vi.stubEnv("VITE_APP_META_APK", "web");
    const out = appendAppMetaToOAuthUrl(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=y",
    );
    const url = new URL(out);
    expect(url.searchParams.get("client_id")).toBe("x");
    expect(url.searchParams.get("state")).toBe("y");
    expect(url.searchParams.get("app_meta")).toBe(encodeAppMetaBase64());
  });
});

describe("buildAppleAuthRedirectUri", () => {
  it("appends app_meta on /apple/auth", () => {
    vi.stubEnv("VITE_APP_META_APK", "web");
    const out = buildAppleAuthRedirectUri("https://apis.example.com");
    const url = new URL(out);
    expect(url.origin).toBe("https://apis.example.com");
    expect(url.pathname).toBe("/api/v1/apple/auth");
    expect(url.searchParams.get("app_meta")).toBe(encodeAppMetaBase64());
  });
});
