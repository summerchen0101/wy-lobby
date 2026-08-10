import { isGatewayWsSuppressedRoute } from "./gatewayWsRoute";

const PAYMENT_CALLBACK_PREFIXES = [
  "/payment/callback",
  "/redeem/callback",
  "/game/callback",
] as const;

/** 次分頁封鎖 Gate 不套用的路由（遊戲彈窗、法律頁、金流回跳等）。 */
export function isSecondaryTabGateExemptRoute(pathname: string): boolean {
  if (pathname === "/play" || pathname === "/game-popout") return true;
  if (isGatewayWsSuppressedRoute(pathname)) return true;
  return PAYMENT_CALLBACK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
