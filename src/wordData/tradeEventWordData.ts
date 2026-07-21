import { getWord } from "../wordData/getWord";

/** wallet.TradeEvent enum name → WordData ID */
const TRADE_EVENT_ENUM_WORD_DATA: Readonly<Record<string, number>> = {
  PAYMENT_BUY_GOLD: 510769,
  REFERRAL_BONUS: 510768,
  PURCHASE: 510769,
  LEVEL_UP_BONUS: 510783,
  DAILY_BONUS: 510786,
  AMOE: 510784,
  REPLENISHMENT: 510785,
};

/** wallet.TradeEvent numeric value → WordData ID */
const TRADE_EVENT_NUM_WORD_DATA: Readonly<Record<number, number>> = {
  17: 510769,
};

export function tradeEventWordDataId(raw: unknown): number | undefined {
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string"
        ? Number(raw.trim())
        : NaN;
  if (Number.isFinite(n) && TRADE_EVENT_NUM_WORD_DATA[n]) {
    return TRADE_EVENT_NUM_WORD_DATA[n];
  }
  if (typeof raw === "string" && raw.trim()) {
    return TRADE_EVENT_ENUM_WORD_DATA[raw.trim().toUpperCase()];
  }
  return undefined;
}

export function tradeEventToLabel(raw: unknown): string {
  const wordId = tradeEventWordDataId(raw);
  if (wordId !== undefined) {
    const label = getWord(wordId);
    if (label) return label;
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .trim()
      .split("_")
      .map((part) =>
        part.length > 0
          ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          : "",
      )
      .join(" ");
  }
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string"
        ? Number(raw.trim())
        : NaN;
  if (Number.isFinite(n)) {
    return `TradeEvent ${n}`;
  }
  return getWord(510769) || "Transaction";
}
