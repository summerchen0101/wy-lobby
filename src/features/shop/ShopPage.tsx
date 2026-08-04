import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAuth } from "../../auth/useAuth";
import { useAlert } from "../../components/alert/alertContext";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { isThirdPartyPaymentEnabled } from "../../lib/env";
import { usePaymentCallbackListener } from "../payment/usePaymentCallbackListener";
import {
  GATEWAY_API_BUY_PRODUCT,
  GATEWAY_API_MEGA_ACCOUNT_BINDING,
} from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  decodeBuyProductResponseBytes,
  decodeMegaAccountBindingResponseBytes,
  encodeBuyProductRequestBytes,
  encodeShopMegaAccountBindingRequestBytes,
} from "../../realtime/shopLobbyWire";
import {
  getSocureDiSessionToken,
  setSocureBindingNavigationContext,
} from "../../lib/socure/socureDevice";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { isPhoneBound } from "./isPhoneBound";
import { translateGatewayError } from "../../i18n/apiErrorMessage";
import { ShopCheckoutOverlay, type CheckoutStep } from "./ShopCheckoutOverlay";
import type {
  ShopBindingFormPayload,
  ShopPack,
  ShopBindingPrefill,
} from "./types";
import { useWordData } from "../../wordData/useWordData";
import { formatVipPoints } from "../lobby/vipHelpers";
import { DAILY_LOGIN_AUTO_CLOSE_MS } from "../dailyLogin/dailyLoginFlow";
import { shopCoinPileSrc } from "./shopCoinPile";
import "./ShopPage.css";
import "../lobby/SessionPageDecor.css";

const PAYMENT_UNAVAILABLE_MSG =
  "Payment is unavailable. Please try again later.";

/** WebGL：PaymentType 固定 0，付款方式於 paymentURL 頁選擇。 */
const BUY_PRODUCT_PAYMENT_TYPE = 0;

