import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import { isWelcomeVoiceGateOpen } from "../../lib/lobbyWelcomeVoiceGate";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { useDailyLoginActivity } from "./dailyLoginContext";
import {
  markDailyLoginAutoPopupShown,
  wasDailyLoginAutoPopupShown,
} from "./dailyLoginSession";

export function DailyLoginGate() {
  const { ready, user } = useAuth();
  const location = useLocation();
  const { gatewayRequestReady, needsLobbyHydrationOverlay } = useGatewayLobby();
  const { viewModel, loading, openModal } = useDailyLoginActivity();

  useEffect(() => {
    if (!ready || !user || user.id === "0") return;
    if (location.pathname !== "/") return;
    if (!isWsLobbyGamesEnabled()) return;
    if (!gatewayRequestReady || needsLobbyHydrationOverlay) return;
    if (!isWelcomeVoiceGateOpen()) return;
    if (loading || !viewModel?.claimable) return;
    if (wasDailyLoginAutoPopupShown()) return;

    markDailyLoginAutoPopupShown();
    openModal({ refresh: false });
  }, [
    ready,
    user,
    location.pathname,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    loading,
    viewModel?.claimable,
    openModal,
  ]);

  return null;
}
