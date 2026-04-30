import { describe, expect, it } from "vitest";
import { formatScFromRaw, formatScFromRawWireInteger } from "./formatWalletAmount";

describe("formatScFromRawWireInteger", () => {
  it("與 formatScFromRaw（number）對齊於可安全表示的原始整數", () => {
    expect(formatScFromRawWireInteger("12345")).toBe(formatScFromRaw(12345));
    expect(formatScFromRawWireInteger("500000")).toBe(formatScFromRaw(500000));
    expect(formatScFromRawWireInteger("18000")).toBe(formatScFromRaw(18000));
  });

  it("超過 Number.MAX_SAFE_INTEGER 的原始字串仍可格式化", () => {
    const wire = `${9007199254740993n * 10000n}`; // raw > MAX_SAFE_INTEGER (not multiple of 10000)
    expect(() => BigInt(wire)).not.toThrow();
    const a = formatScFromRawWireInteger(wire);
    expect(a).not.toBe("—");
    expect(a).toMatch(/^\d[\d,]*(\.\d{1,2})?$/);
  });

  it("非十進位整數或空值回傳 dash", () => {
    expect(formatScFromRawWireInteger("")).toBe("—");
    expect(formatScFromRawWireInteger("1.5")).toBe("—");
    expect(formatScFromRawWireInteger("  ")).toBe("—");
    expect(formatScFromRawWireInteger("abc")).toBe("—");
  });
});
