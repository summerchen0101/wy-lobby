import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { IoChevronBack } from "react-icons/io5";
import "./ShopCheckout.css";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { ProtectAccountView } from "./ProtectAccountView";
import type {
  ShopBindingFormPayload,
  ShopBindingPrefill,
  ShopPack,
} from "./types";

export type CheckoutStep = "summary" | "protect" | "payment" | "success";

type Props = {
  open: boolean;
  pack: ShopPack;
  step: CheckoutStep;
  buyBusy: boolean;
  buyError: string | null;
  paymentUrl: string | null;
  bindingBusy: boolean;
  bindingError: string | null;
  protectNeedSms: boolean;
  bindingPrefill?: ShopBindingPrefill;
  onClose: () => void;
  onProtectClose: () => void;
  onBackToProtectForm: () => void;
  onBindingSubmit: (payload: ShopBindingFormPayload) => Promise<void>;
  onContinuePurchase: () => void;
  onCancelPaymentFrame: () => void;
  /** 開啟第三方金流結帳 URL；回傳 false 表示已阻擋（Toast 由父層處理） */
  onOpenPaymentPage: (url: string) => boolean;
};

function BackIcon() {
  return <IoChevronBack className="shop-checkout__back-icon" aria-hidden />;
}

function OrderSummaryView({
  pack,
  buyBusy,
  buyError,
  onClose,
  onContinuePurchase,
}: {
  pack: ShopPack;
  buyBusy: boolean;
  buyError: string | null;
  onClose: () => void;
  onContinuePurchase: () => void;
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
          ORDER SUMMARY
        </h2>
        <span className="app-modal__head-spacer" aria-hidden />
      </header>
      <hr className="app-modal__rule shop-checkout__head-rule" />
      <div className="shop-checkout__summary-body">
        <p className="shop-checkout__price">{pack.price}</p>
        {pack.originalPrice && pack.originalPrice !== pack.price ? (
          <p className="shop-checkout__line shop-checkout__line--muted-small">
            <span className="shop-checkout__strike">
              {pack.originalPrice}
            </span>
          </p>
        ) : null}
        <p className="shop-checkout__line">
          <span className="shop-checkout__line-muted">Get</span>{" "}
          <span className="shop-checkout__line-gc">
            <span className="shop-page__chip shop-page__chip--gc">
              <img src={CURRENCY_ICON_GC} alt="" />
            </span>
            <span className="shop-checkout__line-amt shop-checkout__line-amt--gc">
              {pack.gcLabel}
            </span>
          </span>{" "}
          <span className="shop-checkout__line-muted">+ Free</span>{" "}
          <span className="shop-checkout__line-sc">
            <span className="shop-page__chip shop-page__chip--sc">
              <img src={CURRENCY_ICON_SC} alt="" />
            </span>
            <span className="shop-checkout__line-amt shop-checkout__line-amt--sc">
              {pack.bonusSc}
            </span>
          </span>
        </p>
        {buyError ? (
          <p className="shop-checkout__pay-error" role="alert">
            {buyError}
          </p>
        ) : null}
        <button
          type="button"
          className="shop-checkout__submit shop-checkout__submit--blue shop-checkout__continue-pay"
          disabled={buyBusy}
          onClick={onContinuePurchase}>
          {buyBusy ? "Please wait…" : "CONTINUE TO PAYMENT"}
        </button>
        <p className="shop-checkout__footer-hint">
          You will choose your payment method on the secure payment page.
        </p>
      </div>
    </>
  );
}

function PaymentFrameView({
  paymentUrl,
  onBack,
  onOpenPaymentPage,
}: {
  paymentUrl: string;
  onBack: () => void;
  onOpenPaymentPage: (url: string) => boolean;
}) {
  return (
    <>
      <header className="app-modal__head-row">
        <button
          type="button"
          className="app-modal__head-btn"
          onClick={onBack}
          aria-label="Back to order summary">
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
  pack,
  step,
  buyBusy,
  buyError,
  paymentUrl,
  bindingBusy,
  bindingError,
  protectNeedSms,
  bindingPrefill,
  onClose,
  onProtectClose,
  onBackToProtectForm,
  onBindingSubmit,
  onContinuePurchase,
  onCancelPaymentFrame,
  onOpenPaymentPage,
}: Props) {
  const closeOverlay = useCallback(() => {
    onCancelPaymentFrame();
    onClose();
  }, [onClose, onCancelPaymentFrame]);

  const handleBackdrop = useCallback(() => {
    if (step === "payment") onCancelPaymentFrame();
    else if (step === "protect") onProtectClose();
    else closeOverlay();
  }, [step, onCancelPaymentFrame, onProtectClose, closeOverlay]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step === "payment") onCancelPaymentFrame();
      else if (step === "protect") onProtectClose();
      else closeOverlay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step, onCancelPaymentFrame, onProtectClose, closeOverlay]);

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
        {step === "summary" ? (
          <OrderSummaryView
            pack={pack}
            buyBusy={buyBusy}
            buyError={buyError}
            onClose={closeOverlay}
            onContinuePurchase={onContinuePurchase}
          />
        ) : step === "protect" ? (
          <ProtectAccountView
            bindingBusy={bindingBusy}
            bindingError={bindingError}
            protectNeedSms={protectNeedSms}
            bindingPrefill={bindingPrefill}
            onClose={onProtectClose}
            onBackToProtectForm={onBackToProtectForm}
            onSubmit={onBindingSubmit}
          />
        ) : step === "payment" && paymentUrl ? (
          <PaymentFrameView
            paymentUrl={paymentUrl}
            onBack={onCancelPaymentFrame}
            onOpenPaymentPage={onOpenPaymentPage}
          />
        ) : (
          <SuccessView onClose={closeOverlay} />
        )}
      </div>
    </div>,
    document.body,
  );
}
