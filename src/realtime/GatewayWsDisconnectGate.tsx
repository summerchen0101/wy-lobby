import { createPortal } from "react-dom";
import { getWordPlain } from "../wordData/getWord";
import { useGatewayLobby } from "./useGatewayLobby";
import "../components/ForceUpdateGate.css";

function disconnectTitle(): string {
  const raw = getWordPlain(400023) || "Session Expired";
  return raw.split("\n")[0]?.trim() || "Session Expired";
}

function disconnectMessage(): string {
  return (
    getWordPlain(400015) ||
    "The network signal is unstable.\nPlease click to reconnect."
  );
}

/**
 * 已登入後 Gateway WS 意外斷線：全螢幕擋住操作（含 /play），避免收不到踢人推播仍能開遊戲。
 */
export function GatewayWsDisconnectGate() {
  const { gatewayWsDisconnected } = useGatewayLobby();

  if (!gatewayWsDisconnected) return null;

  const title = disconnectTitle();
  const message = disconnectMessage();

  return createPortal(
    <div
      className="force-update-overlay ws-disconnect-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ws-disconnect-title"
      aria-describedby="ws-disconnect-desc"
    >
      <div className="force-update-overlay__panel">
        <h2 id="ws-disconnect-title" className="force-update-overlay__title">
          {title}
        </h2>
        <p
          id="ws-disconnect-desc"
          className="force-update-overlay__message ws-disconnect-overlay__message"
        >
          {message}
        </p>
        <button
          type="button"
          className="force-update-overlay__link"
          onClick={() => window.location.reload()}
        >
          Reconnect
        </button>
      </div>
    </div>,
    document.body,
  );
}
