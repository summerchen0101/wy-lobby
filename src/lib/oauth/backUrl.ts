import { resolvePostLoginRedirect } from "../../auth/loginEntry";

/**
 * OAuth 完成後後端導回的前端 URL（對齊 official LoginPopup `backUrl`）。
 * 使用 query `to` 承載登入後路徑（本專案另用 `redirect` 時會一併寫入 `to`）。
 */
export function buildOAuthBackUrl(searchParams?: URLSearchParams): string {
  if (typeof window === "undefined") return "";
  const { protocol, host, pathname } = window.location;
  const q = new URLSearchParams();
  const redirect = searchParams?.get("redirect");
  if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
    q.set("to", resolvePostLoginRedirect(redirect));
  }
  const ref = searchParams?.get("referrercode");
  if (ref?.trim()) {
    q.set("referrercode", ref.trim());
  }
  const qs = q.toString();
  return `${protocol}//${host}${pathname}${qs ? `?${qs}` : ""}`;
}

/** OAuth 回調後導向路徑：優先 `to`，其次 `redirect`；預設大廳。 */
export function resolvePostOAuthPath(searchParams: URLSearchParams): string {
  const to = searchParams.get("to")?.trim();
  const redirect = searchParams.get("redirect")?.trim();
  return resolvePostLoginRedirect(to ?? redirect);
}
