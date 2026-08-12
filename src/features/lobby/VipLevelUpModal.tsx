import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  RewardCoinPileAnimation,
  type RewardCoinPileLabels,
} from "../../components/RewardCoinPileAnimation";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { formatCompactGcAmount } from "../../lib/formatCompactGcAmount";
import { profileVipBadgeUrl } from "../../lib/profileAssets";
import type { VipLevelBonusItem } from "../../realtime/walletGetLobbyWire";
import { formatScFromRawWireInteger } from "../../wallet/formatWalletAmount";
import "./VipLevelUpModal.css";

const EXIT_MS = 280;
/** LEVEL UP 入場動畫播完後再啟動金幣堆。 */
const VIP_MODAL_REVEAL_MS = 900;

type FlowPhase = "hidden" | "modal" | "reward" | "exiting";

type Props = {
  open: boolean;
  bonus: VipLevelBonusItem | null;
  onClose: () => void;
};

function formatGcRewardDisplay(gcAmountWire: string): string {
  const n = Number(gcAmountWire);
  if (!Number.isFinite(n) || n <= 0) return "+0";
  return `+${formatCompactGcAmount(n)}`;
}

function formatScRewardDisplay(scAmountWire: string): string {
  if (scAmountWire === "0") return "+0";
  const formatted = formatScFromRawWireInteger(scAmountWire);
  return formatted === "—" ? "+0" : `+${formatted}`;
}

function bonusDisplayKey(bonus: VipLevelBonusItem): string {
  return `${bonus.vipLevel}:${bonus.gcAmountWire}:${bonus.scAmountWire}`;
}

function bonusRewardAnimLabels(bonus: VipLevelBonusItem): RewardCoinPileLabels {
  return {
    gcLabel: formatGcRewardDisplay(bonus.gcAmountWire).replace(/^\+/, ""),
    scLabel: formatScRewardDisplay(bonus.scAmountWire).replace(/^\+/, ""),
  };
}

function hasAnimatableBonus(bonus: VipLevelBonusItem): boolean {
  const labels = bonusRewardAnimLabels(bonus);
  const gc = labels.gcLabel?.trim() ?? "";
  const sc = labels.scLabel?.trim() ?? "";
  return (gc !== "" && gc !== "0") || (sc !== "" && sc !== "0");
}

export function VipLevelUpModal({ open, bonus, onClose }: Props) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const revealTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<FlowPhase>("hidden");
  const [rewardAnimLabels, setRewardAnimLabels] =
    useState<RewardCoinPileLabels | null>(null);
  const [displayBonus, setDisplayBonus] = useState<VipLevelBonusItem | null>(
    null,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current != null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const beginExit = useCallback(() => {
    clearRevealTimer();
    setPhase("exiting");
  }, [clearRevealTimer]);

  const skipFlow = useCallback(() => {
    if (phase === "hidden" || phase === "exiting") return;
    clearRevealTimer();
    setRewardAnimLabels(null);
    beginExit();
  }, [phase, clearRevealTimer, beginExit]);

  useEffect(() => {
    if (!open || !bonus) {
      clearRevealTimer();
      if (!open) {
        setPhase("hidden");
        setRewardAnimLabels(null);
      }
      return;
    }

    setDisplayBonus(bonus);
    setRewardAnimLabels(null);
    setPhase("modal");

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const revealDelay = reduce ? 120 : VIP_MODAL_REVEAL_MS;

    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null;
      if (hasAnimatableBonus(bonus)) {
        setRewardAnimLabels(bonusRewardAnimLabels(bonus));
        setPhase("reward");
        return;
      }
      beginExit();
    }, revealDelay);

    return clearRevealTimer;
  }, [open, bonus, clearRevealTimer, beginExit]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const delay = reduce ? 0 : EXIT_MS;
    const timer = window.setTimeout(() => {
      setPhase("hidden");
      setRewardAnimLabels(null);
      setDisplayBonus(null);
      onCloseRef.current();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "modal" && phase !== "reward") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipFlow();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, skipFlow]);

  const handleRewardAnimComplete = useCallback(() => {
    setRewardAnimLabels(null);
    beginExit();
  }, [beginExit]);

  const shouldRenderModal =
    displayBonus && (phase === "modal" || phase === "reward" || phase === "exiting");

  if (!shouldRenderModal && phase !== "reward") return null;

  return createPortal(
    <>
      {shouldRenderModal && displayBonus ? (
        <div
          className={
            "vip-level-up-overlay" +
            (phase === "exiting" ? " vip-level-up-overlay--out" : "")
          }
          role="presentation"
          onClick={skipFlow}
        >
          <div className="vip-level-up-overlay__glow" aria-hidden />
          <div className="vip-level-up-overlay__rays" aria-hidden />
          <button
            type="button"
            className="vip-level-up-overlay__close"
            aria-label="Close"
            onClick={skipFlow}
            disabled={phase === "exiting"}
          >
            <X aria-hidden strokeWidth={2.4} />
          </button>

          <div
            key={bonusDisplayKey(displayBonus)}
            className="vip-level-up-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vip-level-up-modal__badge-wrap">
              <div className="vip-level-up-modal__badge-ring">
                <img
                  className="vip-level-up-modal__badge-img"
                  src={profileVipBadgeUrl(displayBonus.vipLevel)}
                  alt=""
                  decoding="async"
                />
              </div>
            </div>

            <h2 id={titleId} className="vip-level-up-modal__title">
              LEVEL UP
            </h2>

            <div className="vip-level-up-modal__divider" aria-hidden />

            <div className="vip-level-up-modal__rewards">
              <div className="vip-level-up-modal__reward">
                <img
                  className="vip-level-up-modal__reward-icon"
                  src={CURRENCY_ICON_GC}
                  alt=""
                  decoding="async"
                />
                <span className="vip-level-up-modal__reward-value">
                  {formatGcRewardDisplay(displayBonus.gcAmountWire)}
                </span>
              </div>
              <div className="vip-level-up-modal__reward">
                <img
                  className="vip-level-up-modal__reward-icon"
                  src={CURRENCY_ICON_SC}
                  alt=""
                  decoding="async"
                />
                <span className="vip-level-up-modal__reward-value">
                  {formatScRewardDisplay(displayBonus.scAmountWire)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {phase === "reward" && rewardAnimLabels ? (
        <RewardCoinPileAnimation
          elevated
          gcLabel={rewardAnimLabels.gcLabel}
          scLabel={rewardAnimLabels.scLabel}
          onComplete={handleRewardAnimComplete}
        />
      ) : null}
    </>,
    document.body,
  );
}
