import type {
  ActivityDataDecoded,
  UserDailyMissionDecoded,
} from "../../realtime/activityLobbyWire";
import { parseWireInt64 } from "../../realtime/activityLobbyWire";

export type MissionStatus = "locked" | "claimable" | "claimed";

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

export function getMissionProgress(m: UserDailyMissionDecoded): {
  progress: number;
  target: number;
} {
  return {
    progress: parseWireInt64(m.actionTimes) ?? 0,
    target: parseWireInt64(m.achievedActionTimes) ?? 1,
  };
}

export function getMissionStatus(m: UserDailyMissionDecoded): MissionStatus {
  const { progress, target } = getMissionProgress(m);
  if (m.isCollected) return "claimed";
  if (progress >= target) return "claimable";
  return "locked";
}

export function isMissionClaimable(m: UserDailyMissionDecoded): boolean {
  return getMissionStatus(m) === "claimable";
}

export function isActivityInDisplayWindow(
  displayStartSec: number,
  displayEndSec: number,
  nowMs: number = Date.now(),
): boolean {
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
      const dateFromKey = parseWireInt64(key);
      const dateFromGroup = parseWireInt64(group?.date);
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
      const missionDate = parseWireInt64(mission.date) ?? dateMs;
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

function dayStatusFromMissions(missions: UserDailyMissionDecoded[]): MissionStatus {
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
    const dateMs = parseWireInt64(row.mission.date) ?? row.groupDateMs;
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

function dayViewModelFromGroup(
  group: DayGroup,
  dayNumber: number,
): DayViewModel {
  const status = dayStatusFromMissions(group.missions);
  const claimableMissionIds = group.missions
    .filter(isMissionClaimable)
    .map((m) => String(m.dailyMissionID ?? ""))
    .filter(Boolean);
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

function utcCalendarDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isWindowFullyClaimed(groups: DayGroup[], cycleStart: number): boolean {
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
    if (dayStatusFromMissions(groups[i]!.missions) !== "claimed") return i;
  }
  return -1;
}

function shouldHoldCompletedWindow(
  groups: DayGroup[],
  cycleStart: number,
  nowMs: number,
): boolean {
  if (!isWindowFullyClaimed(groups, cycleStart)) return false;

  const nextWindowStart = cycleStart + 7;
  if (nextWindowStart >= groups.length) return true;

  const nextUnclaimedIdx = firstUnclaimedIndexInWindow(groups, nextWindowStart);
  if (nextUnclaimedIdx < 0) return false;

  const nextGroup = groups[nextUnclaimedIdx]!;
  const nextStatus = dayStatusFromMissions(nextGroup.missions);

  if (nextStatus === "claimable") {
    return utcCalendarDay(nowMs) !== utcCalendarDay(nextGroup.dateMs);
  }

  return true;
}

function computeCycleStartDayIndex(
  groups: DayGroup[],
  nowMs: number = Date.now(),
): number {
  const activeIndex = computeActiveDayIndex(groups);
  const naturalCycle = Math.floor(activeIndex / 7) * 7;
  const prevStart = naturalCycle - 7;

  if (
    prevStart >= 0 &&
    isWindowFullyClaimed(groups, prevStart) &&
    shouldHoldCompletedWindow(groups, prevStart, nowMs)
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
    const dateMs = parseWireInt64(row.mission.date) ?? row.groupDateMs;
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
    const claimableMissionIds = g.missions
      .filter(isMissionClaimable)
      .map((m) => String(m.dailyMissionID ?? ""))
      .filter(Boolean);
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
  nowMs: number = Date.now(),
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

  const cycleStart = computeCycleStartDayIndex(allDayGroups, nowMs);
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
    const d = new Date(ms);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };
  if (!startMs && !endMs) return "";
  if (!endMs) return `${fmt(startMs)} (ET)`;
  return `${fmt(startMs)} - ${fmt(endMs)} (ET)`;
}

export function enforceSequentialDayStatuses(
  days: DayViewModel[],
): DayViewModel[] {
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
  nowMs: number = Date.now(),
): boolean {
  if (flat.length === 0) return false;
  const { days } = computeSevenDayWindow(flat, nowMs);
  const claimableDay = enforceSequentialDayStatuses(days).find(
    (d) => d.status === "claimable",
  );
  if (!claimableDay || claimableDay.missions.length === 0) return false;

  const missionDateMs = claimableDay.dateMs;
  const missionUtc = new Date(missionDateMs);
  const nowUtc = new Date(nowMs);

  const missionDay = Date.UTC(
    missionUtc.getUTCFullYear(),
    missionUtc.getUTCMonth(),
    missionUtc.getUTCDate(),
  );
  const todayDay = Date.UTC(
    nowUtc.getUTCFullYear(),
    nowUtc.getUTCMonth(),
    nowUtc.getUTCDate(),
  );

  if (todayDay !== missionDay) return false;

  return claimableDay.claimableMissionIds.length > 0;
}

export function buildDailyLoginViewModel(
  activity: ActivityDataDecoded,
  nowMs: number = Date.now(),
): DailyLoginViewModel | null {
  const activityId = String(activity.activityID ?? "").trim();
  if (!activityId) return null;

  const displayStart = parseWireInt64(activity.displayStartTime) ?? 0;
  const displayEnd = parseWireInt64(activity.displayEndTime) ?? 0;
  const inDisplayWindow = isActivityInDisplayWindow(
    displayStart,
    displayEnd,
    nowMs,
  );

  const flat = flattenDailyMissions(activity);
  const { days: rawDays } = computeSevenDayWindow(flat, nowMs);
  const days = enforceSequentialDayStatuses(rawDays);
  const creditRewards = findClaimableCreditRewards(activity);
  const hasClaimableDaily =
    inDisplayWindow &&
    canClaimTodayUtc(flat, nowMs) &&
    days.some((d) => d.status === "claimable");
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
      actionTimes: claimable ? 1 : collected ? 1 : 0,
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
