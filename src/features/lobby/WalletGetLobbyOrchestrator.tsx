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
  installBeggarEnvelopeDevMock,
} from "../../lib/beggarEnvelopeDevMock";
import {
  installRedeemApprovalDevMock,
  REDEEM_APPROVAL_DEV_PREVIEW_EVENT,
} from "../../lib/redeemApprovalDevMock";
import {
  installVipLevelUpDevMock,
  VIP_LEVEL_UP_DEV_PREVIEW_EVENT,
} from "../../lib/vipLevelUpDevMock";
import { fetchWalletGetLobbyExtras } from "../../realtime/walletGetGateway";
import type { VipLevelBonusItem } from "../../realtime/walletGetLobbyWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { BeggarRedEnvelopeModal } from "./BeggarRedEnvelopeModal";
import { RedeemApprovalModal } from "./RedeemApprovalModal";
import { VipLevelUpModal } from "./VipLevelUpModal";
import {
  REDEEM_WITHDRAW_RETURN_SUCCESS_EVENT,
} from "./redeemApprovalWalletGet";
import {
  vipLevelBonusFingerprint,
  vipLevelBonusItemFingerprint,
} from "./vipLevelUpWalletGet";

const VIP_LEVEL_UP_SHOWN_KEY = "ffgt:vipLevelUpShown";
const REDEEM_APPROVAL_SHOWN_KEY = "ffgt:redeemApprovalShown";

function isVipLevelUpShown(fingerprint: string): boolean {
  try {
    const raw = sessionStorage.getItem(VIP_LEVEL_UP_SHOWN_KEY);
    if (!raw) return false;
    return raw.split(",").includes(fingerprint);
  } catch {
    return false;
  }
}

function markVipLevelUpShown(fingerprint: string): void {
  try {
    const raw = sessionStorage.getItem(VIP_LEVEL_UP_SHOWN_KEY);
    const parts = raw ? raw.split(",").filter(Boolean) : [];
    if (!parts.includes(fingerprint)) parts.push(fingerprint);
    sessionStorage.setItem(VIP_LEVEL_UP_SHOWN_KEY, parts.join(","));
  } catch {
    /* ignore */
  }
}

function clearVipLevelUpShownForTests(): void {
  try {
    sessionStorage.removeItem(VIP_LEVEL_UP_SHOWN_KEY);
  } catch {
    /* ignore */
  }
}

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

function filterUnshownBonuses(bonuses: VipLevelBonusItem[]): VipLevelBonusItem[] {
  return bonuses.filter(
    (bonus) => !isVipLevelUpShown(vipLevelBonusItemFingerprint(bonus)),
  );
}

/**
 * One WALLET_GET (12) per lobby check; fans out to beggar envelope, VIP level-up,
 * and redeem approval modals.
 */
