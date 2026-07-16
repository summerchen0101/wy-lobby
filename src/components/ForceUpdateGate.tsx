import { useEffect, useState } from "react";
import type { ClientVersionError } from "../lib/api/clientVersionError";
import { setClientVersionRequiredHandler } from "../lib/clientVersionNotify";
import {
  CLIENT_VERSION_REQUIRED_MESSAGE,
  presentClientVersionError,
} from "../lib/clientVersionUi";
import "./ForceUpdateGate.css";

/**
 * 全域強更遮罩：refresh／apiRequest 偵測到 Code 600 時顯示，阻擋繼續使用舊版。
 */
export function ForceUpdateGate() {
  const [err, setErr] = useState<ClientVersionError | null>(null);
  const [message, setMessage] = useState(CLIENT_VERSION_REQUIRED_MESSAGE);

  useEffect(() => {
    setClientVersionRequiredHandler((next) => {
      setErr(next);
      setMessage(presentClientVersionError(next));
    });
    return () => setClientVersionRequiredHandler(null);
  }, []);

  if (!err) return null;

  const url = err.updateUrl?.trim();

  return (
    <div
      className="force-update-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
      aria-describedby="force-update-desc"
    >
      <div className="force-update-overlay__panel">
        <h2 id="force-update-title" className="force-update-overlay__title">
          Update required
        </h2>
        <p id="force-update-desc" className="force-update-overlay__message">
          {message}
        </p>
        {url ? (
          <a
            className="force-update-overlay__link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open update page
          </a>
        ) : (
          <button
            type="button"
            className="force-update-overlay__link"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        )}
      </div>
    </div>
  );
}
