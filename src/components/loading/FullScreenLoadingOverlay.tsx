import { publicImageUrl } from "../../lib/publicImageUrl";
import "./FullScreenLoadingOverlay.css";

const BRAND_LOGO = publicImageUrl("/images/brand/brand-logo.webp");

export function FullScreenLoadingOverlay() {
  return (
    <div
      className="fullscreen-loading-overlay"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="fullscreen-loading-overlay__sr-only">Loading</span>
      <div className="fullscreen-loading-overlay__stage" aria-hidden>
        <div className="fullscreen-loading-overlay__ring-soft" />
        <div className="fullscreen-loading-overlay__ring" />
        <img
          src={BRAND_LOGO}
          alt=""
          width={96}
          height={96}
          decoding="async"
          className="fullscreen-loading-overlay__logo"
        />
      </div>
    </div>
  )
}
