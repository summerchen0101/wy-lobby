import { describe, expect, it } from "vitest";
import {
  decodeGetThirdPartyGameInfoRequestForDevLog,
  decodePlayerAvatarsInfoBytes,
  encodeGetThirdPartyGameInfoRequest,
  encodeUpdatePlayerCurrentAvatarRequest,
} from "./playerAvatarWire";

describe("encodeUpdatePlayerCurrentAvatarRequest", () => {
  it("encodes Item ID with empty URL and IsFBAvatar No", () => {
    const raw = encodeUpdatePlayerCurrentAvatarRequest({
      avatarID: 406,
      avatarURL: "",
      isFBAvatar: false,
    });
    expect(raw.byteLength).toBeGreaterThan(0);
  });
});

describe("decodePlayerAvatarsInfoBytes", () => {
  it("decodes xlsx sample UPDATE_PLAYER_AVATAR response", () => {
    const raw = Uint8Array.from([8, 158, 3, 24, 2]);
    const row = decodePlayerAvatarsInfoBytes(raw);
    expect(row.avatarID).toBe("414");
    expect(row.goodState).toBe("IN_ACTIVE");
  });
});

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
