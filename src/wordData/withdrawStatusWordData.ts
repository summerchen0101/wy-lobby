import { getWord } from "./getWord";

/** megaman withdraw order payment status → WordData ID */
const WITHDRAW_STATUS_WORD_DATA: Readonly<Record<number, number>> = {
  1: 510477,
  2: 510479,
  3: 510480,
  4: 510479,
  5: 510481,
  6: 510482,
  7: 510483,
  8: 510483,
};

const WITHDRAW_STATUS_NAME_WORD_DATA: Readonly<Record<string, number>> = {
  Reviewing: 510477,
  Passed: 510479,
  Rejected: 510480,
  Proccessing: 510479,
  Processing: 510479,
  Success: 510481,
  Failed: 510482,
  ExpirationRejected: 510483,
  Canceled: 510483,
  CANCELED: 510483,
};

export function withdrawOrderPaymentStatusToLabel(raw: unknown): string {
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string"
        ? Number(raw.trim())
        : NaN;
  if (Number.isFinite(n) && WITHDRAW_STATUS_WORD_DATA[n]) {
    const label = getWord(WITHDRAW_STATUS_WORD_DATA[n]);
    if (label) return label;
  }
  const s =
    typeof raw === "string"
      ? raw.trim()
      : typeof raw === "number"
        ? String(raw)
        : "";
  const wordId = WITHDRAW_STATUS_NAME_WORD_DATA[s];
  if (wordId !== undefined) {
    const label = getWord(wordId);
    if (label) return label;
  }
  return s || "Unknown";
}
