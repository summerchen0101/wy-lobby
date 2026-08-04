import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoChevronBack } from "react-icons/io5";
import { CoinFlyToBalance } from "../../components/CoinFlyToBalance";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { formatVipPoints } from "../lobby/vipHelpers";
import { useWordData } from "../../wordData/useWordData";
import "./ShopCheckout.css";
import { ProtectAccountView } from "./ProtectAccountView";
import { shopCoinPileSrc } from "./shopCoinPile";
import type {
  ShopBindingFormPayload,
  ShopBindingPrefill,
  ShopPack,
} from "./types";

export type CheckoutStep =
  | "loading"
  | "protect"
  | "bindingSuccess"
  | "payment"
  | "success";

type Props = {
  open: boolean;
  step: CheckoutStep;
  pack: ShopPack;
  buyBusy: boolean;
  buyError: string | null;
  paymentUrl: string | null;
  bindingBusy: boolean;
  bindingError: string | null;
  protectNeedSms: boolean;
  bindingPrefill?: ShopBindingPrefill;
  flying: boolean;
  onClose: () => void;
  onBackFromProtect: () => void;
  onBackToProtectForm: () => void;
  onBindingSubmit: (payload: ShopBindingFormPayload) => Promise<void>;
  onBindingSuccessConfirm: () => void;
  onOpenPaymentPage: (url: string) => boolean;
  onSuccessFlyComplete: () => void;
  onStartSuccessFly: (rect: DOMRect) => void;
};

function BackIcon() {
  return <IoChevronBack className="shop-checkout__back-icon" aria-hidden />;
}

function LoadingView({
  buyBusy,
  buyError,
  onClose,
}: {
  buyBusy: boolean;
  buyError: string | null;
  onClose: () => void;
}) {
  const w = useWordData();
  return (
    <>
      <header className="app-modal__head-row">
        <button
          type="button"
          className="app-modal__head-btn"
          onClick={onClose}
          aria-label="Close">
          <BackIcon />
        </button>
        <h2
          className="app-modal__title--abs-center shop-checkout__title"
          id="shop-checkout-dialog-title">
          {w(103)}
        </h2>
        <button
          type="button"
          className="app-modal__close"
          onClick={onClose}
          aria-label="Close">
          ×
        </button>
      </header>
      <hr className="app-modal__rule shop-checkout__head-rule" />
      <div className="shop-checkout__summary-body shop-checkout__payment-wait-body">
        {buyError ? (
          <p className="shop-checkout__pay-error" role="alert">
            {buyError}
          </p>
        ) : (
          <p className="shop-checkout__payment-wait-text" role="status">
            {buyBusy ? "Please wait…" : "Starting payment…"}
          </p>
        )}
        {buyError ? (
          <button
            type="button"
            className="shop-checkout__submit shop-checkout__submit--blue"
            onClick={onClose}>
            OK
          </button>
        ) : null}
      </div>
    </>
  );
}

function PaymentFrameView({
  paymentUrl,
  onClose,
  onOpenPaymentPage,
}: {
  paymentUrl: string;
  onClose: () => void;
  onOpenPaymentPage: (url: string) => boolean;
}) {
  const w = useWordData();
  return (
    <>
      <header className="app-modal__head-row">
        <button
          type="button"
          className="app-modal__head-btn"
          onClick={onClose}
          aria-label="Close">
          <BackIcon />
        </button>
        <h2
          className="app-modal__title--abs-center shop-checkout__title"
          id="shop-checkout-dialog-title">
          {w(103)}
        </h2>
        <span className="app-modal__head-spacer" aria-hidden />
      </header>
      <hr className="app-modal__rule shop-checkout__head-rule" />
      <div className="shop-checkout__payment-frame-wrap shop-checkout__payment-wait-body">
        <p className="shop-checkout__payment-wait-text">
          Complete your payment in the new browser tab or window. This dialog
          will update when your purchase is confirmed.
        </p>
        <p className="shop-checkout__payment-wait-text">
          <button
            type="button"
            className="shop-checkout__payment-wait-link"
            onClick={() => onOpenPaymentPage(paymentUrl)}>
            Open payment page
          </button>{" "}
          if it did not open automatically.
        </p>
      </div>
    </>
  );
}

function BindingSuccessView({ onConfirm }: { onConfirm: () => void }) {
  const w = useWordData();
  return (
    <div
      className="shop-checkout__summary-body shop-checkout__binding-success-body"
      role="status">
      <p className="shop-checkout__binding-success-text">{w(121)}</p>
      <button
        type="button"
        className="shop-checkout__submit shop-checkout__submit--blue"
        onClick={onConfirm}>
        {w(57)}
      </button>
    </div>
  );
}

