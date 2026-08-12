import { describe, expect, it } from "vitest";
import {
  AUTH_LOGIN_ENTRY_PATH,
  AUTH_LOGIN_PROMPT_PATH,
  guestLandingPath,
} from "./loginEntry";

describe("loginEntry", () => {
  it("keeps forced logout on guest landing without login popup", () => {
    expect(AUTH_LOGIN_ENTRY_PATH).toBe("/");
    expect(guestLandingPath()).toBe("/");
  });

  it("opens login popup after connection-failed logout", () => {
    expect(AUTH_LOGIN_PROMPT_PATH).toBe("/?auth=login");
  });
});
