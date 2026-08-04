import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InfoPopover } from "../../components/InfoPopover";
import { useAlert } from "../../components/alert/alertContext";
import { useAuth } from "../../auth/useAuth";
import { CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { openZendeskOrFallback } from "../../lib/zendeskSupport";
import {
  formatScFromRaw,
  formatScFromRawWireInteger,
  formatScFromTruncatedHundredths,
  formatWithdrawHistoryFiatAmount,
  MIN_REDEEM_SC_DISPLAY,
} from "../../wallet/formatWalletAmount";
import {
  GATEWAY_API_CANCEL_REDEEM_ORDER,
  GATEWAY_API_LIST_WITHDRAW_ORDERS,
} from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  encodeCancelRedeemOrderRequestBytes,
  encodeListWithdrawOrdersRequestBytes,
  decodeListWithdrawOrdersResponseBytes,
  type WithdrawOrderWireRow,
} from "../../realtime/withdrawLobbyWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { redeemScBalancesFromLobby } from "./redeemBalances";
import { RedeemNotifyPill } from "./RedeemNotifyPill";
import { useRedeemPillMessages } from "./useRedeemPillMessages";
import { RedeemMethodModal } from "./RedeemMethodModal";
import {
  RedeemBindingModal,
  type RedeemBindingMode,
} from "./RedeemBindingModal";
import { redeemPlayerBindingFromLobby } from "../../realtime/lobbyDecode";
import { translateGatewayError } from "../../i18n/apiErrorMessage";
import {
  resolveMinRedeemDisplay,
  resolveMinRedeemRaw,
} from "./redeemMinAmount";
import {
  formatRedeemHistoryLinkAmount,
  formatWithdrawCreatedAt,
  redeemHistoryStatusClassName,
  withdrawHistoryShowsCancel,
  withdrawHistoryShowsRemark,
} from "./redeemHistoryUi";
import { useWordData } from "../../wordData/useWordData";
import "./RedeemPage.css";
import "./SessionPageDecor.css";

const SC_INLINE_PX = 18;

const ORDERS_PER_PAGE = 4;

function ScInlineIcon() {
  return (
    <img
      className="redeem-page__info-sc-icon"
      src={CURRENCY_ICON_SC}
      alt=""
      width={SC_INLINE_PX}
      height={SC_INLINE_PX}
    />
  );
}

/** Re-export: minimum redeemable SC shown to the user (50). */
export const MIN_REDEEM_SC = MIN_REDEEM_SC_DISPLAY;

type RedeemHistoryRowProps = {
  row: WithdrawOrderWireRow;
  cancelBusyUid: string | null;
  onCancel: (uid: string) => void;
  w: (id: number, ...args: string[]) => string;
};

