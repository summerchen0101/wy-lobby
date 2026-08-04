import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAlert } from "../../components/alert/alertContext";
import { useAuth } from "../../auth/useAuth";
import {
  buildRedeemCallbackUrl,
  isThirdPartyPaymentEnabled,
} from "../../lib/env";
import { GATEWAY_API_CREATE_WITHDRAW_ORDER } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  decodeCreateWithdrawOrderResponseBytes,
  encodeCreateWithdrawOrderRequestBytes,
} from "../../realtime/withdrawLobbyWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import {
  SC_POINT_SCALE,
} from "../../wallet/formatWalletAmount";
import { usePaymentCallbackListener } from "../payment/usePaymentCallbackListener";
import {
  resolveMinRedeemDisplay,
  resolveMinRedeemRaw,
} from "./redeemMinAmount";
import type { LobbyGetDecoded } from "../../realtime/lobbyDecode";
import { useWordData } from "../../wordData/useWordData";
import { translateGatewayError } from "../../i18n/apiErrorMessage";
import "./RedeemFormPage.css";
import "./RedeemMethodModal.css";

type Step = "amount" | "payment" | "success";

type Props = {
  open: boolean;
  onClose: () => void;
  onOrderCreated?: () => void | Promise<void>;
  redeemableAmountRaw?: number;
  lobbyGet?: LobbyGetDecoded | null;
};

function parseWithdrawDisplayToWire(amountStr: string): bigint | null {
  const t = amountStr.trim().replace(/,/g, "");
  if (!/^\d+$/.test(t)) return null;
  try {
    return BigInt(t) * BigInt(SC_POINT_SCALE);
  } catch {
    return null;
  }
}

