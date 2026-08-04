import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import { GATEWAY_API_WALLET_GET } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import {
  decodeWalletGetResponseBytes,
  encodeWalletGetRequestBytes,
  parseRedeemSCList,
} from "../../realtime/walletGetLobbyWire";
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

export function RedeemApprovalGate() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const { requestRef, gatewayRequestReady, needsLobbyHydrationOverlay } =
    useGatewayLobby();

  const [open, setOpen] = useState(false);
  const [amountsWire, setAmountsWire] = useState<string[]>([]);

  const fetchRedeemApprovals = useCallback(async () => {
    const req = requestRef.current;
    if (!req) return;

    try {
      const r = await req({
        type: GATEWAY_API_WALLET_GET,
        data: encodeWalletGetRequestBytes("SC"),
        debugLabel: "WALLET_GET_REDEEM_APPROVAL",
      });
      if (
        !isGatewaySuccessCode(String(r.code ?? "")) ||
        !(r.data instanceof Uint8Array)
      ) {
        return;
      }
      const decoded = decodeWalletGetResponseBytes(r.data);
      const list = parseRedeemSCList(decoded.redeemSCList);
      if (list.length === 0) return;
      const fingerprint = redeemApprovalFingerprint(list);
      if (isRedeemApprovalShown(fingerprint)) return;
      setAmountsWire(list);
      setOpen(true);
    } catch {
      /* ignore — non-blocking lobby UX */
    }
  }, [requestRef]);

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
