import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import { isGatewayWsSuppressedRoute } from "../../lib/gatewayWsRoute";
import { isLobbySessionEvicted } from "../../lib/dismissLobbySessionOverlays";
import { usePrimaryAppTab } from "../../lib/primaryAppTab";
import {
  isWelcomeVoiceGateOpen,
  LOBBY_WELCOME_VOICE_GATE_EVENT,
} from "../../lib/lobbyWelcomeVoiceGate";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import {
  shouldShowNoviceTeachingGeneralTutorial,
  type LobbyGetDecoded,
} from "../../realtime/lobbyDecode";
import {
  isNewbieTutorialCompletedThisSession,
  isTutorialOverlayOpen,
  TUTORIAL_OVERLAY_STATE_EVENT,
} from "../tutorial/tutorialOverlayState";
import {
  isWelcomeGiftOverlayOpen,
  wasWelcomeGiftClaimed,
  WELCOME_GIFT_STATE_EVENT,
} from "../welcomeGift/welcomeGiftState";
import { useDailyLoginActivity } from "./dailyLoginContext";
import { shouldAutoPopupDailyLogin } from "./dailyLoginLogic";
import {
  markDailyLoginAutoPopupShown,
  wasDailyLoginAutoPopupShown,
} from "./dailyLoginSession";

function isDailyLoginAutoPopupBlockedRoute(pathname: string): boolean {
  return (
    pathname === "/play" ||
    pathname === "/game-popout" ||
    isGatewayWsSuppressedRoute(pathname)
  );
}

function isNewbieTutorialBlockingDailyLogin(
  lobbyGet: LobbyGetDecoded | null | undefined,
  userId: string,
): boolean {
  if (isNewbieTutorialCompletedThisSession()) return false;
  if (isTutorialOverlayOpen()) return true;
  if (isWelcomeGiftOverlayOpen()) return true;
  if (
    shouldShowNoviceTeachingGeneralTutorial(lobbyGet) &&
    !wasWelcomeGiftClaimed(userId)
  ) {
    return true;
  }
  return shouldShowNoviceTeachingGeneralTutorial(lobbyGet);
}

export function DailyLoginGate() {
  const { ready, user } = useAuth();
  const location = useLocation();
  const isPrimaryAppTab = usePrimaryAppTab();
  const { gatewayRequestReady, needsLobbyHydrationOverlay, lobbyGet } =
    useGatewayLobby();
  const { viewModel, loading, openModal } = useDailyLoginActivity();
  const [welcomeVoiceGateVersion, setWelcomeVoiceGateVersion] = useState(0);
  const [tutorialOverlayVersion, setTutorialOverlayVersion] = useState(0);
  const [welcomeGiftStateVersion, setWelcomeGiftStateVersion] = useState(0);

  useEffect(() => {
    const sync = () => setWelcomeVoiceGateVersion((v) => v + 1);
    window.addEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
    return () =>
      window.removeEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
  }, []);

  useEffect(() => {
    const sync = () => setTutorialOverlayVersion((v) => v + 1);
    window.addEventListener(TUTORIAL_OVERLAY_STATE_EVENT, sync);
    return () =>
      window.removeEventListener(TUTORIAL_OVERLAY_STATE_EVENT, sync);
  }, []);

  useEffect(() => {
    const sync = () => setWelcomeGiftStateVersion((v) => v + 1);
    window.addEventListener(WELCOME_GIFT_STATE_EVENT, sync);
    return () =>
      window.removeEventListener(WELCOME_GIFT_STATE_EVENT, sync);
  }, []);

  useEffect(() => {
    const userId = user?.id?.trim() ?? "";
    if (!ready || !userId || userId === "0") return;
    if (isLobbySessionEvicted()) return;
    if (!isPrimaryAppTab) return;
    if (isDailyLoginAutoPopupBlockedRoute(location.pathname)) return;
    if (!isWsLobbyGamesEnabled()) return;
    if (!gatewayRequestReady || needsLobbyHydrationOverlay) return;
    if (!isWelcomeVoiceGateOpen()) return;
    if (isNewbieTutorialBlockingDailyLogin(lobbyGet, userId)) return;
    if (loading || !shouldAutoPopupDailyLogin(viewModel)) return;
    if (wasDailyLoginAutoPopupShown(userId)) return;

    markDailyLoginAutoPopupShown(userId);
    openModal({ refresh: false });
  }, [
    ready,
    user,
    isPrimaryAppTab,
    location.pathname,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    loading,
    viewModel,
    welcomeVoiceGateVersion,
    tutorialOverlayVersion,
    welcomeGiftStateVersion,
    lobbyGet,
    openModal,
  ]);

  return null;
}
