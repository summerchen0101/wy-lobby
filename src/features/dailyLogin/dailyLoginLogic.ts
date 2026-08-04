import type {
  ActivityDataDecoded,
  UserDailyMissionDecoded,
} from "../../realtime/activityLobbyWire";
import {
  normalizeWireTimestampToMs,
  normalizeWireTimestampToSec,
  parseWireInt64,
} from "../../realtime/activityLobbyWire";

export type MissionStatus = "locked" | "claimable" | "claimed";

export const DAILY_LOGIN_CALENDAR_TIME_ZONE = "America/New_York";

export type FlatMission = {
  index: number;
  mission: UserDailyMissionDecoded;
  groupDateMs: number;
};

export type DayReward = {
  itemID: number;
  itemAmount: number;
  wallet: "GC" | "SC";
};

export type DayViewModel = {
  dayNumber: number;
  index: number;
  missions: UserDailyMissionDecoded[];
  dateMs: number;
  status: MissionStatus;
  rewards: DayReward[];
  claimableMissionIds: string[];
};

export type CreditRewardViewModel = {
  requiredCreditAmount: number;
  rewards: DayReward[];
  isCollected: boolean;
  claimable: boolean;
};

export type DailyLoginViewModel = {
  activityId: string;
  dateRangeLabel: string;
  achievedCreditAmount: number;
  days: DayViewModel[];
  creditRewards: CreditRewardViewModel[];
  hasClaimableDaily: boolean;
  hasClaimableCredit: boolean;
  claimable: boolean;
};

/** Fixed cumulative sign-in gift milestones (doc / APP). */
export const CREDIT_MILESTONE_THRESHOLDS = [8, 15, 22, 30] as const;
export const CREDIT_MILESTONE_MAX = 30;

function walletFromItemId(itemID: number): "GC" | "SC" {
  return itemID === 2 ? "SC" : "GC";
}

function missionRequiredActionTimes(m: UserDailyMissionDecoded): number {
  const parsed = parseWireInt64(m.achievedActionTimes);
  if (parsed === null || parsed <= 0) return 1;
  return parsed;
}

export function getMissionProgress(m: UserDailyMissionDecoded): {
  progress: number;
  target: number;
} {
  return {
    progress: parseWireInt64(m.actionTimes) ?? 0,
    target: missionRequiredActionTimes(m),
  };
}

export function getMissionStatus(m: UserDailyMissionDecoded): MissionStatus {
  const { progress, target } = getMissionProgress(m);
  if (m.isCollected) return "claimed";
  // 小強：登入才會把 actionTimes 從 0 改 1；0 表示尚未完成
  if (progress <= 0 || progress < target) return "locked";
  return "claimable";
}

export function isMissionClaimable(m: UserDailyMissionDecoded): boolean {
  return getMissionStatus(m) === "claimable";
}

/** xlsx: actionTimes (progress) >= achievedActionTimes (required) && !isCollected */
export function isMissionCollectEligible(
  m: UserDailyMissionDecoded,
): boolean {
  return isMissionClaimable(m);
}

export function calendarDayKeyInTimeZone(
  ms: number,
  timeZone: string = DAILY_LOGIN_CALENDAR_TIME_ZONE,
): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");
  return year * 10000 + month * 100 + day;
}

export function isSameCalendarDayInTimeZone(
  aMs: number,
  bMs: number,
  timeZone: string = DAILY_LOGIN_CALENDAR_TIME_ZONE,
): boolean {
  return (
    calendarDayKeyInTimeZone(aMs, timeZone) ===
    calendarDayKeyInTimeZone(bMs, timeZone)
  );
}

export function isDayCollectable(
  day: Pick<DayViewModel, "status" | "claimableMissionIds" | "missions">,
): boolean {
  if (day.status !== "claimable") return false;
  return getCollectableMissionIdsForDay(day as DayViewModel).length > 0;
}

