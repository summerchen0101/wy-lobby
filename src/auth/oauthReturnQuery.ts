import { normalizeAuthResponse } from "../lib/api/authParse";
import type { AuthResponse } from "../lib/api/types";

const OAUTH_RETURN_KEYS = [
  "accessToken",
  "refreshToken",
  "expiresIn",
  "tokenType",
  "to",
  "isNewOAuthAccount",
  "errCode",
  "errMsg",
] as const;

export type OAuthReturnError = {
  errCode: string;
  errMsg: string;
};

export function readOAuthReturnError(
  searchParams: URLSearchParams,
): OAuthReturnError | null {
  const errCode = searchParams.get("errCode")?.trim();
  if (!errCode) return null;
  return {
    errCode,
    errMsg: searchParams.get("errMsg")?.trim() || "Sign-in failed",
  };
}

export function readOAuthReturnAuth(
  searchParams: URLSearchParams,
): AuthResponse | null {
  const accessToken = searchParams.get("accessToken")?.trim();
  if (!accessToken) return null;
  const refreshToken = searchParams.get("refreshToken")?.trim();
  const expiresInRaw = searchParams.get("expiresIn")?.trim();
  let expiresIn: number | undefined;
  if (expiresInRaw) {
    const n = Number(expiresInRaw);
    if (!Number.isNaN(n)) expiresIn = n;
  }
  const tokenType = searchParams.get("tokenType")?.trim();
  return normalizeAuthResponse({
    accessToken,
    refreshToken: refreshToken || undefined,
    expiresIn,
    tokenType: tokenType || undefined,
  });
}

export function isNewOAuthAccount(searchParams: URLSearchParams): boolean {
  return searchParams.get("isNewOAuthAccount") === "true";
}

/** 自 URL 移除 OAuth 回調參數，保留 `redirect`、`referrercode` 等。 */
export function stripOAuthReturnQuery(
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  for (const key of OAUTH_RETURN_KEYS) {
    next.delete(key);
  }
  return next;
}

export function oauthReturnMessageForCode(errCode: string): string {
  if (errCode === "403012") {
    return "Registration limit reached. Please contact support.";
  }
  return "";
}
