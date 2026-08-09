import { describe, expect, it } from "vitest";
import {
  decodeDeletePlayerInfoRequestForDevLog,
  encodeDeletePlayerInfoRequest,
  OAUTH_PROVIDER_MEGA,
} from "./deleteAccountWire";

describe("encodeDeletePlayerInfoRequest", () => {
  it("encodes provider and access token", () => {
    const raw = encodeDeletePlayerInfoRequest({
      accessToken: "test-access-token",
      provider: OAUTH_PROVIDER_MEGA,
    });
    const decoded = decodeDeletePlayerInfoRequestForDevLog(raw);
    expect(decoded.privoder).toBe("PROVIDER_MEGA");
    expect(decoded.accessToken).toBe("test-access-token");
  });

  it("defaults provider to PROVIDER_MEGA", () => {
    const raw = encodeDeletePlayerInfoRequest({
      accessToken: "abc",
    });
    const decoded = decodeDeletePlayerInfoRequestForDevLog(raw);
    expect(decoded.privoder).toBe("PROVIDER_MEGA");
  });
});
