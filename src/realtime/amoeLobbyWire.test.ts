import { describe, expect, it } from "vitest";
import {
  classifyGenerateAmoeError,
  decodeGenerateAmoeCodeResponseBytes,
  encodeGenerateAmoeCodeResponseForTest,
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
