import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../../auth/useAuth";
import {
  isRadarUserId,
  shouldVerifyOnUserChange,
} from "../../lib/geo/geoSession";
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
  const loggedIn = Boolean(token?.trim() && user?.id?.trim());
  const [status, setStatus] = useState<GeoStatus>(() =>
    isRadarGeoEnabled() ? "allowed" : "skipped",
  );
  const [blockReason, setBlockReason] = useState<GeoBlockReason | undefined>();
  const verifySeqRef = useRef(0);
  const userIdRef = useRef<string | undefined>(user?.id);
  const verifiedUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const applyVerificationResult = useCallback(
    (result: Awaited<ReturnType<typeof runGeoVerification>>) => {
      // Never apply blocks without a real Radar user id (logout / placeholder).
      if (!isRadarUserId(userIdRef.current)) {
        setBlockReason(undefined);
        setStatus("allowed");
        return;
      }

      if (result.status === "allowed") {
        setBlockReason(undefined);
        setStatus("allowed");
        startGeoTracking(userIdRef.current);
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

    const playerId = userIdRef.current?.trim();
    if (!isRadarUserId(playerId)) return;

    const seq = ++verifySeqRef.current;
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

    const playerId = userIdRef.current?.trim();
    if (!isRadarUserId(playerId)) {
      setBlockReason(undefined);
      setStatus("allowed");
      return;
    }

    const seq = ++verifySeqRef.current;
    setStatus("checking");
    stopGeoTracking();

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

    // Pre-login: never check or block.
    if (!loggedIn) {
      verifySeqRef.current += 1;
      stopGeoTracking();
      identifyRadarPlayer(undefined);
      setBlockReason(undefined);
      setStatus("allowed");
      verifiedUserIdRef.current = undefined;
      return;
    }

    const playerId = user?.id?.trim();
    // Placeholder `"0"`: wait for LOBBY_GET real id before Radar.
    if (!isRadarUserId(playerId)) return;

    if (!shouldVerifyOnUserChange(verifiedUserIdRef.current, playerId)) {
      return;
    }

    verifiedUserIdRef.current = playerId;
    identifyRadarPlayer(playerId);
    void verifyInBackground();
  }, [ready, loggedIn, user?.id, verifyInBackground]);

  useEffect(() => {
    if (!isRadarGeoEnabled()) return;
    return subscribeGeoTokenUpdates((result) => {
      // Periodic token updates only apply while still logged in with a real id.
      if (!isRadarUserId(userIdRef.current)) return;

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
    isBlocked: loggedIn && status === "blocked",
  };

  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}
