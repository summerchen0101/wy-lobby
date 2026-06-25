import { createContext, useContext } from "react";
import type {
  GeoBlockReason,
  GeoVerificationStatus,
} from "../../lib/geo/radarGeo";

export type GeoStatus = "checking" | GeoVerificationStatus;

export type GeoContextValue = {
  status: GeoStatus;
  blockReason?: GeoBlockReason;
  recheck: () => Promise<void>;
  isBlocked: boolean;
};

export const GeoContext = createContext<GeoContextValue | null>(null);

function isAllowedStatus(status: GeoStatus): boolean {
  return status === "allowed" || status === "skipped";
}

export function useGeo(): GeoContextValue {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error("useGeo must be used within GeoProvider");
  return ctx;
}

export function useGeoAllowed(): boolean {
  const { status } = useGeo();
  return isAllowedStatus(status);
}
