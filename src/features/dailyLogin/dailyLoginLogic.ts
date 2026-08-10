import type {
  ActivityDataDecoded,
  UserDailyMissionDecoded,
} from "../../realtime/activityLobbyWire";
import {
  normalizeWireTimestampToMs,
  normalizeWireTimestampToSec,
  parseWireInt64,
} from "../../realtime/activityLobbyWire";
import { applyDailyLoginVipBonus } from "./dailyLoginVipBonus";

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
  if (parsed === null || parsed <= 0) return 0;
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

/**
 * PDF / API：未完成 ActionTimes < AchievedActionTimes；
 * 可領 ActionTimes >= AchievedActionTimes && !IsCollected。
 * 登入後後端才把當前筆 actionTimes 從 0 同步為 1，不可用任務 date 判斷。
 */
export function getMissionStatus(m: UserDailyMissionDecoded): MissionStatus {
  if (m.isCollected) return "claimed";
  const { progress, target } = getMissionProgress(m);
  if (target <= 0) return "locked";
  if (progress < target) return "locked";
  return "claimable";
}

/** xlsx: actionTimes (progress) >= achievedActionTimes (required) */
export function isMissionThresholdMet(
  m: UserDailyMissionDecoded,
): boolean {
  const { progress, target } = getMissionProgress(m);
  return progress >= target;
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
  const rows: Array<{
    mission: UserDailyMissionDecoded;
    groupDateMs: number;
  }> = [];

  for (const [key, group] of Object.entries(map)) {
    const dateFromKey = normalizeWireTimestampToMs(key);
    const dateFromGroup = normalizeWireTimestampToMs(group?.date);
    const groupDateMs = dateFromGroup ?? dateFromKey ?? 0;
    for (const mission of group?.userDailyMissions ?? []) {
      rows.push({ mission, groupDateMs });
    }
  }

  rows.sort((a, b) => {
    const sortDiff =
      (parseWireInt64(a.mission.sort) ?? 0) -
      (parseWireInt64(b.mission.sort) ?? 0);
    if (sortDiff !== 0) return sortDiff;
    const dateA =
      normalizeWireTimestampToMs(a.mission.date) ?? a.groupDateMs;
    const dateB =
      normalizeWireTimestampToMs(b.mission.date) ?? b.groupDateMs;
    if (dateA !== dateB) return dateA - dateB;
    const idA = parseWireInt64(a.mission.dailyMissionID) ?? 0;
    const idB = parseWireInt64(b.mission.dailyMissionID) ?? 0;
    return idA - idB;
  });

  return rows.map((row, index) => ({
    index,
    mission: row.mission,
    groupDateMs:
      normalizeWireTimestampToMs(row.mission.date) ?? row.groupDateMs,
  }));
}

