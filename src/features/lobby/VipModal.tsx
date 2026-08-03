import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { InfoPopover } from "../../components/InfoPopover";
import { useAuth } from "../../auth/useAuth";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import {
  PROFILE_VIP_CLAIMED_STAMP_URL,
  profileVipBadgeUrl,
} from "../../lib/profileAssets";
import { profileVipProgress } from "./profileVipProgress";
import {
  clampVipViewLevel,
  formatVipPoints,
  formatVipRewardCompact,
  isVipLevelUpBonusClaimed,
  resolveVipBenefits,
  VIP_LEVEL_COUNT,
  VIP_MAX_LEVEL,
  VIP_MIN_LEVEL,
  vipRowForLevel,
  vipTitleForLevel,
} from "./vipHelpers";
import { useWordData } from "../../wordData/useWordData";
import { formatScFromRaw } from "../../wallet/formatWalletAmount";
import "./VipModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function VipModal({ open, onClose }: Props) {
  const w = useWordData();
  const { user } = useAuth();
  const titleId = useId();
  const playerVipLevel = user?.vipLevel ?? VIP_MIN_LEVEL;
  const [viewLevel, setViewLevel] = useState(() =>
    clampVipViewLevel(playerVipLevel),
  );

  const {
    useServerVipBar,
    current: vipProgressCurrent,
    required: vipProgressRequired,
    fillPct: vipProgressFillPct,
  } = profileVipProgress(user);

  useEffect(() => {
    if (open) {
      setViewLevel(clampVipViewLevel(playerVipLevel));
    }
  }, [open, playerVipLevel]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  if (!open) return null;

  const row = vipRowForLevel(viewLevel);
  const benefits = resolveVipBenefits(row);
  const levelTitle = vipTitleForLevel(viewLevel);
  const vipPoints = row?.VIPPoint ?? 0;
  const gcReward = row?.LvRewardGC ?? 0;
  const scReward = row?.LvRewardSC ?? 0;
  const bonusClaimed = isVipLevelUpBonusClaimed(viewLevel, playerVipLevel);

  return createPortal(
    <div className="app-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-modal app-modal--col vip-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}>
        <div className="app-modal__header app-modal__header--with-start">
          <InfoPopover
            align="start"
            content={
              useServerVipBar ? (
                <div className="vip-modal__info-popover-text">
                  <p>{w(510763)}</p>
                  <p>{w(510764)}</p>
                  <p>{w(510765)}</p>
                  <p>{w(510766)}</p>
                </div>
              ) : (
                <p className="vip-modal__info-popover-text">
                  VIP tier details will appear when your account is connected to
                  the loyalty system.
                </p>
              )
            }>
            {(p, triggerRef) => (
              <button
                ref={triggerRef}
                {...p}
                className="vip-modal__info"
                aria-label="VIP info">
                i
              </button>
            )}
          </InfoPopover>
          <h2 id={titleId} className="app-modal__title">
            {w(510759)}
          </h2>
          <button
            type="button"
            className="app-modal__close"
            onClick={onClose}
            aria-label="Close">
            ×
          </button>
        </div>
        <hr className="app-modal__rule app-modal__rule--flush" />
        <div className="vip-modal__body">
          <div className="vip-modal__progress">
            <div
              className="vip-modal__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={vipProgressRequired}
              aria-valuenow={vipProgressCurrent}
              aria-label="VIP point progress">
              <div
                className="vip-modal__bar-fill"
                style={{ width: `${vipProgressFillPct}%` }}
              />
              <span className="vip-modal__bar-label">
                {vipProgressCurrent}/{vipProgressRequired}
              </span>
              <div className="vip-modal__bar-cap" aria-hidden>
                <img
                  className="vip-modal__bar-badge-img"
                  src={profileVipBadgeUrl(playerVipLevel)}
                  alt=""
                />
              </div>
            </div>
          </div>

          <div className="vip-modal__nav-row">
            <button
              type="button"
              className="vip-modal__nav-btn"
              aria-label="Previous VIP level"
              disabled={viewLevel <= VIP_MIN_LEVEL}
              onClick={() =>
                setViewLevel((prev) => Math.max(VIP_MIN_LEVEL, prev - 1))
              }>
              <ChevronLeft className="vip-modal__nav-icon" aria-hidden />
            </button>
            <div className="vip-modal__badge" aria-hidden>
              <img
                className="vip-modal__badge-img"
                src={profileVipBadgeUrl(viewLevel)}
                alt=""
              />
            </div>
            <button
              type="button"
              className="vip-modal__nav-btn"
              aria-label="Next VIP level"
              disabled={viewLevel >= VIP_MAX_LEVEL}
              onClick={() =>
                setViewLevel((prev) => Math.min(VIP_MAX_LEVEL, prev + 1))
              }>
              <ChevronRight className="vip-modal__nav-icon" aria-hidden />
            </button>
          </div>

          <p className="vip-modal__level-name">{levelTitle}</p>
          <div className="vip-modal__points">
            <p className="vip-modal__points-text">
              {formatVipPoints(vipPoints)} {w(510760)}
            </p>
            <hr className="vip-modal__points-rule" />
          </div>

          <h3 className="vip-modal__benefits-head">{w(510761)}</h3>
          <div className="vip-modal__benefits-scroll">
            {benefits.length > 0 ? (
              <ul className="vip-modal__benefits-list">
                {benefits.map((text, index) => (
                  <li
                    key={`${viewLevel}-${index}`}
                    className="vip-modal__benefit">
                    <Check
                      className="vip-modal__benefit-check"
                      strokeWidth={3}
                      aria-hidden
                    />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="vip-modal__benefits-empty">
                Benefits for this tier will be listed here.
              </p>
            )}
          </div>

          <div className="vip-modal__bonus">
            {bonusClaimed ? (
              <img
                className="vip-modal__claimed"
                src={PROFILE_VIP_CLAIMED_STAMP_URL}
                alt="Claimed"
              />
            ) : null}
            <p className="vip-modal__bonus-title">{w(510762)}</p>
            <div className="vip-modal__bonus-row">
              <img
                className="vip-modal__bonus-coin"
                src={CURRENCY_ICON_GC}
                alt=""
                width={22}
                height={22}
              />
              <span className="vip-modal__bonus-value">
                {formatVipRewardCompact(gcReward)}
              </span>
              <span className="vip-modal__bonus-plus">+</span>
              <img
                className="vip-modal__bonus-coin"
                src={CURRENCY_ICON_SC}
                alt=""
                width={22}
                height={22}
              />
              <span className="vip-modal__bonus-value">
                {formatScFromRaw(scReward)}
              </span>
            </div>
          </div>

          <p className="vip-modal__pager" aria-live="polite">
            {viewLevel + 1}/{VIP_LEVEL_COUNT}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
