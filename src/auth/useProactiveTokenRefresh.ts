import { useEffect, useRef } from "react";
import type { AuthResponse } from "../lib/api/types";
import { refreshSession } from "./refreshSession";
import {
  getStoredAccessExpiresAtMs,
  getStoredRefreshToken,
} from "./sessionPersist";
import {
  computeRefreshDelayMs,
  isWithinRefreshLeadWindow,
  tokenRefreshLeadSecFromEnv,
} from "./tokenExpiry";

type UseProactiveTokenRefreshArgs = {
  token: string | null;
  onRefreshed: (res: AuthResponse) => void;
  onRefreshFailed: () => void;
};

/**
 * Schedules POST /api/v1/token before access expiry (see login_flow `expiresIn`).
 * Also refreshes when the tab becomes visible inside the lead window.
 */
export function useProactiveTokenRefresh({
  token,
  onRefreshed,
  onRefreshFailed,
}: UseProactiveTokenRefreshArgs): void {
  const onRefreshedRef = useRef(onRefreshed);
  const onRefreshFailedRef = useRef(onRefreshFailed);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    onRefreshedRef.current = onRefreshed;
    onRefreshFailedRef.current = onRefreshFailed;
  }, [onRefreshed, onRefreshFailed]);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const runRefresh = async () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      clearTimer();
      try {
        const res = await refreshSession();
        if (res) {
          onRefreshedRef.current(res);
        } else {
          onRefreshFailedRef.current();
        }
      } finally {
        refreshingRef.current = false;
      }
    };

    const scheduleFromStorage = () => {
      clearTimer();
      if (!token?.trim()) return;

      const expiresAtMs = getStoredAccessExpiresAtMs();
      if (expiresAtMs == null) {
        if (getStoredRefreshToken()?.trim()) {
          void runRefresh();
        }
        return;
      }

      const leadSec = tokenRefreshLeadSecFromEnv();
      const delayMs = computeRefreshDelayMs(expiresAtMs, leadSec);
      if (delayMs === 0) {
        void runRefresh();
        return;
      }
      timerRef.current = setTimeout(() => {
        void runRefresh();
      }, delayMs);
    };

    scheduleFromStorage();

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!token?.trim() || refreshingRef.current) return;
      const expiresAtMs = getStoredAccessExpiresAtMs();
      const leadSec = tokenRefreshLeadSecFromEnv();
      if (expiresAtMs == null) {
        if (getStoredRefreshToken()?.trim()) {
          void runRefresh();
        }
        return;
      }
      if (isWithinRefreshLeadWindow(expiresAtMs, leadSec)) {
        void runRefresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);
}
