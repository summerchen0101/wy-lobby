import type { ActivityDataDecoded } from "../../realtime/activityLobbyWire";

const ACTIVITY_ID_KEY = "ffgt:daily-login:activity-id";
const ACTIVITY_SNAPSHOT_KEY = "ffgt:daily-login:activity-snapshot";

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

export function readCachedDailyLoginActivity(): ActivityDataDecoded | null {
  try {
    const raw = sessionStorage.getItem(ACTIVITY_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivityDataDecoded;
    const activityId = String(parsed.activityID ?? "").trim();
    return activityId ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedDailyLoginActivity(
  activity: ActivityDataDecoded,
): void {
  const activityId = String(activity.activityID ?? "").trim();
  if (!activityId) return;
  try {
    sessionStorage.setItem(ACTIVITY_SNAPSHOT_KEY, JSON.stringify(activity));
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
