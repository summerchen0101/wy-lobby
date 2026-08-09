import { describe, expect, it } from "vitest";
import {
  extractPhoneDigits,
  isValidUsPhoneDigits,
  sanitizeUsPhoneInput,
  usPhoneValidationWordId,
} from "./usPhoneValidation";

describe("usPhoneValidation", () => {
  it("extractPhoneDigits strips non-digits", () => {
    expect(extractPhoneDigits("(212) 555-1234")).toBe("2125551234");
  });

  it("sanitizeUsPhoneInput caps at 10 digits", () => {
    expect(sanitizeUsPhoneInput("21255512345678")).toBe("2125551234");
  });

  it("isValidUsPhoneDigits accepts valid NANP numbers", () => {
    expect(isValidUsPhoneDigits("2125551234")).toBe(true);
    expect(isValidUsPhoneDigits("4158675309")).toBe(true);
  });

  it("isValidUsPhoneDigits rejects invalid NANP numbers", () => {
    expect(isValidUsPhoneDigits("1234567890")).toBe(false);
    expect(isValidUsPhoneDigits("0123456789")).toBe(false);
    expect(isValidUsPhoneDigits("2120551234")).toBe(false);
    expect(isValidUsPhoneDigits("212555123")).toBe(false);
  });

  it("usPhoneValidationWordId maps length and format errors", () => {
    expect(usPhoneValidationWordId("212555")).toBe(555);
    expect(usPhoneValidationWordId("0123456789")).toBe(557);
    expect(usPhoneValidationWordId("2125551234")).toBe(null);
  });
});
