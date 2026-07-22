import type { GeoBlockReason } from "../../lib/geo/radarGeo";

export const LEGAL_GEO_PATHS = new Set(["/privacy", "/terms", "/term", "/sweeps", "/invite-terms"]);

export const GEO_MESSAGE_KEYS: Record<GeoBlockReason, string> = {
  region: "geo.regionBlocked",
  proxy: "geo.proxyBlocked",
  permissions: "geo.permissionsRequired",
  network: "geo.networkError",
  location: "geo.locationError",
  unknown: "geo.regionBlocked",
};
