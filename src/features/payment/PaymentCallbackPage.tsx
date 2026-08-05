import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  parseCallbackState,
  writePaymentCallbackPayload,
  type PaymentCallbackChannel,
} from "./paymentCallbackStorage";
import "./PaymentCallbackPage.css";

export type PaymentCallbackPageProps = {
  channel: PaymentCallbackChannel;
  returnPath: string;
  returnLabel: string;
};

type Props = PaymentCallbackPageProps;

export function PaymentCallbackPage({
  channel,
  returnPath,
  returnLabel,
}: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const state = useMemo(
    () => parseCallbackState(params.get("state")),
    [params],
  );

  useEffect(() => {
    if (state == null) return;
    writePaymentCallbackPayload({
      channel,
      state,
      at: Date.now(),
    });
    const t = window.setTimeout(() => {
      if (window.opener && !window.opener.closed) {
        window.close();
        return;
      }
      navigate(returnPath, { replace: true });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [channel, navigate, returnPath, state]);

  if (state == null) {
    return (
      <main className="payment-callback-page">
        <p className="payment-callback-page__title">Invalid payment callback</p>
        <Link className="payment-callback-page__link" to={returnPath}>
          {returnLabel}
        </Link>
      </main>
    );
  }

  const success = state === 1;
  return (
    <main className="payment-callback-page">
      <p className="payment-callback-page__title">
        {success ? "Payment completed" : "Payment failed"}
      </p>
      <p className="payment-callback-page__hint">
        {window.opener && !window.opener.closed
          ? "Closing this window…"
          : `Returning to ${returnLabel}…`}
      </p>
    </main>
  );
}