/** @deprecated Cumulative sign-in: mission date is not a claim gate. Use {@link isDayCollectable}. */
export function isDayClaimableToday(
  day: Pick<DayViewModel, "status" | "dateMs" | "claimableMissionIds" | "missions">,
): boolean {
  return isDayCollectable(day);
}

export function getCollectableMissionIdsForDay(day: DayViewModel): string[] {
  return day.claimableMissionIds.filter((id) => {
    const mission = day.missions.find(
      (m) => String(m.dailyMissionID ?? "") === id,
    );
    return mission != null && isMissionCollectEligible(mission);
  });
}

export function findCollectableDay(
  viewModel: DailyLoginViewModel | null,
): DayViewModel | null {
  const day = viewModel?.days.find((d) => isDayCollectable(d));
  if (!day) return null;
  const claimableMissionIds = getCollectableMissionIdsForDay(day);
  if (claimableMissionIds.length === 0) return null;
  return { ...day, claimableMissionIds };
}

/** @deprecated Use {@link findCollectableDay}. */
export function findTodayCollectableDay(
  viewModel: DailyLoginViewModel | null,
): DayViewModel | null {
  return findCollectableDay(viewModel);
}

export function isActivityInDisplayWindow(
  displayStartRaw: string | number | undefined,
  displayEndRaw: string | number | undefined,
  nowMs: number = Date.now(),
): boolean {
  const displayStartSec = normalizeWireTimestampToSec(displayStartRaw) ?? 0;
  const displayEndSec = normalizeWireTimestampToSec(displayEndRaw) ?? 0;
  const nowSec = Math.floor(nowMs / 1000);
  if (displayStartSec > 0 && nowSec < displayStartSec) return false;
  if (displayEndSec > 0 && nowSec > displayEndSec) return false;
  return true;
}

export function flattenDailyMissions(
  activity: ActivityDataDecoded,
): FlatMission[] {
  const map = activity.UserDailyMissionsByDates ?? {};
  const groups = Object.entries(map)
    .map(([key, group]) => {
      const dateFromKey = normalizeWireTimestampToMs(key);
      const dateFromGroup = normalizeWireTimestampToMs(group?.date);
      const dateMs = dateFromGroup ?? dateFromKey ?? 0;
      return { dateMs, missions: group?.userDailyMissions ?? [] };
    })
    .sort((a, b) => a.dateMs - b.dateMs);

  const flat: FlatMission[] = [];
  for (const { dateMs, missions } of groups) {
    const sorted = [...missions].sort(
      (a, b) =>
        (parseWireInt64(a.sort) ?? 0) - (parseWireInt64(b.sort) ?? 0),
    );
    for (const mission of sorted) {
      const missionDate =
        normalizeWireTimestampToMs(mission.date) ?? dateMs;
      flat.push({ index: flat.length, mission, groupDateMs: missionDate });
    }
  }
  return flat;
}

function rewardsFromMissions(missions: UserDailyMissionDecoded[]): DayReward[] {
  const rewards: DayReward[] = [];
  for (const m of missions) {
    const itemID = parseWireInt64(m.itemID) ?? 0;
    const itemAmount = parseWireInt64(m.itemAmount) ?? 0;
    if (itemID <= 0 || itemAmount <= 0) continue;
    rewards.push({
      itemID,
      itemAmount,
      wallet: walletFromItemId(itemID),
    });
  }
  return rewards;
}

function dayStatusFromMissions(
  missions: UserDailyMissionDecoded[],
): MissionStatus {
  if (missions.length === 0) return "locked";
  if (missions.every((m) => getMissionStatus(m) === "claimed")) return "claimed";
  if (missions.some((m) => isMissionClaimable(m))) return "claimable";
  return "locked";
}

type DayGroup = {
  dateMs: number;
  missions: UserDailyMissionDecoded[];
  indices: number[];
};

function groupFlatIntoDayGroups(flat: FlatMission[]): DayGroup[] {
  const groups: DayGroup[] = [];

  for (const row of flat) {
    const dateMs = row.groupDateMs;
    const last = groups[groups.length - 1];
    if (last && last.dateMs === dateMs) {
      last.missions.push(row.mission);
      last.indices.push(row.index);
    } else {
      groups.push({
        dateMs,
        missions: [row.mission],
        indices: [row.index],
      });
    }
  }

  return groups;
}

