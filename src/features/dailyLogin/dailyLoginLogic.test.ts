import { describe, expect, it } from "vitest";
import type { ActivityDataDecoded } from "../../realtime/activityLobbyWire";
import {
  CREDIT_MILESTONE_THRESHOLDS,
  applyBacklogAwareDayStatuses,
  applySameDayDailyClaimCap,
  buildDailyLoginViewModel,
  buildMockDailyLoginActivity,
  countCollectableMissions,
  countLeadingCollectableDayGroups,
  inferClaimedDailyTodayFromActivity,
  shouldAutoPopupDailyLogin,
  computeSevenDayWindow,
  enforceSequentialDayStatuses,
  findCumulativeProgressDayIndexFromFlat,
  findClaimableCreditRewards,
  flattenDailyMissions,
  formatDateRangeEtLabel,
  canClaimTodayUtc,
  getMissionStatus,
  isActivityInDisplayWindow,
  shouldApplySameDayDailyClaimCap,
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
  it("getMissionStatus uses actionTimes progress vs achievedActionTimes target", () => {
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
    const day8Date = base + 7 * dayMs;
    const { startIndex, days } = computeSevenDayWindow(flat);
    expect(startIndex).toBe(7);
    expect(days).toHaveLength(7);
    expect(days[0].dateMs).toBe(day8Date);
    expect(days[0].status).toBe("claimable");
    const firstMs = days[0].dateMs;
    const lastMs = days[6].dateMs;
    expect(formatDateRangeEtLabel(firstMs, lastMs)).toContain("(ET)");
    expect(lastMs - firstMs).toBe(6 * 86400000);
  });

  it("holds first-week window until next day after day 7 is claimed", () => {
    const base = Date.UTC(2026, 5, 1);
    const missions = buildMissionsByDate(14, base, (i) => ({
      collected: i < 7,
      claimable: false,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
    );
    const held = computeSevenDayWindow(flat);
    expect(held.startIndex).toBe(0);
    expect(held.days.every((d) => d.status === "claimed")).toBe(true);

    const stillHeld = computeSevenDayWindow(flat);
    expect(stillHeld.startIndex).toBe(0);
    expect(stillHeld.days.every((d) => d.status === "claimed")).toBe(true);
  });

  it("advances to week two when day 8 progress is complete", () => {
    const base = Date.UTC(2026, 5, 1);
    const missions = buildMissionsByDate(14, base, (i) => ({
      collected: i < 7,
      claimable: i === 7,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
    );
    const advanced = computeSevenDayWindow(flat);
    expect(advanced.startIndex).toBe(7);
    expect(advanced.days[0].status).toBe("claimable");
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
    const day21Date = base + 20 * dayMs;
    const { startIndex, days } = computeSevenDayWindow(flat);
    expect(startIndex).toBe(14);
    expect(days.length).toBe(7);
    expect(days[6].dateMs).toBe(day21Date);
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
    const { days } = computeSevenDayWindow(flat);
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

  it("canClaimTodayUtc is true when cumulative progress has a collectable day", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;

    const claimableMissions = buildMissionsByDate(7, now - 30 * dayMs, (i) => ({
      collected: i < 3,
      claimable: i === 3,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: claimableMissions }),
    );
    expect(canClaimTodayUtc(flat)).toBe(true);

    const lockedMissions = buildMissionsByDate(7, now - 30 * dayMs, (i) => ({
      collected: i < 3,
      claimable: false,
    }));
    const flatLocked = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: lockedMissions }),
    );
    expect(canClaimTodayUtc(flatLocked)).toBe(false);
  });

  it("treats today's daily login as claimable when actionTimes has synced", () => {
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
    expect(vm!.dateRangeLabel).toBe("01/01/2026 - 12/31/2026 (ET)");
    expect(vm!.creditRewards).toHaveLength(4);
  });

  it("dateRangeLabel uses activity display window not 7-day mission window", () => {
    const now = Date.UTC(2026, 6, 30, 12, 0, 0);
    const july28 = 1785211200000;
    const july29 = 1785297600000;
    const july30 = 1785384000000;
    const vm = buildDailyLoginViewModel(
      buildMockDailyLoginActivity({
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
      }),
      now,
    );
    expect(vm!.dateRangeLabel).toBe("07/29/2026 - 09/01/2026 (ET)");
    expect(vm!.dateRangeLabel).not.toContain("07/28/2026");
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

  it("collectClaimableMissionIds only includes missions that meet doc eligibility", () => {
    const now = Date.UTC(2026, 6, 30, 12, 0, 0);
    const missions = buildMissionsByDate(1, now, () => ({
      collected: false,
      claimable: false,
    }));
    const key = String(now);
    missions![key]!.userDailyMissions = [
      {
        dailyMissionID: "gc-1",
        date: String(now),
        actionTimes: 1,
        achievedActionTimes: 0,
        isCollected: false,
        itemID: 1,
        itemAmount: 100000,
        sort: "1",
      },
      {
        dailyMissionID: "sc-1",
        date: String(now),
        actionTimes: 0,
        achievedActionTimes: 1,
        isCollected: false,
        itemID: 2,
        itemAmount: 3000,
        sort: "2",
      },
    ];
    const vm = buildDailyLoginViewModel(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
      now,
    );
    const claimableDay = vm?.days.find((day) => day.status === "claimable");
    expect(claimableDay?.claimableMissionIds).toEqual(["gc-1"]);
  });

  it("does not treat actionTimes=0 as claimable when achievedActionTimes=0", () => {
    const now = Date.UTC(2026, 6, 30, 12, 0, 0);
    const missions = buildMissionsByDate(1, now, () => ({
      collected: false,
      claimable: false,
    }));
    const key = String(now);
    missions![key]!.userDailyMissions = [
      {
        dailyMissionID: "not-ready",
        date: String(now),
        actionTimes: 0,
        achievedActionTimes: 0,
        isCollected: false,
        itemID: 1,
        itemAmount: 100000,
        sort: "1",
      },
    ];
    const vm = buildDailyLoginViewModel(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
      now,
    );
    expect(vm?.hasClaimableDaily).toBe(false);
    expect(vm?.days.every((day) => day.claimableMissionIds.length === 0)).toBe(
      true,
    );
  });

  it("does not highlight the next day after same-day daily claim cap", () => {
    const vm = buildDailyLoginViewModel(buildMockDailyLoginActivity(), Date.now(), {
      claimedDailyToday: true,
    });
    expect(vm?.hasClaimableDaily).toBe(false);
    expect(vm?.days.some((day) => day.status === "claimable")).toBe(false);
  });

  it("does not light next day on refresh when API falsely marks it claimable", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(8, now - 6 * dayMs, (i) => ({
      collected: i < 6,
      claimable: i === 6,
    }));
    const activity = buildMockDailyLoginActivity({
      achievedCreditAmount: "6",
      UserDailyMissionsByDates: missions,
    });
    const vm = buildDailyLoginViewModel(activity, now, {
      claimedDailyToday: false,
    });
    expect(vm?.hasClaimableDaily).toBe(false);
    expect(vm?.days.some((day) => day.status === "claimable")).toBe(false);
    expect(inferClaimedDailyTodayFromActivity(activity)).toBe(true);
  });

  it("lights today when achievedCredit matches cumulative sign-in slot", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(8, now - 5 * dayMs, (i) => ({
      collected: i < 5,
      claimable: i === 5,
    }));
    const activity = buildMockDailyLoginActivity({
      achievedCreditAmount: "6",
      UserDailyMissionsByDates: missions,
    });
    const vm = buildDailyLoginViewModel(activity, now);
    expect(vm?.days.some((day) => day.status === "claimable")).toBe(true);
  });

  it("only lights up when actionTimes progress is complete", () => {
    const now = Date.UTC(2026, 6, 18, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(3, Date.UTC(2026, 5, 1), () => ({
      collected: false,
      claimable: false,
    }));
    const firstKey = String(Date.UTC(2026, 5, 1));
    missions![firstKey]!.userDailyMissions = [
      {
        dailyMissionID: "1",
        date: firstKey,
        actionTimes: 1,
        achievedActionTimes: 1,
        isCollected: false,
        itemID: 1,
        itemAmount: 1000,
        sort: "0",
      },
    ];
    const secondKey = String(Date.UTC(2026, 5, 1) + dayMs);
    missions![secondKey]!.userDailyMissions = [
      {
        dailyMissionID: "2",
        date: secondKey,
        actionTimes: 0,
        achievedActionTimes: 1,
        isCollected: false,
        itemID: 1,
        itemAmount: 2000,
        sort: "0",
      },
    ];

    const vm = buildDailyLoginViewModel(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
      now,
    );
    expect(
      vm?.days.find((day) => day.dayNumber === 1)?.status,
    ).toBe("claimable");
    expect(
      vm?.days.find((day) => day.dayNumber === 2)?.status,
    ).toBe("locked");
  });

  it("inferClaimedDailyTodayFromActivity is true when next pending progress is incomplete", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(3, now - 2 * dayMs, (i) => ({
      collected: i === 0,
      claimable: false,
    }));
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });
    expect(inferClaimedDailyTodayFromActivity(activity)).toBe(true);
  });

  it("inferClaimedDailyTodayFromActivity is false when next pending is ready to claim", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const missions = buildMissionsByDate(3, now, (i) => ({
      collected: false,
      claimable: i === 0,
    }));
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });
    expect(inferClaimedDailyTodayFromActivity(activity)).toBe(false);
  });

  it("locks next day when session claim cap survives logout re-login", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(7, now - 3 * dayMs, (i) => ({
      collected: i === 0,
      claimable: i === 1,
    }));
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });
    const withoutCap = buildDailyLoginViewModel(activity, now, {
      claimedDailyToday: false,
      initialCollectableCount: 1,
    });
    expect(
      withoutCap?.days.some(
        (day) => day.dayNumber === 2 && day.status === "claimable",
      ),
    ).toBe(true);

    const withCap = buildDailyLoginViewModel(activity, now, {
      claimedDailyToday: true,
      initialCollectableCount: 1,
    });
    expect(withCap?.hasClaimableDaily).toBe(false);
    expect(withCap?.days.some((day) => day.status === "claimable")).toBe(
      false,
    );
  });

  it("applySameDayDailyClaimCap locks remaining claimable slots", () => {
    const days = applySameDayDailyClaimCap(
      [
        {
          dayNumber: 1,
          index: 0,
          missions: [],
          dateMs: 0,
          status: "claimed",
          rewards: [],
          claimableMissionIds: [],
        },
        {
          dayNumber: 2,
          index: 1,
          missions: [],
          dateMs: 0,
          status: "claimable",
          rewards: [],
          claimableMissionIds: ["2"],
        },
      ],
      {
        claimedDailyToday: true,
        collectableCount: 0,
        initialCollectableCount: 1,
      },
    );
    expect(days[1]?.status).toBe("locked");
    expect(days[1]?.claimableMissionIds).toEqual([]);
  });

  it("shows both claimable days when backlog has two pending rewards", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(4, now - 3 * dayMs, (i) => ({
      collected: false,
      claimable: i <= 1,
    }));
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });
    expect(countLeadingCollectableDayGroups(activity)).toBe(2);

    const vm = buildDailyLoginViewModel(activity, now, {
      initialCollectableCount: 2,
    });
    const claimableDays = vm?.days.filter((day) => day.status === "claimable");
    expect(claimableDays?.length).toBe(2);
  });

  it("lights only one day when GC+SC same day are both collectable", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions: ActivityDataDecoded["UserDailyMissionsByDates"] = {};
    for (let i = 0; i < 2; i++) {
      const priorMs = now - (3 - i) * dayMs;
      const priorKey = String(priorMs);
      missions[priorKey] = {
        date: priorKey,
        userDailyMissions: [
          {
            dailyMissionID: String(8000 + i),
            date: priorKey,
            actionTimes: 1,
            achievedActionTimes: 1,
            isCollected: true,
            itemID: 1,
            itemAmount: 1000,
            sort: "0",
          },
        ],
      };
    }
    const claimMs = now - dayMs;
    const claimKey = String(claimMs);
    missions[claimKey] = {
      date: claimKey,
      userDailyMissions: [
        {
          dailyMissionID: "gc",
          date: claimKey,
          actionTimes: 1,
          achievedActionTimes: 1,
          isCollected: false,
          itemID: 1,
          itemAmount: 1000,
          sort: "0",
        },
        {
          dailyMissionID: "sc",
          date: claimKey,
          actionTimes: 1,
          achievedActionTimes: 1,
          isCollected: false,
          itemID: 2,
          itemAmount: 100,
          sort: "1",
        },
      ],
    };
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });
    expect(countCollectableMissions(activity)).toBe(2);
    expect(countLeadingCollectableDayGroups(activity)).toBe(1);

    const vm = buildDailyLoginViewModel(activity, now);
    expect(vm?.days.filter((day) => day.status === "claimable").length).toBe(1);
  });

  it("caps falsely claimable future days to only one lit slot", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(10, now - 2 * dayMs, (i) => ({
      collected: i < 2,
      claimable: i >= 2,
    }));
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });
    expect(countLeadingCollectableDayGroups(activity)).toBe(8);

    const vm = buildDailyLoginViewModel(activity, now);
    expect(vm?.days.filter((day) => day.status === "claimable").length).toBe(
      1,
    );
  });

  it("allows backlog second claim after first same-day claim", () => {
    const now = Date.UTC(2026, 6, 15, 12, 0, 0);
    const dayMs = 86400000;
    const missions = buildMissionsByDate(4, now - 3 * dayMs, (i) => ({
      collected: i === 0,
      claimable: i === 1,
    }));
    const activity = buildMockDailyLoginActivity({
      UserDailyMissionsByDates: missions,
    });

    const vm = buildDailyLoginViewModel(activity, now, {
      claimedDailyToday: true,
      initialCollectableCount: 2,
    });
    expect(vm?.hasClaimableDaily).toBe(true);
    expect(
      shouldApplySameDayDailyClaimCap({
        claimedDailyToday: true,
        collectableCount: 1,
        initialCollectableCount: 2,
      }),
    ).toBe(false);
  });

  it("holds completed window until next cycle day is claimable", () => {
    const base = Date.UTC(2026, 5, 1);
    const missions = buildMissionsByDate(14, base, (i) => ({
      collected: i < 7,
      claimable: false,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
    );
    const held = computeSevenDayWindow(flat);
    expect(held.startIndex).toBe(0);
    expect(held.days.every((d) => d.status === "claimed")).toBe(true);

    const claimableDay8 = buildMissionsByDate(14, base, (i) => ({
      collected: i < 7,
      claimable: i === 7,
    }));
    const flatAdvanced = flattenDailyMissions(
      buildMockDailyLoginActivity({
        UserDailyMissionsByDates: claimableDay8,
      }),
    );
    const advanced = computeSevenDayWindow(flatAdvanced);
    expect(advanced.startIndex).toBe(7);
    expect(advanced.days[0].status).toBe("claimable");
  });

  it("findCumulativeProgressDayIndexFromFlat tracks latest completed slot", () => {
    const base = Date.UTC(2026, 5, 1);
    const missions = buildMissionsByDate(5, base, (i) => ({
      collected: i < 2,
      claimable: i === 2,
    }));
    const flat = flattenDailyMissions(
      buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
    );
    expect(findCumulativeProgressDayIndexFromFlat(flat)).toBe(2);
  });

  it("applies VIP bonus to displayed daily rewards", () => {
    const vm = buildDailyLoginViewModel(buildMockDailyLoginActivity(), Date.now(), {
      vipLevel: 1,
    });
    const claimableDay = vm?.days.find((day) => day.status === "claimable");
    expect(claimableDay?.rewards[0]?.itemAmount).toBe(63000);
  });

  it("suppresses claimable UI while stale cache is refreshing", () => {
    const vm = buildDailyLoginViewModel(buildMockDailyLoginActivity(), Date.now(), {
      suppressClaimableFromStaleCache: true,
    });
    expect(vm?.hasClaimableDaily).toBe(false);
    expect(vm?.days.some((day) => day.status === "claimable")).toBe(false);
  });

  it("applyBacklogAwareDayStatuses keeps at most two claimable days lit", () => {
    const days = applyBacklogAwareDayStatuses(
      [
        {
          dayNumber: 1,
          index: 0,
          missions: [],
          dateMs: 0,
          status: "claimable",
          rewards: [],
          claimableMissionIds: ["1"],
        },
        {
          dayNumber: 2,
          index: 1,
          missions: [],
          dateMs: 0,
          status: "claimable",
          rewards: [],
          claimableMissionIds: ["2"],
        },
        {
          dayNumber: 3,
          index: 2,
          missions: [],
          dateMs: 0,
          status: "claimable",
          rewards: [],
          claimableMissionIds: ["3"],
        },
      ],
      2,
    );
    expect(days[0].status).toBe("claimable");
    expect(days[1].status).toBe("claimable");
    expect(days[2].status).toBe("locked");

    const single = applyBacklogAwareDayStatuses(
      [
        {
          dayNumber: 1,
          index: 0,
          missions: [],
          dateMs: 0,
          status: "claimable",
          rewards: [],
          claimableMissionIds: ["1"],
        },
        {
          dayNumber: 2,
          index: 1,
          missions: [],
          dateMs: 0,
          status: "claimable",
          rewards: [],
          claimableMissionIds: ["2"],
        },
        {
          dayNumber: 3,
          index: 2,
          missions: [],
          dateMs: 0,
          status: "claimable",
          rewards: [],
          claimableMissionIds: ["3"],
        },
      ],
      5,
    );
    expect(single.filter((day) => day.status === "claimable").length).toBe(1);
  });

  it("marks earliest unclaimed completed record claimable (production payload shape)", () => {
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
          day.dateMs === july28 &&
          day.claimableMissionIds.includes("1"),
      ),
    ).toBe(true);
  });
});
