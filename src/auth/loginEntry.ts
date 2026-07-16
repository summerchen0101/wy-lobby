/** 大廳登入 modal 入口（`LoginRedirect` 亦導向此 query） */
export const AUTH_LOGIN_ENTRY_PATH = "/?auth=login";

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
