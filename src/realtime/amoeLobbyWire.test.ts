import { describe, expect, it } from "vitest";
import {
  classifyGenerateAmoeError,
  decodeAmoeCreditedPushBytes,
  decodeAmoeInvalidPushBytes,
  decodeGenerateAmoeCodeResponseBytes,
  encodeAmoeCreditedPushForTest,
  encodeAmoeInvalidPushForTest,
  encodeGenerateAmoeCodeResponseForTest,
  formatAmoeCreditedPushToast,
  formatAmoeInvalidPushToast,
  formatSweepstakeCodeDigits,
} from "./amoeLobbyWire";

describe("decodeGenerateAmoeCodeResponseBytes", () => {
  it("decodes entry id and sweepstake code", () => {
    const bytes = encodeGenerateAmoeCodeResponseForTest(1024, "9991234564");
    const decoded = decodeGenerateAmoeCodeResponseBytes(bytes);
    expect(decoded.entryId).toBe("1024");
    expect(decoded.sweepstakeCode).toBe("9991234564");
  });
});

describe("formatSweepstakeCodeDigits", () => {
  it("splits code into individual characters", () => {
    expect(formatSweepstakeCodeDigits("9991234564")).toEqual([
      "9",
      "9",
      "9",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "4",
    ]);
  });

  it("trims whitespace before splitting", () => {
    expect(formatSweepstakeCodeDigits(" 123 ")).toEqual(["1", "2", "3"]);
  });
});

describe("classifyGenerateAmoeError", () => {
  it("classifies profile name and email errors", () => {
    expect(
      classifyGenerateAmoeError(
        "400001",
        "Please complete your full name before requesting a sweepstake code.",
      ),
    ).toBe("profile_name");
    expect(
      classifyGenerateAmoeError(
        "400001",
        "Please set your email before requesting a sweepstake code.",
      ),
    ).toBe("profile_email");
  });

  it("classifies rate limit, quota, unauthorized, and server errors", () => {
    expect(classifyGenerateAmoeError("429001")).toBe("rate_limit");
    expect(classifyGenerateAmoeError("409001")).toBe("quota");
    expect(classifyGenerateAmoeError("401001")).toBe("unauthorized");
    expect(classifyGenerateAmoeError("500001")).toBe("server");
    expect(classifyGenerateAmoeError("999999")).toBe("unknown");
  });
});

describe("decodeAmoeCreditedPushBytes", () => {
  it("decodes sc amount wire and sweepstake code", () => {
    const raw = encodeAmoeCreditedPushForTest(42, "20000", "9991234564");
    const got = decodeAmoeCreditedPushBytes(raw);
    expect(got).toEqual({
      entryId: "42",
      scAmountWire: "20000",
      sweepstakeCode: "9991234564",
    });
  });

  it("returns null for empty payload", () => {
    expect(decodeAmoeCreditedPushBytes(new Uint8Array(0))).toBeNull();
  });
});

describe("decodeAmoeInvalidPushBytes", () => {
  it("decodes invalid push with exception codes", () => {
    const raw = encodeAmoeInvalidPushForTest(
      7,
      "1234567890",
      "INVALID_HANDWRITING,MISSING_CODE",
    );
    const got = decodeAmoeInvalidPushBytes(raw);
    expect(got).toEqual({
      entryId: "7",
      sweepstakeCode: "1234567890",
      exceptionCodes: "INVALID_HANDWRITING,MISSING_CODE",
    });
  });
});

describe("formatAmoe push toasts", () => {
  it("formats credited push with scaled SC display", () => {
    expect(
      formatAmoeCreditedPushToast({
        entryId: "1",
        scAmountWire: "20000",
        sweepstakeCode: "9991234564",
      }),
    ).toBe(
      "Your AMOE entry (code: 9991234564) was approved. 2.00 SC has been credited.",
    );
  });

  it("formats invalid push", () => {
    expect(
      formatAmoeInvalidPushToast({
        entryId: "1",
        sweepstakeCode: "9991234564",
        exceptionCodes: "INVALID_HANDWRITING",
      }),
    ).toBe(
      "Your AMOE entry (code: 9991234564) was not approved. Please review the Sweepstakes Rules and try again with a new Mail-In Request Code.",
    );
  });
});
