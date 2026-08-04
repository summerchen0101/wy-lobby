import { describe, expect, it } from "vitest";
import {
  buildShopBindingPayload,
  computeShopBindingInvalidFields,
  normalizePhoneDigitsForSubmit,
} from "./shopBindingPayload";

describe("shopBindingPayload", () => {
  const baseFields = {
    email: "user@example.com",
    phoneCountry: "1",
    phoneNumber: "2125551234",
    firstName: "Jane",
    lastName: "Doe",
    birthday: "1994-02-04",
  };

  it("buildShopBindingPayload includes hidden profile fields", () => {
    const payload = buildShopBindingPayload(baseFields, "888888");
    expect(payload).toEqual({
      countryCode: "1",
      phone: "2125551234",
      email: "user@example.com",
      answer: "888888",
      firstName: "Jane",
      lastName: "Doe",
      birthday: "1994-02-04",
    });
  });

  it("buildShopBindingPayload sends empty hidden fields when not prefilled", () => {
    const payload = buildShopBindingPayload(
      {
        ...baseFields,
        firstName: "",
        lastName: "",
        birthday: "",
      },
      "",
    );
    expect(payload.firstName).toBe("");
    expect(payload.lastName).toBe("");
    expect(payload.birthday).toBe("");
  });

  it("normalizePhoneDigitsForSubmit strips non-digits and leading zeros", () => {
    expect(normalizePhoneDigitsForSubmit("09-123-4567")).toBe("91234567");
  });

  it("computeShopBindingInvalidFields skips email when read-only", () => {
    const missing = computeShopBindingInvalidFields(
      { ...baseFields, email: "" },
      true,
    );
    expect(missing.has("email")).toBe(false);
  });

  it("computeShopBindingInvalidFields requires email when editable", () => {
    const missing = computeShopBindingInvalidFields(
      { ...baseFields, email: "" },
      false,
    );
    expect(missing.has("email")).toBe(true);
  });

  it("computeShopBindingInvalidFields does not require firstName lastName birthday", () => {
    const missing = computeShopBindingInvalidFields(
      {
        ...baseFields,
        firstName: "",
        lastName: "",
        birthday: "",
      },
      true,
    );
    expect(missing.size).toBe(0);
  });

  it("computeShopBindingInvalidFields requires 10-digit US phone", () => {
    const missing = computeShopBindingInvalidFields(
      { ...baseFields, phoneNumber: "12345" },
      true,
    );
    expect(missing.has("phoneNumber")).toBe(true);
  });
});
