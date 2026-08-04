import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { forceSafariRepaint } from "../lib/forceSafariRepaint";
import { FullScreenLoadingOverlay } from "../components/loading/FullScreenLoadingOverlay";
import { useGatewayLobby } from "./useGatewayLobby";

export function LobbyHydrationGate() {
  const { needsLobbyHydrationOverlay } = useGatewayLobby();
  const wasBlockingRef = useRef(false);

  useEffect(() => {
    if (wasBlockingRef.current && !needsLobbyHydrationOverlay) {
      forceSafariRepaint();
    }
    wasBlockingRef.current = needsLobbyHydrationOverlay;
  }, [needsLobbyHydrationOverlay]);

  if (!needsLobbyHydrationOverlay) return null;

  return createPortal(<FullScreenLoadingOverlay />, document.body);
}
