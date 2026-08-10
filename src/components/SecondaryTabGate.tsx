import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  requestPrimaryTabFocus,
  tryDismissSecondaryTab,
  usePrimaryAppTab,
} from "../lib/primaryAppTab";
import { isSecondaryTabGateExemptRoute } from "../lib/secondaryTabGateRoute";
import "./ForceUpdateGate.css";

/**
 * 嚴格單分頁：次分頁全螢幕封鎖，須關閉主分頁後才能使用（聚焦不會搶佔主分頁）。
 */
export function SecondaryTabGate() {
  const { pathname } = useLocation();
  const isPrimaryAppTab = usePrimaryAppTab();
  const [closeBlocked, setCloseBlocked] = useState(false);

  const focusPrimaryTab = useCallback(() => {
    requestPrimaryTabFocus();
    try {
      window.opener?.focus();
    } catch {
      /* ignore */
    }
  }, []);

  const closeTab = useCallback(() => {
    tryDismissSecondaryTab(() => setCloseBlocked(true));
  }, []);

  if (isPrimaryAppTab || isSecondaryTabGateExemptRoute(pathname)) {
    return null;
  }

  return createPortal(
    <div
      className="force-update-overlay secondary-tab-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="secondary-tab-title"
      aria-describedby="secondary-tab-desc"
    >
      <div className="force-update-overlay__panel">
        <h2 id="secondary-tab-title" className="force-update-overlay__title">
          {closeBlocked ? "Close this tab manually" : "Close this tab"}
        </h2>
        <p id="secondary-tab-desc" className="force-update-overlay__message">
          {closeBlocked
            ? "Your browser blocked automatic tab closing. Press Ctrl+W (Windows) or Cmd+W (Mac), or click the × on this tab. Your original tab should already be focused."
            : "This game only supports one browser tab at a time. Please close this tab and return to your original tab to continue playing."}
        </p>
        <button
          type="button"
          className="force-update-overlay__link"
          onClick={closeBlocked ? focusPrimaryTab : closeTab}
        >
          {closeBlocked ? "Go to original tab" : "Close"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
