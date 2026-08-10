import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { BEGGAR_ENVELOPE_CHECK_EVENT } from "../../lib/beggarEnvelopeCheck";
import {
  installVipLevelUpDevMock,
  VIP_LEVEL_UP_DEV_PREVIEW_EVENT,
} from "../../lib/vipLevelUpDevMock";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import type { VipLevelBonusItem } from "../../realtime/walletGetLobbyWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { VipLevelUpModal } from "./VipLevelUpModal";
import {
  fetchVipLevelBonusListFromGateway,
  vipLevelBonusFingerprint,
  vipLevelBonusItemFingerprint,
} from "./vipLevelUpWalletGet";

const VIP_LEVEL_UP_SHOWN_KEY = "ffgt:vipLevelUpShown";

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

function filterUnshownBonuses(bonuses: VipLevelBonusItem[]): VipLevelBonusItem[] {
  return bonuses.filter(
    (bonus) => !isVipLevelUpShown(vipLevelBonusItemFingerprint(bonus)),
  );
}

export function VipLevelUpGate() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const {
    requestRef,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    refreshLobbyGet,
  } = useGatewayLobby();

  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<VipLevelBonusItem[]>([]);
  const [batchFingerprint, setBatchFingerprint] = useState("");
  const [checkNonce, setCheckNonce] = useState(0);

  const showBonuses = useCallback((bonuses: VipLevelBonusItem[]) => {
    const pending = filterUnshownBonuses(bonuses);
    if (pending.length === 0) return;
    const fingerprint = vipLevelBonusFingerprint(pending);
    if (isVipLevelUpShown(fingerprint)) return;
    setBatchFingerprint(fingerprint);
    setQueue(pending);
    setOpen(true);
  }, []);

  const fetchVipBonuses = useCallback(async () => {
    const req = requestRef.current;
    if (!req) return;
    try {
      const list = await fetchVipLevelBonusListFromGateway(req);
      showBonuses(list);
    } catch {
      /* ignore — non-blocking lobby UX */
    }
  }, [requestRef, showBonuses]);

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

  useEffect(() => {
    if (!canFetch()) return;
    void fetchVipBonuses();
  }, [canFetch, fetchVipBonuses, checkNonce]);

  useEffect(() => {
    const onGameReturn = () => {
      if (!canFetch()) return;
      setCheckNonce((n) => n + 1);
    };
    window.addEventListener(BEGGAR_ENVELOPE_CHECK_EVENT, onGameReturn);
    return () =>
      window.removeEventListener(BEGGAR_ENVELOPE_CHECK_EVENT, onGameReturn);
  }, [canFetch]);

  useEffect(() => {
    installVipLevelUpDevMock(clearVipLevelUpShownForTests);
  }, []);

  useEffect(() => {
    const onPreview = (e: Event) => {
      const bonuses = (e as CustomEvent<{ bonuses?: VipLevelBonusItem[] }>)
        .detail?.bonuses;
      if (!Array.isArray(bonuses) || bonuses.length === 0) return;
      showBonuses(bonuses);
    };
    window.addEventListener(VIP_LEVEL_UP_DEV_PREVIEW_EVENT, onPreview);
    return () =>
      window.removeEventListener(VIP_LEVEL_UP_DEV_PREVIEW_EVENT, onPreview);
  }, [showBonuses]);

  const handleClose = useCallback(() => {
    const current = queue[0];
    if (current) {
      markVipLevelUpShown(vipLevelBonusItemFingerprint(current));
    }

    if (queue.length <= 1) {
      if (batchFingerprint) {
        markVipLevelUpShown(batchFingerprint);
      }
      setOpen(false);
      setQueue([]);
      setBatchFingerprint("");
      void refreshLobbyGet();
      return;
    }

    setQueue((prev) => prev.slice(1));
  }, [queue, batchFingerprint, refreshLobbyGet]);

  const currentBonus = open && queue.length > 0 ? queue[0] : null;

  return (
    <VipLevelUpModal
      open={open && currentBonus !== null}
      bonus={currentBonus}
      onClose={handleClose}
    />
  );
}
