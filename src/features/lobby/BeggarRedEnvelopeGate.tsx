import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAlert } from "../../components/alert/alertContext";
import { useAuth } from "../../auth/useAuth";
import { formatCompactGcAmount } from "../../lib/formatCompactGcAmount";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import {
  BEGGAR_ENVELOPE_CHECK_EVENT,
  consumePendingBeggarEnvelopeCheck,
  isBeggarEnvelopeShown,
  markBeggarEnvelopeShown,
} from "../../lib/beggarEnvelopeCheck";
import {
  BEGGAR_ENVELOPE_DEV_PREVIEW_EVENT,
  getDevBeggarEnvelopeSubsidyAmount,
  installBeggarEnvelopeDevMock,
} from "../../lib/beggarEnvelopeDevMock";
import { GATEWAY_API_WALLET_GET } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import {
  decodeWalletGetResponseBytes,
  encodeWalletGetRequestBytes,
  parseSubsidyAmount,
} from "../../realtime/walletGetLobbyWire";
import { BeggarRedEnvelopeModal } from "./BeggarRedEnvelopeModal";

export function BeggarRedEnvelopeGate() {
  const { show } = useAlert();
  const { user, ready } = useAuth();
  const location = useLocation();
  const { requestRef, gatewayRequestReady, needsLobbyHydrationOverlay, refreshLobbyGet } =
    useGatewayLobby();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [flying, setFlying] = useState(false);
  const [checkNonce, setCheckNonce] = useState(0);

  const fetchSubsidy = useCallback(async () => {
    const devMock = getDevBeggarEnvelopeSubsidyAmount();
    if (devMock !== null) {
      if (devMock > 0 && !isBeggarEnvelopeShown(devMock)) {
        setAmount(devMock);
        setOpen(true);
      }
      return;
    }

    const req = requestRef.current;
    if (!req) return;

    try {
      const r = await req({
        type: GATEWAY_API_WALLET_GET,
        data: encodeWalletGetRequestBytes("GC"),
        debugLabel: "WALLET_GET",
      });
      if (
        !isGatewaySuccessCode(String(r.code ?? "")) ||
        !(r.data instanceof Uint8Array)
      ) {
        return;
      }
      const decoded = decodeWalletGetResponseBytes(r.data);
      const subsidy = parseSubsidyAmount(decoded.subsidyAmount);
      if (subsidy <= 0 || isBeggarEnvelopeShown(subsidy)) return;
      setAmount(subsidy);
      setOpen(true);
    } catch {
      /* ignore — non-blocking lobby UX */
    }
  }, [requestRef]);

  const tryConsumeAndFetch = useCallback(() => {
    if (!ready || !user || user.id === "0") return;
    if (location.pathname !== "/") return;
    if (!isWsLobbyGamesEnabled()) return;
    if (!gatewayRequestReady || needsLobbyHydrationOverlay) return;
    if (!consumePendingBeggarEnvelopeCheck()) return;
    void fetchSubsidy();
  }, [
    ready,
    user,
    location.pathname,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    fetchSubsidy,
  ]);

  useEffect(() => {
    tryConsumeAndFetch();
  }, [tryConsumeAndFetch, checkNonce]);

  useEffect(() => {
    const onCheck = () => setCheckNonce((n) => n + 1);
    window.addEventListener(BEGGAR_ENVELOPE_CHECK_EVENT, onCheck);
    return () => window.removeEventListener(BEGGAR_ENVELOPE_CHECK_EVENT, onCheck);
  }, []);

  useEffect(() => {
    installBeggarEnvelopeDevMock();
  }, []);

  useEffect(() => {
    const onPreview = (e: Event) => {
      const amount = (e as CustomEvent<{ amount?: number }>).detail?.amount;
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return;
      }
      setAmount(Math.floor(amount));
      setOpen(true);
    };
    window.addEventListener(BEGGAR_ENVELOPE_DEV_PREVIEW_EVENT, onPreview);
    return () =>
      window.removeEventListener(BEGGAR_ENVELOPE_DEV_PREVIEW_EVENT, onPreview);
  }, []);

  const handleClaim = useCallback(() => {
    if (flying) return;
    setFlying(true);
  }, [flying]);

  const handleFlyComplete = useCallback(() => {
    void (async () => {
      try {
        await refreshLobbyGet();
        markBeggarEnvelopeShown(amount);
        show(
          `Successfully claimed ${formatCompactGcAmount(amount)} GC!`,
          { variant: "success" },
        );
      } catch {
        show("Could not update balance. Please try again.", { variant: "error" });
      } finally {
        setFlying(false);
        setOpen(false);
      }
    })();
  }, [amount, refreshLobbyGet, show]);

  const handleClose = useCallback(() => {
    if (flying) return;
    setOpen(false);
  }, [flying]);

  return (
    <BeggarRedEnvelopeModal
      open={open}
      amount={amount}
      flying={flying}
      onClaim={handleClaim}
      onFlyComplete={handleFlyComplete}
      onClose={handleClose}
    />
  );
}
