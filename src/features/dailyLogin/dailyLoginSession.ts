const AUTO_POPUP_SESSION_KEY = "ffgt:daily-login:auto-shown";

function sessionKey(userId: string): string {
  return `${AUTO_POPUP_SESSION_KEY}:${userId}`;
}

/** 本瀏覽器分頁 session 是否已自動彈過（含重新整理後仍有效）。 */
export function wasDailyLoginAutoPopupShown(userId: string): boolean {
  const id = userId.trim();
  if (!id || id === "0") return false;
  try {
    return sessionStorage.getItem(sessionKey(id)) === "1";
  } catch {
    return false;
  }
}

export function markDailyLoginAutoPopupShown(userId: string): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  try {
    sessionStorage.setItem(sessionKey(id), "1");
  } catch {
    /* ignore */
  }
}
