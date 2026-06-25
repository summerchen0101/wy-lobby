import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { IoChevronBack } from "react-icons/io5";
import "./ShopCheckout.css";
import { ProtectAccountView } from "./ProtectAccountView";
import type {
  ShopBindingFormPayload,
  ShopBindingPrefill,
} from "./types";

export type CheckoutStep = "loading" | "protect" | "payment" | "success";

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
  onBackToProtectForm: () => void;
  onBindingSubmit: (payload: ShopBindingFormPayload) => Promise<void>;
  /** 開啟第三方金流結帳 URL；回傳 false 表示已阻擋（Toast 由父層處理） */
  onOpenPaymentPage: (url: string) => boolean;
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
          {buyError ? "PURCHASE" : "PREPARING PAYMENT"}
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
          COMPLETE PAYMENT
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

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <>
      <header className="app-modal__head-row">
        <span className="app-modal__head-spacer" aria-hidden />
        <h2
          className="app-modal__title--abs-center shop-checkout__title"
          id="shop-checkout-dialog-title">
          THANK YOU
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
          Your purchase is complete. Coins have been added to your wallet.
        </p>
        <button
          type="button"
          className="shop-checkout__submit shop-checkout__submit--blue"
          onClick={onClose}>
          OK
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
  onBackToProtectForm,
  onBindingSubmit,
  onOpenPaymentPage,
}: Props) {
  const handleBackdrop = useCallback(() => {
    if (step === "success") return;
    onClose();
  }, [step, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step === "success") return;
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
            onClose={onClose}
            onBackToProtectForm={onBackToProtectForm}
            onSubmit={onBindingSubmit}
          />
        ) : step === "loading" ? (
          <LoadingView buyBusy={buyBusy} buyError={buyError} onClose={onClose} />
        ) : step === "payment" && paymentUrl ? (
          <PaymentFrameView
            paymentUrl={paymentUrl}
            onClose={onClose}
            onOpenPaymentPage={onOpenPaymentPage}
          />
        ) : (
          <SuccessView onClose={onClose} />
        )}
      </div>
    </div>,
    document.body,
  );
}
