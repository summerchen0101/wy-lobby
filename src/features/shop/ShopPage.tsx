import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useAlert } from "../../components/alert/alertContext";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { isThirdPartyPaymentEnabled } from "../../lib/env";
import { scheduleLobbyWalletGetAfterShopReward } from "../../lib/lobbyWalletGetCheck";
import { navigateToThirdPartyPayment } from "../../lib/thirdPartyPaymentNavigation";
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
import { translateShopGatewayError } from "./shopGatewayError";
import { ShopCheckoutOverlay, type CheckoutStep } from "./ShopCheckoutOverlay";
import type {
  ShopBindingFormPayload,
  ShopPack,
  ShopBindingPrefill,
} from "./types";
import { useWordData } from "../../wordData/useWordData";
import { getWord } from "../../wordData/getWord";
import { formatVipPoints } from "../lobby/vipHelpers";
import { shopCoinPileSrc } from "./shopCoinPile";
import { ShopPurchaseRewardAnimation } from "./ShopPurchaseRewardAnimation";
import {
  dispatchShopRewardDevPreview,
  installShopRewardDevMock,
  parseShopRewardDevQuery,
  SHOP_REWARD_DEV_MOCK_PACK,
  SHOP_REWARD_DEV_PREVIEW_EVENT,
  type ShopRewardDevPreviewDetail,
} from "./shopRewardDevMock";
import {
  clearPendingShopOrder,
  createPendingShopOrder,
  isPaymentPushFailure,
  persistPendingShopOrder,
  readPendingShopOrder,
  shouldAcceptPaymentComplete,
  type PendingShopOrder,
} from "./shopPaymentSession";
import {
  parseShopPaymentState,
  stripShopPaymentStateParam,
} from "./shopPaymentReturn";
import "./ShopPage.css";
import "../lobby/SessionPageDecor.css";

const PAYMENT_UNAVAILABLE_MSG =
  "Payment is unavailable. Please try again later.";

/** WebGL：PaymentType 固定 0，付款方式於 paymentURL 頁選擇。 */
const BUY_PRODUCT_PAYMENT_TYPE = 0;

