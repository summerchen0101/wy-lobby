import { LAST_LOGIN_ACCOUNT_STORAGE_KEY } from "./storage";

export function readLastLoginAccount(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(LAST_LOGIN_ACCOUNT_STORAGE_KEY)?.trim() ?? "";
}

export function saveLastLoginAccount(account: string): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = account.trim();
  if (!trimmed) return;
  localStorage.setItem(LAST_LOGIN_ACCOUNT_STORAGE_KEY, trimmed);
}
