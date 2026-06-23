import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { useAlert } from "../../components/alert/alertContext";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { isThirdPartyPaymentEnabled } from "../../lib/env";
import { usePaymentCallbackListener } from "../payment/usePaymentCallbackListener";
import {
  GATEWAY_API_BUY_PRODUCT,
  GATEWAY_API_LIST_PRODUCTS,
  GATEWAY_API_MEGA_ACCOUNT_BINDING,
} from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  decodeBuyProductResponseBytes,
  decodeListProductsResponseBytes,
  decodeMegaAccountBindingResponseBytes,
  encodeBuyProductRequestBytes,
  encodeListProductsRequestBytes,
  encodeMegaAccountBindingRequestBytes,
} from "../../realtime/shopLobbyWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { mapListProductToShopPack } from "./mapListProductToShopPack";
import { publicImageUrl } from "../../lib/publicImageUrl";
import { isPhoneBound } from "./isPhoneBound";
import { ShopCheckoutOverlay, type CheckoutStep } from "./ShopCheckoutOverlay";
import type {
  ShopBindingFormPayload,
  ShopPack,
  ShopBindingPrefill,
} from "./types";
import "./ShopPage.css";
import "../lobby/SessionPageDecor.css";

const PANEL = publicImageUrl("/images/shop");

const PAYMENT_UNAVAILABLE_MSG =
  "Payment is unavailable. Please try again later.";

/** BuyProduct 新第三方：PaymentType 固定 0，方式於 paymentURL 頁選擇。 */
const BUY_PRODUCT_PAYMENT_TYPE = 0;

function coinPileSrc(n: 1 | 2 | 3 | 4 | 5) {
  return `${PANEL}/icon_coinPile${n}.png`;
}

