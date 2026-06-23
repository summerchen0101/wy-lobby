export type PaymentCallbackChannel = "shop" | "redeem" | "game";

export type PaymentCallbackPayload = {
  channel: PaymentCallbackChannel;
  /** 1 = success, 2 = failure */
  state: 1 | 2;
  at: number;
};

const STORAGE_KEYS: Record<PaymentCallbackChannel, string> = {
  shop: "shop-payment-callback",
  redeem: "redeem-payment-callback",
  game: "game-callback",
};

const MESSAGE_TYPE = "ffgt-payment-callback";

export function paymentCallbackStorageKey(
  channel: PaymentCallbackChannel,
): string {
  return STORAGE_KEYS[channel];
}

export function writePaymentCallbackPayload(
  payload: PaymentCallbackPayload,
): void {
  try {
    sessionStorage.setItem(
      paymentCallbackStorageKey(payload.channel),
      JSON.stringify(payload),
    );
  } catch {
    /* ignore quota / private mode */
  }
  try {
    if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: MESSAGE_TYPE, ...payload },
        window.location.origin,
      );
    }
  } catch {
    /* cross-origin opener */
  }
}

export function readPaymentCallbackPayload(
  channel: PaymentCallbackChannel,
): PaymentCallbackPayload | null {
  try {
    const raw = sessionStorage.getItem(paymentCallbackStorageKey(channel));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaymentCallbackPayload;
    if (parsed.channel !== channel) return null;
    if (parsed.state !== 1 && parsed.state !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPaymentCallbackPayload(
  channel: PaymentCallbackChannel,
): void {
  try {
    sessionStorage.removeItem(paymentCallbackStorageKey(channel));
  } catch {
    /* ignore */
  }
}

function isPaymentCallbackMessage(
  data: unknown,
  channel: PaymentCallbackChannel,
): data is PaymentCallbackPayload & { type: string } {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.type === MESSAGE_TYPE &&
    o.channel === channel &&
    (o.state === 1 || o.state === 2)
  );
}

/** 訂閱 shop/redeem 第三方 redirect callback（postMessage + sessionStorage poll）。 */
export function subscribePaymentCallback(
  channel: PaymentCallbackChannel,
  listener: (payload: PaymentCallbackPayload) => void,
): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (!isPaymentCallbackMessage(event.data, channel)) return;
    listener({
      channel,
      state: event.data.state,
      at: typeof event.data.at === "number" ? event.data.at : Date.now(),
    });
  };
  window.addEventListener("message", onMessage);

  let stopped = false;
  const poll = () => {
    if (stopped) return;
    const payload = readPaymentCallbackPayload(channel);
    if (payload) {
      clearPaymentCallbackPayload(channel);
      listener(payload);
    }
  };
  const intervalId = window.setInterval(poll, 800);
  poll();

  return () => {
    stopped = true;
    window.removeEventListener("message", onMessage);
    window.clearInterval(intervalId);
  };
}

export function parseCallbackState(raw: string | null): 1 | 2 | null {
  const t = (raw ?? "").trim();
  if (t === "1") return 1;
  if (t === "2") return 2;
  return null;
}
