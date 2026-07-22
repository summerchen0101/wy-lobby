import { useCallback, useEffect, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { GameOverlay } from "../../components/GameOverlay";
import {
  getStoredAccessToken,
  getStoredRefreshToken,
} from "../../auth/sessionPersist";
import {
  clearGamePopoutUrlByKey,
  parseSafeHttpGameUrl,
  readGamePopoutUrlByKey,
} from "../../lib/gameShell";
import {
  logGameOverlayClosed,
  logPerfMemorySnapshot,
} from "../../lib/gameShellTelemetry";
import { markPendingBeggarEnvelopeCheck } from "../../lib/beggarEnvelopeCheck";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { usePaymentCallbackListener } from "../payment/usePaymentCallbackListener";

function launchUrlHadToken(url: string): boolean {
  try {
    return Boolean(new URL(url).searchParams.get("token")?.trim());
  } catch {
    return false;
  }
}

export function GamePlayPage() {
  const navigate = useNavigate();
  const { ready } = useAuth();
  const { refreshLobbyGet } = useGatewayLobby();
  const [params] = useSearchParams();
  const k = params.get("k")?.trim();
  const rawUrlParam = params.get("url")?.trim();

  const frameUrl = useMemo(() => {
    if (k) return readGamePopoutUrlByKey(k);
    if (rawUrlParam) return parseSafeHttpGameUrl(rawUrlParam);
    return null;
  }, [k, rawUrlParam]);

  const requiresStoredSession = useMemo(
    () => (frameUrl ? launchUrlHadToken(frameUrl) : false),
    [frameUrl],
  );

  useEffect(() => {
    if (!ready || !requiresStoredSession) return;
    const hasSession =
      Boolean(getStoredAccessToken()?.trim()) ||
      Boolean(getStoredRefreshToken()?.trim());
    if (!hasSession) {
      navigate("/", { replace: true });
    }
  }, [ready, requiresStoredSession, navigate]);

  const handleClose = useCallback(() => {
    if (k) clearGamePopoutUrlByKey(k);
    logGameOverlayClosed();
    logPerfMemorySnapshot("[game-shell][dev] heap on play_route_close");
    void refreshLobbyGet();
    markPendingBeggarEnvelopeCheck();
    navigate("/", { replace: true });
  }, [k, navigate, refreshLobbyGet]);

  usePaymentCallbackListener("game", Boolean(frameUrl), handleClose);

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
