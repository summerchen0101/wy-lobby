import { describe, expect, it } from "vitest";
import {
  formatRedeemHistoryLinkAmount,
  formatRedeemHistoryRowLabel,
  formatWithdrawCreatedAt,
  redeemHistoryFeeShouldDisplay,
  redeemHistoryStatusClassName,
  withdrawHistoryShowsCancel,
  withdrawHistoryShowsRemark,
} from "./redeemHistoryUi";
import { getActiveLocale } from "../../i18n/getActiveLocale";
import { DISPLAY_TZ } from "../../lib/displayTimezone";
import { WITHDRAW_ORDER_PAYMENT_STATUS } from "../../realtime/withdrawLobbyWire";

describe("redeemHistoryUi", () => {
  it("maps status codes to CSS modifiers", () => {
    expect(redeemHistoryStatusClassName(WITHDRAW_ORDER_PAYMENT_STATUS.Rejected)).toContain(
      "--negative",
    );
    expect(redeemHistoryStatusClassName(WITHDRAW_ORDER_PAYMENT_STATUS.Reviewing)).toContain(
      "--progress",
    );
    expect(redeemHistoryStatusClassName(WITHDRAW_ORDER_PAYMENT_STATUS.Success)).toContain(
      "--positive",
    );
  });

  it("shows remark only for rejected, expired, failed", () => {
    expect(withdrawHistoryShowsRemark(WITHDRAW_ORDER_PAYMENT_STATUS.Rejected)).toBe(
      true,
    );
    expect(withdrawHistoryShowsRemark(WITHDRAW_ORDER_PAYMENT_STATUS.Failed)).toBe(
      true,
    );
    expect(withdrawHistoryShowsRemark(WITHDRAW_ORDER_PAYMENT_STATUS.Reviewing)).toBe(
      false,
    );
  });

  it("shows cancel only for reviewing", () => {
    expect(withdrawHistoryShowsCancel(WITHDRAW_ORDER_PAYMENT_STATUS.Reviewing)).toBe(
      true,
    );
    expect(withdrawHistoryShowsCancel(WITHDRAW_ORDER_PAYMENT_STATUS.Rejected)).toBe(
      false,
    );
  });

  it("formats create date from epoch ms in Eastern Time", () => {
    const ms = 1700000000000;
    const label = formatWithdrawCreatedAt(String(ms));
    const expectedEt = new Intl.DateTimeFormat(getActiveLocale(), {
      timeZone: DISPLAY_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(ms));
    expect(label).toBe(expectedEt);
  });

  it("prefixes fiat link amount with dollar sign", () => {
    expect(formatRedeemHistoryLinkAmount("999")).toBe("$999");
    expect(formatRedeemHistoryLinkAmount("$50")).toBe("$50");
  });

  it("includes fee in row label when fee is positive", () => {
    const w = (id: number, ...args: string[]) =>
      id === 510476 ? `${args[0]} ${args[1]}` : "";
    expect(
      formatRedeemHistoryRowLabel({
        fiatAmount: "5",
        feeWire: "0.15",
        w,
      }),
    ).toBe("Redeem $5, Fee $0.15");
  });

  it("omits fee in row label when fee is zero or empty", () => {
    const w = (id: number, ...args: string[]) =>
      id === 510476 ? `${args[0]} ${args[1]}` : "";
    expect(
      formatRedeemHistoryRowLabel({
        fiatAmount: "100",
        feeWire: "0",
        w,
      }),
    ).toBe("Redeem $100");
    expect(redeemHistoryFeeShouldDisplay("0")).toBe(false);
    expect(redeemHistoryFeeShouldDisplay("")).toBe(false);
  });
});
