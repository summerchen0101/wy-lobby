import { describe, expect, it } from "vitest";
import { getWordPlain } from "../wordData/getWord";

describe("GatewayWsDisconnectGate copy", () => {
  it("uses session-expired title and reconnect body", () => {
    const title = (getWordPlain(400023) || "Session Expired")
      .split("\n")[0]
      ?.trim();
    const message = getWordPlain(400015);
    expect(title).toBe("Session Expired");
    expect(message).toMatch(/reconnect/i);
  });
});
