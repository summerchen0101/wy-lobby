import { useCallback, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { GameOverlay } from "../../components/GameOverlay";
import {
  clearGamePopoutUrlByKey,
  parseSafeHttpGameUrl,
  readGamePopoutUrlByKey,
} from "../../lib/gameShell";
import {
  logGameOverlayClosed,
  logPerfMemorySnapshot,
} from "../../lib/gameShellTelemetry";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";

export function GamePlayPage() {
  const navigate = useNavigate();
  const { refreshLobbyGet } = useGatewayLobby();
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
    logPerfMemorySnapshot("[game-shell][dev] heap on play_route_close");
    void refreshLobbyGet();
    navigate("/", { replace: true });
  }, [k, navigate, refreshLobbyGet]);

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
