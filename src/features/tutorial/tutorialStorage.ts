const STORAGE_KEY = "ffgt_newbie_tutorial_done_v1";

export function isNewbieTutorialMarkedDone(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function markNewbieTutorialDone(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, "1");
}
