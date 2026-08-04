import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { forceSafariRepaint } from "../../lib/forceSafariRepaint";
import { useGeo } from "../geo/geoContext";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import {
  isWelcomeVoiceGateOpen,
  LOBBY_WELCOME_VOICE_GATE_EVENT,
} from "../../lib/lobbyWelcomeVoiceGate";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { NewbieVideoTutorialOverlay } from "./NewbieVideoTutorialOverlay";
import { submitNoviceTeachingGeneralDone } from "./submitNoviceTeachingGeneralDone";
import {
  isNewbieTutorialMarkedDone,
  markNewbieTutorialDone,
} from "./tutorialStorage";

export function NewbieTutorialGate() {
  const { user, ready } = useAuth();
  const { status: geoStatus } = useGeo();
  const { requestRef, gatewayRequestReady, needsLobbyHydrationOverlay } =
    useGatewayLobby();
  const [open, setOpen] = useState(false);
  const [welcomeVoiceGateVersion, setWelcomeVoiceGateVersion] = useState(0);
  const wasOpenRef = useRef(false);

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

  useLayoutEffect(() => {
    if (!ready || !user || isNewbieTutorialMarkedDone()) {
      setOpen(false);
      return;
    }
    if (geoStatus === "checking" || needsLobbyHydrationOverlay) {
      return;
    }
    if (!isWelcomeVoiceGateOpen()) {
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
  ]);

  const handleTutorialComplete = useCallback(() => {
    markNewbieTutorialDone();
    setOpen(false);

    const wsOk = isWsLobbyGamesEnabled();
    const request = requestRef.current;
    const userId = user?.id?.trim() ?? "";

    if (wsOk && gatewayRequestReady && request && userId && userId !== "0") {
      void submitNoviceTeachingGeneralDone(request, userId).then((ok) => {
        if (!ok) {
          console.warn(
            "[newbie-tutorial] UPDATE_NOVICE_TEACHING did not return a 2xx code",
          );
        }
      }).catch((err) => {
        console.warn("[newbie-tutorial] UPDATE_NOVICE_TEACHING failed", err);
      });
    }
  }, [gatewayRequestReady, requestRef, user?.id]);

  return (
    <NewbieVideoTutorialOverlay
      open={open}
      onComplete={handleTutorialComplete}
    />
  );
}