export function ShopPage() {
  const { show } = useAlert();
  const { token, user, mergeUser } = useAuth();
  const { requestRef, subscribePaymentFinish } = useGatewayLobby();
  const [packs, setPacks] = useState<ShopPack[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [checkoutPack, setCheckoutPack] = useState<ShopPack | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("summary");
  const [buyBusy, setBuyBusy] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [protectNeedSms, setProtectNeedSms] = useState(false);
  const [bindingBusy, setBindingBusy] = useState(false);
  const [bindingError, setBindingError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPacks([]);
      setListLoading(false);
      setListError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setListLoading(true);
      setListError(null);
      for (let i = 0; i < 50 && !cancelled; i++) {
        const req = requestRef.current;
        if (req) {
          try {
            const r = await req({
              type: GATEWAY_API_LIST_PRODUCTS,
              data: encodeListProductsRequestBytes(),
              debugLabel: "LIST_PRODUCTS",
            });
            const code = String(r.code ?? "");
            if (!isGatewaySuccessCode(code)) {
              if (!cancelled) {
                setListError(
                  r.errMessage?.trim() || `List products failed (${code})`,
                );
                setPacks([]);
              }
              return;
            }
            const raw = r.data;
            if (raw instanceof Uint8Array && raw.byteLength > 0) {
              const { products } = decodeListProductsResponseBytes(raw);
              if (!cancelled) {
                setPacks(products.map(mapListProductToShopPack));
              }
            } else if (!cancelled) {
              setPacks([]);
            }
          } catch (e) {
            if (!cancelled) {
              setListError(
                e instanceof Error ? e.message : "Could not load products",
              );
              setPacks([]);
            }
          } finally {
            if (!cancelled) setListLoading(false);
          }
          return;
        }
        await new Promise((res) => setTimeout(res, 100));
      }
      if (!cancelled) {
        setListError("Could not connect to shop");
        setPacks([]);
        setListLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, requestRef]);

  const handlePaymentCallback = useCallback(
    (payload: { state: 1 | 2 }) => {
      if (checkoutStep !== "payment" || !paymentUrl) return;
      if (payload.state === 2) {
        setBuyError("Payment was not completed.");
        setPaymentUrl(null);
        setCheckoutStep("summary");
        return;
      }
      setPaymentUrl(null);
      setCheckoutStep("success");
    },
    [checkoutStep, paymentUrl],
  );

  usePaymentCallbackListener(
    "shop",
    checkoutStep === "payment" && !!paymentUrl,
    handlePaymentCallback,
  );

  useEffect(() => {
    if (checkoutStep !== "payment" || !paymentUrl) return;
    return subscribePaymentFinish((push) => {
      const err = String(push.errorMsg ?? "").trim();
      const reason = String(push.reason ?? "").trim();
      if (err || reason) {
        setBuyError(err || reason);
        setPaymentUrl(null);
        setCheckoutStep("summary");
        return;
      }
      setPaymentUrl(null);
      setCheckoutStep("success");
    });
  }, [checkoutStep, paymentUrl, subscribePaymentFinish]);

  const openCheckout = (p: ShopPack) => {
    setBuyError(null);
    setPaymentUrl(null);
    setCheckoutStep("summary");
    setProtectNeedSms(false);
    setBindingError(null);
    setCheckoutPack(p);
  };

  const closeCheckout = useCallback(() => {
    setCheckoutPack(null);
    setCheckoutStep("summary");
    setPaymentUrl(null);
    setBuyError(null);
    setProtectNeedSms(false);
    setBindingError(null);
  }, []);

  const cancelPaymentFrame = useCallback(() => {
    setPaymentUrl(null);
    setCheckoutStep("summary");
  }, []);

  const handleProtectClose = useCallback(() => {
    setCheckoutStep("summary");
    setProtectNeedSms(false);
    setBindingError(null);
  }, []);

  const handleBackToProtectForm = useCallback(() => {
    setProtectNeedSms(false);
    setBindingError(null);
  }, []);

  const notifyPaymentBlocked = useCallback(() => {
    show(PAYMENT_UNAVAILABLE_MSG, { variant: "info" });
  }, [show]);

  const openThirdPartyPaymentPage = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return false;
      if (!isThirdPartyPaymentEnabled()) {
        notifyPaymentBlocked();
        return false;
      }
      const w = window.open(trimmed, "_blank");
      if (!w) console.warn("[shop] payment window.open blocked");
      return true;
    },
    [notifyPaymentBlocked],
  );

  const executeBuyProduct = useCallback(async () => {
    const pack = checkoutPack;
    if (!pack) return;
    const req = requestRef.current;
    if (!req) {
      setBuyError("Not connected");
      return;
    }
    if (!isThirdPartyPaymentEnabled()) {
      notifyPaymentBlocked();
      return;
    }
    setBuyBusy(true);
    setBuyError(null);
    let paymentTab: Window | null = null;
    try {
      paymentTab = window.open("about:blank", "_blank");
      const r = await req({
        type: GATEWAY_API_BUY_PRODUCT,
        data: encodeBuyProductRequestBytes(
          pack.productID,
          BUY_PRODUCT_PAYMENT_TYPE,
        ),
        debugLabel: "BUY_PRODUCT",
      });
      const code = String(r.code ?? "");
      if (!isGatewaySuccessCode(code)) {
        paymentTab?.close();
        setBuyError(r.errMessage?.trim() || `Purchase failed (${code})`);
        return;
      }
      const raw = r.data;
      if (!(raw instanceof Uint8Array) || raw.byteLength === 0) {
        paymentTab?.close();
        setBuyError("Empty purchase response");
        return;
      }
      const { paymentURL: url } = decodeBuyProductResponseBytes(raw);
      if (!url?.trim()) {
        paymentTab?.close();
        setBuyError("No payment URL returned");
        return;
      }
      const trimmed = url.trim();
      if (paymentTab && !paymentTab.closed) {
        try {
          paymentTab.location.href = trimmed;
        } catch {
          paymentTab.close();
        }
      }
      setPaymentUrl(trimmed);
      setCheckoutStep("payment");
    } catch (e) {
      paymentTab?.close();
      setBuyError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBuyBusy(false);
    }
  }, [checkoutPack, requestRef, notifyPaymentBlocked]);

  const handleBindingSubmit = useCallback(
    async (payload: ShopBindingFormPayload) => {
      if (!checkoutPack) return;
      const req = requestRef.current;
      if (!req) {
        setBindingError("Not connected");
        return;
      }
      const uid = user?.id;
      if (!uid || !/^\d+$/.test(uid)) {
        setBindingError("Missing user id");
        return;
      }
      setBindingBusy(true);
      setBindingError(null);
      try {
        const data = encodeMegaAccountBindingRequestBytes({
          userID: uid,
          countryCode: payload.countryCode,
          phone: payload.phone,
          email: payload.email,
          answer: payload.answer,
          firstName: payload.firstName,
          lastName: payload.lastName,
          birthday: payload.birthday,
          address: payload.address,
          country: payload.country,
          city: payload.city,
          state: payload.state,
          zip: payload.zip,
          language: "en",
        });
        const r = await req({
          type: GATEWAY_API_MEGA_ACCOUNT_BINDING,
          data,
          debugLabel: "MEGA_ACCOUNT_BINDING",
        });
        const code = String(r.code ?? "");
        if (!isGatewaySuccessCode(code)) {
          setBindingError(r.errMessage?.trim() || `Binding failed (${code})`);
          return;
        }
        const raw = r.data;
        const decoded =
          raw instanceof Uint8Array && raw.byteLength > 0
            ? decodeMegaAccountBindingResponseBytes(raw)
            : decodeMegaAccountBindingResponseBytes(new Uint8Array(0));
        if (decoded.needSMSAnswer) {
          setProtectNeedSms(true);
          if (payload.answer.trim()) {
            setBindingError("Invalid or expired verification code.");
          }
          return;
        }
        const phone = decoded.phoneNum.trim();
        if (phone) mergeUser({ phone });
        setProtectNeedSms(false);
        setBindingError(null);
        setCheckoutStep("summary");
        show("Account verified. Please tap purchase again to continue.", {
          variant: "success",
        });
      } catch (e) {
        setBindingError(e instanceof Error ? e.message : "Binding failed");
      } finally {
        setBindingBusy(false);
      }
    },
    [checkoutPack, user?.id, requestRef, mergeUser, show],
  );

  const handleContinuePurchase = useCallback(async () => {
    if (!checkoutPack) return;
    if (!isPhoneBound(user)) {
      setProtectNeedSms(false);
      setBindingError(null);
      setCheckoutStep("protect");
      return;
    }
    await executeBuyProduct();
  }, [checkoutPack, user, executeBuyProduct]);

  return (
    <div className="shop-page page-container session-page session-page--pattern">
      <div className="shop-page__inner">
        <h1 className="shop-page__title">STORE</h1>
        <p className="shop-page__subtitle">CHOOSE YOUR COINS PACKAGE</p>
        {listLoading ? (
          <p className="shop-page__status" role="status">
            Loading packages…
          </p>
        ) : listError ? (
          <p
            className="shop-page__status shop-page__status--error"
            role="alert">
            {listError}
          </p>
        ) : packs.length === 0 ? (
          <p className="shop-page__status" role="status">
            No packages available.
          </p>
        ) : (
          <ul className="shop-page__grid">
            {packs.map((p) => (
              <li key={p.id} className="shop-page__card">
                <div className="shop-page__card-mid">
                  <div className="shop-page__card-top">
                    <span className="shop-page__gc-row">
                      <span className="shop-page__chip shop-page__chip--gc">
                        <img
                          src={CURRENCY_ICON_GC}
                          alt=""
                          width={24}
                          height={24}
                        />
                      </span>
                      <span className="shop-page__gc-amount">{p.gcLabel}</span>
                    </span>
                  </div>
                  <div className="shop-page__card-art" data-pile={p.coinPile}>
                    <img
                      src={coinPileSrc(p.coinPile)}
                      alt=""
                      className="shop-page__card-art-img"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p
                    className="shop-page__bonus"
                    aria-label={`Plus free SC ${p.bonusSc}`}>
                    <span className="shop-page__bonus-free">+FREE</span>
                    <span className="shop-page__chip shop-page__chip--sc">
                      <img
                        src={CURRENCY_ICON_SC}
                        alt=""
                        width={24}
                        height={24}
                      />
                    </span>
                    <span className="shop-page__bonus-amt">{p.bonusSc}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="shop-page__price-btn"
                  onClick={() => openCheckout(p)}>
                  {p.price}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {checkoutPack ? (
        <ShopCheckoutOverlay
          open
          pack={checkoutPack}
          step={checkoutStep}
          buyBusy={buyBusy}
          buyError={buyError}
          paymentUrl={paymentUrl}
          bindingBusy={bindingBusy}
          bindingError={bindingError}
          protectNeedSms={protectNeedSms}
          bindingPrefill={
            {
              email: user?.email,
              phone: user?.phone,
            } satisfies ShopBindingPrefill
          }
          onClose={closeCheckout}
          onProtectClose={handleProtectClose}
          onBackToProtectForm={handleBackToProtectForm}
          onBindingSubmit={handleBindingSubmit}
          onContinuePurchase={() => void handleContinuePurchase()}
          onCancelPaymentFrame={cancelPaymentFrame}
          onOpenPaymentPage={openThirdPartyPaymentPage}
        />
      ) : null}
    </div>
  );
}
