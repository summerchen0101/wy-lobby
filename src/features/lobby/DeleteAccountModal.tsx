import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../auth/useAuth";
import { useWordData } from "../../wordData/useWordData";
import { WordDataText } from "../../wordData/WordDataText";
import "./DeleteAccountModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DeleteAccountModal({ open, onClose }: Props) {
  const w = useWordData();
  const { logout } = useAuth();
  const titleId = useId();
  const inputId = useId();
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<"confirm" | "done">("confirm");

  useEffect(() => {
    if (!open) return;
    setConfirmText("");
    setStep("confirm");
  }, [open]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  if (!open) return null;

  const canSubmit = confirmText.trim().toUpperCase() === "DELETE";

  return createPortal(
    <div className="app-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-modal app-modal--col delete-account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal__header">
          <button
            type="button"
            className="app-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <h2 id={titleId} className="app-modal__title">
            {w(4085)}
          </h2>
        </div>
        <hr className="app-modal__rule" />
        <div className="app-modal__body">
          {step === "confirm" ? (
            <>
              <p className="delete-account-modal__text">
                <WordDataText id={4086} />
              </p>
              <label className="delete-account-modal__label" htmlFor={inputId}>
                <WordDataText id={4087} />
              </label>
              <input
                id={inputId}
                className="delete-account-modal__input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
              <p className="delete-account-modal__warn">{w(1293)}</p>
              <div className="delete-account-modal__actions">
                <button type="button" className="delete-account-modal__cancel" onClick={onClose}>
                  {w(58)}
                </button>
                <button
                  type="button"
                  className="delete-account-modal__submit"
                  disabled={!canSubmit}
                  onClick={() => {
                    setStep("done");
                    void logout();
                  }}
                >
                  {w(57)}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="delete-account-modal__text">{w(1623)}</p>
              <button type="button" className="delete-account-modal__submit" onClick={onClose}>
                {w(1655)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
