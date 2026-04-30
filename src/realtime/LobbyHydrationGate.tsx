import { createPortal } from "react-dom";
import { FullScreenLoadingOverlay } from "../components/loading/FullScreenLoadingOverlay";
import { useGatewayLobby } from "./useGatewayLobby";

export function LobbyHydrationGate() {
  const { needsLobbyHydrationOverlay } = useGatewayLobby();

  if (!needsLobbyHydrationOverlay) return null;

  return createPortal(<FullScreenLoadingOverlay />, document.body);
}
