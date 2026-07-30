import { describe, expect, it } from "vitest";
import type { ActivityDataDecoded } from "../../realtime/activityLobbyWire";
import {
  CREDIT_MILESTONE_THRESHOLDS,
  buildDailyLoginViewModel,
  buildMockDailyLoginActivity,
  shouldAutoPopupDailyLogin,
  computeSevenDayWindow,
  enforceSequentialDayStatuses,
  findClaimableCreditRewards,
  flattenDailyMissions,
  formatDateRangeEtLabel,
  canClaimTodayUtc,
  getMissionStatus,
  isActivityInDisplayWindow,
} from "./dailyLoginLogic";

function buildMissionsByDate(
  count: number,
  baseMs: number,
  opts: (i: number) => {
    collected?: boolean;
    claimable?: boolean;
  },
): ActivityDataDecoded["UserDailyMissionsByDates"] {
  const missions: ActivityDataDecoded["UserDailyMissionsByDates"] = {};
  const dayMs = 86400000;
  for (let i = 0; i < count; i++) {
    const dateMs = baseMs + i * dayMs;
    const key = String(dateMs);
    const { collected = false, claimable = false } = opts(i);
    missions[key] = {
      date: key,
      userDailyMissions: [
        {
          dailyMissionID: String(5000 + i),
          date: key,
          actionTimes: claimable || collected ? 1 : 0,
          achievedActionTimes: 1,
          isCollected: collected,
          itemID: 1,
          itemAmount: 1000,
          sort: "0",
        },
      ],
    };
  }
  return missions;
}

