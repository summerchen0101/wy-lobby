import { WITHDRAW_ORDER_PAYMENT_STATUS } from "../../realtime/withdrawLobbyWire";

export type WithdrawHistoryStatusTone =
  | "positive"
  | "progress"
  | "negative"
  | "muted";

const WITHDRAW_HISTORY_STATUS_MOD: Record<number, WithdrawHistoryStatusTone> = {
  [WITHDRAW_ORDER_PAYMENT_STATUS.Success]: "positive",
  [WITHDRAW_ORDER_PAYMENT_STATUS.Passed]: "positive",
  [WITHDRAW_ORDER_PAYMENT_STATUS.Reviewing]: "progress",
  [WITHDRAW_ORDER_PAYMENT_STATUS.Proccessing]: "progress",
  [WITHDRAW_ORDER_PAYMENT_STATUS.Rejected]: "negative",
  [WITHDRAW_ORDER_PAYMENT_STATUS.Failed]: "negative",
  [WITHDRAW_ORDER_PAYMENT_STATUS.ExpirationRejected]: "negative",
  [WITHDRAW_ORDER_PAYMENT_STATUS.Canceled]: "muted",
  [WITHDRAW_ORDER_PAYMENT_STATUS.Unknown]: "muted",
};

export function redeemHistoryStatusClassName(statusCode: number): string {
  const base = "redeem-page__history-status";
  const mod = WITHDRAW_HISTORY_STATUS_MOD[statusCode] ?? "muted";
  return `${base} ${base}--${mod}`;
}

export function withdrawHistoryShowsRemark(statusCode: number): boolean {
  return (
    statusCode === WITHDRAW_ORDER_PAYMENT_STATUS.Rejected ||
    statusCode === WITHDRAW_ORDER_PAYMENT_STATUS.ExpirationRejected ||
    statusCode === WITHDRAW_ORDER_PAYMENT_STATUS.Failed
  );
}

export function withdrawHistoryShowsCancel(statusCode: number): boolean {
  return statusCode === WITHDRAW_ORDER_PAYMENT_STATUS.Reviewing;
}

export function formatWithdrawCreatedAt(msRaw: string): string {
  const t = msRaw.trim();
  if (!/^\d+$/.test(t)) return "—";
  const ms = Number(t);
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(ms));
  } catch {
    return "—";
  }
}

export function formatRedeemHistoryLinkAmount(fiatAmount: string): string {
  const t = fiatAmount.trim();
  if (!t || t === "—") return "—";
  return t.startsWith("$") ? t : `$${t}`;
}