function rewardsFromMissions(
  missions: UserDailyMissionDecoded[],
  vipLevel: number = 0,
): DayReward[] {
  const rewards: DayReward[] = [];
  for (const m of missions) {
    const itemID = parseWireInt64(m.itemID) ?? 0;
    const itemAmount = parseWireInt64(m.itemAmount) ?? 0;
    if (itemID <= 0 || itemAmount <= 0) continue;
    rewards.push({
      itemID,
      itemAmount: applyDailyLoginVipBonus(itemAmount, itemID, vipLevel),
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

/** @deprecated Cumulative sign-in: only mission progress gates claimability. */
export function isDayGroupEligibleByAchievedCredit(
  _groupIndex: number,
  _achievedCredit?: number,
  missions?: UserDailyMissionDecoded[],
): boolean {
  return missions?.some((m) => isMissionClaimable(m)) ?? false;
}

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
  displayStatus: MissionStatus,
  vipLevel: number = 0,
): DayViewModel {
  const rawStatus = dayStatusFromMissions(group.missions);
  const claimableMissionIds = collectClaimableMissionIds(
    group.missions,
    displayStatus === "claimable" ? "claimable" : rawStatus,
  );
  return {
    dayNumber,
    index: group.indices[0] ?? dayNumber - 1,
    missions: group.missions,
    dateMs: group.dateMs,
    status: displayStatus,
    rewards: rewardsFromMissions(group.missions, vipLevel),
    claimableMissionIds:
      displayStatus === "claimable" ? claimableMissionIds : [],
  };
}

function createPlaceholderDayGroup(dateMs: number): DayGroup {
  return { dateMs, missions: [], indices: [] };
}

/**
 * 累計簽到今日點位：已領日數 + 目前可領日數（積壓最多 2）− 1。
 * 不用任務 date；避免 API 誤標未來多筆可領時把點位推到最後。
 */
export function findCumulativeProgressDayGroupIndex(
  groups: DayGroup[],
  achievedCredit?: number,
): number {
  let collected = 0;
  for (const group of groups) {
    if (dayStatusFromMissions(group.missions) === "claimed") {
      collected++;
      continue;
    }
    break;
  }
  const leadingClaimable = countLeadingCollectableDayGroupsFromGroups(
    groups,
    achievedCredit,
  );
  if (leadingClaimable <= 0) {
    return Math.max(0, collected - 1);
  }
  const activeSpan = leadingClaimable === 2 ? 2 : 1;
  return collected + activeSpan - 1;
}

export function findCumulativeProgressDayIndexFromFlat(
  flat: FlatMission[],
  achievedCredit?: number,
): number {
  return findCumulativeProgressDayGroupIndex(
    groupFlatIntoDayGroups(flat),
    achievedCredit,
  );
}

/** 從第一筆未領起，連續可領的「日」數（GC+SC 同日只算 1 日）。 */
export function countLeadingCollectableDayGroupsFromGroups(
  groups: DayGroup[],
  achievedCredit?: number,
): number {
  let count = 0;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    const status = dayStatusFromMissions(group.missions);
    if (status === "claimed") continue;
    if (status === "claimable") {
      if (!isDayGroupEligibleByAchievedCredit(i, achievedCredit, group.missions)) {
        break;
      }
      count++;
      continue;
    }
    break;
  }
  return count;
}

export function countLeadingCollectableDayGroupsFromFlat(
  flat: FlatMission[],
  achievedCredit?: number,
): number {
  return countLeadingCollectableDayGroupsFromGroups(
    groupFlatIntoDayGroups(flat),
    achievedCredit,
  );
}

export function countLeadingCollectableDayGroups(
  activity: ActivityDataDecoded,
): number {
  const achievedCredit = parseWireInt64(activity.achievedCreditAmount) ?? 0;
  return countLeadingCollectableDayGroupsFromFlat(
    flattenDailyMissions(activity),
    achievedCredit,
  );
}

function computeLitClaimableDayIndices(
  groups: DayGroup[],
  achievedCredit?: number,
): Set<number> {
  const leading = countLeadingCollectableDayGroupsFromGroups(
    groups,
    achievedCredit,
  );
  const maxLit = leading === 2 ? 2 : 1;
  const lit = new Set<number>();
  let count = 0;
  for (let i = 0; i < groups.length; i++) {
    const status = dayStatusFromMissions(groups[i]!.missions);
    if (status === "claimed") continue;
    if (status === "claimable") {
      if (
        count < maxLit &&
        isDayGroupEligibleByAchievedCredit(
          i,
          achievedCredit,
          groups[i]!.missions,
        )
      ) {
        lit.add(i);
        count++;
      }
      continue;
    }
    break;
  }
  return lit;
}

function displayStatusForDayGroup(
  group: DayGroup,
  groupIndex: number,
  cumulativeProgressIndex: number,
  litClaimableIndices: Set<number>,
): MissionStatus {
  if (groupIndex > cumulativeProgressIndex) return "locked";
  const raw = dayStatusFromMissions(group.missions);
  if (raw === "claimable") {
    return litClaimableIndices.has(groupIndex) ? "claimable" : "locked";
  }
  return raw;
}

function applyDisplayDayStatusesToWindow(
  windowGroups: DayGroup[],
  windowStartIndex: number,
  allDayGroups: DayGroup[],
  vipLevel: number,
  achievedCredit?: number,
): DayViewModel[] {
  const cumulativeProgressIndex = findCumulativeProgressDayGroupIndex(
    allDayGroups,
    achievedCredit,
  );
  const litClaimableIndices = computeLitClaimableDayIndices(
    allDayGroups,
    achievedCredit,
  );

  return windowGroups.map((group, i) => {
    const groupIndex = windowStartIndex + i;
    const status = displayStatusForDayGroup(
      group,
      groupIndex,
      cumulativeProgressIndex,
      litClaimableIndices,
    );
    return dayViewModelFromGroup(group, i + 1, status, vipLevel);
  });
}

function computeActiveDayIndex(
  groups: DayGroup[],
  achievedCredit?: number,
): number {
  return findCumulativeProgressDayGroupIndex(groups, achievedCredit);
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

function computeCycleStartDayIndex(
  groups: DayGroup[],
  achievedCredit?: number,
): number {
  const activeIndex = computeActiveDayIndex(groups, achievedCredit);
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
  vipLevel: number = 0,
  achievedCredit?: number,
): {
  startIndex: number;
  days: DayViewModel[];
} {
  const allDayGroups = groupFlatIntoDayGroups(flat);
  if (allDayGroups.length === 0) {
    const placeholders = padDayGroupsToSeven([], [], 0);
    return {
      startIndex: 0,
      days: placeholders.map((g, i) =>
        dayViewModelFromGroup(g, i + 1, "locked", vipLevel),
      ),
    };
  }

  const cycleStart = computeCycleStartDayIndex(allDayGroups, achievedCredit);
  const windowGroups = padDayGroupsToSeven(
    allDayGroups.slice(cycleStart, cycleStart + 7),
    allDayGroups,
    cycleStart,
  );
  const startIndex = allDayGroups[cycleStart]?.indices[0] ?? 0;

  return {
    startIndex,
    days: applyDisplayDayStatusesToWindow(
      windowGroups,
      cycleStart,
      allDayGroups,
      vipLevel,
      achievedCredit,
    ),
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

export function countCollectableMissionsFromFlat(flat: FlatMission[]): number {
  return flat.filter((row) => isMissionCollectEligible(row.mission)).length;
}

export function countCollectableMissions(
  activity: ActivityDataDecoded,
): number {
  return countCollectableMissionsFromFlat(flattenDailyMissions(activity));
}

/** @deprecated Cumulative sign-in: mission date is not a claim gate. */
export function applyMissionDateClaimGate(days: DayViewModel[]): DayViewModel[] {
  return days;
}

/** 積壓 (恰好 2 日) 時亮 2 日；否則只亮最早 1 日。 */
export function applyBacklogAwareDayStatuses(
  days: DayViewModel[],
  leadingCollectableDayGroups: number,
): DayViewModel[] {
  const maxLit = leadingCollectableDayGroups === 2 ? 2 : 1;
  let lit = 0;
  return days.map((day) => {
    if (day.status !== "claimable") return day;
    if (lit < maxLit) {
      lit++;
      return day;
    }
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
  vipLevel: number = 0,
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
      const itemAmount = parseWireInt64(row.itemAmount) ?? 0;
      const wallet = walletFromItemId(itemID);
      if (byWallet.has(wallet)) continue;
      byWallet.set(wallet, {
        itemID,
        itemAmount: applyDailyLoginVipBonus(itemAmount, itemID, vipLevel),
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
  vipLevel: number = 0,
  achievedCredit?: number,
): boolean {
  if (flat.length === 0) return false;
  const { days } = computeSevenDayWindow(flat, vipLevel, achievedCredit);
  return days.some((day) => isDayCollectable(day));
}

export type BuildDailyLoginViewModelOptions = {
  /** 快取資料刷新中：不顯示 claimable 避免閃爍。 */
  suppressClaimableFromStaleCache?: boolean;
  /** 玩家 VIP 等級（獎勵顯示加乘）。 */
  vipLevel?: number;
};

export function buildDailyLoginViewModel(
  activity: ActivityDataDecoded,
  nowMs: number = Date.now(),
  options?: BuildDailyLoginViewModelOptions,
): DailyLoginViewModel | null {
  const activityId = String(activity.activityID ?? "").trim();
  if (!activityId) return null;

  const vipLevel = options?.vipLevel ?? 0;
  const inDisplayWindow = isActivityInDisplayWindow(
    activity.displayStartTime,
    activity.displayEndTime,
    nowMs,
  );

  const flat = flattenDailyMissions(activity);
  const achievedCredit = parseWireInt64(activity.achievedCreditAmount) ?? 0;
  const { days: rawDays } = computeSevenDayWindow(
    flat,
    vipLevel,
    achievedCredit,
  );
  let days = rawDays;
  if (options?.suppressClaimableFromStaleCache) {
    days = days.map((day) => {
      if (day.status !== "claimable") return day;
      return {
        ...day,
        status: "locked" as const,
        claimableMissionIds: [],
      };
    });
  }
  const creditRewards = findClaimableCreditRewards(activity, vipLevel);
  const hasClaimableDaily =
    inDisplayWindow && days.some((day) => isDayCollectable(day));
  const hasClaimableCredit =
    inDisplayWindow && creditRewards.some((r) => r.claimable);

  const displayStartMs =
    normalizeWireTimestampToMs(activity.displayStartTime) ?? 0;
  const displayEndMs =
    normalizeWireTimestampToMs(activity.displayEndTime) ?? 0;

  return {
    activityId,
    dateRangeLabel: formatDateRangeEtLabel(displayStartMs, displayEndMs),
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
    displayStartTime: "1767243600",
    displayEndTime: "1798779599",
    achievedCreditAmount: "6",
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
