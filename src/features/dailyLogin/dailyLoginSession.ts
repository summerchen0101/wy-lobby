import {
  calendarDayKeyInTimeZone,
  DAILY_LOGIN_CALENDAR_TIME_ZONE,
} from "./dailyLoginLogic";

const DAILY_CLAIM_DATE_KEY_PREFIX = "dailyLogin.claimedEtDateKey";

/** 本輪登入（SPA 生命週期）是否已自動彈過；登出後清除，重新登入可再彈。 */
let autoPopupShownUserId: string | null = null;
const claimedDailyDateKeyByUser = new Map<string, number>();

function claimStorageKey(userId: string): string {
  return `${DAILY_CLAIM_DATE_KEY_PREFIX}:${userId}`;
}

function readStoredClaimedDailyDateKey(userId: string): number | null {
  const id = userId.trim();
  if (!id || id === "0") return null;
  try {
    const raw = sessionStorage.getItem(claimStorageKey(id));
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredClaimedDailyDateKey(
  userId: string,
  key: number | null,
): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  try {
    const storageKey = claimStorageKey(id);
    if (key == null) {
      sessionStorage.removeItem(storageKey);
      return;
    }
    sessionStorage.setItem(storageKey, String(key));
  } catch {
    /* ignore */
  }
}

/** 當日 ET 已成功領取過每日簽到（每天僅能打卡一次）。 */
export function markDailyClaimedToday(
  userId: string,
  nowMs: number = Date.now(),
): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  const dateKey = calendarDayKeyInTimeZone(
    nowMs,
    DAILY_LOGIN_CALENDAR_TIME_ZONE,
  );
  claimedDailyDateKeyByUser.set(id, dateKey);
  writeStoredClaimedDailyDateKey(id, dateKey);
}

export function hasClaimedDailyToday(
  userId: string,
  nowMs: number = Date.now(),
): boolean {
  const id = userId.trim();
  if (!id || id === "0") return false;
  let dateKey = claimedDailyDateKeyByUser.get(id);
  if (dateKey === undefined) {
    dateKey = readStoredClaimedDailyDateKey(id) ?? undefined;
    if (dateKey !== undefined) {
      claimedDailyDateKeyByUser.set(id, dateKey);
    }
  }
  if (dateKey === undefined) return false;
  return (
    dateKey ===
    calendarDayKeyInTimeZone(nowMs, DAILY_LOGIN_CALENDAR_TIME_ZONE)
  );
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

/** 登出時呼叫：僅重置自動彈窗；當日已領紀錄保留，避免同日重登後下一天錯誤亮起。 */
export function clearDailyLoginAutoPopupSession(): void {
  autoPopupShownUserId = null;
}

/** @internal test helper */
export function clearDailyLoginClaimRecord(userId: string): void {
  const id = userId.trim();
  if (!id) return;
  claimedDailyDateKeyByUser.delete(id);
  writeStoredClaimedDailyDateKey(id, null);
}
