const AUTO_POPUP_SESSION_KEY = "ffgt:daily-login:auto-shown";

export function wasDailyLoginAutoPopupShown(): boolean {
  try {
    return sessionStorage.getItem(AUTO_POPUP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDailyLoginAutoPopupShown(): void {
  try {
    sessionStorage.setItem(AUTO_POPUP_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}
