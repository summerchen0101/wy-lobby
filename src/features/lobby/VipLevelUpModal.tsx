import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { formatCompactGcAmount } from "../../lib/formatCompactGcAmount";
import { profileVipBadgeUrl } from "../../lib/profileAssets";
import type { VipLevelBonusItem } from "../../realtime/walletGetLobbyWire";
import {
  formatScFromRawWireInteger,
} from "../../wallet/formatWalletAmount";
import "./VipLevelUpModal.css";

const EXIT_MS = 280;

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

export function VipLevelUpModal({ open, bonus, onClose }: Props) {
  const titleId = useId();
  const [exiting, setExiting] = useState(false);
  const [displayBonus, setDisplayBonus] = useState<VipLevelBonusItem | null>(
    null,
  );

  useEffect(() => {
    if (bonus) {
      setDisplayBonus(bonus);
    }
  }, [bonus]);

  const shouldRender = displayBonus && (open || exiting);

  useEffect(() => {
    if (open && bonus) {
      setExiting(false);
    }
  }, [open, bonus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !exiting && displayBonus) {
        setExiting(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, exiting, displayBonus]);

  useEffect(() => {
    if (!exiting) return;
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const delay = reduce ? 0 : EXIT_MS;
    const timer = window.setTimeout(() => {
      setExiting(false);
      onClose();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [exiting, onClose]);

  const requestClose = () => {
    if (exiting || !displayBonus) return;
    setExiting(true);
  };

  if (!shouldRender || !displayBonus) return null;

  const gcDisplay = formatGcRewardDisplay(displayBonus.gcAmountWire);
  const scDisplay = formatScRewardDisplay(displayBonus.scAmountWire);
  const contentKey = bonusDisplayKey(displayBonus);

  return createPortal(
    <div
      className={
        "vip-level-up-overlay" +
        (exiting ? " vip-level-up-overlay--out" : "")
      }
      role="presentation"
      onClick={requestClose}>
      <div className="vip-level-up-overlay__glow" aria-hidden />
      <div className="vip-level-up-overlay__rays" aria-hidden />
      <button
        type="button"
        className="vip-level-up-overlay__close"
        aria-label="Close"
        onClick={requestClose}
        disabled={exiting}>
        <X aria-hidden strokeWidth={2.4} />
      </button>

      <div
        key={contentKey}
        className="vip-level-up-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}>
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
            <span className="vip-level-up-modal__reward-value">{gcDisplay}</span>
          </div>
          <div className="vip-level-up-modal__reward">
            <img
              className="vip-level-up-modal__reward-icon"
              src={CURRENCY_ICON_SC}
              alt=""
              decoding="async"
            />
            <span className="vip-level-up-modal__reward-value">{scDisplay}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
