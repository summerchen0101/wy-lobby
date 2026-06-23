import { useEffect } from "react";
import {
  subscribePaymentCallback,
  type PaymentCallbackChannel,
  type PaymentCallbackPayload,
} from "./paymentCallbackStorage";

export function usePaymentCallbackListener(
  channel: PaymentCallbackChannel,
  active: boolean,
  onCallback: (payload: PaymentCallbackPayload) => void,
): void {
  useEffect(() => {
    if (!active) return;
    return subscribePaymentCallback(channel, onCallback);
  }, [channel, active, onCallback]);
}
