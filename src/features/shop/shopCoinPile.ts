import { publicImageUrl } from "../../lib/publicImageUrl";
import {
  REWARD_GC_COIN_SRC,
  REWARD_SC_COIN_SRC,
} from "../../lib/rewardCoinPileAssets";

const PANEL = publicImageUrl("/images/shop");

export function shopCoinPileSrc(n: 1 | 2 | 3 | 4 | 5): string {
  return `${PANEL}/icon_coinPile${n}.png`;
}

/** SUCCESS 弹窗固定使用 pile5。 */
export const SHOP_SUCCESS_PILE_SRC = shopCoinPileSrc(5);

export function shopCoinGcSrc(n: 1 | 2 | 3 | 4 | 5): string {
  return `${PANEL}/icon_coinGC_${n}.png`;
}

export function shopCoinScSrc(n: 3): string {
  return `${PANEL}/icon_coinSC_${n}.png`;
}

/** 储值成功奖励动画固定资源。 */
export const SHOP_REWARD_GC_COIN_SRC = REWARD_GC_COIN_SRC;
export const SHOP_REWARD_SC_COIN_SRC = REWARD_SC_COIN_SRC;
