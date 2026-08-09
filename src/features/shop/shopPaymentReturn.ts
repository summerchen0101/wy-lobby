/** Shop 第三方付款完成导回 query：`/shop?paymentState=1|2` */
export const SHOP_PAYMENT_STATE_PARAM = "paymentState";

export function parseShopPaymentState(raw: string | null): 1 | 2 | null {
  const t = (raw ?? "").trim();
  if (t === "1") return 1;
  if (t === "2") return 2;
  return null;
}

export function shopPaymentReturnPath(paymentState: 1 | 2): string {
  return `/shop?${SHOP_PAYMENT_STATE_PARAM}=${paymentState}`;
}

export function buildShopPaymentReturnUrl(
  paymentState: 1 | 2,
  origin = typeof window !== "undefined"
    ? window.location.origin.replace(/\/+$/, "")
    : "",
): string {
  return `${origin}${shopPaymentReturnPath(paymentState)}`;
}

/** Remove `paymentState` from current search params (returns new URLSearchParams). */
export function stripShopPaymentStateParam(
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(SHOP_PAYMENT_STATE_PARAM);
  return next;
}
