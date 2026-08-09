import { getWord } from "../wordData/getWord";

/** wallet.TradeEvent enum name → WordData ID */
const TRADE_EVENT_ENUM_WORD_DATA: Readonly<Record<string, number>> = {
  PAYMENT_BUY_GOLD: 510769,
  REFERRAL_BONUS: 510768,
  PURCHASE: 510769,
  LEVEL_UP_BONUS: 510783,
  VIPLEVELBONUS: 510783,
  VIP_LEVEL_BONUS: 510783,
  DAILY_BONUS: 510786,
  AMOE: 510784,
  AMOE_AWARD: 510784,
  REPLENISHMENT: 510785,
  DAILY_LOGIN_AWARD: 510786,
  DAILYMISSONAWARD: 510786,
  GUILD_REFERRER_AWARD: 510768,
  BINDING_REFERRER_CODE_AWARD: 510768,
  PLAYER_DAILY_SCORE_AWARD: 510785,
  SERIAL_NUMBER: 510784,
  PROMOTION_TASK_AWARD: 510783,
};

/** wallet.TradeEvent numeric value → WordData ID */
const TRADE_EVENT_NUM_WORD_DATA: Readonly<Record<number, number>> = {
  17: 510769, // PAYMENT_BUY_GOLD
  28: 510784, // SERIAL_NUMBER → AMOE
  34: 510786, // DAILY_LOGIN_AWARD
  35: 510768, // GUILD_REFERRER_AWARD
  45: 510783, // PROMOTION_TASK_AWARD
  46: 510768, // BINDING_REFERRER_CODE_AWARD
  51: 510786, // DailyMissonAward
  66: 510785, // PLAYER_DAILY_SCORE_AWARD
  111: 510783, // VIPLevelBonus
  112: 510784, // AMOE_AWARD
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
