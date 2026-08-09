import { describe, expect, it } from "vitest";
import { isDeleteConfirmTextValid } from "./deleteAccountValidation";

describe("isDeleteConfirmTextValid", () => {
  it("accepts exact uppercase DELETE", () => {
    expect(isDeleteConfirmTextValid("DELETE")).toBe(true);
    expect(isDeleteConfirmTextValid("  DELETE  ")).toBe(true);
  });

  it("rejects lowercase, mixed case, partial, and empty input", () => {
    expect(isDeleteConfirmTextValid("delete")).toBe(false);
    expect(isDeleteConfirmTextValid("Delete")).toBe(false);
    expect(isDeleteConfirmTextValid("DELET")).toBe(false);
    expect(isDeleteConfirmTextValid("")).toBe(false);
    expect(isDeleteConfirmTextValid("   ")).toBe(false);
  });
});
