/** 由 AuthProvider 註冊；refreshSession 失敗時觸發（清 session、導向大廳登入）。 */
let onSessionRefreshFailed: (() => void) | null = null;

export function setOnSessionRefreshFailedHandler(
  fn: (() => void) | null,
): void {
  onSessionRefreshFailed = fn;
}

export function notifySessionRefreshFailed(): void {
  onSessionRefreshFailed?.();
}
