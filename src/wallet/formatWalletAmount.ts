import type { ActiveWallet } from "./walletContext";
import type { User } from "../lib/api/types";
import { getActiveLocale } from "../i18n/getActiveLocale";

/** Header pill: compact thousands for large balances（依目前語系格式化）。 */
export function formatWalletPillAmount(n: number | undefined): string {
  if (n === undefined) return "—";
  return new Intl.NumberFormat(getActiveLocale(), {
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Sweeps Coins 畫面值：向零截斷至小數第二位；畫面上固定顯示兩位小數（依目前語系千分位）。
 * Header SC 與 {@link formatScFromRaw} 共用。
 */
export function formatWalletScAmountForDisplay(n: number | undefined): string {
  if (n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  const truncatedTowardZero = Math.trunc(n * 100) / 100;
  return new Intl.NumberFormat(getActiveLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(truncatedTowardZero);
}

/** LOBBY / redeem wire：後端 SC 整數為「萬分之一」顯示單位（見 ScPointCurrency）。 */
export const SC_POINT_SCALE = 10000;

/** 可提領下限：畫面上的整數 SC。 */
export const MIN_REDEEM_SC_DISPLAY = 50;

/** 可提領下限：後端原始值（= MIN_REDEEM_SC_DISPLAY × SC_POINT_SCALE）。 */
export const MIN_REDEEM_SC_RAW = MIN_REDEEM_SC_DISPLAY * SC_POINT_SCALE;

/** 將後端原始 SC（萬分之一）換成畫面上的 SC 數值（可含小數）。 */
export function scRawToDisplay(raw: number): number {
  return raw / SC_POINT_SCALE;
}

/** 與 {@link formatScFromRaw} 相同：raw → 向零截斷至小數第二位（以「顯示值×100」整數表示，避免浮點誤差）。 */
export function scTruncatedHundredthsFromRaw(raw: number): number {
  return Math.trunc(raw / 100);
}

/** 與 {@link formatScFromRaw} 相同：raw → 向零截斷至小數第二位之顯示數值。 */
export function scTruncatedDisplayFromRaw(raw: number): number {
  return scTruncatedHundredthsFromRaw(raw) / 100;
}

/** 後端原始值 → 顯示字串（向零捨去至小數二位，與 header SC 一致）。 */
export function formatScFromRaw(raw: number | undefined): string {
  if (raw === undefined) return "—";
  return formatWalletScAmountForDisplay(scRawToDisplay(raw));
}

/** 已截斷至小數二位的 SC 顯示值（×100 整數）→ 顯示字串；避免大額 raw 相減後 `formatScFromRaw` 浮點誤差。 */
export function formatScFromTruncatedHundredths(hundredths: number): string {
  const h = Math.trunc(hundredths);
  if (!Number.isFinite(h)) return "—";
  const neg = h < 0;
  const abs = Math.abs(h);
  const intPart = Math.trunc(abs / 100);
  const frac = abs % 100;
  const intFmt = intPart.toLocaleString(getActiveLocale());
  const fracFmt = String(frac).padStart(2, "0");
  return `${neg ? "-" : ""}${intFmt}.${fracFmt}`;
}

/** 對齊 {@link formatScFromRaw}：後端 raw 已為 SC×10000；整數部千分位、小數部固定二位（非負數 raw）。 */
function formatScTruncTenThousandthsBigInt(rawTenThousandths: bigint): string {
  if (rawTenThousandths < 0n) return "—";
  const intPart = rawTenThousandths / 10000n;
  const frac = Number((rawTenThousandths % 10000n) / 100n);
  const intFmt = intPart.toLocaleString(getActiveLocale());
  const fracFmt = String(frac).padStart(2, "0");
  return `${intFmt}.${fracFmt}`;
}

/**
 * megaman.WithdrawSuccessPush.actualAmount：`string` 整數後端原始 SC（萬分之一）。
 * 以 BigInt 解析，避免超大整數經 JS `number` 失真。
 */
export function formatScFromRawWireInteger(wireRaw: string): string {
  const t = String(wireRaw ?? "")
    .trim()
    .replace(/,/g, "");
  if (!/^\d+$/.test(t)) return "—";
  try {
    const rawBig = BigInt(t);
    return formatScTruncTenThousandthsBigInt(rawBig);
  } catch {
    return "—";
  }
}

/**
 * List withdraw orders：`amount` 為法幣顯示數值（不經 {@link SC_POINT_SCALE}）。
 */
export function formatWithdrawHistoryFiatAmount(amountWire: string): string {
  const t = String(amountWire ?? "")
    .trim()
    .replace(/,/g, "");
  if (t === "") return "—";
  const n = Number(t);
  if (!Number.isFinite(n)) return "—";
  const truncatedTowardZero = Math.trunc(n * 100) / 100;
  return new Intl.NumberFormat(getActiveLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(truncatedTowardZero);
}

/**
 * Header SC：`sweepstakesBalance` 一律視為後端萬分之一（與 Lobby bag／Redeem 相同），不依賴
 * `user.currency`。避免未帶 ScPointCurrency 時誤將 raw 當畫面值顯示（例如 18000→應為 1.8）。
 */
export function getWalletDisplay(
  user: User | null | undefined,
  active: ActiveWallet,
) {
  if (!user) return { label: active, amount: "—" as string };
  if (active === "GC") {
    return {
      label: "GC" as const,
      amount: formatWalletPillAmount(user.balance),
    };
  }
  return {
    label: "SC" as const,
    amount: formatScFromRaw(user.sweepstakesBalance),
  };
}
