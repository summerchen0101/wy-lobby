import { encodeAppMetaBase64 } from "../appMeta";
import { apiRequest } from "./client";
import { getApiPaths } from "./paths";
import type { OAuthLinkChannel } from "./paths";

/** 對齊 official `YesNo.No`：由前端自行導向 OAuth URL */
export const OAUTH_AUTO_REDIRECT_NO = 2;

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

/**
 * 在 OAuth URL（如 `/google/link` 回傳值、`/apple/auth` redirect）上附加
 * `app_meta`（JSON → Base64）。相對路徑以目前 origin 為 base。
 */
export function appendAppMetaToOAuthUrl(oauthUrl: string): string {
  const base =
    typeof window !== "undefined" ? window.location.href : "http://local/";
  const url = new URL(oauthUrl, base);
  url.searchParams.set("app_meta", encodeAppMetaBase64());
  return url.toString();
}

/** Apple Sign In `redirectURI` → `…/api/v1/apple/auth?app_meta=…` */
export function buildAppleAuthRedirectUri(apiBase: string): string {
  const path = "/api/v1/apple/auth";
  return appendAppMetaToOAuthUrl(apiBase ? `${apiBase}${path}` : path);
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
