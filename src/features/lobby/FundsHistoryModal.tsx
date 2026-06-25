import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { HiCheckCircle } from "react-icons/hi2";
import { InfoPopover } from "../../components/InfoPopover";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { GATEWAY_API_LIST_PURCHASE_AND_PRIZE_HISTORIES } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  decodeListPurchaseAndPrizeHistoriesResponseBytes,
  formatFundsHistoryDate,
  formatFundsHistoryGcAmount,
  formatFundsHistoryScBonus,
  type FundsHistoryWireRow,
} from "../../realtime/fundsHistoryLobbyWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import "./FundsHistoryModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FundsHistoryModal({ open, onClose }: Props) {
  const titleId = useId();
  const { requestRef, gatewayRequestReady } = useGatewayLobby();
  const [rows, setRows] = useState<FundsHistoryWireRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchHistories = useCallback(async () => {
    const req = requestRef.current;
    if (!req) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await req({
        type: GATEWAY_API_LIST_PURCHASE_AND_PRIZE_HISTORIES,
        data: new Uint8Array(),
        debugLabel: "LIST_PURCHASE_AND_PRIZE_HISTORIES",
      });
      const code = String(r.code ?? "");
      if (!isGatewaySuccessCode(code)) {
        setError(r.errMessage?.trim() || `Request failed (${code})`);
        setRows([]);
        return;
      }
      const raw = r.data;
      if (!(raw instanceof Uint8Array) || raw.byteLength === 0) {
        setRows([]);
        return;
      }
      const { histories } = decodeListPurchaseAndPrizeHistoriesResponseBytes(raw);
      setRows(histories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [requestRef]);

  useEffect(() => {
    if (!open) return;
    if (!gatewayRequestReady) return;
    void fetchHistories();
  }, [open, gatewayRequestReady, fetchHistories]);

  useEffect(() => {
    if (open) return;
    setRows([]);
    setError(null);
    setLoading(false);
  }, [open]);

  if (!open) return null;

  const bodyClassName = loading
    ? "funds-history-modal__scroll funds-history-modal__scroll--loading"
    : "funds-history-modal__scroll";

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
        <div className={bodyClassName}>
          {error ? (
            <p className="funds-history-modal__empty" role="alert">
              {error}
            </p>
          ) : loading ? (
            <p className="funds-history-modal__empty">Loading history…</p>
          ) : rows.length === 0 ? (
            <p className="funds-history-modal__empty">No transactions yet.</p>
          ) : (
            <ul className="funds-history-modal__list" aria-label="Funds history">
              {rows.map((row, i) => {
                const gcLabel = formatFundsHistoryGcAmount(row.gcAmountWire);
                const scBonus = formatFundsHistoryScBonus(row.scAmountWire);
                const dateLabel = formatFundsHistoryDate(row.timestampMs);
                const rowKey = `${row.timestampMs}-${row.tradeEventRaw}-${row.gcAmountWire}-${i}`;
                return (
                  <li key={rowKey} className="funds-history-modal__row">
                    <div className="funds-history-modal__left">
                      <span className="funds-history-modal__desc">
                        {row.tradeEventLabel}
                      </span>
                      <span className="funds-history-modal__date">
                        {dateLabel}
                      </span>
                    </div>
                    <div className="funds-history-modal__amounts">
                      {gcLabel !== "—" ? (
                        <span className="funds-history-modal__coin-group">
                          <img
                            className="funds-history-modal__coin"
                            src={CURRENCY_ICON_GC}
                            alt=""
                            aria-hidden
                          />
                          <span className="funds-history-modal__coin-value">
                            {gcLabel}
                          </span>
                        </span>
                      ) : null}
                      {scBonus ? (
                        <>
                          <span className="funds-history-modal__free">+FREE</span>
                          <span className="funds-history-modal__coin-group">
                            <img
                              className="funds-history-modal__coin"
                              src={CURRENCY_ICON_SC}
                              alt=""
                              aria-hidden
                            />
                            <span className="funds-history-modal__coin-value">
                              {scBonus}
                            </span>
                          </span>
                        </>
                      ) : null}
                      <HiCheckCircle
                        className="funds-history-modal__status"
                        aria-hidden
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
