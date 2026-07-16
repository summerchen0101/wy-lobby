import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientVersionError, apiRequest } from "./client";

describe("apiRequest client version", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("VITE_API_BASE", "https://api.example.com");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("throws ClientVersionError on HTTP 400 with Code 600 body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ Code: 600, Update: "https://dl.example" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiRequest("/api/v1/login", { method: "POST" })).rejects.toBeInstanceOf(
      ClientVersionError,
    );
  });
});