function RedeemHistoryRow({
  row,
  cancelBusyUid,
  onCancel,
  w,
}: RedeemHistoryRowProps) {
  const fiatAmount = formatWithdrawHistoryFiatAmount(row.amount);
  const linkLabel = w(
    510476,
    "Redeem",
    formatRedeemHistoryLinkAmount(fiatAmount),
  );
  const orderUrl = row.uuu.trim();
  const createdAtLabel = formatWithdrawCreatedAt(
    row.createdAtTimestampMillisecond,
  );
  const showRemark = withdrawHistoryShowsRemark(row.withdrawOrderPaymentStatus);
  const showCancel = withdrawHistoryShowsCancel(row.withdrawOrderPaymentStatus);
  const cancelBusy =
    cancelBusyUid !== null &&
    cancelBusyUid === row.withdrawOrderUID &&
    row.withdrawOrderUID !== "";

  return (
    <li className="redeem-page__history-row">
      <InfoPopover
        align="start"
        panelClassName="redeem-page__history-date-popover"
        content={
          <p className="redeem-page__history-date-text">
            {w(510475)}
            {createdAtLabel}
          </p>
        }>
        {(p, triggerRef) => (
          <button
            ref={triggerRef}
            type="button"
            className="redeem-page__history-icon"
            aria-label="Order create date"
            {...p}>
            i
          </button>
        )}
      </InfoPopover>
      {orderUrl ? (
        <button
          type="button"
          className="redeem-page__history-link"
          onClick={() => window.open(orderUrl, "_blank", "noopener,noreferrer")}>
          {linkLabel}
        </button>
      ) : (
        <span className="redeem-page__history-desc">{linkLabel}</span>
      )}
      <div className="redeem-page__history-status-col">
        <span
          className={redeemHistoryStatusClassName(
            row.withdrawOrderPaymentStatus,
          )}>
          {row.statusLabel}
        </span>
        {showRemark && row.remark ? (
          <span className="redeem-page__history-remark">{row.remark}</span>
        ) : null}
        {showCancel ? (
          <button
            type="button"
            className="redeem-page__history-cancel"
            disabled={cancelBusy}
            onClick={() => onCancel(row.withdrawOrderUID)}>
            {cancelBusy ? "…" : w(510478)}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function RedeemPage() {
  const w = useWordData();
  const { show } = useAlert();
  const { user } = useAuth();
  const {
    requestRef,
    lobbyGet,
    gatewayRequestReady,
    refreshLobbyGet,
    subscribeWithdrawSuccessPush,
    redeemOrdersPrefetch,
  } = useGatewayLobby();

  const [pillExtras, setPillExtras] = useState<string[]>([]);
  useEffect(() => {
    return subscribeWithdrawSuccessPush((p) => {
      setPillExtras((prev) => {
        const line = `${p.nickname} redeemed ${formatScFromRawWireInteger(p.actualAmountWire)} SC`;
        return [line, ...prev].slice(0, 24);
      });
    });
  }, [subscribeWithdrawSuccessPush]);

  const pillMessages = useRedeemPillMessages(pillExtras);

  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [bindingModalOpen, setBindingModalOpen] = useState(false);
  const [bindingMode, setBindingMode] = useState<RedeemBindingMode>("full");
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersRows, setOrdersRows] = useState<WithdrawOrderWireRow[]>(
    () => redeemOrdersPrefetch?.rows ?? [],
  );
  const [ordersTotal, setOrdersTotal] = useState(
    () => redeemOrdersPrefetch?.total ?? 0,
  );
  const [ordersLoading, setOrdersLoading] = useState(
    () => redeemOrdersPrefetch === null,
  );
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [initialOrdersFetched, setInitialOrdersFetched] = useState(
    () => redeemOrdersPrefetch !== null,
  );
  const [cancelBusyUid, setCancelBusyUid] = useState<string | null>(null);

  const { amount: scAmount, redeemableAmount, unplayedHundredths } =
    redeemScBalancesFromLobby({
      lobbyGet,
      sweepstakesFallback: user?.sweepstakesBalance,
    });

  const redeemableDisplay = formatScFromRaw(redeemableAmount);

  const hasOrderHistory =
    ordersTotal > 0 || ordersRows.length > 0;

  const totalPages =
    ordersTotal <= 0
      ? 1
      : Math.max(1, Math.ceil(ordersTotal / ORDERS_PER_PAGE));

  const fetchOrders = useCallback(
    async (page: number, options?: { background?: boolean }) => {
      const req = requestRef.current;
      const userId = user?.id?.trim();
      if (!req || !userId || userId === "0") {
        setOrdersLoading(false);
        setInitialOrdersFetched(true);
        return;
      }
      if (!options?.background) {
        setOrdersLoading(true);
      }
      setOrdersError(null);
      try {
        const r = await req({
          type: GATEWAY_API_LIST_WITHDRAW_ORDERS,
          data: encodeListWithdrawOrdersRequestBytes(
            userId,
            page,
            ORDERS_PER_PAGE,
          ),
          debugLabel: "LIST_WITHDRAW_ORDERS",
        });
        const code = String(r.code ?? "");
        if (!isGatewaySuccessCode(code)) {
          setOrdersError(translateGatewayError(code, r.errMessage));
          setOrdersRows([]);
          setOrdersTotal(0);
          return;
        }
        const raw = r.data;
        if (!(raw instanceof Uint8Array) || raw.byteLength === 0) {
          setOrdersRows([]);
          setOrdersTotal(0);
          return;
        }
        const { orders, total } = decodeListWithdrawOrdersResponseBytes(raw);
        setOrdersRows(orders);
        const tn = Number(total);
        setOrdersTotal(Number.isFinite(tn) ? tn : 0);
      } catch (e) {
        setOrdersError(e instanceof Error ? e.message : "Failed to load orders");
        setOrdersRows([]);
        setOrdersTotal(0);
      } finally {
        setOrdersLoading(false);
        setInitialOrdersFetched(true);
      }
    },
    [requestRef, user?.id],
  );

  useEffect(() => {
    if (!gatewayRequestReady) return;
    if (ordersPage === 0 && redeemOrdersPrefetch !== null) {
      setOrdersRows(redeemOrdersPrefetch.rows);
      setOrdersTotal(redeemOrdersPrefetch.total);
      setOrdersLoading(false);
      setInitialOrdersFetched(true);
      void fetchOrders(0, { background: true });
      return;
    }
    void fetchOrders(ordersPage);
  }, [gatewayRequestReady, ordersPage, fetchOrders, redeemOrdersPrefetch]);

  useEffect(() => {
    if (!redeemOrdersPrefetch || ordersPage !== 0 || initialOrdersFetched) return;
    setOrdersRows(redeemOrdersPrefetch.rows);
    setOrdersTotal(redeemOrdersPrefetch.total);
    setOrdersLoading(false);
    setInitialOrdersFetched(true);
  }, [
    redeemOrdersPrefetch,
    ordersPage,
    initialOrdersFetched,
  ]);

  const refetchOrdersAfterWithdraw = useCallback(async () => {
    setOrdersPage(0);
    if (!gatewayRequestReady) return;
    await refreshLobbyGet();
    await fetchOrders(0);
  }, [gatewayRequestReady, fetchOrders, refreshLobbyGet]);

  const handleCancelOrder = useCallback(
    async (redeemOrderUID: string) => {
      const uid = redeemOrderUID.trim();
      if (!uid) return;
      const req = requestRef.current;
      if (!req || !gatewayRequestReady) {
        show("Not connected to server. Try again.", { variant: "error" });
        return;
      }
      setCancelBusyUid(uid);
      try {
        const r = await req({
          type: GATEWAY_API_CANCEL_REDEEM_ORDER,
          data: encodeCancelRedeemOrderRequestBytes(uid),
          debugLabel: "CANCEL_REDEEM_ORDER",
        });
        const code = String(r.code ?? "");
        if (!isGatewaySuccessCode(code)) {
          show(translateGatewayError(code, r.errMessage), { variant: "error" });
          return;
        }
        await fetchOrders(ordersPage);
      } catch (e) {
        show(e instanceof Error ? e.message : "Cancel failed", {
          variant: "error",
        });
      } finally {
        setCancelBusyUid(null);
      }
    },
    [requestRef, gatewayRequestReady, show, fetchOrders, ordersPage],
  );

  const pagerPrev = useCallback(() => {
    setOrdersPage((p) => Math.max(0, p - 1));
  }, []);

  const pagerNext = useCallback(() => {
    setOrdersPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  const showPager = totalPages > 1;

  const cannotRedeem = redeemableAmount < resolveMinRedeemRaw(lobbyGet, user);
  const minRedeemDisplay = resolveMinRedeemDisplay(lobbyGet, user);

  /** 未達門檻且無提領紀錄 → 不顯示 history 區（Insufficient 併於餘額卡） */
  const showInsufficientFullPage =
    initialOrdersFetched &&
    !ordersLoading &&
    cannotRedeem &&
    !hasOrderHistory;

  const showRedeemHistoryUi =
    gatewayRequestReady && !showInsufficientFullPage;

  const balanceInfoPanel = useMemo(
    () => (
      <div className="redeem-page__info-panel">
        <p>
          <strong>{w(510493)}</strong> {formatScFromRaw(scAmount)}{" "}
          <ScInlineIcon />
        </p>
        <p>
          <strong>{w(510494)}</strong> {formatScFromRaw(redeemableAmount)}{" "}
          <ScInlineIcon />
        </p>
        <p>
          <strong>{w(510495)}</strong>{" "}
          {formatScFromTruncatedHundredths(unplayedHundredths)} <ScInlineIcon />
        </p>
        <p>
          <ScInlineIcon /> {w(510496)}
        </p>
        <p>{w(510497)}</p>
      </div>
    ),
    [w, scAmount, redeemableAmount, unplayedHundredths],
  );

  return (
    <section className="redeem-page page-container session-page session-page--pattern">
      <div className="redeem-page__hero">
        <h1 className="redeem-page__title">{w(136)}</h1>
        <RedeemNotifyPill messages={pillMessages} />
        <p className="redeem-page__sub">SWEEPSTAKES PRIZE REDEMPTION</p>
      </div>

      <div className="redeem-page__card">
        <div className="redeem-page__row">
          <Link to="/" className="redeem-page__back" aria-label="Back">
            ‹
          </Link>
          <h2 className="redeem-page__row-title">{w(510469)}</h2>
          <InfoPopover
            align="end"
            panelClassName="redeem-page__info-popover"
            content={balanceInfoPanel}>
            {(p, triggerRef) => (
              <button
                ref={triggerRef}
                {...p}
                className="redeem-page__info"
                aria-label="Prize redemption info">
                i
              </button>
            )}
          </InfoPopover>
        </div>

        <div className="redeem-page__balance-row">
          <span className="redeem-page__sc-badge" aria-hidden>
            <img src={CURRENCY_ICON_SC} alt="" width={40} height={40} />
          </span>
          <p className="redeem-page__amount">{redeemableDisplay}</p>
        </div>

        {cannotRedeem && initialOrdersFetched && !ordersLoading ? (
          <div className="redeem-page__insufficient-inline">
            <div className="redeem-page__insufficient-panel">
              <h3 className="redeem-page__insufficient-title">{w(510470)}</h3>
              <p className="redeem-page__insufficient-text">
                {w(510471, minRedeemDisplay)}
              </p>
              <p className="redeem-page__insufficient-accent">{w(510472)}</p>
            </div>
            {!hasOrderHistory ? (
              <Link to="/" className="redeem-page__to-lobby">
                {w(510473)}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {!gatewayRequestReady ? (
        <div className="redeem-page__card redeem-page__history-card">
          <p className="redeem-page__history-title">Connecting…</p>
        </div>
      ) : null}

      {showRedeemHistoryUi ? (
        <div className="redeem-page__card redeem-page__history-card">
          <div className="redeem-page__history-head">
            <h2 className="redeem-page__history-title">{w(510474)}</h2>
          </div>
          <div
            className={
              ordersLoading
                ? "redeem-page__history-body redeem-page__history-body--loading"
                : "redeem-page__history-body"
            }>
            {ordersError ? (
              <p className="redeem-page__insufficient-text" role="alert">
                {ordersError}
              </p>
            ) : ordersLoading ? (
              <p className="redeem-page__history-loading">Loading history…</p>
            ) : (
              <>
                <ul
                  className="redeem-page__history-list"
                  aria-label="Redemption history">
                  {ordersRows.map((row, i) => (
                    <RedeemHistoryRow
                      key={
                        row.withdrawOrderUID ||
                        `${ordersPage}-${row.amount}-${row.withdrawOrderPaymentStatus}-${i}`
                      }
                      row={row}
                      cancelBusyUid={cancelBusyUid}
                      onCancel={(uid) => void handleCancelOrder(uid)}
                      w={w}
                    />
                  ))}
                </ul>
                {ordersRows.length === 0 && !ordersError ? (
                  <p className="redeem-page__insufficient-text">
                    No redemption requests yet.
                  </p>
                ) : null}
              </>
            )}
          </div>
          {showPager ? (
            <div className="redeem-page__history-pager redeem-page__history-pager--footer">
              <button
                type="button"
                className="redeem-page__history-pager-btn"
                aria-label="Previous page"
                disabled={ordersPage <= 0 || ordersLoading}
                onClick={pagerPrev}>
                ‹
              </button>
              <span className="redeem-page__history-pager-link">
                {w(510484)}
              </span>
              {showPager ? (
                <span
                  className="redeem-page__history-pager-badge"
                  aria-label={`Page ${ordersPage + 1} of ${totalPages}`}>
                  {ordersPage + 1}
                </span>
              ) : null}
              <button
                type="button"
                className="redeem-page__history-pager-btn"
                aria-label="Next page"
                disabled={
                  ordersLoading ||
                  ordersPage >= totalPages - 1 ||
                  totalPages <= 1
                }
                onClick={pagerNext}>
                ›
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="redeem-page__new-redeem"
            disabled={
              ordersLoading ||
              !gatewayRequestReady ||
              cannotRedeem
            }
            onClick={() => {
              const binding = redeemPlayerBindingFromLobby(lobbyGet);
              if (!binding.hasCellPhone) {
                setBindingMode("full");
                setBindingModalOpen(true);
                return;
              }
              if (!binding.hasAddress) {
                setBindingMode("addressOnly");
                setBindingModalOpen(true);
                return;
              }
              if (!binding.hasFrontImage) {
                void refreshLobbyGet();
                show("Verification in progress. Please try again later.", {
                  variant: "info",
                });
                return;
              }
              setMethodModalOpen(true);
            }}>
            {w(510485)}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="redeem-page__support-link"
        onClick={() => void openZendeskOrFallback()}>
        {w(510486)}
      </button>

      <RedeemBindingModal
        open={bindingModalOpen}
        mode={bindingMode}
        onClose={() => setBindingModalOpen(false)}
        onBound={() => {
          setBindingModalOpen(false);
          setMethodModalOpen(true);
        }}
        bindingPrefill={{
          email: user?.email,
          phone: user?.phone,
        }}
      />

      <RedeemMethodModal
        open={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        onOrderCreated={refetchOrdersAfterWithdraw}
        redeemableAmountRaw={redeemableAmount}
        lobbyGet={lobbyGet}
      />
    </section>
  );
}
