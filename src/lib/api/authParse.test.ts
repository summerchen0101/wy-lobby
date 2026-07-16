import { describe, expect, it } from "vitest";
import { ClientVersionError, throwIfClientVersionError } from "./clientVersionError";
import { normalizeAuthResponse } from "./authParse";

describe("throwIfClientVersionError", () => {
  it("throws on Code 600 with Update URL", () => {
    expect(() =>
      throwIfClientVersionError({ Code: 600, Update: "https://example.com/dl" }),
    ).toThrow(ClientVersionError);
    try {
      throwIfClientVersionError({ Code: 600, Update: "https://example.com/dl" });
    } catch (err) {
      expect(err).toBeInstanceOf(ClientVersionError);
      expect((err as ClientVersionError).updateUrl).toBe("https://example.com/dl");
    }
  });

  it("throws on lowercase code 600 even without update URL", () => {
    expect(() => throwIfClientVersionError({ code: 600 })).toThrow(
      ClientVersionError,
    );
  });

  it("checks nested data payload", () => {
    expect(() =>
      throwIfClientVersionError({
        code: "400001",
        data: { Code: 600, update: "https://cdn.example/app" },
      }),
    ).toThrow(ClientVersionError);
  });
});

describe("normalizeAuthResponse", () => {
  it("prefers version mismatch over missing access token", () => {
    expect(() =>
      normalizeAuthResponse({ Code: 600, Update: "https://example.com" }),
    ).toThrow(ClientVersionError);
  });
});
