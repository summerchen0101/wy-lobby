import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
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
  const [welcomeVoiceGateOpen, setWelcomeVoiceGateOpen] = useState(
    isWelcomeVoiceGateOpen,
  );

  useEffect(() => {
    const sync = () => setWelcomeVoiceGateOpen(isWelcomeVoiceGateOpen());
    window.addEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
    return () =>
      window.removeEventListener(LOBBY_WELCOME_VOICE_GATE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!ready || !user || isNewbieTutorialMarkedDone()) {
      setOpen(false);
      return;
    }
    if (geoStatus === "checking" || needsLobbyHydrationOverlay) {
      return;
    }
    if (!welcomeVoiceGateOpen) {
      return;
    }
    setOpen(true);
  }, [
    ready,
    user,
    geoStatus,
    needsLobbyHydrationOverlay,
    welcomeVoiceGateOpen,
  ]);

  const handleTutorialComplete = useCallback(async () => {
    const wsOk = isWsLobbyGamesEnabled();
    const request = requestRef.current;
    const userId = user?.id?.trim() ?? "";

    if (wsOk && gatewayRequestReady && request && userId && userId !== "0") {
      try {
        const ok = await submitNoviceTeachingGeneralDone(request, userId);
        if (!ok) {
          console.warn(
            "[newbie-tutorial] UPDATE_NOVICE_TEACHING did not return a 2xx code",
          );
        }
      } catch (err) {
        console.warn("[newbie-tutorial] UPDATE_NOVICE_TEACHING failed", err);
      }
    }

    markNewbieTutorialDone();
    setOpen(false);
  }, [gatewayRequestReady, requestRef, user?.id]);

  return (
    <NewbieVideoTutorialOverlay
      open={open}
      onComplete={handleTutorialComplete}
    />
  );
}
