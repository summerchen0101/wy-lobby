import { publicImageUrl } from "../../lib/publicImageUrl";

const PANEL = publicImageUrl("/images/shop");

export function shopCoinPileSrc(n: 1 | 2 | 3 | 4 | 5): string {
  return `${PANEL}/icon_coinPile${n}.png`;
}
