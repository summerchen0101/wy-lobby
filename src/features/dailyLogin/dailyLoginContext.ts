import { createContext, useContext } from "react";
import type { RewardCoinPileLabels } from "../../components/RewardCoinPileAnimation";
import type { DayViewModel, DailyLoginViewModel } from "./dailyLoginLogic";

export type DailyLoginContextValue = {
  viewModel: DailyLoginViewModel | null;
  loading: boolean;
  error: string | null;
  claiming: boolean;
  flying: boolean;
  rewardAnimLabels: RewardCoinPileLabels | null;
  modalOpen: boolean;
  postClaimDismissible: boolean;
  canDismissModal: boolean;
  openModal: (options?: { refresh?: boolean; background?: boolean }) => void;
  closeModal: () => void;
  dismissModal: () => void;
  reload: (options?: { background?: boolean }) => Promise<void>;
  claimDay: (day: DayViewModel) => Promise<void>;
  claimCreditReward: (requiredCreditAmount: number) => Promise<void>;
  onFlyComplete: () => void;
  handlePrimaryAction: () => void;
};

export const DailyLoginContext = createContext<DailyLoginContextValue | null>(
  null,
);

export function useDailyLoginActivity(): DailyLoginContextValue {
  const ctx = useContext(DailyLoginContext);
  if (!ctx) {
    throw new Error(
      "useDailyLoginActivity must be used within DailyLoginProvider",
    );
  }
  return ctx;
}
