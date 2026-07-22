import { describe, expect, it } from "vitest";
import { getWord, getWordPlain, stripWordDataTags } from "./getWord";

describe("getWord", () => {
  it("returns text for known id", () => {
    expect(getWord(510755)).toBe("FUNDS HISTORY");
  });

  it("replaces positional placeholders", () => {
    expect(getWord(40, 30)).toBe("RESEND (30 s)");
    expect(getWord(510488, 50)).toBe("Enter an amount of 50 or more.");
  });

  it("returns empty string for unknown id", () => {
    expect(getWord(999999999)).toBe("");
  });
});

describe("stripWordDataTags", () => {
  it("removes color tags", () => {
    const raw = getWord(4086);
    expect(stripWordDataTags(raw)).toContain("DELETE");
    expect(stripWordDataTags(raw)).not.toContain("[FF3300]");
  });
});

describe("getWordPlain", () => {
  it("returns text without rich tags", () => {
    const plain = getWordPlain(4086);
    expect(plain).not.toContain("[");
  });
});
