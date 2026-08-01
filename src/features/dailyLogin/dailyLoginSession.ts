import { calendarDayKeyInTimeZone } from "./dailyLoginLogic";

const DAILY_CLAIM_DATE_KEY_STORAGE = "dailyLogin.claimedEtDateKey";

/** 本輪登入（SPA 生命週期）是否已自動彈過；登出後清除，重新登入可再彈。 */
let autoPopupShownUserId: string | null = null;
let claimedDailyDateKey: number | null = null;

function readStoredClaimedDailyDateKey(): number | null {
  try {
    const raw = sessionStorage.getItem(DAILY_CLAIM_DATE_KEY_STORAGE);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredClaimedDailyDateKey(key: number | null): void {
  try {
    if (key == null) {
      sessionStorage.removeItem(DAILY_CLAIM_DATE_KEY_STORAGE);
      return;
    }
    sessionStorage.setItem(DAILY_CLAIM_DATE_KEY_STORAGE, String(key));
  } catch {
    /* ignore */
  }
}

/** 當日 ET 已成功領取過每日簽到（每天僅能打卡一次）。 */
export function markDailyClaimedToday(nowMs: number = Date.now()): void {
  claimedDailyDateKey = calendarDayKeyInTimeZone(nowMs);
  writeStoredClaimedDailyDateKey(claimedDailyDateKey);
}

export function hasClaimedDailyToday(nowMs: number = Date.now()): boolean {
  if (claimedDailyDateKey === null) {
    claimedDailyDateKey = readStoredClaimedDailyDateKey();
  }
  if (claimedDailyDateKey === null) return false;
  return claimedDailyDateKey === calendarDayKeyInTimeZone(nowMs);
}

export function wasDailyLoginAutoPopupShown(userId: string): boolean {
  const id = userId.trim();
  if (!id || id === "0") return false;
  return autoPopupShownUserId === id;
}

export function markDailyLoginAutoPopupShown(userId: string): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  autoPopupShownUserId = id;
}

/** 登出時呼叫，讓下次登入（當日未打卡）可再自動彈出每日登入。 */
export function clearDailyLoginAutoPopupSession(): void {
  autoPopupShownUserId = null;
  claimedDailyDateKey = null;
  writeStoredClaimedDailyDateKey(null);
}