function RedeemWithdrawSuccessView({
  orderUid,
  amountDisplay,
  statusLabel,
  backLabel,
  onBackToLobby,
}: {
  orderUid: string;
  amountDisplay: string;
  statusLabel: string;
  backLabel: string;
  onBackToLobby: () => void;
}) {
  return (
    <div className="redeem-method-modal__success">
      <p className="redeem-method-modal__success-hero-title">
        YOUR REQUEST SUBMITTED
      </p>
      <div className="redeem-method-modal__success-summary-card">
        <p className="redeem-method-modal__success-summary-label">
          Your redemption request
        </p>
        <p className="redeem-method-modal__success-amount" aria-label="Amount">
          {amountDisplay || "—"}
        </p>
        <p className="redeem-method-modal__success-line">
          Has been successfully submitted
        </p>
        <p className="redeem-method-modal__success-hint">
          Please check your email for payment updates.
        </p>
      </div>
      <div className="redeem-method-modal__success-detail-card">
        <p className="redeem-method-modal__success-field-label">Order number</p>
        <div
          className="redeem-method-modal__success-order-box"
          title={orderUid}>
          {orderUid}
        </div>
        <p className="redeem-method-modal__success-field-label">Status</p>
        <div className="redeem-method-modal__success-status-box">
          {statusLabel}
        </div>
        <button
          type="button"
          className="redeem-method-modal__success-cta"
          onClick={onBackToLobby}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}

export function RedeemMethodModal({
  open,
  onClose,
  onOrderCreated,
  redeemableAmountRaw,
  lobbyGet,
}: Props) {
  const w = useWordData();
  const { show } = useAlert();
  const { user } = useAuth();
  const { requestRef, gatewayRequestReady } = useGatewayLobby();
  const titleId = useId();
  const amountId = useId();

  const minRaw = resolveMinRedeemRaw(lobbyGet, user);
  const minDisplay = resolveMinRedeemDisplay(lobbyGet, user);

  const [step, setStep] = useState<Step>("amount");
  const [pickAmount, setPickAmount] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [successOrderUid, setSuccessOrderUid] = useState("");
  const [successAmountDisplay, setSuccessAmountDisplay] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("amount");
    setPickAmount("");
    setSubmitBusy(false);
    setPaymentUrl(null);
    setSuccessOrderUid("");
    setSuccessAmountDisplay("");
  }, [open]);

  const finalizeSuccessFlow = useCallback(
    async (orderUid: string, amountStr: string) => {
      setSuccessOrderUid(orderUid);
      setSuccessAmountDisplay(amountStr.trim());
      setPaymentUrl(null);
      await onOrderCreated?.();
      setStep("success");
    },
    [onOrderCreated],
  );

  const handleRedeemCallback = useCallback(
    (payload: { state: 1 | 2 }) => {
      if (step !== "payment" || !paymentUrl) return;
      if (payload.state === 2) {
        show("Redemption was not completed.", { variant: "error" });
        setPaymentUrl(null);
        setStep("amount");
        return;
      }
      void finalizeSuccessFlow(successOrderUid || "—", pickAmount);
    },
    [
      step,
      paymentUrl,
      show,
      finalizeSuccessFlow,
      successOrderUid,
      pickAmount,
    ],
  );

  usePaymentCallbackListener(
    "redeem",
    open && step === "payment" && !!paymentUrl,
    handleRedeemCallback,
  );

  const openPaymentPage = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (!isThirdPartyPaymentEnabled()) {
      show("Redemption payment is unavailable.", { variant: "error" });
      return false;
    }
    window.open(trimmed, "_blank");
    return true;
  }, [show]);

  const submitWithdrawOrder = useCallback(async () => {
    const wireAmt = parseWithdrawDisplayToWire(pickAmount);
    if (wireAmt === null || wireAmt <= BigInt(0)) {
      show("Enter a valid whole-number SC amount.", { variant: "error" });
      return;
    }
    if (wireAmt < BigInt(minRaw)) {
      show(w(510488, minDisplay), { variant: "error" });
      return;
    }
    if (redeemableAmountRaw !== undefined) {
      const maxRaw = BigInt(Math.floor(Math.max(0, redeemableAmountRaw)));
      if (wireAmt > maxRaw) {
        show("Amount exceeds your redeemable balance.", { variant: "error" });
        return;
      }
    }
    const req = requestRef.current;
    if (!req || !gatewayRequestReady) {
      show("Not connected to server. Try again.", { variant: "error" });
      return;
    }
    if (!isThirdPartyPaymentEnabled()) {
      show("Redemption payment is unavailable.", { variant: "error" });
      return;
    }
    const uid = user?.id?.trim();
    if (!uid || !/^\d+$/.test(uid)) {
      show("Missing user id.", { variant: "error" });
      return;
    }

    setSubmitBusy(true);
    let paymentTab: Window | null = null;
    try {
      paymentTab = window.open("about:blank", "_blank");
      const data = encodeCreateWithdrawOrderRequestBytes({
        userID: uid,
        amount: wireAmt,
        successUrl: buildRedeemCallbackUrl(1),
        failUrl: buildRedeemCallbackUrl(2),
      });
      const r = await req({
        type: GATEWAY_API_CREATE_WITHDRAW_ORDER,
        data,
        debugLabel: "CREATE_WITHDRAW_ORDER",
      });
      const code = String(r.code ?? "");
      if (!isGatewaySuccessCode(code)) {
        paymentTab?.close();
        show(translateGatewayError(code, r.errMessage, `Withdrawal failed (${code})`), {
          variant: "error",
        });
        return;
      }
      const raw = r.data;
      if (!(raw instanceof Uint8Array) || raw.byteLength === 0) {
        paymentTab?.close();
        show("Empty withdrawal response", { variant: "error" });
        return;
      }
      const { withdrawOrderUID, paymentURL } =
        decodeCreateWithdrawOrderResponseBytes(raw);
      const oid = withdrawOrderUID.trim();
      setSuccessOrderUid(oid || "—");

      const url = paymentURL.trim();
      if (!url) {
        paymentTab?.close();
        await finalizeSuccessFlow(oid || "—", pickAmount);
        return;
      }

      if (paymentTab && !paymentTab.closed) {
        try {
          paymentTab.location.href = url;
        } catch {
          paymentTab.close();
        }
      }
      setPaymentUrl(url);
      setStep("payment");
    } catch (e) {
      paymentTab?.close();
      show(e instanceof Error ? e.message : "Withdrawal failed", {
        variant: "error",
      });
    } finally {
      setSubmitBusy(false);
    }
  }, [
    pickAmount,
    minRaw,
    minDisplay,
    redeemableAmountRaw,
    requestRef,
    gatewayRequestReady,
    user,
    show,
    w,
    finalizeSuccessFlow,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step === "payment") {
        setPaymentUrl(null);
        setStep("amount");
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step, onClose]);

  const titleText =
    step === "amount"
      ? "Redeem amount"
      : step === "payment"
        ? "Complete redemption"
        : "Redemption submitted";

  if (!open) return null;

  return createPortal(
    <div
      className="app-modal-overlay"
      role="presentation"
      onClick={step === "success" ? undefined : onClose}>
      <div
        className="app-modal app-modal--scroll-y redeem-method-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}>
        <div className="redeem-method-modal__head">
          <button
            type="button"
            className="redeem-method-modal__back"
            aria-label={step === "payment" ? "Back" : "Close"}
            onClick={() => {
              if (step === "payment") {
                setPaymentUrl(null);
                setStep("amount");
                return;
              }
              onClose();
            }}>
            ‹
          </button>
        </div>

        <div
          className={
            step === "success"
              ? "redeem-method-modal__body redeem-method-modal__body--success"
              : "redeem-method-modal__body"
          }>
          <h2 id={titleId} className="redeem-method-modal__sr-only">
            {titleText}
          </h2>

          {step === "success" ? (
            <RedeemWithdrawSuccessView
              orderUid={successOrderUid}
              amountDisplay={successAmountDisplay}
              statusLabel={w(510477)}
              backLabel={w(510473)}
              onBackToLobby={onClose}
            />
          ) : step === "payment" && paymentUrl ? (
            <div className="redeem-method-modal__payment-wait">
              <p className="redeem-form-page__hint">
                Complete your redemption in the new browser tab. This dialog
                will update when finished.
              </p>
              <button
                type="button"
                className="redeem-form-page__confirm"
                onClick={() => openPaymentPage(paymentUrl)}>
                Open redemption page
              </button>
            </div>
          ) : (
            <>
              <label className="redeem-method-modal__label" htmlFor={amountId}>
                {w(510487)}
              </label>
              <input
                id={amountId}
                className="redeem-method-modal__input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                aria-required
                value={pickAmount}
                onChange={(e) => setPickAmount(e.target.value)}
                disabled={submitBusy}
              />
              <p className="redeem-form-page__hint">{w(510488, minDisplay)}</p>
              <pre className="redeem-method-modal__fee-tiers">{w(510489)}</pre>
              <button
                type="button"
                className="redeem-form-page__confirm"
                disabled={submitBusy || !pickAmount.trim()}
                onClick={() => void submitWithdrawOrder()}>
                {submitBusy ? "…" : w(510490)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