function collectClaimableMissionIds(
  missions: UserDailyMissionDecoded[],
  status: MissionStatus,
): string[] {
  if (status !== "claimable") return [];
  return missions
    .filter((m) => isMissionCollectEligible(m))
    .map((m) => String(m.dailyMissionID ?? ""))
    .filter(Boolean);
}

function dayViewModelFromGroup(
  group: DayGroup,
  dayNumber: number,
): DayViewModel {
  const status = dayStatusFromMissions(group.missions);
  const claimableMissionIds = collectClaimableMissionIds(
    group.missions,
    status,
  );
  return {
    dayNumber,
    index: group.indices[0] ?? dayNumber - 1,
    missions: group.missions,
    dateMs: group.dateMs,
    status,
    rewards: rewardsFromMissions(group.missions),
    claimableMissionIds,
  };
}

function createPlaceholderDayGroup(dateMs: number): DayGroup {
  return { dateMs, missions: [], indices: [] };
}

function computeActiveDayIndex(groups: DayGroup[]): number {
  const claimableIdx = groups.findIndex(
    (g) => dayStatusFromMissions(g.missions) === "claimable",
  );
  if (claimableIdx >= 0) return claimableIdx;

  const nextPendingIdx = groups.findIndex(
    (g) => dayStatusFromMissions(g.missions) === "locked",
  );
  if (nextPendingIdx >= 0) return nextPendingIdx;

  const lastClaimedIdx = groups.reduce(
    (acc, g, i) =>
      dayStatusFromMissions(g.missions) === "claimed" ? i : acc,
    -1,
  );
  if (lastClaimedIdx >= 0) {
    return Math.min(lastClaimedIdx + 1, Math.max(0, groups.length - 1));
  }
  return 0;
}

function isWindowFullyClaimed(
  groups: DayGroup[],
  cycleStart: number,
): boolean {
  const window = groups.slice(cycleStart, cycleStart + 7);
  return (
    window.length === 7 &&
    window.every((g) => dayStatusFromMissions(g.missions) === "claimed")
  );
}

function firstUnclaimedIndexInWindow(
  groups: DayGroup[],
  windowStart: number,
): number {
  for (let i = windowStart; i < windowStart + 7 && i < groups.length; i++) {
    const group = groups[i]!;
    if (dayStatusFromMissions(group.missions) !== "claimed") {
      return i;
    }
  }
  return -1;
}

function shouldHoldCompletedWindow(
  groups: DayGroup[],
  cycleStart: number,
): boolean {
  if (!isWindowFullyClaimed(groups, cycleStart)) return false;

  const nextWindowStart = cycleStart + 7;
  if (nextWindowStart >= groups.length) return true;

  const nextUnclaimedIdx = firstUnclaimedIndexInWindow(
    groups,
    nextWindowStart,
  );
  if (nextUnclaimedIdx < 0) return false;

  const nextGroup = groups[nextUnclaimedIdx]!;
  const nextStatus = dayStatusFromMissions(nextGroup.missions);

  if (nextStatus === "claimable") {
    return false;
  }

  return true;
}

function computeCycleStartDayIndex(groups: DayGroup[]): number {
  const activeIndex = computeActiveDayIndex(groups);
  const naturalCycle = Math.floor(activeIndex / 7) * 7;
  const prevStart = naturalCycle - 7;

  if (
    prevStart >= 0 &&
    isWindowFullyClaimed(groups, prevStart) &&
    shouldHoldCompletedWindow(groups, prevStart)
  ) {
    return prevStart;
  }

  return naturalCycle;
}

