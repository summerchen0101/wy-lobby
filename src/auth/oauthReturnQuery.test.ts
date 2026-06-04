import { describe, expect, it } from "vitest";
import {
  oauthReturnMessageForCode,
  oauthReturnUsesBlockingAlert,
  readOAuthReturnAuth,
  readOAuthReturnError,
  stripOAuthReturnQuery,
} from "./oauthReturnQuery";

describe("oauthReturnQuery", () => {
  it("reads auth from query string", () => {
    const q = new URLSearchParams({
      accessToken: "at-1",
      refreshToken: "rt-1",
      expiresIn: "3600",
    });
    const auth = readOAuthReturnAuth(q);
    expect(auth?.accessToken).toBe("at-1");
    expect(auth?.refreshToken).toBe("rt-1");
    expect(auth?.expiresIn).toBe(3600);
  });

  it("reads oauth error", () => {
    const q = new URLSearchParams({ errCode: "403012", errMsg: "limit" });
    expect(readOAuthReturnError(q)?.errCode).toBe("403012");
  });

  it("maps 400008 to Apple email sharing message", () => {
    expect(oauthReturnMessageForCode("400008")).toContain("email");
  });

  it("uses blocking alert only for 400008", () => {
    expect(oauthReturnUsesBlockingAlert("400008")).toBe(true);
    expect(oauthReturnUsesBlockingAlert("403012")).toBe(false);
  });

  it("strips oauth keys but keeps redirect", () => {
    const q = new URLSearchParams({
      accessToken: "x",
      redirect: "/play",
      referrercode: "abc",
    });
    const next = stripOAuthReturnQuery(q);
    expect(next.has("accessToken")).toBe(false);
    expect(next.get("redirect")).toBe("/play");
    expect(next.get("referrercode")).toBe("abc");
  });
});
