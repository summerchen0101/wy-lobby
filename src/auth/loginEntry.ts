/** 未登入大廳首頁。強制登出／session 失效時導向此處，不帶 `auth=login`（不自動開 login popup）。 */
export const AUTH_LOGIN_ENTRY_PATH = "/";

/** 清 session 後需要立刻再開登入彈窗（LandingPage 讀 `auth=login`）。 */
export const AUTH_LOGIN_PROMPT_PATH = "/?auth=login";

/** 登入成功後預設進大廳（`/`），非基本資料頁。 */
export const POST_LOGIN_LOBBY_PATH = "/";

/** 登入／OAuth 完成後導向：預設大廳；`/profile` 改導大廳；其餘合法路徑保留（如 `/shop`）。 */
export function resolvePostLoginRedirect(
  redirect: string | null | undefined,
): string {
  const trimmed = redirect?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return POST_LOGIN_LOBBY_PATH;
  }
  if (trimmed === "/profile" || trimmed.startsWith("/profile/")) {
    return POST_LOGIN_LOBBY_PATH;
  }
  return trimmed;
}

/** Build guest landing URL; optional `redirect` only — never sets `auth=login`. */
export function guestLandingPath(
  redirect?: string | null,
): string {
  const resolved = resolvePostLoginRedirect(redirect);
  if (!resolved || resolved === POST_LOGIN_LOBBY_PATH) {
    return AUTH_LOGIN_ENTRY_PATH;
  }
  const q = new URLSearchParams();
  q.set("redirect", resolved);
  return `/?${q.toString()}`;
}
