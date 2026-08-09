import type { WordDataFn } from "../../wordData/useWordData";
import { getWord } from "../../wordData/getWord";
import { formatScFromRawWireInteger } from "../../wallet/formatWalletAmount";
import { WITHDRAW_MARQUEE_NAMES } from "./withdrawMarqueeNames";

export type WithdrawMarqueeRng = () => number;

const defaultRng: WithdrawMarqueeRng = () => Math.random();

function randomIntInclusive(min: number, max: number, rng: WithdrawMarqueeRng): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

/** Wire integer SC amount with spec weighting (docs/兌換跑馬燈.docx). */
export function generateWeightedWithdrawAmountWire(rng: WithdrawMarqueeRng = defaultRng): number {
  const roll = rng() * 100;
  if (roll < 70) {
    return randomIntInclusive(6, 500, rng);
  }
  if (roll < 98) {
    return randomIntInclusive(501, 3000, rng);
  }
  return randomIntInclusive(3001, 10000, rng);
}

/** Mask nickname as `Aaron****568` (name + **** + suffix 1–1000). */
export function maskWithdrawNickname(
  nickname: string,
  rng: WithdrawMarqueeRng = defaultRng,
): string {
  const base = nickname.trim() || "Player";
  const suffix = randomIntInclusive(1, 1000, rng);
  return `${base}****${suffix}`;
}

export function buildWithdrawMarqueeLine(
  w: WordDataFn,
  nickname: string,
  amountWire: string | number,
  rng: WithdrawMarqueeRng = defaultRng,
): string {
  const masked = maskWithdrawNickname(nickname, rng);
  const amount = formatScFromRawWireInteger(String(amountWire));
  return w(510468, masked, amount);
}

export function formatWithdrawMarqueePushLine(
  w: WordDataFn,
  nickname: string,
  actualAmountWire: string,
): string {
  return buildWithdrawMarqueeLine(w, nickname, actualAmountWire);
}

export function generateWithdrawMarqueeSeed(
  count = 100,
  rng: WithdrawMarqueeRng = defaultRng,
): string[] {
  const names = WITHDRAW_MARQUEE_NAMES;
  const picked = new Set<number>();
  const target = Math.min(count, names.length);
  while (picked.size < target) {
    picked.add(Math.floor(rng() * names.length));
  }
  return [...picked].map((idx) => {
    const name = names[idx]!;
    const amountWire = generateWeightedWithdrawAmountWire(rng);
    return buildWithdrawMarqueeLine(getWord, name, amountWire, rng);
  });
}
