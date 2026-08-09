/** Redeem 第三方提現完成导回 query：`/redeem?paymentState=1|2` */
export const REDEEM_PAYMENT_STATE_PARAM = "paymentState";

export function parseRedeemPaymentState(raw: string | null): 1 | 2 | null {
  const t = (raw ?? "").trim();
  if (t === "1") return 1;
  if (t === "2") return 2;
  return null;
}

export function redeemPaymentReturnPath(paymentState: 1 | 2): string {
  return `/redeem?${REDEEM_PAYMENT_STATE_PARAM}=${paymentState}`;
}

export function buildRedeemPaymentReturnUrl(
  paymentState: 1 | 2,
  origin = typeof window !== "undefined"
    ? window.location.origin.replace(/\/+$/, "")
    : "",
): string {
  return `${origin}${redeemPaymentReturnPath(paymentState)}`;
}

/** Remove `paymentState` from current search params (returns new URLSearchParams). */
export function stripRedeemPaymentStateParam(
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(REDEEM_PAYMENT_STATE_PARAM);
  return next;
}
