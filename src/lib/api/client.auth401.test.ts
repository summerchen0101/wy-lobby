import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiRequest,
  setOn401RefreshTokenHandler,
  setUnauthorizedHandler,
} from "./client";

describe("apiRequest 401", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("VITE_API_BASE", "https://api.example.com");
  });

  afterEach(() => {
    setOn401RefreshTokenHandler(null);
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("skipUnauthorizedOn401: does not call on401RefreshToken (avoid refresh deadlock)", async () => {
    const onRefresh = vi.fn();
    setOn401RefreshTokenHandler(onRefresh);

    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 401, statusText: "Unauthorized" }),
    );

    await expect(
      apiRequest("/api/v1/token", {
        method: "POST",
        token: "stale-access",
        skipUnauthorizedOn401: true,
      }),
    ).rejects.toMatchObject({ status: 401, name: "ApiError" });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("default 401 with token: tries on401RefreshToken before throwing", async () => {
    const onRefresh = vi.fn().mockResolvedValue(null);
    setOn401RefreshTokenHandler(onRefresh);

    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 401, statusText: "Unauthorized" }),
    );

    await expect(
      apiRequest("/api/v1/games", { method: "GET", token: "access" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
