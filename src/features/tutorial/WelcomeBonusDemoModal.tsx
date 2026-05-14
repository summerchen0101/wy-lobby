import "./WelcomeBonusDemoModal.css";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { notifyWelcomeBonusClaimFinished } from "./welcomeBonusTutorialBridge";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * DEV-only stub for Welcome Bonus — Claim invokes {@link notifyWelcomeBonusClaimFinished}.
 */
export function WelcomeBonusDemoModal({ open, onClose }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function onClaim() {
    onClose();
    notifyWelcomeBonusClaimFinished();
  }

  return createPortal(
    <div
      className="welcome-bonus-demo-overlay app-modal-overlay"
      role="presentation">
      <div
        className="welcome-bonus-demo app-modal welcome-bonus-demo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}>
        <div className="welcome-bonus-demo__inner">
          <h2 id={titleId} className="welcome-bonus-demo__title">
            Welcome Bonus <span className="welcome-bonus-demo__badge">Demo</span>
          </h2>
          <p className="welcome-bonus-demo__desc">
            Stub modal for development. Production Welcome Bonus should call{" "}
            <code className="welcome-bonus-demo__code">
              notifyWelcomeBonusClaimFinished()
            </code>{" "}
            after Claim completes.
          </p>
          <div className="welcome-bonus-demo__actions">
            <button type="button" className="welcome-bonus-demo__ghost" onClick={onClose}>
              Not now
            </button>
            <button type="button" className="welcome-bonus-demo__claim" onClick={onClaim}>
              Claim
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
