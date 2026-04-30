import { describe, expect, it } from "vitest";
import i18n from "./i18n";
import { translateApiErrorCode } from "./apiErrorMessage";

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
