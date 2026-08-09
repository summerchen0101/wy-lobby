import { describe, expect, it } from "vitest";
import {
  buildDailyLoginViewModel,
  buildMockDailyLoginActivity,
} from "./dailyLoginLogic";
import {
  DAILY_LOGIN_AUTO_CLOSE_MS,
  computeCanDismissModal,
  resolveDailyLoginPrimaryAction,
} from "./dailyLoginFlow";

describe("dailyLoginFlow", () => {
  it("uses a 1 second auto-close delay to match APP", () => {
    expect(DAILY_LOGIN_AUTO_CLOSE_MS).toBe(1000);
  });

  describe("computeCanDismissModal", () => {
    it("blocks dismiss while claiming or flying", () => {
      expect(
        computeCanDismissModal({
          postClaimDismissible: true,
          hasClaimableDaily: false,
          hasClaimableCredit: false,
          claiming: true,
          flying: false,
        }),
      ).toBe(false);
      expect(
        computeCanDismissModal({
          postClaimDismissible: true,
          hasClaimableDaily: false,
          hasClaimableCredit: false,
          claiming: false,
          flying: true,
        }),
      ).toBe(false);
    });

    it("allows dismiss after claim flow completes", () => {
      expect(
        computeCanDismissModal({
          postClaimDismissible: true,
          hasClaimableDaily: false,
          hasClaimableCredit: false,
          claiming: false,
          flying: false,
        }),
      ).toBe(true);
    });

    it("allows dismiss when reopened with nothing claimable", () => {
      expect(
        computeCanDismissModal({
          postClaimDismissible: false,
          hasClaimableDaily: false,
          hasClaimableCredit: false,
          claiming: false,
          flying: false,
        }),
      ).toBe(true);
    });

    it("blocks dismiss when daily reward is still claimable", () => {
      expect(
        computeCanDismissModal({
          postClaimDismissible: false,
          hasClaimableDaily: true,
          hasClaimableCredit: false,
          claiming: false,
          flying: false,
        }),
      ).toBe(false);
    });
  });

  describe("resolveDailyLoginPrimaryAction", () => {
    it("claims today's daily reward from the bottom-half primary action", () => {
      const vm = buildDailyLoginViewModel(buildMockDailyLoginActivity());
      const claimableDay = vm?.days.find((day) => day.status === "claimable");
      expect(claimableDay).toBeTruthy();

      const action = resolveDailyLoginPrimaryAction(vm, {
        postClaimDismissible: false,
        claiming: false,
        flying: false,
      });

      expect(action).toEqual({
        type: "claim-day",
        day: claimableDay,
      });
    });

    it("claims the first available credit reward when daily is not claimable", () => {
      const base = buildMockDailyLoginActivity();
      const missions = { ...base.UserDailyMissionsByDates };
      for (const key of Object.keys(missions)) {
        const group = missions[key];
        if (!group?.userDailyMissions) continue;
        for (const mission of group.userDailyMissions) {
          mission.isCollected = true;
          mission.actionTimes = 1;
        }
      }

      const vm = buildDailyLoginViewModel(
        buildMockDailyLoginActivity({
          UserDailyMissionsByDates: missions,
          achievedCreditAmount: 8,
          dailyMissionCreditRewards: [
            {
              requiredCreditAmount: 8,
              itemID: 1,
              itemAmount: 50000,
              isCollected: false,
            },
          ],
        }),
      );

      const action = resolveDailyLoginPrimaryAction(vm, {
        postClaimDismissible: false,
        claiming: false,
        flying: false,
      });

      expect(action).toEqual({
        type: "claim-credit",
        requiredCreditAmount: 8,
      });
    });

    it("dismisses when nothing is claimable or after claim flow completes", () => {
      const claimedVm = buildDailyLoginViewModel(
        buildMockDailyLoginActivity({
          UserDailyMissionsByDates: undefined,
        }),
      );

      const claimedAction = resolveDailyLoginPrimaryAction(
        buildDailyLoginViewModel(
          buildMockDailyLoginActivity({
            UserDailyMissionsByDates: (() => {
              const base = buildMockDailyLoginActivity();
              const missions = { ...base.UserDailyMissionsByDates };
              for (const key of Object.keys(missions)) {
                const group = missions[key];
                if (!group?.userDailyMissions) continue;
                for (const mission of group.userDailyMissions) {
                  mission.isCollected = true;
                  mission.actionTimes = 1;
                  mission.achievedActionTimes = 1;
                }
              }
              return missions;
            })(),
          }),
        ),
        {
          postClaimDismissible: false,
          claiming: false,
          flying: false,
        },
      );

      expect(claimedAction.type).toBe("dismiss");

      const postClaimAction = resolveDailyLoginPrimaryAction(claimedVm, {
        postClaimDismissible: true,
        claiming: false,
        flying: false,
      });
      expect(postClaimAction.type).toBe("dismiss");
    });

    it("allows dismiss after a failed claim instead of retrying", () => {
      const vm = buildDailyLoginViewModel(buildMockDailyLoginActivity());
      const action = resolveDailyLoginPrimaryAction(vm, {
        postClaimDismissible: false,
        claiming: false,
        flying: false,
        hasError: true,
      });
      expect(action).toEqual({ type: "dismiss" });
    });

    it("allows dismiss when claim error is shown", () => {
      expect(
        computeCanDismissModal({
          postClaimDismissible: false,
          hasClaimableDaily: true,
          hasClaimableCredit: false,
          claiming: false,
          flying: false,
          hasError: true,
        }),
      ).toBe(true);
    });

    it("dismisses instead of claiming when today's missions are not ready", () => {
      const now = Date.UTC(2026, 6, 30, 12, 0, 0);
      const missions = {
        [String(now)]: {
          date: String(now),
          userDailyMissions: [
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
          ],
        },
      };
      const vm = buildDailyLoginViewModel(
        buildMockDailyLoginActivity({ UserDailyMissionsByDates: missions }),
        now,
      );
      expect(vm?.hasClaimableDaily).toBe(false);

      const action = resolveDailyLoginPrimaryAction(vm, {
        postClaimDismissible: false,
        claiming: false,
        flying: false,
      });
      expect(action).toEqual({ type: "dismiss" });
    });

    it("returns none while claiming or flying", () => {
      const vm = buildDailyLoginViewModel(buildMockDailyLoginActivity());
      expect(
        resolveDailyLoginPrimaryAction(vm, {
          postClaimDismissible: false,
          claiming: true,
          flying: false,
        }).type,
      ).toBe("none");
    });
  });
});
