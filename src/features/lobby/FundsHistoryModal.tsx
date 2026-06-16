import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { InfoPopover } from "../../components/InfoPopover";
import "./FundsHistoryModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FundsHistoryModal({ open, onClose }: Props) {
  const titleId = useId();

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

  return createPortal(
    <div className="app-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-modal app-modal--col funds-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}>
        <div className="app-modal__header app-modal__header--with-start">
          <InfoPopover
            align="start"
            panelClassName="funds-history-modal__info-popover-wrap"
            content={
              <p className="funds-history-modal__info-popover-text">
                Some Information about Funds History.
              </p>
            }>
            {(p, triggerRef) => (
              <button
                ref={triggerRef}
                {...p}
                className="funds-history-modal__info"
                aria-label="Funds history info">
                i
              </button>
            )}
          </InfoPopover>
          <h2 id={titleId} className="app-modal__title">
            FUNDS HISTORY
          </h2>
          <button
            type="button"
            className="app-modal__close"
            onClick={onClose}
            aria-label="Close">
            ×
          </button>
        </div>
        <hr className="app-modal__rule app-modal__rule--flush" />
        <div className="funds-history-modal__scroll">
          <p className="funds-history-modal__empty">No transactions yet.</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
