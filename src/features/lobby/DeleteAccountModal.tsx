import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useAlert } from "../../components/alert/alertContext";
import { useAuth } from "../../auth/useAuth";
import { translateGatewayError } from "../../i18n/apiErrorMessage";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import { GATEWAY_API_DELETE_ACCOUNT } from "../../realtime/gatewayApi";
import { encodeDeletePlayerInfoRequest } from "../../realtime/deleteAccountWire";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { useWordData } from "../../wordData/useWordData";
import { WordDataText } from "../../wordData/WordDataText";
import "./DeleteAccountModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DeleteAccountModal({ open, onClose }: Props) {
  const w = useWordData();
  const { show } = useAlert();
  const { token, logout } = useAuth();
  const { requestRef, gatewayRequestReady } = useGatewayLobby();
  const titleId = useId();
  const inputId = useId();
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<"confirm" | "done">("confirm");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmText("");
    setStep("confirm");
    setSubmitting(false);
  }, [open]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    },
    [onClose, submitting],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  const submitDelete = useCallback(async () => {
    if (!isWsLobbyGamesEnabled()) {
      show("Could not delete account", { variant: "error" });
      return;
    }
    if (!gatewayRequestReady || !requestRef.current) {
      show("Could not delete account", { variant: "error" });
      return;
    }
    const accessToken = token?.trim();
    if (!accessToken) {
      show("Could not delete account", { variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const body = encodeDeletePlayerInfoRequest({ accessToken });
      const r = await requestRef.current({
        type: GATEWAY_API_DELETE_ACCOUNT,
        data: body,
        debugLabel: "DELETE_ACCOUNT",
      });
      if (!isGatewaySuccessCode(String(r.code ?? ""))) {
        show(
          translateGatewayError(
            String(r.code ?? ""),
            r.errMessage,
            "Could not delete account",
          ),
          { variant: "error" },
        );
        return;
      }
      setStep("done");
      void logout();
    } catch {
      show("Could not delete account", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [gatewayRequestReady, logout, requestRef, show, token]);

  if (!open) return null;

  const canSubmit = confirmText.trim().toUpperCase() === "DELETE" && !submitting;

  return createPortal(
    <div className="app-modal-overlay" role="presentation" onClick={submitting ? undefined : onClose}>
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
            disabled={submitting}
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
                disabled={submitting}
              />
              <p className="delete-account-modal__warn">{w(1293)}</p>
              <div className="delete-account-modal__actions">
                <button
                  type="button"
                  className="delete-account-modal__cancel"
                  onClick={onClose}
                  disabled={submitting}
                >
                  {w(58)}
                </button>
                <button
                  type="button"
                  className="delete-account-modal__submit"
                  disabled={!canSubmit}
                  onClick={() => {
                    void submitDelete();
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
