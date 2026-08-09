import type { ActivityDataDecoded } from "../../realtime/activityLobbyWire";
import {
  calendarDayKeyInTimeZone,
  DAILY_LOGIN_CALENDAR_TIME_ZONE,
} from "./dailyLoginLogic";

const ACTIVITY_ID_KEY = "ffgt:daily-login:activity-id";
const ACTIVITY_SNAPSHOT_KEY = "ffgt:daily-login:activity-snapshot";

type CachedDailyLoginSnapshot = {
  etDateKey: number;
  activity: ActivityDataDecoded;
};

export function readCachedDailyLoginActivityId(): string | null {
  try {
    const id = sessionStorage.getItem(ACTIVITY_ID_KEY)?.trim();
    return id || null;
  } catch {
    return null;
  }
}

export function writeCachedDailyLoginActivityId(activityId: string): void {
  const id = activityId.trim();
  if (!id) return;
  try {
    sessionStorage.setItem(ACTIVITY_ID_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readCachedDailyLoginActivity(
  nowMs: number = Date.now(),
): ActivityDataDecoded | null {
  try {
    const raw = sessionStorage.getItem(ACTIVITY_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as
      | CachedDailyLoginSnapshot
      | ActivityDataDecoded;
    const todayKey = calendarDayKeyInTimeZone(
      nowMs,
      DAILY_LOGIN_CALENDAR_TIME_ZONE,
    );

    if ("etDateKey" in parsed && "activity" in parsed) {
      if (parsed.etDateKey !== todayKey) return null;
      const activityId = String(parsed.activity.activityID ?? "").trim();
      return activityId ? parsed.activity : null;
    }

    const legacy = parsed as ActivityDataDecoded;
    const activityId = String(legacy.activityID ?? "").trim();
    return activityId ? legacy : null;
  } catch {
    return null;
  }
}

export function writeCachedDailyLoginActivity(
  activity: ActivityDataDecoded,
  nowMs: number = Date.now(),
): void {
  const activityId = String(activity.activityID ?? "").trim();
  if (!activityId) return;
  try {
    const snapshot: CachedDailyLoginSnapshot = {
      etDateKey: calendarDayKeyInTimeZone(
        nowMs,
        DAILY_LOGIN_CALENDAR_TIME_ZONE,
      ),
      activity,
    };
    sessionStorage.setItem(ACTIVITY_SNAPSHOT_KEY, JSON.stringify(snapshot));
    writeCachedDailyLoginActivityId(activityId);
  } catch {
    /* ignore */
  }
}

export function clearCachedDailyLoginActivity(): void {
  try {
    sessionStorage.removeItem(ACTIVITY_SNAPSHOT_KEY);
    sessionStorage.removeItem(ACTIVITY_ID_KEY);
  } catch {
    /* ignore */
  }
}
