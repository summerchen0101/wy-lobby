import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { forceSafariRepaint } from "../../lib/forceSafariRepaint";
import { isIOSWebKit } from "../../lib/iosGameFullscreen";
import {
  isLobbySessionEvicted,
  LOBBY_SESSION_OVERLAYS_DISMISS_EVENT,
} from "../../lib/dismissLobbySessionOverlays";
import { useGeo } from "../geo/geoContext";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import {
  isWelcomeVoiceGateOpen,
  LOBBY_WELCOME_VOICE_GATE_EVENT,
} from "../../lib/lobbyWelcomeVoiceGate";
import {
  isNoviceTeachingGeneralDone,
  shouldShowNoviceTeachingGeneralTutorial,
} from "../../realtime/lobbyDecode";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import {
  markNewbieTutorialCompletedThisSession,
  syncNewbieTutorialSessionUser,
} from "./tutorialOverlayState";
import { wasWelcomeGiftClaimed } from "../welcomeGift/welcomeGiftState";
import { subscribeWelcomeBonusClaimFinished } from "./welcomeBonusTutorialBridge";
import { NewbieVideoTutorialOverlay } from "./NewbieVideoTutorialOverlay";
import { submitNoviceTeachingGeneralDone } from "./submitNoviceTeachingGeneralDone";

export function NewbieTutorialGate() {
  const { user, ready } = useAuth();
  const { status: geoStatus } = useGeo();
  const {
    requestRef,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    lobbyGet,
    refreshLobbyGet,
  } = useGatewayLobby();
  const [open, setOpen] = useState(false);
  const [welcomeVoiceGateVersion, setWelcomeVoiceGateVersion] = useState(0);
  const [welcomeGiftClaimVersion, setWelcomeGiftClaimVersion] = useState(0);
  const [completedLocally, setCompletedLocally] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    syncNewbieTutorialSessionUser(user?.id);
    setCompletedLocally(false);
  }, [user?.id]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      forceSafariRepaint();
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    const sync = () => setWelcomeVoiceGateVersion((v) => v + 1);
    window.addEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
    return () =>
      window.removeEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
  }, []);

  useEffect(() => {
    const sync = () => setWelcomeGiftClaimVersion((v) => v + 1);
    return subscribeWelcomeBonusClaimFinished(sync);
  }, []);

  useEffect(() => {
    const onDismiss = () => setOpen(false);
    window.addEventListener(LOBBY_SESSION_OVERLAYS_DISMISS_EVENT, onDismiss);
    return () =>
      window.removeEventListener(LOBBY_SESSION_OVERLAYS_DISMISS_EVENT, onDismiss);
  }, []);

  useEffect(() => {
    if (completedLocally || isNoviceTeachingGeneralDone(lobbyGet)) {
      setOpen(false);
    }
  }, [completedLocally, lobbyGet]);

  useLayoutEffect(() => {
    const userId = user?.id?.trim() ?? "";
    if (!ready || !user) {
      setOpen(false);
      return;
    }
    if (isLobbySessionEvicted()) {
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
    // iOS autoplay / BFCache can leave the welcome-voice gate stuck closed; don't block tutorial.
    if (!isIOSWebKit() && !isWelcomeVoiceGateOpen()) {
      setOpen(false);
      return;
    }
    if (completedLocally || !shouldShowNoviceTeachingGeneralTutorial(lobbyGet)) {
      setOpen(false);
      return;
    }
    if (!wasWelcomeGiftClaimed(userId)) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [
    ready,
    user,
    geoStatus,
    needsLobbyHydrationOverlay,
    welcomeVoiceGateVersion,
    welcomeGiftClaimVersion,
    completedLocally,
    lobbyGet,
  ]);

  const handleTutorialComplete = useCallback(() => {
    markNewbieTutorialCompletedThisSession();
    setCompletedLocally(true);
    setOpen(false);

    const wsOk = isWsLobbyGamesEnabled();
    const request = requestRef.current;
    const userId = user?.id?.trim() ?? "";

    if (wsOk && gatewayRequestReady && request && userId && userId !== "0") {
      void submitNoviceTeachingGeneralDone(request, userId)
        .then((ok) => {
          if (!ok) {
            console.warn(
              "[newbie-tutorial] UPDATE_NOVICE_TEACHING did not return a 2xx code",
            );
            return;
          }
          void refreshLobbyGet().catch((err) => {
            console.warn(
              "[newbie-tutorial] LOBBY_GET refresh after UPDATE_NOVICE_TEACHING failed",
              err,
            );
          });
        })
        .catch((err) => {
          console.warn("[newbie-tutorial] UPDATE_NOVICE_TEACHING failed", err);
        });
    }
  }, [gatewayRequestReady, refreshLobbyGet, requestRef, user?.id]);

  return (
    <NewbieVideoTutorialOverlay
      open={open}
      onComplete={handleTutorialComplete}
    />
  );
}
