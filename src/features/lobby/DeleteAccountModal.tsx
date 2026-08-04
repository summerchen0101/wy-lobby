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
import { isDeleteConfirmTextValid } from "./deleteAccountValidation";
import "./DeleteAccountModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = "input" | "done";

export function DeleteAccountModal({ open, onClose }: Props) {
  const w = useWordData();
  const { show } = useAlert();
  const { token, logout } = useAuth();
  const { requestRef, gatewayRequestReady } = useGatewayLobby();
  const titleId = useId();
  const inputId = useId();
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [showInputError, setShowInputError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmText("");
    setStep("input");
    setShowInputError(false);
    setSubmitting(false);
  }, [open]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Escape" || submitting) return;
      if (showInputError) {
        setShowInputError(false);
        return;
      }
      onClose();
    },
    [onClose, showInputError, submitting],
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

  const handleInputConfirm = useCallback(() => {
    if (submitting) return;
    if (!isDeleteConfirmTextValid(confirmText)) {
      setShowInputError(true);
      return;
    }
    void submitDelete();
  }, [confirmText, submitDelete, submitting]);

  if (!open) return null;

  const showTitle = step === "input";

  return createPortal(
    <>
      <div
        className="app-modal-overlay"
        role="presentation"
        onClick={submitting || showInputError ? undefined : onClose}
      >
        <div
          className="app-modal app-modal--col delete-account-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={showTitle ? titleId : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {showTitle ? (
            <div className="app-modal__header">
              <h2 id={titleId} className="app-modal__title">
                {w(4085)}
              </h2>
              <button
                type="button"
                className="app-modal__close"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          ) : null}
          {showTitle ? <hr className="app-modal__rule" /> : null}
          <div className="app-modal__body">
            {step === "input" ? (
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
                <div className="delete-account-modal__actions">
                  <button
                    type="button"
                    className="delete-account-modal__cancel btn-crown-secondary"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    {w(58)}
                  </button>
                  <button
                    type="button"
                    className="delete-account-modal__submit btn-crown-primary"
                    disabled={submitting}
                    onClick={handleInputConfirm}
                  >
                    {w(57)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="delete-account-modal__text">{w(1623)}</p>
                <button
                  type="button"
                  className="delete-account-modal__submit btn-crown-primary"
                  onClick={onClose}
                >
                  {w(1655)}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showInputError ? (
        <div
          className="app-modal-overlay delete-account-modal__error-overlay"
          role="presentation"
        >
          <div
            className="app-modal delete-account-modal__error"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-input-error"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-modal__body delete-account-modal__error-body">
              <p
                id="delete-account-input-error"
                className="delete-account-modal__error-message"
              >
                {w(4088)}
              </p>
              <div className="delete-account-modal__error-actions">
                <button
                  type="button"
                  className="delete-account-modal__submit btn-crown-primary"
                  onClick={() => setShowInputError(false)}
                >
                  {w(57)}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
