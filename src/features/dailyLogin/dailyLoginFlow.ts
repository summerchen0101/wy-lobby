import type { DailyLoginViewModel, DayViewModel } from "./dailyLoginLogic";
import {
  findClaimableCreditRewardAmounts,
  findTodayCollectableDay,
} from "./dailyLoginLogic";

export const DAILY_LOGIN_AUTO_CLOSE_MS = 1000;

export type DailyLoginPrimaryAction =
  | { type: "claim-day"; day: DayViewModel }
  | { type: "claim-credit"; requiredCreditAmount: number }
  | { type: "dismiss" }
  | { type: "none" };

export function computeCanDismissModal({
  postClaimDismissible,
  hasClaimableDaily,
  hasClaimableCredit,
  claiming,
  flying,
  hasError = false,
}: {
  postClaimDismissible: boolean;
  hasClaimableDaily: boolean;
  hasClaimableCredit: boolean;
  claiming: boolean;
  flying: boolean;
  hasError?: boolean;
}): boolean {
  if (claiming || flying) return false;
  if (postClaimDismissible) return true;
  if (hasError) return true;
  return !hasClaimableDaily && !hasClaimableCredit;
}

export function resolveDailyLoginPrimaryAction(
  viewModel: DailyLoginViewModel | null,
  options: {
    postClaimDismissible: boolean;
    claiming: boolean;
    flying: boolean;
    hasError?: boolean;
  },
): DailyLoginPrimaryAction {
  const { postClaimDismissible, claiming, flying, hasError } = options;
  if (claiming || flying) return { type: "none" };

  if (
    hasError &&
    computeCanDismissModal({
      postClaimDismissible,
      hasClaimableDaily: viewModel?.hasClaimableDaily ?? false,
      hasClaimableCredit: viewModel?.hasClaimableCredit ?? false,
      claiming,
      flying,
      hasError: true,
    })
  ) {
    return { type: "dismiss" };
  }

  const claimableDay = findTodayCollectableDay(viewModel);
  if (claimableDay) {
    return { type: "claim-day", day: claimableDay };
  }

  const [firstCredit] = findClaimableCreditRewardAmounts(
    viewModel?.creditRewards ?? [],
  );
  if (firstCredit != null) {
    return { type: "claim-credit", requiredCreditAmount: firstCredit };
  }

  if (
    computeCanDismissModal({
      postClaimDismissible,
      hasClaimableDaily: viewModel?.hasClaimableDaily ?? false,
      hasClaimableCredit: viewModel?.hasClaimableCredit ?? false,
      claiming,
      flying,
    })
  ) {
    return { type: "dismiss" };
  }

  return { type: "none" };
}
