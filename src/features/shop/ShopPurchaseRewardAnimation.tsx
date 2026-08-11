import type { ShopPack } from "./types";
import { RewardCoinPileAnimation } from "../../components/RewardCoinPileAnimation";

type Props = {
  pack: ShopPack;
  onComplete: () => void;
};

export function ShopPurchaseRewardAnimation({ pack, onComplete }: Props) {
  return (
    <RewardCoinPileAnimation
      gcLabel={pack.gcLabel}
      scLabel={pack.bonusSc > 0 ? String(pack.bonusSc) : undefined}
      onComplete={onComplete}
    />
  );
}
