import Radar from "radar-sdk-js";
import { createFraudPlugin } from "@radarlabs/plugin-fraud";
import type { RadarTrackVerifiedResponse } from "@radarlabs/plugin-fraud";
import type { RadarUser } from "radar-sdk-js";

const TRACKING_INTERVAL_SEC = 1200;

export type GeoBlockReason =
  | "region"
  | "proxy"
  | "permissions"
  | "network"
  | "location"
  | "unknown";

export type GeoVerificationStatus = "skipped" | "allowed" | "blocked";

export type GeoVerificationResult = {
  status: GeoVerificationStatus;
  blockReason?: GeoBlockReason;
  token?: string;
};

type RadarUserWithJurisdiction = RadarUser & {
  country?: RadarUser["country"] & { passed?: boolean };
  state?: RadarUser["state"] & { passed?: boolean };
};

type RadarTrackVerifiedLike = {
  passed: boolean;
  failureReasons?: string[];
  token?: string;
  user?: RadarUserWithJurisdiction;
};

type RadarErrorLike = {
  status?: string;
};

let initialized = false;
let fraudPluginRegistered = false;

export function getRadarPublishableKey(): string | undefined {
  const key = import.meta.env.VITE_RADAR_PUBLISHABLE_KEY?.trim();
  return key || undefined;
}

export function isRadarGeoEnabled(): boolean {
  return Boolean(getRadarPublishableKey());
}

function ensureFraudPlugin(): void {
  if (fraudPluginRegistered) return;
  Radar.registerPlugin(createFraudPlugin());
  fraudPluginRegistered = true;
}

export function initRadarGeo(): boolean {
  const publishableKey = getRadarPublishableKey();
  if (!publishableKey) return false;
  ensureFraudPlugin();
  if (!initialized) {
    Radar.initialize({ publishableKey, desiredAccuracy: "medium" });
    initialized = true;
  }
  return true;
}

export function identifyRadarPlayer(playerId?: string): void {
  if (!initRadarGeo()) return;
  const trimmed = playerId?.trim();
  if (trimmed) {
    Radar.setUserId(trimmed);
    return;
  }
  Radar.setUserId(undefined);
}

export function mapRadarErrorStatus(status: string | undefined): GeoBlockReason {
  switch (status) {
    case "ERROR_PERMISSIONS":
      return "permissions";
    case "ERROR_NETWORK":
      return "network";
    case "ERROR_LOCATION":
      return "location";
    default:
      return "unknown";
  }
}

export function mapVerificationResult(
  response: RadarTrackVerifiedLike,
): GeoVerificationResult {
  // Radar Dashboard Bypass / Block rules (whitelist): fraud.bypassed === true
  // forces a pass for testing outside the jurisdiction allowlist.
  if (response.passed || response.user?.fraud?.bypassed) {
    return { status: "allowed", token: response.token };
  }

  const user = response.user;
  if (user?.fraud?.proxy) {
    return { status: "blocked", blockReason: "proxy" };
  }

  const countryFailed = user?.country?.passed === false;
  const stateFailed = user?.state?.passed === false;
  if (countryFailed || stateFailed) {
    return { status: "blocked", blockReason: "region" };
  }

  const reasons = response.failureReasons ?? [];
  if (
    reasons.some((reason) =>
      /country|state|jurisdiction|region/i.test(reason),
    )
  ) {
    return { status: "blocked", blockReason: "region" };
  }

  return { status: "blocked", blockReason: "region" };
}

function mapRadarError(error: unknown): GeoVerificationResult {
  const status =
    error && typeof error === "object" && "status" in error
      ? String((error as RadarErrorLike).status)
      : undefined;
  return {
    status: "blocked",
    blockReason: mapRadarErrorStatus(status),
  };
}

export async function runGeoVerification(
  playerId?: string,
): Promise<GeoVerificationResult> {
  if (!initRadarGeo()) {
    return { status: "skipped" };
  }

  identifyRadarPlayer(playerId);

  try {
    const result = await Radar.fraud.trackVerified({
      skipVerifyApp: true,
      reason: "login",
    });
    return mapVerificationResult(result);
  } catch (error) {
    return mapRadarError(error);
  }
}

export function startGeoTracking(): void {
  if (!initRadarGeo()) return;
  Radar.fraud.startTrackingVerified({
    skipVerifyApp: true,
    interval: TRACKING_INTERVAL_SEC,
  });
}

export function stopGeoTracking(): void {
  if (!initialized || !fraudPluginRegistered) return;
  Radar.fraud.stopTrackingVerified();
}

export function subscribeGeoTokenUpdates(
  callback: (result: GeoVerificationResult) => void,
): () => void {
  if (!initRadarGeo()) {
    return () => {};
  }

  const handler = (response: RadarTrackVerifiedResponse) => {
    callback(mapVerificationResult(response));
  };

  Radar.fraud.onTokenUpdated(handler);
  return () => {
    Radar.fraud.onTokenUpdated(() => {});
  };
}
