import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import {
  installRedeemApprovalDevMock,
  REDEEM_APPROVAL_DEV_PREVIEW_EVENT,
} from "../../lib/redeemApprovalDevMock";
import {
  fetchRedeemSCListFromGateway,
  REDEEM_WITHDRAW_RETURN_SUCCESS_EVENT,
} from "./redeemApprovalWalletGet";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { RedeemApprovalModal } from "./RedeemApprovalModal";

const REDEEM_APPROVAL_SHOWN_KEY = "ffgt:redeemApprovalShown";

function redeemApprovalFingerprint(amounts: string[]): string {
  return amounts.join(",");
}

function isRedeemApprovalShown(fingerprint: string): boolean {
  try {
    return sessionStorage.getItem(REDEEM_APPROVAL_SHOWN_KEY) === fingerprint;
  } catch {
    return false;
  }
}

function markRedeemApprovalShown(fingerprint: string): void {
  try {
    sessionStorage.setItem(REDEEM_APPROVAL_SHOWN_KEY, fingerprint);
  } catch {
    /* ignore */
  }
}

function clearRedeemApprovalShownForTests(): void {
  try {
    sessionStorage.removeItem(REDEEM_APPROVAL_SHOWN_KEY);
  } catch {
    /* ignore */
  }
}

export function RedeemApprovalGate() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const { requestRef, gatewayRequestReady, needsLobbyHydrationOverlay } =
    useGatewayLobby();

  const [open, setOpen] = useState(false);
  const [amountsWire, setAmountsWire] = useState<string[]>([]);

  const showApprovals = useCallback((list: string[]) => {
    if (list.length === 0) return;
    const fingerprint = redeemApprovalFingerprint(list);
    if (isRedeemApprovalShown(fingerprint)) return;
    setAmountsWire(list);
    setOpen(true);
  }, []);

  const fetchRedeemApprovals = useCallback(async () => {
    const req = requestRef.current;
    if (!req) return;
    try {
      const list = await fetchRedeemSCListFromGateway(req);
      showApprovals(list);
    } catch {
      /* ignore — non-blocking lobby UX */
    }
  }, [requestRef, showApprovals]);

  useEffect(() => {
    if (!ready || !user || user.id === "0") return;
    if (location.pathname !== "/") return;
    if (!isWsLobbyGamesEnabled()) return;
    if (!gatewayRequestReady || needsLobbyHydrationOverlay) return;
    void fetchRedeemApprovals();
  }, [
    ready,
    user,
    location.pathname,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    fetchRedeemApprovals,
  ]);

  useEffect(() => {
    const onWithdrawReturn = () => {
      void fetchRedeemApprovals();
    };
    window.addEventListener(
      REDEEM_WITHDRAW_RETURN_SUCCESS_EVENT,
      onWithdrawReturn,
    );
    return () =>
      window.removeEventListener(
        REDEEM_WITHDRAW_RETURN_SUCCESS_EVENT,
        onWithdrawReturn,
      );
  }, [fetchRedeemApprovals]);

  useEffect(() => {
    installRedeemApprovalDevMock(clearRedeemApprovalShownForTests);
  }, []);

  useEffect(() => {
    const onPreview = (e: Event) => {
      const amountsWire = (e as CustomEvent<{ amountsWire?: string[] }>).detail
        ?.amountsWire;
      if (!Array.isArray(amountsWire) || amountsWire.length === 0) return;
      showApprovals(
        amountsWire
          .map((v) => String(v ?? "").trim().replace(/,/g, ""))
          .filter((v) => /^\d+$/.test(v)),
      );
    };
    window.addEventListener(REDEEM_APPROVAL_DEV_PREVIEW_EVENT, onPreview);
    return () =>
      window.removeEventListener(REDEEM_APPROVAL_DEV_PREVIEW_EVENT, onPreview);
  }, [showApprovals]);

  const handleClose = useCallback(() => {
    if (amountsWire.length > 0) {
      markRedeemApprovalShown(redeemApprovalFingerprint(amountsWire));
    }
    setOpen(false);
    setAmountsWire([]);
  }, [amountsWire]);

  return (
    <RedeemApprovalModal
      open={open}
      amountsWire={amountsWire}
      onClose={handleClose}
    />
  );
}