export function ShopPage() {
  const w = useWordData();
  const { show } = useAlert();
  const { token, user, mergeUser } = useAuth();
  const {
    requestRef,
    subscribePaymentFinish,
    refreshLobbyGet,
    shopPacks,
    refreshShopPacks,
    gatewayRequestReady,
  } = useGatewayLobby();
  const [checkoutPack, setCheckoutPack] = useState<ShopPack | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("loading");
  const [buyBusy, setBuyBusy] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [protectNeedSms, setProtectNeedSms] = useState(false);
  const [bindingBusy, setBindingBusy] = useState(false);
  const [bindingError, setBindingError] = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  const successCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token || !gatewayRequestReady) return;
    void refreshShopPacks();
  }, [token, gatewayRequestReady, refreshShopPacks]);

  const packs = shopPacks ?? [];
  const listLoading = Boolean(token) && shopPacks === null;

  const clearSuccessCloseTimer = useCallback(() => {
    if (successCloseTimerRef.current != null) {
      window.clearTimeout(successCloseTimerRef.current);
      successCloseTimerRef.current = null;
    }
  }, []);

  const closeCheckout = useCallback(() => {
    clearSuccessCloseTimer();
    setCheckoutPack(null);
    setCheckoutStep("loading");
    setPaymentUrl(null);
    setBuyError(null);
    setProtectNeedSms(false);
    setBindingError(null);
    setFlying(false);
  }, [clearSuccessCloseTimer]);

  const handlePaymentCallback = useCallback(
    (payload: { state: 1 | 2 }) => {
      if (checkoutStep !== "payment" || !paymentUrl) return;
      if (payload.state === 2) {
        closeCheckout();
        show("Payment was not completed.", { variant: "info" });
        return;
      }
      setPaymentUrl(null);
      setCheckoutStep("success");
    },
    [checkoutStep, paymentUrl, closeCheckout, show],
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
        closeCheckout();
        show(err || reason, { variant: "info" });
        return;
      }
      setPaymentUrl(null);
      setCheckoutStep("success");
    });
  }, [checkoutStep, paymentUrl, subscribePaymentFinish, closeCheckout, show]);

  useEffect(() => {
    if (checkoutStep !== "protect") return;
    void setSocureBindingNavigationContext();
  }, [checkoutStep]);

  useEffect(() => {
    return () => clearSuccessCloseTimer();
  }, [clearSuccessCloseTimer]);

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
      const tab = window.open(trimmed, "_blank");
      if (!tab) console.warn("[shop] payment window.open blocked");
      return true;
    },
    [notifyPaymentBlocked],
  );

  const executeBuyProduct = useCallback(
    async (pack: ShopPack) => {
      const req = requestRef.current;
      if (!req) {
        setBuyError("Not connected");
        setCheckoutStep("loading");
        return;
      }
      if (!isThirdPartyPaymentEnabled()) {
        notifyPaymentBlocked();
        closeCheckout();
        return;
      }
      setCheckoutStep("loading");
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
          setBuyError(
            translateGatewayError(
              code,
              r.errMessage,
              `Purchase failed (${code})`,
            ),
          );
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
    },
    [requestRef, notifyPaymentBlocked, closeCheckout],
  );

  const onPackClick = useCallback(
    (p: ShopPack) => {
      if (checkoutPack) return;
      setBuyError(null);
      setPaymentUrl(null);
      setProtectNeedSms(false);
      setBindingError(null);
      setFlying(false);
      setCheckoutPack(p);
      if (!isPhoneBound(user)) {
        setCheckoutStep("protect");
        return;
      }
      void executeBuyProduct(p);
    },
    [checkoutPack, user, executeBuyProduct],
  );

  const onPackKeyDown = useCallback(
    (e: KeyboardEvent, p: ShopPack) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onPackClick(p);
    },
    [onPackClick],
  );

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
        const socureDiSessionToken = await getSocureDiSessionToken();
        if (!socureDiSessionToken) {
          setBindingError(
            "Device verification unavailable. Please refresh and try again.",
          );
          return;
        }
        const data = encodeShopMegaAccountBindingRequestBytes({
          userID: uid,
          countryCode: payload.countryCode,
          phone: payload.phone,
          email: payload.email,
          answer: payload.answer,
          firstName: payload.firstName,
          lastName: payload.lastName,
          birthday: payload.birthday,
          socureDiSessionToken,
        });
        const r = await req({
          type: GATEWAY_API_MEGA_ACCOUNT_BINDING,
          data,
          debugLabel: "MEGA_ACCOUNT_BINDING",
        });
        const code = String(r.code ?? "");
        if (!isGatewaySuccessCode(code)) {
          setBindingError(
            translateGatewayError(code, r.errMessage, `Binding failed (${code})`),
          );
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
        await refreshLobbyGet();
        setProtectNeedSms(false);
        setBindingError(null);
        setCheckoutStep("bindingSuccess");
      } catch (e) {
        setBindingError(e instanceof Error ? e.message : "Binding failed");
      } finally {
        setBindingBusy(false);
      }
    },
    [checkoutPack, user?.id, requestRef, mergeUser, refreshLobbyGet],
  );

  const handleBindingSuccessConfirm = useCallback(() => {
    if (!checkoutPack) return;
    void executeBuyProduct(checkoutPack);
  }, [checkoutPack, executeBuyProduct]);

  const handleBackToProtectForm = useCallback(() => {
    setProtectNeedSms(false);
    setBindingError(null);
  }, []);

  const handleLoadingClose = useCallback(() => {
    closeCheckout();
  }, [closeCheckout]);

  const handleStartSuccessFly = useCallback(() => {
    setFlying(true);
  }, []);

  const handleSuccessFlyComplete = useCallback(async () => {
    setFlying(false);
    try {
      await refreshLobbyGet();
    } catch {
      /* balance refresh best-effort */
    }
    clearSuccessCloseTimer();
    successCloseTimerRef.current = window.setTimeout(() => {
      closeCheckout();
    }, DAILY_LOGIN_AUTO_CLOSE_MS);
  }, [refreshLobbyGet, clearSuccessCloseTimer, closeCheckout]);

  return (
    <div className="shop-page page-container session-page session-page--pattern">
      <div className="shop-page__inner">
        <h1 className="shop-page__title">{w(100)}</h1>
        <p className="shop-page__subtitle">{w(102)}</p>
        {listLoading ? (
          <p className="shop-page__status" role="status">
            Loading packages…
          </p>
        ) : packs.length === 0 ? (
          <p className="shop-page__status" role="status">
            No packages available.
          </p>
        ) : (
          <ul className="shop-page__grid">
            {packs.map((p) => (
              <li
                key={p.id}
                className={
                  "shop-page__card shop-page__card--clickable" +
                  (checkoutPack ? " shop-page__card--disabled" : "")
                }
                role="button"
                tabIndex={checkoutPack ? -1 : 0}
                aria-disabled={checkoutPack ? true : undefined}
                onClick={() => onPackClick(p)}
                onKeyDown={(e) => onPackKeyDown(e, p)}>
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
                      <span className="shop-page__gc-amount">
                        {w(104)} {p.gcLabel}
                      </span>
                    </span>
                  </div>
                  <div className="shop-page__card-art" data-pile={p.coinPile}>
                    <img
                      src={shopCoinPileSrc(p.coinPile)}
                      alt=""
                      className="shop-page__card-art-img"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p
                    className="shop-page__bonus"
                    aria-label={`Plus free SC ${p.bonusSc}`}>
                    <span className="shop-page__bonus-free">+{w(105)}</span>
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
                  {p.vipExp > 0 ? (
                    <p
                      className="shop-page__vip"
                      aria-label={`VIP points ${p.vipExp}`}>
                      <span className="shop-page__vip-plus">+</span>
                      <span className="shop-page__vip-amt">
                        {formatVipPoints(p.vipExp)}
                      </span>
                      <span className="shop-page__vip-label">{w(510760)}</span>
                    </p>
                  ) : null}
                </div>
                <span className="shop-page__price-pill">{p.price}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {checkoutPack ? (
        <ShopCheckoutOverlay
          open
          step={checkoutStep}
          pack={checkoutPack}
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
          flying={flying}
          onClose={
            checkoutStep === "loading" ? handleLoadingClose : closeCheckout
          }
          onBackFromProtect={closeCheckout}
          onBackToProtectForm={handleBackToProtectForm}
          onBindingSubmit={handleBindingSubmit}
          onBindingSuccessConfirm={handleBindingSuccessConfirm}
          onOpenPaymentPage={openThirdPartyPaymentPage}
          onStartSuccessFly={handleStartSuccessFly}
          onSuccessFlyComplete={handleSuccessFlyComplete}
        />
      ) : null}
    </div>
  );
}
