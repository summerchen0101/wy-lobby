import { useEffect, useRef } from "react";
import { useAuth } from "../../auth/useAuth";
import { getAlertApi } from "../alert/alertImperative";
import { dismissLobbySessionOverlays } from "../../lib/dismissLobbySessionOverlays";
import { getOrCreateTabId } from "../../lib/primaryAppTab";
import { startSessionEvictionListener } from "../../lib/sessionEvictionBroadcast";

/**
 * 同源多分頁：主分頁被 Gateway 踢下線時，同步關閉次分頁（含 `/play` 無 WS 者）。
 */
export function SessionEvictionListener() {
  const { logout } = useAuth();
  const kickLockRef = useRef(false);

  useEffect(() => {
    return startSessionEvictionListener((payload) => {
      if (payload.sourceTabId === getOrCreateTabId()) return;
      if (kickLockRef.current) return;
      kickLockRef.current = true;
      dismissLobbySessionOverlays();
      const api = getAlertApi();
      if (api) {
        api.showBlockingAlert(payload.message, {
          onConfirm: () => logout(),
        });
      } else {
        logout();
      }
    });
  }, [logout]);

  return null;
}
