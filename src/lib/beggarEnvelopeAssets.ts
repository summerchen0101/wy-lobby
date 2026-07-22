import { publicImageUrl } from "./publicImageUrl";

const GUEST = publicImageUrl("/images/lobby/guest");
const ENVELOPE = publicImageUrl("/images/beggar-envelope");

/** 單枚 G 幣（膠囊內、飛行動畫） */
export const BEGGAR_ENVELOPE_COIN_SINGLE_URL = `${GUEST}/img_coin1_2x.png`;
/** 堆疊 G 幣（飛行動畫） */
export const BEGGAR_ENVELOPE_COIN_STACK_URL = `${GUEST}/img_coin3_2x.png`;

/** 藥丸區塊底圖（含左右雙層金幣） */
export const BEGGAR_ENVELOPE_PILL_BLOCK_URL = `${ENVELOPE}/pill_block.png`;

export const BEGGAR_ENVELOPE_FLY_COIN_URLS = [
  BEGGAR_ENVELOPE_COIN_SINGLE_URL,
  BEGGAR_ENVELOPE_COIN_STACK_URL,
] as const;