export function WalletGetLobbyOrchestrator() {
  const { show } = useAlert();
  const { user, ready } = useAuth();
  const location = useLocation();
  const {
    requestRef,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    refreshLobbyGet,
  } = useGatewayLobby();

  const [beggarOpen, setBeggarOpen] = useState(false);
  const [beggarAmount, setBeggarAmount] = useState(0);
  const [beggarFlying, setBeggarFlying] = useState(false);

  const [vipOpen, setVipOpen] = useState(false);
  const [vipQueue, setVipQueue] = useState<VipLevelBonusItem[]>([]);
  const [vipBatchFingerprint, setVipBatchFingerprint] = useState("");

  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemAmountsWire, setRedeemAmountsWire] = useState<string[]>([]);

  const [checkNonce, setCheckNonce] = useState(0);

  const showVipBonuses = useCallback((bonuses: VipLevelBonusItem[]) => {
    const pending = filterUnshownBonuses(bonuses);
    if (pending.length === 0) return;
    const fingerprint = vipLevelBonusFingerprint(pending);
    if (isVipLevelUpShown(fingerprint)) return;
    setVipBatchFingerprint(fingerprint);
    setVipQueue(pending);
    setVipOpen(true);
  }, []);

  const showRedeemApprovals = useCallback((list: string[]) => {
    if (list.length === 0) return;
    const fingerprint = redeemApprovalFingerprint(list);
    if (isRedeemApprovalShown(fingerprint)) return;
    setRedeemAmountsWire(list);
    setRedeemOpen(true);
  }, []);

  const showBeggarSubsidy = useCallback((subsidy: number) => {
    if (subsidy <= 0 || isBeggarEnvelopeShown(subsidy)) return;
    setBeggarAmount(subsidy);
    setBeggarOpen(true);
  }, []);

  const canFetch = useCallback(() => {
    if (!ready || !user || user.id === "0") return false;
    if (location.pathname !== "/") return false;
    if (!isWsLobbyGamesEnabled()) return false;
    if (!gatewayRequestReady || needsLobbyHydrationOverlay) return false;
    return true;
  }, [
    ready,
    user,
    location.pathname,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
  ]);

  const runLobbyWalletGetCheck = useCallback(async () => {
    const req = requestRef.current;
    if (!req) return;
    try {
      const extras = await fetchWalletGetLobbyExtras(req);
      showVipBonuses(extras.vipLevelBonusList);
      showRedeemApprovals(extras.redeemSCList);
      if (consumePendingBeggarEnvelopeCheck()) {
        showBeggarSubsidy(extras.subsidyAmount);
      }
    } catch {
      /* ignore — non-blocking lobby UX */
    }
  }, [requestRef, showVipBonuses, showRedeemApprovals, showBeggarSubsidy]);

  useEffect(() => {
    if (!canFetch()) return;
    void runLobbyWalletGetCheck();
  }, [canFetch, runLobbyWalletGetCheck, checkNonce]);

  useEffect(() => {
    const onLobbyRecheck = () => {
      if (!canFetch()) return;
      setCheckNonce((n) => n + 1);
    };
    window.addEventListener(BEGGAR_ENVELOPE_CHECK_EVENT, onLobbyRecheck);
    return () =>
      window.removeEventListener(BEGGAR_ENVELOPE_CHECK_EVENT, onLobbyRecheck);
  }, [canFetch]);

  useEffect(() => {
    const onWithdrawReturn = () => {
      if (!canFetch()) return;
      const req = requestRef.current;
      if (!req) return;
      void (async () => {
        try {
          const extras = await fetchWalletGetLobbyExtras(req, { force: true });
          showRedeemApprovals(extras.redeemSCList);
        } catch {
          /* ignore */
        }
      })();
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
  }, [canFetch, requestRef, showRedeemApprovals]);

  useEffect(() => {
    installBeggarEnvelopeDevMock();
    installVipLevelUpDevMock(clearVipLevelUpShownForTests);
    installRedeemApprovalDevMock(clearRedeemApprovalShownForTests);
  }, []);

  useEffect(() => {
    const onBeggarPreview = (e: Event) => {
      const amount = (e as CustomEvent<{ amount?: number }>).detail?.amount;
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return;
      }
      setBeggarAmount(Math.floor(amount));
      setBeggarOpen(true);
    };
    window.addEventListener(BEGGAR_ENVELOPE_DEV_PREVIEW_EVENT, onBeggarPreview);
    return () =>
      window.removeEventListener(
        BEGGAR_ENVELOPE_DEV_PREVIEW_EVENT,
        onBeggarPreview,
      );
  }, []);

  useEffect(() => {
    const onVipPreview = (e: Event) => {
      const bonuses = (e as CustomEvent<{ bonuses?: VipLevelBonusItem[] }>)
        .detail?.bonuses;
      if (!Array.isArray(bonuses) || bonuses.length === 0) return;
      showVipBonuses(bonuses);
    };
    window.addEventListener(VIP_LEVEL_UP_DEV_PREVIEW_EVENT, onVipPreview);
    return () =>
      window.removeEventListener(VIP_LEVEL_UP_DEV_PREVIEW_EVENT, onVipPreview);
  }, [showVipBonuses]);

  useEffect(() => {
    const onRedeemPreview = (e: Event) => {
      const amountsWire = (e as CustomEvent<{ amountsWire?: string[] }>).detail
        ?.amountsWire;
      if (!Array.isArray(amountsWire) || amountsWire.length === 0) return;
      showRedeemApprovals(
        amountsWire
          .map((v) => String(v ?? "").trim().replace(/,/g, ""))
          .filter((v) => /^\d+$/.test(v)),
      );
    };
    window.addEventListener(REDEEM_APPROVAL_DEV_PREVIEW_EVENT, onRedeemPreview);
    return () =>
      window.removeEventListener(
        REDEEM_APPROVAL_DEV_PREVIEW_EVENT,
        onRedeemPreview,
      );
  }, [showRedeemApprovals]);

  const handleBeggarClaim = useCallback(() => {
    if (beggarFlying) return;
    setBeggarFlying(true);
  }, [beggarFlying]);

  const handleBeggarFlyComplete = useCallback(() => {
    void (async () => {
      try {
        await refreshLobbyGet();
        markBeggarEnvelopeShown(beggarAmount);
        show(
          `Successfully claimed ${formatCompactGcAmount(beggarAmount)} GC!`,
          { variant: "success" },
        );
      } catch {
        show("Could not update balance. Please try again.", { variant: "error" });
      } finally {
        setBeggarFlying(false);
        setBeggarOpen(false);
      }
    })();
  }, [beggarAmount, refreshLobbyGet, show]);

  const handleBeggarClose = useCallback(() => {
    if (beggarFlying) return;
    setBeggarOpen(false);
  }, [beggarFlying]);

  const handleVipClose = useCallback(() => {
    const current = vipQueue[0];
    if (current) {
      markVipLevelUpShown(vipLevelBonusItemFingerprint(current));
    }

    if (vipQueue.length <= 1) {
      if (vipBatchFingerprint) {
        markVipLevelUpShown(vipBatchFingerprint);
      }
      setVipOpen(false);
      setVipQueue([]);
      setVipBatchFingerprint("");
      void refreshLobbyGet();
      return;
    }

    setVipQueue((prev) => prev.slice(1));
  }, [vipQueue, vipBatchFingerprint, refreshLobbyGet]);

  const handleRedeemClose = useCallback(() => {
    if (redeemAmountsWire.length > 0) {
      markRedeemApprovalShown(redeemApprovalFingerprint(redeemAmountsWire));
    }
    setRedeemOpen(false);
    setRedeemAmountsWire([]);
  }, [redeemAmountsWire]);

  const currentVipBonus = vipOpen && vipQueue.length > 0 ? vipQueue[0] : null;

  return (
    <>
      <BeggarRedEnvelopeModal
        open={beggarOpen}
        amount={beggarAmount}
        flying={beggarFlying}
        onClaim={handleBeggarClaim}
        onFlyComplete={handleBeggarFlyComplete}
        onClose={handleBeggarClose}
      />
      <VipLevelUpModal
        open={vipOpen && currentVipBonus !== null}
        bonus={currentVipBonus}
        onClose={handleVipClose}
      />
      <RedeemApprovalModal
        open={redeemOpen}
        amountsWire={redeemAmountsWire}
        onClose={handleRedeemClose}
      />
    </>
  );
}
