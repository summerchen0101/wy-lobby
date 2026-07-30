import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import {
  isWelcomeVoiceGateOpen,
  LOBBY_WELCOME_VOICE_GATE_EVENT,
} from "../../lib/lobbyWelcomeVoiceGate";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { useDailyLoginActivity } from "./dailyLoginContext";
import { shouldAutoPopupDailyLogin } from "./dailyLoginLogic";
import {
  markDailyLoginAutoPopupShown,
  wasDailyLoginAutoPopupShown,
} from "./dailyLoginSession";

function isDailyLoginAutoPopupBlockedRoute(pathname: string): boolean {
  return pathname === "/play" || pathname === "/game-popout";
}

export function DailyLoginGate() {
  const { ready, user } = useAuth();
  const location = useLocation();
  const { gatewayRequestReady, needsLobbyHydrationOverlay } = useGatewayLobby();
  const { viewModel, loading, openModal } = useDailyLoginActivity();
  const [welcomeVoiceGateVersion, setWelcomeVoiceGateVersion] = useState(0);

  useEffect(() => {
    const sync = () => setWelcomeVoiceGateVersion((v) => v + 1);
    window.addEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
    return () =>
      window.removeEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
  }, []);

  useEffect(() => {
    const userId = user?.id?.trim() ?? "";
    if (!ready || !userId || userId === "0") return;
    if (isDailyLoginAutoPopupBlockedRoute(location.pathname)) return;
    if (!isWsLobbyGamesEnabled()) return;
    if (!gatewayRequestReady || needsLobbyHydrationOverlay) return;
    if (!isWelcomeVoiceGateOpen()) return;
    if (loading || !shouldAutoPopupDailyLogin(viewModel)) return;
    if (wasDailyLoginAutoPopupShown(userId)) return;

    markDailyLoginAutoPopupShown(userId);
    openModal({ refresh: false });
  }, [
    ready,
    user,
    location.pathname,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    loading,
    viewModel,
    welcomeVoiceGateVersion,
    openModal,
  ]);

  return null;
}