function SuccessView({
  pack,
  flying,
  onClose,
  onPileRef,
}: {
  pack: ShopPack;
  flying: boolean;
  onClose: () => void;
  onPileRef: (el: HTMLImageElement | null) => void;
}) {
  const w = useWordData();
  return (
    <>
      <header className="app-modal__head-row">
        <span className="app-modal__head-spacer" aria-hidden />
        <h2
          className="app-modal__title--abs-center shop-checkout__title"
          id="shop-checkout-dialog-title">
          {w(103)}
        </h2>
        <button
          type="button"
          className="app-modal__close"
          onClick={onClose}
          aria-label="Close"
          disabled={flying}>
          ×
        </button>
      </header>
      <hr className="app-modal__rule shop-checkout__head-rule" />
      <div className="shop-checkout__summary-body shop-checkout__success-body">
        <p className="shop-checkout__success-text">
          Your purchase is complete. Coins have been added to your wallet.
        </p>
        <div className="shop-checkout__success-pile-wrap">
          <img
            ref={onPileRef}
            src={shopCoinPileSrc(pack.coinPile)}
            alt=""
            className="shop-checkout__success-pile"
          />
        </div>
        <p className="shop-checkout__line">
          <span className="shop-checkout__line-muted">{w(104)}</span>
          <span className="shop-checkout__line-gc">
            <img src={CURRENCY_ICON_GC} alt="" width={20} height={20} />
            <span className="shop-checkout__line-amt--gc">{pack.gcLabel}</span>
          </span>
        </p>
        {pack.bonusSc > 0 ? (
          <p className="shop-checkout__line">
            <span className="shop-checkout__line-muted">+{w(105)}</span>
            <span className="shop-checkout__line-sc">
              <img src={CURRENCY_ICON_SC} alt="" width={20} height={20} />
              <span className="shop-checkout__line-amt--sc">{pack.bonusSc}</span>
            </span>
          </p>
        ) : null}
        {pack.vipExp > 0 ? (
          <p className="shop-checkout__line">
            <span className="shop-checkout__line-muted">+</span>
            <span className="shop-checkout__line-amt--gc">
              {formatVipPoints(pack.vipExp)} {w(510760)}
            </span>
          </p>
        ) : null}
        <button
          type="button"
          className="shop-checkout__submit shop-checkout__submit--blue"
          onClick={onClose}
          disabled={flying}>
          OK
        </button>
      </div>
    </>
  );
}

export function ShopCheckoutOverlay({
  open,
  step,
  pack,
  buyBusy,
  buyError,
  paymentUrl,
  bindingBusy,
  bindingError,
  protectNeedSms,
  bindingPrefill,
  flying,
  onClose,
  onBackFromProtect,
  onBackToProtectForm,
  onBindingSubmit,
  onBindingSuccessConfirm,
  onOpenPaymentPage,
  onSuccessFlyComplete,
  onStartSuccessFly,
}: Props) {
  const pileRef = useRef<HTMLImageElement | null>(null);
  const [flyFromRect, setFlyFromRect] = useState<DOMRect | null>(null);
  const successFlyStartedRef = useRef(false);

  const handleBackdrop = useCallback(() => {
    if (step === "success" || step === "bindingSuccess" || flying) return;
    onClose();
  }, [step, flying, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step === "success" || step === "bindingSuccess" || flying) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step, flying, onClose]);

  useEffect(() => {
    if (step !== "success") {
      successFlyStartedRef.current = false;
      setFlyFromRect(null);
      return;
    }
    if (successFlyStartedRef.current) return;
    successFlyStartedRef.current = true;

    const timer = window.setTimeout(() => {
      const el = pileRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setFlyFromRect(rect);
      onStartSuccessFly(rect);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [step, onStartSuccessFly]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="app-modal-overlay"
        role="presentation"
        onClick={handleBackdrop}>
        <div
          className={
            "app-modal app-modal--col shop-checkout" +
            (step === "payment" ? " shop-checkout--payment" : "")
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-checkout-dialog-title"
          onClick={(e) => e.stopPropagation()}>
          {step === "protect" ? (
            <ProtectAccountView
              bindingBusy={bindingBusy}
              bindingError={bindingError}
              protectNeedSms={protectNeedSms}
              bindingPrefill={bindingPrefill}
              onClose={onBackFromProtect}
              onBackToProtectForm={onBackToProtectForm}
              onSubmit={onBindingSubmit}
            />
          ) : step === "bindingSuccess" ? (
            <BindingSuccessView onConfirm={onBindingSuccessConfirm} />
          ) : step === "loading" ? (
            <LoadingView
              buyBusy={buyBusy}
              buyError={buyError}
              onClose={onClose}
            />
          ) : step === "payment" && paymentUrl ? (
            <PaymentFrameView
              paymentUrl={paymentUrl}
              onClose={onClose}
              onOpenPaymentPage={onOpenPaymentPage}
            />
          ) : step === "success" ? (
            <SuccessView
              pack={pack}
              flying={flying}
              onClose={onClose}
              onPileRef={(el) => {
                pileRef.current = el;
              }}
            />
          ) : (
            <LoadingView
              buyBusy={buyBusy}
              buyError={buyError}
              onClose={onClose}
            />
          )}
        </div>
      </div>
      <CoinFlyToBalance
        active={flying && !!flyFromRect}
        fromRect={flyFromRect}
        onComplete={onSuccessFlyComplete}
      />
    </>,
    document.body,
  );
}
