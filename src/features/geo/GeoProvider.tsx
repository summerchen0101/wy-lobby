import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../../auth/useAuth";
import { shouldVerifyOnTokenChange } from "../../lib/geo/geoSession";
import {
  identifyRadarPlayer,
  isRadarGeoEnabled,
  runGeoVerification,
  startGeoTracking,
  stopGeoTracking,
  subscribeGeoTokenUpdates,
  type GeoBlockReason,
} from "../../lib/geo/radarGeo";
import {
  GeoContext,
  type GeoContextValue,
  type GeoStatus,
} from "./geoContext";

export function GeoProvider({ children }: { children: ReactNode }) {
  const { user, ready, token } = useAuth();
  const [status, setStatus] = useState<GeoStatus>(() =>
    isRadarGeoEnabled() ? "allowed" : "skipped",
  );
  const [blockReason, setBlockReason] = useState<GeoBlockReason | undefined>();
  const verifySeqRef = useRef(0);
  const userIdRef = useRef<string | undefined>(user?.id);
  const prevTokenRef = useRef<string | null | undefined>(undefined);
  const identifiedUserIdRef = useRef<string | undefined>(undefined);
  /** True when the latest verify ran without a Radar userId (bypass rules cannot match). */
  const verifiedWithoutUserIdRef = useRef(false);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const applyVerificationResult = useCallback(
    (result: Awaited<ReturnType<typeof runGeoVerification>>) => {
      if (result.status === "allowed") {
        setBlockReason(undefined);
        setStatus("allowed");
        startGeoTracking();
        return;
      }

      if (result.status === "skipped") {
        setBlockReason(undefined);
        setStatus("skipped");
        return;
      }

      stopGeoTracking();
      setBlockReason(result.blockReason ?? "region");
      setStatus("blocked");
    },
    [],
  );

  const verifyInBackground = useCallback(async () => {
    if (!isRadarGeoEnabled()) return;

    const seq = ++verifySeqRef.current;
    const playerId = userIdRef.current;
    verifiedWithoutUserIdRef.current = !playerId?.trim();
    const result = await runGeoVerification(playerId);
    if (seq !== verifySeqRef.current) return;
    applyVerificationResult(result);
  }, [applyVerificationResult]);

  const recheck = useCallback(async () => {
    if (!isRadarGeoEnabled()) {
      setStatus("skipped");
      setBlockReason(undefined);
      return;
    }

    const seq = ++verifySeqRef.current;
    setStatus("checking");
    stopGeoTracking();

    const playerId = userIdRef.current;
    verifiedWithoutUserIdRef.current = !playerId?.trim();
    const result = await runGeoVerification(playerId);
    if (seq !== verifySeqRef.current) return;
    applyVerificationResult(result);
  }, [applyVerificationResult]);

  useEffect(() => {
    if (!ready) return;

    if (!isRadarGeoEnabled()) {
      setStatus("skipped");
      setBlockReason(undefined);
      return;
    }

    const current = token?.trim() || null;
    const prev = prevTokenRef.current;
    prevTokenRef.current = current;

    if (!current) {
      stopGeoTracking();
      setBlockReason(undefined);
      setStatus("allowed");
      identifiedUserIdRef.current = undefined;
      verifiedWithoutUserIdRef.current = false;
      return;
    }

    if (shouldVerifyOnTokenChange(prev, current)) {
      void verifyInBackground();
    }
  }, [ready, token, verifyInBackground]);

  // Bypass rules match on Radar userId. If the first check ran before playerId
  // was known, identify and re-verify once the id arrives.
  useEffect(() => {
    const playerId = user?.id?.trim();
    if (!playerId || !isRadarGeoEnabled()) return;
    if (identifiedUserIdRef.current === playerId) return;
    identifiedUserIdRef.current = playerId;
    identifyRadarPlayer(playerId);
    if (verifiedWithoutUserIdRef.current) {
      void verifyInBackground();
    }
  }, [user?.id, verifyInBackground]);

  useEffect(() => {
    if (!isRadarGeoEnabled()) return;
    return subscribeGeoTokenUpdates((result) => {
      if (result.status === "allowed") {
        setBlockReason(undefined);
        setStatus("allowed");
        return;
      }
      if (result.status === "blocked") {
        stopGeoTracking();
        setBlockReason(result.blockReason ?? "region");
        setStatus("blocked");
      }
    });
  }, []);

  useEffect(() => () => stopGeoTracking(), []);

  const value: GeoContextValue = {
    status,
    blockReason,
    recheck,
    isBlocked: status === "blocked",
  };

  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}