describe("dailyLoginLogic", () => {
  it("getMissionStatus uses progress vs target from doc", () => {
    expect(
      getMissionStatus({
        actionTimes: 0,
        achievedActionTimes: 1,
        isCollected: false,
      }),
    ).toBe("locked");
    expect(
      getMissionStatus({
        actionTimes: 1,
        achievedActionTimes: 1,
        isCollected: false,
      }),
    ).toBe("claimable");
    expect(
      getMissionStatus({
        actionTimes: 1,
        achievedActionTimes: 1,
        isCollected: true,
      }),
    ).toBe("claimed");
  });

  it("isActivityInDisplayWindow respects seconds and normalizes milliseconds", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    expect(
      isActivityInDisplayWindow(
        Math.floor(Date.UTC(2026, 0, 1) / 1000),
        Math.floor(Date.UTC(2026, 11, 31) / 1000),
        now,
      ),
    ).toBe(true);
    expect(
      isActivityInDisplayWindow(
        Date.UTC(2026, 0, 1),
        Date.UTC(2026, 11, 31),
        now,
      ),
    ).toBe(true);
  });

  it("computeSevenDayWindow aligns to 7-day cycle for first-week claimable", () => {
    const activity = buildMockDailyLoginActivity();
    const flat = flattenDailyMissions(activity);
    const { startIndex, days } = computeSevenDayWindow(flat);
    expect(startIndex).toBe(0);
    expect(days.length).toBe(7);
    expect(days[5].status).toBe("claimable");
  });

  it("8th sign-in window starts at cycle index 7 on the next calendar day", () => {
    const base = Date.UTC(2026, 5, 1);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(14, base, (i) => ({
      collected: i < 7,
      claimable: i === 7,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
    );
    const nextDay = base + 7 * dayMs;
    const { startIndex, days } = computeSevenDayWindow(flat, nextDay);
    expect(startIndex).toBe(7);
    expect(days).toHaveLength(7);
    expect(days[0].status).toBe("claimable");
    const firstMs = days[0].dateMs;
    const lastMs = days[6].dateMs;
    expect(formatDateRangeEtLabel(firstMs, lastMs)).toContain("(ET)");
    expect(lastMs - firstMs).toBe(6 * 86400000);
  });

  it("holds first-week window until next day after day 7 is claimed", () => {
    const base = Date.UTC(2026, 5, 1);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(14, base, (i) => ({
      collected: i < 7,
      claimable: false,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
    );
    const day7Ms = base + 6 * dayMs;
    const held = computeSevenDayWindow(flat, day7Ms);
    expect(held.startIndex).toBe(0);
    expect(held.days.every((d) => d.status === "claimed")).toBe(true);

    const nextDay = base + 7 * dayMs;
    const stillHeld = computeSevenDayWindow(flat, nextDay);
    expect(stillHeld.startIndex).toBe(0);
    expect(stillHeld.days.every((d) => d.status === "claimed")).toBe(true);
  });

  it("holds first week when day 8 is claimable but not for today", () => {
    const base = Date.UTC(2026, 5, 1);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(14, base, (i) => ({
      collected: i < 7,
      claimable: i === 7,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
    );
    const later = base + 10 * dayMs;
    const held = computeSevenDayWindow(flat, later);
    expect(held.startIndex).toBe(0);
    expect(held.days.every((d) => d.status === "claimed")).toBe(true);
  });

  it("21st claim window starts at cycle index 14", () => {
    const base = Date.UTC(2026, 6, 1);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(28, base, (i) => ({
      collected: i < 20,
      claimable: i === 20,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
    );
    const day21Ms = base + 20 * dayMs;
    const { startIndex, days } = computeSevenDayWindow(flat, day21Ms);
    expect(startIndex).toBe(14);
    expect(days.length).toBe(7);
    expect(days[6].status).toBe("claimable");
  });

  it("merges same-day missions and always shows 7 day slots", () => {
    const missions: ActivityDataDecoded["UserDailyMissionsByDates"] = {};
    const dayMs = 86400000;
    const base = Date.UTC(2026, 6, 1);
    for (let i = 0; i < 10; i++) {
      const dateMs = base + i * dayMs;
      const key = String(dateMs);
      missions[key] = {
        date: key,
        userDailyMissions: [
          {
            dailyMissionID: String(3000 + i),
            date: key,
            actionTimes: i <= 4 ? 1 : 0,
            achievedActionTimes: 1,
            isCollected: i < 4,
            itemID: 1,
            itemAmount: 1000,
            sort: "0",
          },
          {
            dailyMissionID: String(4000 + i),
            date: key,
            actionTimes: i <= 4 ? 1 : 0,
            achievedActionTimes: 1,
            isCollected: i < 4,
            itemID: 2,
            itemAmount: 10000,
            sort: "1",
          },
        ],
      };
    }
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });
    const flat = flattenDailyMissions(activity);
    const claimableDayMs = base + 4 * dayMs;
    const { days } = computeSevenDayWindow(flat, claimableDayMs);
    expect(days).toHaveLength(7);
    expect(days[0].dayNumber).toBe(1);
    expect(days[0].rewards).toHaveLength(2);
    expect(days[4].status).toBe("claimable");
    expect(days[5].status).toBe("locked");
    expect(days[6].dayNumber).toBe(7);
  });

  it("enforceSequentialDayStatuses keeps only first claimable day highlighted", () => {
    const days = [
      {
        dayNumber: 1,
        index: 0,
        missions: [],
        dateMs: 0,
        status: "claimable" as const,
        rewards: [],
        claimableMissionIds: ["1"],
      },
      {
        dayNumber: 2,
        index: 1,
        missions: [],
        dateMs: 0,
        status: "claimable" as const,
        rewards: [],
        claimableMissionIds: ["2"],
      },
      {
        dayNumber: 3,
        index: 2,
        missions: [],
        dateMs: 0,
        status: "locked" as const,
        rewards: [],
        claimableMissionIds: [],
      },
    ];
    const next = enforceSequentialDayStatuses(days);
    expect(next[0].status).toBe("claimable");
    expect(next[1].status).toBe("locked");
    expect(next[2].status).toBe("locked");
  });

  it("always exposes four credit milestones at 8/15/22/30", () => {
    const rewards = findClaimableCreditRewards(
      buildMockDailyLoginActivity({
        dailyMissionCreditRewards: [
          {
            requiredCreditAmount: "8",
            itemID: "1",
            itemAmount: "1000",
            isCollected: false,
          },
          {
            requiredCreditAmount: "8",
            itemID: "1",
            itemAmount: "2000",
            isCollected: false,
          },
          {
            requiredCreditAmount: "15",
            itemID: "1",
            itemAmount: "3000",
            isCollected: false,
          },
        ],
      }),
    );
    expect(rewards.map((r) => r.requiredCreditAmount)).toEqual(
      [...CREDIT_MILESTONE_THRESHOLDS],
    );
    expect(rewards[0].rewards).toHaveLength(1);
    expect(rewards[0].rewards[0].itemAmount).toBe(1000);
  });

  it("merges GC and SC credit rewards at the same milestone", () => {
    const rewards = findClaimableCreditRewards(
      buildMockDailyLoginActivity({
        dailyMissionCreditRewards: [
          {
            requiredCreditAmount: "8",
            itemID: "1",
            itemAmount: "200000",
            isCollected: false,
          },
          {
            requiredCreditAmount: "8",
            itemID: "2",
            itemAmount: "5000",
            isCollected: false,
          },
        ],
      }),
    );
    const day8 = rewards.find((r) => r.requiredCreditAmount === 8);
    expect(day8?.rewards).toHaveLength(2);
    expect(day8?.rewards.find((r) => r.wallet === "GC")?.itemAmount).toBe(
      200000,
    );
    expect(day8?.rewards.find((r) => r.wallet === "SC")?.itemAmount).toBe(
      5000,
    );
  });

  it("canClaimTodayUtc only allows claim when mission date is today in ET", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const todayMs = now;
    const yesterdayMs = now - dayMs;

    const todayMissions = buildMissionsByDate(7, todayMs - 3 * dayMs, (i) => ({
      collected: i < 3,
      claimable: i === 3,
    }));
    const flatToday = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: todayMissions }),
    );
    expect(canClaimTodayUtc(flatToday, now)).toBe(true);

    const pastMissions = buildMissionsByDate(7, now - 7 * dayMs, (i) => ({
      collected: i < 3,
      claimable: i === 3,
    }));
    const flatPast = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: pastMissions }),
    );
    expect(canClaimTodayUtc(flatPast, now)).toBe(false);
  });

  it("treats today's daily login as claimable when actionTimes has not synced yet", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(7, now - 3 * dayMs, (i) => ({
      collected: i < 3,
      claimable: false,
    }));
    const key = String(now - 0 * dayMs);
    missions![key]!.userDailyMissions = [
      {
        dailyMissionID: "7001",
        date: String(now),
        actionTimes: 1,
        achievedActionTimes: 0,
        isCollected: false,
        itemID: 1,
        itemAmount: 1000,
        sort: "0",
      },
    ];
    const vm = buildDailyLoginViewModel(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
      now,
    );
    expect(vm?.hasClaimableDaily).toBe(true);
    expect(vm?.days.some((day) => day.status === "claimable")).toBe(true);
  });

  it("buildDailyLoginViewModel still renders when nothing is claimable today", () => {
    const base = Date.UTC(2026, 5, 1);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(14, base, (i) => ({
      collected: i < 7,
      claimable: false,
    }));
    const now = base + 6 * dayMs;
    const vm = buildDailyLoginViewModel(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
      now,
    );
    expect(vm).not.toBeNull();
    expect(vm!.hasClaimableDaily).toBe(false);
    expect(vm!.claimable).toBe(false);
    expect(vm!.days.every((d) => d.status === "claimed")).toBe(true);
  });

  it("buildDailyLoginViewModel still renders outside display window", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const vm = buildDailyLoginViewModel(
      buildMockDailyLoginActivity({
        displayEndTime: String(Math.floor(now / 1000) - 86400),
      }),
      now,
    );
    expect(vm).not.toBeNull();
    expect(vm!.claimable).toBe(false);
  });

  it("buildDailyLoginViewModel marks claimable when day 6 is ready", () => {
    const vm = buildDailyLoginViewModel(buildMockDailyLoginActivity());
    expect(vm).not.toBeNull();
    expect(vm!.hasClaimableDaily).toBe(true);
    expect(vm!.claimable).toBe(true);
    expect(vm!.dateRangeLabel).toContain("(ET)");
    expect(vm!.creditRewards).toHaveLength(4);
  });

  it("shouldAutoPopupDailyLogin is true only when today daily is claimable", () => {
    const claimableVm = buildDailyLoginViewModel(buildMockDailyLoginActivity());
    expect(shouldAutoPopupDailyLogin(claimableVm)).toBe(true);

    const base = Date.UTC(2026, 5, 1);
    const dayMs = 86400000;
    const claimedToday = buildMissionsByDate(14, base, (i) => ({
      collected: i <= 6,
      claimable: false,
    }));
    const claimedVm = buildDailyLoginViewModel(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: claimedToday }),
      base + 6 * dayMs,
    );
    expect(shouldAutoPopupDailyLogin(claimedVm)).toBe(false);
    expect(shouldAutoPopupDailyLogin(null)).toBe(false);
  });

  it("marks today claimable when past days are uncollected (production payload shape)", () => {
    const now = Date.UTC(2026, 6, 30, 12, 0, 0);
    const july28 = 1785211200000;
    const july29 = 1785297600000;
    const july30 = 1785384000000;
    const activity = buildMockDailyLoginActivity({
      displayStartTime: "1785297600",
      displayEndTime: "1788321599",
      achievedCreditAmount: "0",
      UserDailyMissionsByDates: {
        [String(july28)]: {
          date: String(july28),
          userDailyMissions: [
            {
              dailyMissionID: "1",
              date: String(july28),
              actionTimes: 1,
              achievedActionTimes: 1,
              isCollected: false,
              itemID: 1,
              itemAmount: 100000,
              sort: "1",
            },
          ],
        },
        [String(july29)]: {
          date: String(july29),
          userDailyMissions: [
            {
              dailyMissionID: "2",
              date: String(july29),
              actionTimes: 1,
              achievedActionTimes: 0,
              isCollected: false,
              itemID: 1,
              itemAmount: 100000,
              sort: "2",
            },
          ],
        },
        [String(july30)]: {
          date: String(july30),
          userDailyMissions: [
            {
              dailyMissionID: "3",
              date: String(july30),
              actionTimes: 1,
              achievedActionTimes: 0,
              isCollected: false,
              itemID: 1,
              itemAmount: 150000,
              sort: "3",
            },
          ],
        },
      },
    });

    const vm = buildDailyLoginViewModel(activity, now);
    expect(vm?.hasClaimableDaily).toBe(true);
    expect(
      vm?.days.some(
        (day) =>
          day.status === "claimable" &&
          day.dateMs === july30 &&
          day.claimableMissionIds.includes("3"),
      ),
    ).toBe(true);
  });
});
