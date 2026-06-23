import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../../auth/useAuth";
import {
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
  const { user, ready } = useAuth();
  const [status, setStatus] = useState<GeoStatus>(() =>
    isRadarGeoEnabled() ? "checking" : "skipped",
  );
  const [blockReason, setBlockReason] = useState<GeoBlockReason | undefined>();
  const verifySeqRef = useRef(0);
  const userIdRef = useRef<string | undefined>(user?.id);

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

  const recheck = useCallback(async () => {
    if (!isRadarGeoEnabled()) {
      setStatus("skipped");
      setBlockReason(undefined);
      return;
    }

    const seq = ++verifySeqRef.current;
    setStatus("checking");
    stopGeoTracking();

    const result = await runGeoVerification(userIdRef.current);
    if (seq !== verifySeqRef.current) return;
    applyVerificationResult(result);
  }, [applyVerificationResult]);

  useEffect(() => {
    if (!ready) return;
    void recheck();
  }, [ready, user?.id, recheck]);

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
