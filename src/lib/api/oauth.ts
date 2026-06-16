import { apiRequest } from "./client";
import { getApiPaths } from "./paths";

/** 對齊 official `YesNo.No`：由前端自行導向 OAuth URL */
export const OAUTH_AUTO_REDIRECT_NO = 2;

import type { OAuthLinkChannel } from "./paths";

export type OAuthChannel = OAuthLinkChannel;

function parseLinkPayload(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid OAuth link response");
  }
  const o = raw as Record<string, unknown>;
  const data = o.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (typeof o.url === "string" && o.url.trim()) return o.url.trim();
  throw new Error("Missing OAuth redirect URL");
}

function parseAppleStatePayload(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid Apple state response");
  }
  const o = raw as Record<string, unknown>;
  const data = o.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  throw new Error("Missing Apple state");
}

/** `GET /api/v1/{channel}/link?autoRedirect=2&backUrl=…` */
export async function fetchOAuthLink(
  channel: OAuthChannel,
  backUrl: string,
): Promise<string> {
  const path = getApiPaths().oauthLink(channel);
  const url = new URL(path, "http://local");
  url.searchParams.set("autoRedirect", String(OAUTH_AUTO_REDIRECT_NO));
  url.searchParams.set("backUrl", backUrl);
  const raw = await apiRequest<unknown>(`${url.pathname}${url.search}`, {
    method: "GET",
    largeSafeUserIdsInJson: true,
  });
  return parseLinkPayload(raw);
}

/** `GET /api/v1/apple/state?backUrl=…` */
export async function fetchAppleOAuthState(backUrl: string): Promise<string> {
  const path = getApiPaths().appleState;
  const url = new URL(path, "http://local");
  url.searchParams.set("backUrl", backUrl);
  const raw = await apiRequest<unknown>(`${url.pathname}${url.search}`, {
    method: "GET",
    largeSafeUserIdsInJson: true,
  });
  return parseAppleStatePayload(raw);
}
