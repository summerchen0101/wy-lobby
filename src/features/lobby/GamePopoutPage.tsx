import { useCallback, useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { GameOverlay } from "../../components/GameOverlay";
import {
  clearGamePopoutUrlByKey,
  parseSafeHttpGameUrl,
  readGamePopoutUrlByKey,
} from "../../lib/gameShell";
import { GAME_SHELL_POPOUT_CLOSED_TYPE } from "../../lib/gameShellMessages";
import {
  logGameOverlayClosed,
  logPerfMemorySnapshot,
} from "../../lib/gameShellTelemetry";

export function GamePopoutPage() {
  const [params] = useSearchParams();
  const k = params.get("k")?.trim();
  const rawUrlParam = params.get("url")?.trim();

  const frameUrl = useMemo(() => {
    if (k) return readGamePopoutUrlByKey(k);
    if (rawUrlParam) return parseSafeHttpGameUrl(rawUrlParam);
    return null;
  }, [k, rawUrlParam]);

  const handleClose = useCallback(() => {
    if (k) clearGamePopoutUrlByKey(k);
    logGameOverlayClosed();
    logPerfMemorySnapshot("[game-shell][dev] heap on popout_close");
    try {
      window.opener?.postMessage(
        { type: GAME_SHELL_POPOUT_CLOSED_TYPE },
        window.location.origin,
      );
    } catch {
      /* ignore */
    }
    try {
      window.opener?.focus();
    } catch {
      /* ignore */
    }
    window.close();
    window.setTimeout(() => {
      window.location.replace("/");
    }, 0);
  }, [k]);

  if (!frameUrl) {
    return <Navigate to="/" replace />;
  }

  return (
    <GameOverlay
      key={frameUrl}
      url={frameUrl}
      widthPercent={100}
      heightPercent={100}
      isPayment={false}
      onClose={handleClose}
    />
  );
}
