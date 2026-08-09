import {
  calendarDayKeyInTimeZone,
  DAILY_LOGIN_CALENDAR_TIME_ZONE,
} from "./dailyLoginLogic";

const DAILY_CLAIM_DATE_KEY_PREFIX = "dailyLogin.claimedEtDateKey";
const INITIAL_COLLECTABLE_COUNT_KEY_PREFIX =
  "dailyLogin.initialCollectableCount";
const INITIAL_COLLECTABLE_DATE_KEY_PREFIX =
  "dailyLogin.initialCollectableEtDateKey";

/** 本輪登入（SPA 生命週期）是否已自動彈過；登出後清除，重新登入可再彈。 */
let autoPopupShownUserId: string | null = null;
const claimedDailyDateKeyByUser = new Map<string, number>();
const initialCollectableCountByUser = new Map<string, number>();
const initialCollectableDateKeyByUser = new Map<string, number>();

function claimStorageKey(userId: string): string {
  return `${DAILY_CLAIM_DATE_KEY_PREFIX}:${userId}`;
}

function initialCountStorageKey(userId: string): string {
  return `${INITIAL_COLLECTABLE_COUNT_KEY_PREFIX}:${userId}`;
}

function initialCountDateStorageKey(userId: string): string {
  return `${INITIAL_COLLECTABLE_DATE_KEY_PREFIX}:${userId}`;
}

function readStoredClaimedDailyDateKey(userId: string): number | null {
  const id = userId.trim();
  if (!id || id === "0") return null;
  try {
    const raw = localStorage.getItem(claimStorageKey(id));
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
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, String(key));
  } catch {
    /* ignore */
  }
}

function readStoredInitialCollectableCount(userId: string): {
  dateKey: number;
  count: number;
} | null {
  const id = userId.trim();
  if (!id || id === "0") return null;
  try {
    const dateRaw = localStorage.getItem(initialCountDateStorageKey(id));
    const countRaw = localStorage.getItem(initialCountStorageKey(id));
    if (!dateRaw || !countRaw) return null;
    const dateKey = Number(dateRaw);
    const count = Number(countRaw);
    if (!Number.isFinite(dateKey) || !Number.isFinite(count)) return null;
    return { dateKey, count };
  } catch {
    return null;
  }
}

function writeStoredInitialCollectableCount(
  userId: string,
  dateKey: number,
  count: number,
): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  try {
    localStorage.setItem(initialCountDateStorageKey(id), String(dateKey));
    localStorage.setItem(initialCountStorageKey(id), String(count));
  } catch {
    /* ignore */
  }
}

function clearStoredInitialCollectableCount(userId: string): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  try {
    localStorage.removeItem(initialCountDateStorageKey(id));
    localStorage.removeItem(initialCountStorageKey(id));
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

/** 記錄本 ET 日首次 GET_ACTIVITY 時的全量可領筆數（積壓判斷用）。 */
export function recordInitialCollectableCount(
  userId: string,
  count: number,
  nowMs: number = Date.now(),
): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  const dateKey = calendarDayKeyInTimeZone(
    nowMs,
    DAILY_LOGIN_CALENDAR_TIME_ZONE,
  );
  const existingDateKey = initialCollectableDateKeyByUser.get(id);
  if (existingDateKey === dateKey) return;

  const stored = readStoredInitialCollectableCount(id);
  if (stored?.dateKey === dateKey) {
    initialCollectableDateKeyByUser.set(id, stored.dateKey);
    initialCollectableCountByUser.set(id, stored.count);
    return;
  }

  initialCollectableDateKeyByUser.set(id, dateKey);
  initialCollectableCountByUser.set(id, count);
  writeStoredInitialCollectableCount(id, dateKey, count);
}

export function getInitialCollectableCount(
  userId: string,
  nowMs: number = Date.now(),
): number | null {
  const id = userId.trim();
  if (!id || id === "0") return null;
  const todayKey = calendarDayKeyInTimeZone(
    nowMs,
    DAILY_LOGIN_CALENDAR_TIME_ZONE,
  );

  let dateKey = initialCollectableDateKeyByUser.get(id);
  let count = initialCollectableCountByUser.get(id);
  if (dateKey === undefined || count === undefined) {
    const stored = readStoredInitialCollectableCount(id);
    if (stored) {
      dateKey = stored.dateKey;
      count = stored.count;
      initialCollectableDateKeyByUser.set(id, dateKey);
      initialCollectableCountByUser.set(id, count);
    }
  }

  if (dateKey === undefined || count === undefined) return null;
  if (dateKey !== todayKey) return null;
  return count;
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
  initialCollectableCountByUser.delete(id);
  initialCollectableDateKeyByUser.delete(id);
  clearStoredInitialCollectableCount(id);
}
