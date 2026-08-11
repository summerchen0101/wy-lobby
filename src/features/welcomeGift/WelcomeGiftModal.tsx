import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import {
  WELCOME_GIFT_GC_DISPLAY,
  WELCOME_GIFT_SC_DISPLAY,
} from "./welcomeGiftConstants";
import { WELCOME_GIFT_ILLUSTRATION_URL } from "./welcomeGiftAssets";
import "./WelcomeGiftModal.css";

type Props = {
  open: boolean;
  onClaim: () => void;
};

export function WelcomeGiftModal({ open, onClaim }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="welcome-gift-overlay" role="presentation">
      <div
        className="welcome-gift-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="welcome-gift-modal__header">
          <h2 id={titleId} className="welcome-gift-modal__title">
            WELCOME
          </h2>
        </header>

        <p className="welcome-gift-modal__claim-text">
          Claim Your{" "}
          <span className="welcome-gift-modal__reward">
            <img
              className="welcome-gift-modal__coin-icon"
              src={CURRENCY_ICON_GC}
              alt=""
              width={22}
              height={22}
              decoding="async"
            />
            <span>{WELCOME_GIFT_GC_DISPLAY}</span>
          </span>{" "}
          <span className="welcome-gift-modal__reward">
            <img
              className="welcome-gift-modal__coin-icon"
              src={CURRENCY_ICON_SC}
              alt=""
              width={22}
              height={22}
              decoding="async"
            />
            <span>{WELCOME_GIFT_SC_DISPLAY}</span>
          </span>
        </p>

        <div className="welcome-gift-modal__illustration-wrap">
          <img
            className="welcome-gift-modal__illustration"
            src={WELCOME_GIFT_ILLUSTRATION_URL}
            alt=""
            decoding="async"
          />
        </div>

        <button
          type="button"
          className="welcome-gift-modal__claim"
          onClick={onClaim}
        >
          CLAIM
        </button>
      </div>
    </div>,
    document.body,
  );
}