function padDayGroupsToSeven(
  groups: DayGroup[],
  allDayGroups: DayGroup[],
  cycleStart: number,
): DayGroup[] {
  if (groups.length >= 7) return groups.slice(0, 7);

  const padded = [...groups];
  let nextIdx = cycleStart + groups.length;
  while (padded.length < 7 && nextIdx < allDayGroups.length) {
    padded.push(allDayGroups[nextIdx]!);
    nextIdx += 1;
  }

  let cursor =
    padded.length > 0 ? padded[padded.length - 1]!.dateMs : Date.now();
  while (padded.length < 7) {
    cursor += 86400000;
    padded.push(createPlaceholderDayGroup(cursor));
  }
  return padded;
}

export function groupFlatMissionsByDate(
  flat: FlatMission[],
  startDayNumber: number,
): DayViewModel[] {
  const groups: Array<{
    dateMs: number;
    missions: UserDailyMissionDecoded[];
    indices: number[];
  }> = [];

  for (const row of flat) {
    const dateMs = row.groupDateMs;
    const last = groups[groups.length - 1];
    if (last && last.dateMs === dateMs) {
      last.missions.push(row.mission);
      last.indices.push(row.index);
    } else {
      groups.push({
        dateMs,
        missions: [row.mission],
        indices: [row.index],
      });
    }
  }

  return groups.map((g, i) => {
    const status = dayStatusFromMissions(g.missions);
    const claimableMissionIds = collectClaimableMissionIds(g.missions, status);
    return {
      dayNumber: startDayNumber + i,
      index: g.indices[0] ?? i,
      missions: g.missions,
      dateMs: g.dateMs,
      status,
      rewards: rewardsFromMissions(g.missions),
      claimableMissionIds,
    };
  });
}

export function computeSevenDayWindow(
  flat: FlatMission[],
): {
  startIndex: number;
  days: DayViewModel[];
} {
  const allDayGroups = groupFlatIntoDayGroups(flat);
  if (allDayGroups.length === 0) {
    const placeholders = padDayGroupsToSeven([], [], 0);
    return {
      startIndex: 0,
      days: placeholders.map((g, i) => dayViewModelFromGroup(g, i + 1)),
    };
  }

  const cycleStart = computeCycleStartDayIndex(allDayGroups);
  const windowGroups = padDayGroupsToSeven(
    allDayGroups.slice(cycleStart, cycleStart + 7),
    allDayGroups,
    cycleStart,
  );
  const startIndex = allDayGroups[cycleStart]?.indices[0] ?? 0;

  return {
    startIndex,
    days: windowGroups.map((g, i) => dayViewModelFromGroup(g, i + 1)),
  };
}

export function formatDateRangeEtLabel(
  startMs: number,
  endMs: number,
): string {
  const fmt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DAILY_LOGIN_CALENDAR_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(ms));
    const mm = parts.find((p) => p.type === "month")?.value ?? "00";
    const dd = parts.find((p) => p.type === "day")?.value ?? "00";
    const yyyy = parts.find((p) => p.type === "year")?.value ?? "0000";
    return `${mm}/${dd}/${yyyy}`;
  };
  if (!startMs && !endMs) return "";
  if (!endMs) return `${fmt(startMs)} (ET)`;
  return `${fmt(startMs)} - ${fmt(endMs)} (ET)`;
}

/**
 * Infer same-day daily claim from GET_ACTIVITY when session storage was cleared
 * (e.g. logout → login). Cumulative sign-in: the next uncollected mission still
 * has actionTimes < target after today's check-in (login syncs only the current slot).
 */
export function inferClaimedDailyTodayFromActivity(
  activity: ActivityDataDecoded,
): boolean {
  const flat = flattenDailyMissions(activity);
  if (flat.length === 0) return false;

  const firstPending = flat.find((row) => !row.mission.isCollected);
  if (!firstPending) return false;

  const hasPriorCollected = flat.some(
    (row) => row.index < firstPending.index && row.mission.isCollected,
  );
  if (!hasPriorCollected) return false;

  const { progress, target } = getMissionProgress(firstPending.mission);
  return progress < target;
}

/** @deprecated Cumulative sign-in: mission date is not a claim gate. */
export function applyMissionDateClaimGate(days: DayViewModel[]): DayViewModel[] {
  return days;
}

