import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { isIOSWebKit } from "../../lib/iosGameFullscreen";
import {
  isLobbySessionEvicted,
  LOBBY_SESSION_OVERLAYS_DISMISS_EVENT,
} from "../../lib/dismissLobbySessionOverlays";
import { usePrimaryAppTab } from "../../lib/primaryAppTab";
import {
  isWelcomeVoiceGateOpen,
  LOBBY_WELCOME_VOICE_GATE_EVENT,
} from "../../lib/lobbyWelcomeVoiceGate";
import { useGeo } from "../geo/geoContext";
import { shouldShowNoviceTeachingGeneralTutorial } from "../../realtime/lobbyDecode";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { notifyWelcomeBonusClaimFinished } from "../tutorial/welcomeBonusTutorialBridge";
import { WelcomeGiftModal } from "./WelcomeGiftModal";
import {
  markWelcomeGiftClaimed,
  setWelcomeGiftOverlayOpen,
  wasWelcomeGiftClaimed,
} from "./welcomeGiftState";

export function WelcomeGiftGate() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const isPrimaryAppTab = usePrimaryAppTab();
  const { status: geoStatus } = useGeo();
  const { needsLobbyHydrationOverlay, lobbyGet } = useGatewayLobby();
  const [open, setOpen] = useState(false);
  const [welcomeVoiceGateVersion, setWelcomeVoiceGateVersion] = useState(0);

  const userId = user?.id?.trim() ?? "";

  useEffect(() => {
    const sync = () => setWelcomeVoiceGateVersion((v) => v + 1);
    window.addEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
    return () =>
      window.removeEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
  }, []);

  useEffect(() => {
    const onDismiss = () => setOpen(false);
    window.addEventListener(LOBBY_SESSION_OVERLAYS_DISMISS_EVENT, onDismiss);
    return () =>
      window.removeEventListener(LOBBY_SESSION_OVERLAYS_DISMISS_EVENT, onDismiss);
  }, []);

  useEffect(() => {
    setWelcomeGiftOverlayOpen(open);
  }, [open]);

  useLayoutEffect(() => {
    if (!ready || !userId || userId === "0") {
      setOpen(false);
      return;
    }
    if (isLobbySessionEvicted()) {
      setOpen(false);
      return;
    }
    if (!isPrimaryAppTab) {
      setOpen(false);
      return;
    }
    if (location.pathname !== "/") {
      setOpen(false);
      return;
    }
    if (geoStatus === "checking" || needsLobbyHydrationOverlay) {
      setOpen(false);
      return;
    }
    if (!lobbyGet) {
      setOpen(false);
      return;
    }
    if (!isIOSWebKit() && !isWelcomeVoiceGateOpen()) {
      setOpen(false);
      return;
    }
    if (!shouldShowNoviceTeachingGeneralTutorial(lobbyGet)) {
      setOpen(false);
      return;
    }
    if (wasWelcomeGiftClaimed(userId)) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [
    ready,
    userId,
    isPrimaryAppTab,
    location.pathname,
    geoStatus,
    needsLobbyHydrationOverlay,
    welcomeVoiceGateVersion,
    lobbyGet,
  ]);

  const handleClaim = useCallback(() => {
    if (!userId || userId === "0") return;
    markWelcomeGiftClaimed(userId);
    setOpen(false);
    notifyWelcomeBonusClaimFinished();
  }, [userId]);

  return <WelcomeGiftModal open={open} onClaim={handleClaim} />;
}