export function ShopPage() {
  const w = useWordData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [rewardAnimPack, setRewardAnimPack] = useState<ShopPack | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingShopOrder | null>(() =>
    readPendingShopOrder(),
  );
  const successCloseTimerRef = useRef<number | null>(null);
  const completionHandledRef = useRef(false);
  const processedPaymentReturnRef = useRef<string | null>(null);
  const processedDevRewardQueryRef = useRef<string | null>(null);
  const rewardAnimNavigateRef = useRef(true);

  useEffect(() => {
    if (!token || !gatewayRequestReady) return;
    void refreshShopPacks();
  }, [token, gatewayRequestReady, refreshShopPacks]);

  const packs = shopPacks ?? [];
  const listLoading = Boolean(token) && shopPacks === null;
  const paymentMonitoringActive = Boolean(pendingOrder);

  const clearSuccessCloseTimer = useCallback(() => {
    if (successCloseTimerRef.current != null) {
      window.clearTimeout(successCloseTimerRef.current);
      successCloseTimerRef.current = null;
    }
  }, []);

  const resetCheckoutUi = useCallback(() => {
    clearSuccessCloseTimer();
    setCheckoutPack(null);
    setCheckoutStep("loading");
    setPaymentUrl(null);
    setBuyError(null);
    setProtectNeedSms(false);
    setBindingError(null);
  }, [clearSuccessCloseTimer]);

  const closeCheckout = useCallback(() => {
    resetCheckoutUi();
    clearPendingShopOrder();
    setPendingOrder(null);
    completionHandledRef.current = false;
  }, [resetCheckoutUi]);

  const dismissCheckoutOverlay = useCallback(() => {
    resetCheckoutUi();
  }, [resetCheckoutUi]);

  const dismissPendingPaymentSilently = useCallback(() => {
    completionHandledRef.current = false;
    clearPendingShopOrder();
    setPendingOrder(null);
    resetCheckoutUi();
  }, [resetCheckoutUi]);

  const handlePaymentSuccess = useCallback(() => {
    if (!shouldAcceptPaymentComplete(completionHandledRef.current)) return;
    completionHandledRef.current = true;
    const pending = pendingOrder ?? readPendingShopOrder();
    if (!pending) return;
    clearPendingShopOrder();
    setPendingOrder(null);
    setPaymentUrl(null);
    rewardAnimNavigateRef.current = true;
    setCheckoutPack(pending.pack);
    setCheckoutStep("success");
  }, [pendingOrder]);

  useEffect(() => {
    const raw = searchParams.get("paymentState");
    if (raw == null) return;

    const fingerprint = searchParams.toString();
    if (processedPaymentReturnRef.current === fingerprint) return;
    processedPaymentReturnRef.current = fingerprint;

    const paymentState = parseShopPaymentState(raw);
    const nextParams = stripShopPaymentStateParam(searchParams);
    setSearchParams(nextParams, { replace: true });

    if (paymentState !== 1) {
      dismissPendingPaymentSilently();
      return;
    }

    handlePaymentSuccess();
  }, [
    searchParams,
    setSearchParams,
    dismissPendingPaymentSilently,
    handlePaymentSuccess,
  ]);

  useEffect(() => {
    if (!paymentMonitoringActive) return;
    return subscribePaymentFinish((push) => {
      if (isPaymentPushFailure(push)) {
        dismissPendingPaymentSilently();
        return;
      }
      handlePaymentSuccess();
    });
  }, [
    paymentMonitoringActive,
    subscribePaymentFinish,
    dismissPendingPaymentSilently,
    handlePaymentSuccess,
  ]);

  const applyShopRewardDevPreview = useCallback(
    (detail: ShopRewardDevPreviewDetail) => {
      const pack = detail.pack ?? SHOP_REWARD_DEV_MOCK_PACK;
      const navigateAfter = detail.navigateAfter ?? false;
      rewardAnimNavigateRef.current = navigateAfter;
      if (detail.mode === "success") {
        setCheckoutPack(pack);
        setCheckoutStep("success");
        return;
      }
      setRewardAnimPack(pack);
    },
    [],
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    installShopRewardDevMock();
    const onPreview = (e: Event) => {
      applyShopRewardDevPreview(
        (e as CustomEvent<ShopRewardDevPreviewDetail>).detail,
      );
    };
    window.addEventListener(SHOP_REWARD_DEV_PREVIEW_EVENT, onPreview);
    return () =>
      window.removeEventListener(SHOP_REWARD_DEV_PREVIEW_EVENT, onPreview);
  }, [applyShopRewardDevPreview]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const raw = searchParams.get("devShopReward");
    const mode = parseShopRewardDevQuery(raw);
    if (!mode) return;

    const fingerprint = searchParams.toString();
    if (processedDevRewardQueryRef.current === fingerprint) return;
    processedDevRewardQueryRef.current = fingerprint;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("devShopReward");
    setSearchParams(nextParams, { replace: true });
    dispatchShopRewardDevPreview({ mode, navigateAfter: false });
  }, [searchParams, setSearchParams]);

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
      if (!isThirdPartyPaymentEnabled()) {
        notifyPaymentBlocked();
        return false;
      }
      return navigateToThirdPartyPayment(url);
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
      completionHandledRef.current = false;
      setCheckoutStep("loading");
      setBuyBusy(true);
      setBuyError(null);
      try {
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
          setBuyError(
            translateShopGatewayError(
              code,
              r.errMessage,
              `Purchase failed (${code})`,
            ),
          );
          return;
        }
        const raw = r.data;
        if (!(raw instanceof Uint8Array) || raw.byteLength === 0) {
          setBuyError("Empty purchase response");
          return;
        }
        const { orderID, paymentURL: url } = decodeBuyProductResponseBytes(raw);
        if (!url?.trim()) {
          setBuyError("No payment URL returned");
          return;
        }
        const trimmed = url.trim();
        const pending = createPendingShopOrder(orderID, pack);
        persistPendingShopOrder(pending);
        setPendingOrder(pending);
        navigateToThirdPartyPayment(trimmed);
      } catch (e) {
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
      completionHandledRef.current = false;
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
            translateShopGatewayError(
              code,
              r.errMessage,
              `Binding failed (${code})`,
            ),
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
            setBindingError(getWord(553));
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

  const handleLoadingClose = useCallback(() => {
    closeCheckout();
  }, [closeCheckout]);

  const handlePaymentOverlayClose = useCallback(() => {
    dismissCheckoutOverlay();
  }, [dismissCheckoutOverlay]);

  const handlePlayNowFromSuccess = useCallback(() => {
    const pack = checkoutPack;
    if (!pack) return;
    clearSuccessCloseTimer();
    const navigateAfter = rewardAnimNavigateRef.current;
    resetCheckoutUi();
    rewardAnimNavigateRef.current = navigateAfter;
    setRewardAnimPack(pack);
  }, [checkoutPack, clearSuccessCloseTimer, resetCheckoutUi]);

  const handleRewardAnimationComplete = useCallback(async () => {
    setRewardAnimPack(null);
    const shouldNavigate = rewardAnimNavigateRef.current;
    rewardAnimNavigateRef.current = true;
    if (!shouldNavigate) return;
    try {
      await refreshLobbyGet();
    } catch {
      /* balance refresh best-effort */
    }
    navigate("/");
    scheduleLobbyWalletGetAfterShopReward();
  }, [refreshLobbyGet, navigate]);

  const handleCheckoutClose = useCallback(() => {
    if (checkoutStep === "loading") {
      handleLoadingClose();
      return;
    }
    if (checkoutStep === "payment") {
      handlePaymentOverlayClose();
      return;
    }
    if (checkoutStep === "success") {
      handlePlayNowFromSuccess();
      return;
    }
    closeCheckout();
  }, [
    checkoutStep,
    handleLoadingClose,
    handlePaymentOverlayClose,
    handlePlayNowFromSuccess,
    closeCheckout,
  ]);

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
                  (checkoutPack || rewardAnimPack
                    ? " shop-page__card--disabled"
                    : "")
                }
                role="button"
                tabIndex={checkoutPack || rewardAnimPack ? -1 : 0}
                aria-disabled={checkoutPack || rewardAnimPack ? true : undefined}
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
                  <div className="shop-page__card-spacer" aria-hidden="true" />
                  <div className="shop-page__card-meta">
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
                    <p
                      className={
                        p.vipExp > 0
                          ? "shop-page__vip"
                          : "shop-page__vip shop-page__vip--placeholder"
                      }
                      aria-hidden={p.vipExp <= 0 ? true : undefined}
                      aria-label={
                        p.vipExp > 0 ? `VIP points ${p.vipExp}` : undefined
                      }>
                      {p.vipExp > 0 ? (
                        <>
                          <span className="shop-page__vip-plus">+</span>
                          <span className="shop-page__vip-amt">
                            {formatVipPoints(p.vipExp)}
                          </span>
                          <span className="shop-page__vip-label">
                            {w(510760)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
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
          onClose={handleCheckoutClose}
          onBackFromProtect={closeCheckout}
          onBindingSubmit={handleBindingSubmit}
          onBindingSuccessConfirm={handleBindingSuccessConfirm}
          onOpenPaymentPage={openThirdPartyPaymentPage}
          onPlayNow={handlePlayNowFromSuccess}
        />
      ) : null}
      {rewardAnimPack ? (
        <ShopPurchaseRewardAnimation
          pack={rewardAnimPack}
          onComplete={handleRewardAnimationComplete}
        />
      ) : null}
    </div>
  );
}