/** 每天僅能領一次每日簽到：當日已領後其餘「可領」格改為 locked。 */
export function applySameDayDailyClaimCap(
  days: DayViewModel[],
  claimedDailyToday: boolean,
): DayViewModel[] {
  if (!claimedDailyToday) return days;
  return days.map((day) => {
    if (day.status !== "claimable") return day;
    return {
      ...day,
      status: "locked" as const,
      claimableMissionIds: [],
    };
  });
}

export function enforceSequentialDayStatuses(
  days: DayViewModel[],
): DayViewModel[] {
  const collectableIdx = days.findIndex((day) => isDayCollectable(day));
  if (collectableIdx >= 0) {
    return days.map((day, i) => {
      if (day.status === "claimed") return day;
      if (i === collectableIdx) return day;
      return {
        ...day,
        status: "locked" as const,
        claimableMissionIds: [],
      };
    });
  }

  const firstUnclaimed = days.findIndex((d) => d.status !== "claimed");
  if (firstUnclaimed < 0) return days;

  return days.map((day, i) => {
    if (day.status === "claimed") return day;
    if (i === firstUnclaimed && day.status === "claimable") return day;
    return {
      ...day,
      status: "locked" as const,
      claimableMissionIds: [],
    };
  });
}

export function findClaimableCreditRewards(
  activity: ActivityDataDecoded,
): CreditRewardViewModel[] {
  const achieved = parseWireInt64(activity.achievedCreditAmount) ?? 0;
  const rows = activity.dailyMissionCreditRewards ?? [];
  const byThreshold = new Map<number, typeof rows>();
  for (const r of rows) {
    const required = parseWireInt64(r.requiredCreditAmount) ?? 0;
    if (required <= 0) continue;
    const list = byThreshold.get(required) ?? [];
    list.push(r);
    byThreshold.set(required, list);
  }

  return CREDIT_MILESTONE_THRESHOLDS.map((threshold) => {
    const thresholdRows = byThreshold.get(threshold) ?? [];
    const byWallet = new Map<"GC" | "SC", DayReward & { isCollected: boolean }>();
    for (const row of thresholdRows) {
      const itemID = parseWireInt64(row.itemID) ?? 0;
      const wallet = walletFromItemId(itemID);
      if (byWallet.has(wallet)) continue;
      byWallet.set(wallet, {
        itemID,
        itemAmount: parseWireInt64(row.itemAmount) ?? 0,
        wallet,
        isCollected: Boolean(row.isCollected),
      });
    }
    const rewardLines = [...byWallet.values()];
    const rewards: DayReward[] = rewardLines.map(
      ({ itemID, itemAmount, wallet }) => ({ itemID, itemAmount, wallet }),
    );
    const isCollected =
      rewardLines.length > 0 && rewardLines.every((line) => line.isCollected);
    const claimable =
      rewardLines.length > 0 && !isCollected && achieved >= threshold;

    return {
      requiredCreditAmount: threshold,
      rewards,
      isCollected,
      claimable,
    };
  });
}

export function canClaimTodayUtc(
  flat: FlatMission[],
): boolean {
  if (flat.length === 0) return false;
  const { days } = computeSevenDayWindow(flat);
  return enforceSequentialDayStatuses(days).some((day) => isDayCollectable(day));
}

export type BuildDailyLoginViewModelOptions = {
  /** 當日 ET 是否已成功領取過每日簽到（每天僅能打卡一次）。 */
  claimedDailyToday?: boolean;
};

