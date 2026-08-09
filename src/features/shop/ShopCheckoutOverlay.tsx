import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { IoChevronBack } from "react-icons/io5";
import { useWordData } from "../../wordData/useWordData";
import "./ShopCheckout.css";
import { ProtectAccountView } from "./ProtectAccountView";
import { SHOP_SUCCESS_PILE_SRC } from "./shopCoinPile";
import {
  SHOP_WORD_BINDING_SUCCESS,
  SHOP_WORD_PLAY_NOW,
  SHOP_WORD_SUCCESS_BODY,
  SHOP_WORD_SUCCESS_TITLE,
} from "./shopWordIds";
import type {
  ShopBindingFormPayload,
  ShopBindingPrefill,
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
  buyBusy: boolean;
  buyError: string | null;
  paymentUrl: string | null;
  bindingBusy: boolean;
  bindingError: string | null;
  protectNeedSms: boolean;
  bindingPrefill?: ShopBindingPrefill;
  onClose: () => void;
  onBackFromProtect: () => void;
  onBackToProtectForm: () => void;
  onBindingSubmit: (payload: ShopBindingFormPayload) => Promise<void>;
  onBindingSuccessConfirm: () => void;
  onOpenPaymentPage: (url: string) => boolean;
  onPlayNow: () => void;
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
          You will be redirected to the payment page. This dialog will update
          when your purchase is confirmed.
        </p>
        <p className="shop-checkout__payment-wait-text">
          <button
            type="button"
            className="shop-checkout__payment-wait-link"
            onClick={() => onOpenPaymentPage(paymentUrl)}>
            Continue to payment page
          </button>{" "}
          if you are not redirected automatically.
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
      <p className="shop-checkout__binding-success-text">
        {w(SHOP_WORD_BINDING_SUCCESS)}
      </p>
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
  onClose,
  onPlayNow,
}: {
  onClose: () => void;
  onPlayNow: () => void;
}) {
  const w = useWordData();
  return (
    <>
      <header className="app-modal__head-row">
        <span className="app-modal__head-spacer" aria-hidden />
        <h2
          className="app-modal__title--abs-center shop-checkout__title shop-checkout__title--success"
          id="shop-checkout-dialog-title">
          {w(SHOP_WORD_SUCCESS_TITLE)}
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
      <div className="shop-checkout__summary-body shop-checkout__success-body">
        <p className="shop-checkout__success-text">
          {w(SHOP_WORD_SUCCESS_BODY)}
        </p>
        <div className="shop-checkout__success-pile-wrap">
          <img
            src={SHOP_SUCCESS_PILE_SRC}
            alt=""
            className="shop-checkout__success-pile"
          />
        </div>
        <button
          type="button"
          className="shop-checkout__submit shop-checkout__submit--blue shop-checkout__submit--play-now"
          onClick={onPlayNow}>
          {w(SHOP_WORD_PLAY_NOW)}
        </button>
      </div>
    </>
  );
}

export function ShopCheckoutOverlay({
  open,
  step,
  buyBusy,
  buyError,
  paymentUrl,
  bindingBusy,
  bindingError,
  protectNeedSms,
  bindingPrefill,
  onClose,
  onBackFromProtect,
  onBackToProtectForm,
  onBindingSubmit,
  onBindingSuccessConfirm,
  onOpenPaymentPage,
  onPlayNow,
}: Props) {
  const handleBackdrop = useCallback(() => {
    if (step === "success" || step === "bindingSuccess") return;
    onClose();
  }, [step, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step === "success" || step === "bindingSuccess") return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="app-modal-overlay"
      role="presentation"
      onClick={handleBackdrop}>
      <div
        className={
          "app-modal app-modal--col shop-checkout" +
          (step === "payment" ? " shop-checkout--payment" : "") +
          (step === "success" ? " shop-checkout--success" : "")
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
          <SuccessView onClose={onPlayNow} onPlayNow={onPlayNow} />
        ) : (
          <LoadingView
            buyBusy={buyBusy}
            buyError={buyError}
            onClose={onClose}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
