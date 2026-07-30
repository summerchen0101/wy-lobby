import { LEGAL_GEO_PATHS } from "../features/geo/geoConstants";

/** 靜態法律／條款頁不需 Gateway WS（另開分頁時避免重複連線踢掉主分頁）。 */
export function isGatewayWsSuppressedRoute(pathname: string): boolean {
  return LEGAL_GEO_PATHS.has(pathname);
}