export function buildDailyLoginViewModel(
  activity: ActivityDataDecoded,
  nowMs: number = Date.now(),
  options?: BuildDailyLoginViewModelOptions,
): DailyLoginViewModel | null {
  const activityId = String(activity.activityID ?? "").trim();
  if (!activityId) return null;

  const inDisplayWindow = isActivityInDisplayWindow(
    activity.displayStartTime,
    activity.displayEndTime,
    nowMs,
  );

  const flat = flattenDailyMissions(activity);
  const { days: rawDays } = computeSevenDayWindow(flat);
  const claimedDailyToday =
    options?.claimedDailyToday === true ||
    inferClaimedDailyTodayFromActivity(activity);
  const days = applySameDayDailyClaimCap(
    enforceSequentialDayStatuses(rawDays),
    claimedDailyToday,
  );
  const creditRewards = findClaimableCreditRewards(activity);
  const hasClaimableDaily =
    inDisplayWindow && days.some((day) => isDayCollectable(day));
  const hasClaimableCredit =
    inDisplayWindow && creditRewards.some((r) => r.claimable);

  const firstDayMs = days[0]?.dateMs ?? 0;
  const lastDayMs = days[days.length - 1]?.dateMs ?? firstDayMs;

  return {
    activityId,
    dateRangeLabel: formatDateRangeEtLabel(firstDayMs, lastDayMs),
    achievedCreditAmount: parseWireInt64(activity.achievedCreditAmount) ?? 0,
    days,
    creditRewards,
    hasClaimableDaily,
    hasClaimableCredit,
    claimable:
      inDisplayWindow && (hasClaimableDaily || hasClaimableCredit),
  };
}

/** 當日尚未打卡且可領取時，登入後應自動彈出一次。 */
export function shouldAutoPopupDailyLogin(
  viewModel: DailyLoginViewModel | null,
): boolean {
  return viewModel?.hasClaimableDaily === true;
}

export function findClaimableCreditRewardAmounts(
  rewards: CreditRewardViewModel[],
): number[] {
  return rewards.filter((r) => r.claimable).map((r) => r.requiredCreditAmount);
}

export function buildMockDailyLoginActivity(
  overrides?: Partial<ActivityDataDecoded>,
): ActivityDataDecoded {
  const now = Date.now();
  const dayMs = 86400000;
  const missions: UserDailyMissionDecoded[] = [];
  for (let i = 0; i < 14; i++) {
    const dateMs = now - (5 - i) * dayMs;
    const collected = i < 5;
    const claimable = i === 5;
    missions.push({
      dailyMissionID: String(1000 + i),
      date: String(dateMs),
      actionTimes: claimable || collected ? 1 : 0,
      achievedActionTimes: 1,
      itemID: 1,
      itemAmount: 10000 * (i + 1),
      isCollected: collected,
      sort: String(i),
    });
  }

  const byDate: Record<string, { date: string; userDailyMissions: UserDailyMissionDecoded[] }> =
    {};
  for (const m of missions) {
    const key = String(m.date);
    if (!byDate[key]) {
      byDate[key] = { date: key, userDailyMissions: [] };
    }
    byDate[key].userDailyMissions.push(m);
  }

  return {
    activityID: "9001",
    activityType: "DailySignIn",
    activityName: "Daily Login",
    displayStartTime: "0",
    displayEndTime: "0",
    achievedCreditAmount: "5",
    dailyMissionCreditRewards: [
      {
        requiredCreditAmount: "8",
        itemID: "1",
        itemAmount: "50000",
        isCollected: false,
      },
      {
        requiredCreditAmount: "8",
        itemID: "2",
        itemAmount: "5000",
        isCollected: false,
      },
      {
        requiredCreditAmount: "15",
        itemID: "1",
        itemAmount: "200000",
        isCollected: false,
      },
      {
        requiredCreditAmount: "15",
        itemID: "2",
        itemAmount: "10000",
        isCollected: false,
      },
      {
        requiredCreditAmount: "22",
        itemID: "1",
        itemAmount: "500000",
        isCollected: false,
      },
      {
        requiredCreditAmount: "22",
        itemID: "2",
        itemAmount: "15000",
        isCollected: false,
      },
      {
        requiredCreditAmount: "30",
        itemID: "1",
        itemAmount: "1000000",
        isCollected: false,
      },
      {
        requiredCreditAmount: "30",
        itemID: "2",
        itemAmount: "30000",
        isCollected: false,
      },
    ],
    UserDailyMissionsByDates: byDate,
    ...overrides,
  };
}
