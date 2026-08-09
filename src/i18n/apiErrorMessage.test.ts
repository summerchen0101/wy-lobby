import { describe, expect, it } from "vitest";
import i18n from "./i18n";
import { translateApiErrorCode, translateGatewayError } from "./apiErrorMessage";

describe("translateApiErrorCode", () => {
  it("uses errors namespace for known codes", async () => {
    await i18n.changeLanguage("en");
    expect(translateApiErrorCode("RATE_LIMITED")).toMatch(/Too many requests/i);
  });

  it("falls back to unknown for missing codes", async () => {
    await i18n.changeLanguage("en");
    expect(translateApiErrorCode("NOT_IN_JSON")).toMatch(/Something went wrong/i);
    expect(translateApiErrorCode(undefined)).toMatch(/Something went wrong/i);
  });

  it("respects zh-TW strings", async () => {
    await i18n.changeLanguage("zh-TW");
    expect(translateApiErrorCode("RATE_LIMITED")).toContain("請求");
  });
});

describe("translateGatewayError", () => {
  it("prefers server errMessage over numeric code collisions", async () => {
    await i18n.changeLanguage("en");
    expect(
      translateGatewayError("400001", "This reward is not ready to collect yet."),
    ).toBe("This reward is not ready to collect yet.");
  });

  it("does not map numeric codes to WordData", async () => {
    await i18n.changeLanguage("en");
    expect(translateGatewayError("552", null, "Validation failed")).toBe(
      "Validation failed",
    );
    expect(translateGatewayError("400001", null, "Claim failed (400001)")).toBe(
      "Claim failed (400001)",
    );
  });

  it("falls back to server errMessage when i18n missing", async () => {
    expect(translateGatewayError("NOT_IN_WORDDATA", "Server said no")).toBe(
      "Server said no",
    );
  });

  it("uses i18n for known string keys when errMessage missing", async () => {
    await i18n.changeLanguage("en");
    expect(translateGatewayError("RATE_LIMITED", null, "fallback")).toMatch(
      /Too many requests/i,
    );
  });
});
