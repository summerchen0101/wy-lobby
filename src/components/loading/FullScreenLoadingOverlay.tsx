import { LOBBY_LOADING_IMAGE } from "../../lib/brandLogos";
import "./FullScreenLoadingOverlay.css";

export function FullScreenLoadingOverlay() {
  return (
    <div
      className="fullscreen-loading-overlay"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="fullscreen-loading-overlay__sr-only">Loading</span>
      <img
        src={LOBBY_LOADING_IMAGE}
        alt=""
        width={348}
        height={355}
        decoding="async"
        className="fullscreen-loading-overlay__animation"
      />
    </div>
  );
}
