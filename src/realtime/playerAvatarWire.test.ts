import { describe, expect, it } from "vitest";
import {
  decodeGetThirdPartyGameInfoRequestForDevLog,
  encodeGetThirdPartyGameInfoRequest,
} from "./playerAvatarWire";

describe("encodeGetThirdPartyGameInfoRequest", () => {
  it("帶入 platform、gameUID 與 callback URLs", () => {
    const raw = encodeGetThirdPartyGameInfoRequest("BGAMING", "game-1", {
      successUrl: "https://example.com/game/callback?state=1",
      failUrl: "https://example.com/game/callback?state=2",
    });
    const o = decodeGetThirdPartyGameInfoRequestForDevLog(raw);
    expect(o.platform).toBe("BGAMING");
    expect(o.gameUID).toBe("game-1");
    expect(o.successUrl).toBe(
      "https://example.com/game/callback?state=1",
    );
    expect(o.failUrl).toBe("https://example.com/game/callback?state=2");
  });
});
