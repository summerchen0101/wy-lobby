import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { InfoPopover } from "../../components/InfoPopover";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import "./FundsHistoryModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export type FundsHistoryRow = {
  id: string;
  description: string;
  /** Display as YYYY/M/D */
  date: Date;
  gc: number;
  sc: number;
};

/** Placeholder until wallet ledger API exists */
export const MOCK_FUNDS_HISTORY_ROWS: FundsHistoryRow[] = [
  {
    id: "1",
    description: "Mission0 Reward",
    date: new Date(2026, 3, 30),
    gc: 0,
    sc: 0,
  },
  {
    id: "2",
    description: "Mission1 Reward",
    date: new Date(2026, 3, 30),
    gc: 1,
    sc: 10,
  },
  {
    id: "3",
    description: "Mission2 Reward",
    date: new Date(2026, 3, 29),
    gc: 2,
    sc: 20,
  },
];

function formatFundsHistoryDate(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

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
            FUNDS HISTORY (WIP)
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
          <ul className="funds-history-modal__list">
            {MOCK_FUNDS_HISTORY_ROWS.map((row) => (
              <li key={row.id} className="funds-history-modal__row">
                <div className="funds-history-modal__left">
                  <span className="funds-history-modal__desc">
                    {row.description}
                  </span>
                  <span className="funds-history-modal__date">
                    {formatFundsHistoryDate(row.date)}
                  </span>
                </div>
                <div className="funds-history-modal__amounts">
                  <span className="funds-history-modal__coin-group">
                    <img
                      className="funds-history-modal__coin"
                      src={CURRENCY_ICON_GC}
                      alt=""
                      width={22}
                      height={22}
                    />
                    <span className="funds-history-modal__coin-value">
                      {row.gc}
                    </span>
                  </span>
                  <span className="funds-history-modal__free">+FREE</span>
                  <span className="funds-history-modal__coin-group">
                    <img
                      className="funds-history-modal__coin"
                      src={CURRENCY_ICON_SC}
                      alt=""
                      width={22}
                      height={22}
                    />
                    <span className="funds-history-modal__coin-value">
                      {row.sc}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
