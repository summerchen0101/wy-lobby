import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import { setLobbyBgmSuppressed } from "../../lib/lobbySound";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { NewbieVideoTutorialOverlay } from "./NewbieVideoTutorialOverlay";
import { submitNoviceTeachingGeneralDone } from "./submitNoviceTeachingGeneralDone";
import {
  isNewbieTutorialMarkedDone,
  markNewbieTutorialDone,
} from "./tutorialStorage";

export function NewbieTutorialGate() {
  const { user, ready } = useAuth();
  const { requestRef, gatewayRequestReady } = useGatewayLobby();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !user || isNewbieTutorialMarkedDone()) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [ready, user]);

  useEffect(() => {
    setLobbyBgmSuppressed(open);
    return () => setLobbyBgmSuppressed(false);
  }, [open]);

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
