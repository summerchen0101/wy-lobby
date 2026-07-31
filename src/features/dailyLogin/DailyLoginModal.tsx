import { useCallback, useEffect, useId, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Gift, Lock, X } from "lucide-react";
import { CoinFlyToBalance } from "../../components/CoinFlyToBalance";
import { InfoPopover } from "../../components/InfoPopover";
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from "../../lib/currencyIcons";
import { formatCompactGcAmount } from "../../lib/formatCompactGcAmount";
import { formatItemAmountForDisplay } from "../../realtime/activityLobbyWire";
import { formatWalletScAmountForDisplay } from "../../wallet/formatWalletAmount";
import { dailyBonusDayArtSrc } from "./dailyLoginAssets";
import { useDailyLoginActivity } from "./dailyLoginContext";
import type { CreditRewardViewModel, DayViewModel } from "./dailyLoginLogic";
import { CREDIT_MILESTONE_MAX, isDayCollectable } from "./dailyLoginLogic";
import "./DailyLoginModal.css";

type Props = {
  open: boolean;
};

function scaledAxisPositionStyle(
  value: number,
  max: number,
  axis: "x" | "thumb",
): CSSProperties {
  if (max <= 0) {
    return axis === "thumb"
      ? { left: "0.5rem", transform: "translate(0, -50%)" }
      : { left: "0", transform: "translateX(0)" };
  }
  const ratio = Math.min(1, Math.max(0, value / max));
  if (ratio >= 1) {
    return axis === "thumb"
      ? { left: "100%", transform: "translate(-100%, -50%)" }
      : { left: "100%", transform: "translateX(-100%)" };
  }
  if (ratio <= 0) {
    return axis === "thumb"
      ? { left: "0.5rem", transform: "translate(0, -50%)" }
      : { left: "0", transform: "translateX(0)" };
  }
  return axis === "thumb"
    ? { left: `${ratio * 100}%`, transform: "translate(-50%, -50%)" }
    : { left: `${ratio * 100}%`, transform: "translateX(-50%)" };
}

function formatRewardAmount(wallet: "GC" | "SC", itemID: number, raw: number): string {
  const display = formatItemAmountForDisplay(itemID, raw);
  if (wallet === "SC") return formatWalletScAmountForDisplay(display);
  return formatCompactGcAmount(display);
}

function dayStatusClass(status: DayViewModel["status"]): string {
  if (status === "claimable") return " daily-login-modal__day--claimable";
  if (status === "claimed") return " daily-login-modal__day--claimed";
  return " daily-login-modal__day--locked";
}

function RewardRow({
  wallet,
  itemID,
  itemAmount,
}: {
  wallet: "GC" | "SC";
  itemID: number;
  itemAmount: number;
}) {
  return (
    <div className="daily-login-modal__reward-row">
      <img
        src={wallet === "GC" ? CURRENCY_ICON_GC : CURRENCY_ICON_SC}
        alt=""
        width={18}
        height={18}
      />
      <span>{formatRewardAmount(wallet, itemID, itemAmount)}</span>
    </div>
  );
}

function DayCell({
  day,
  featured = false,
  claiming,
  disabled,
  onClaim,
}: {
  day: DayViewModel;
  featured?: boolean;
  claiming?: boolean;
  disabled?: boolean;
  onClaim?: (day: DayViewModel, rect: DOMRect) => void;
}) {
  const gcReward = day.rewards.find((r) => r.wallet === "GC");
  const scReward = day.rewards.find((r) => r.wallet === "SC");
  const inlineRewardPlus = !featured && gcReward && scReward;
  const showClaimable = isDayCollectable(day);
  const clickable = showClaimable && !disabled && !claiming;
  const visualStatus: DayViewModel["status"] = showClaimable ? "claimable" : "locked";

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLLIElement>) => {
    if (!clickable || !onClaim) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      onClaim(day, el.getBoundingClientRect());
    }
  };

  return (
    <li
      className={
        "daily-login-modal__day" +
        dayStatusClass(visualStatus) +
        (featured ? " daily-login-modal__day--featured" : "") +
        (day.status === "claimed" ? " daily-login-modal__day--checked" : "") +
        (clickable ? " daily-login-modal__day--clickable" : "") +
        (claiming ? " daily-login-modal__day--claiming" : "")
      }
      data-status={day.status}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-disabled={clickable ? undefined : true}
      onClick={(e) => {
        if (!clickable || !onClaim) return;
        onClaim(day, (e.currentTarget as HTMLElement).getBoundingClientRect());
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="daily-login-modal__day-head">DAY {day.dayNumber}</div>
      {day.status === "claimed" ? (
        <div
          className={
            "daily-login-modal__day-body daily-login-modal__day-body--claimed-only" +
            (featured ? " daily-login-modal__day-body--featured" : "")
          }
        >
          <span
            className="daily-login-modal__day-check-mark daily-login-modal__day-check-mark--pop"
            aria-hidden
          >
            <Check strokeWidth={3} />
          </span>
        </div>
      ) : (
        <div
          className={
            "daily-login-modal__day-body" +
            (featured ? " daily-login-modal__day-body--featured" : "")
          }
        >
          {featured && gcReward && scReward ? (
            <>
              <div className="daily-login-modal__featured-side">
                <RewardRow
                  wallet="GC"
                  itemID={gcReward.itemID}
                  itemAmount={gcReward.itemAmount}
                />
                <div className="daily-login-modal__day-art-wrap">
                  <img
                    className="daily-login-modal__day-art"
                    src={dailyBonusDayArtSrc(day.dayNumber, "gc")}
                    alt=""
                    decoding="async"
                  />
                </div>
              </div>
              <span className="daily-login-modal__featured-plus" aria-hidden>
                +
              </span>
              <div className="daily-login-modal__featured-side">
                <RewardRow
                  wallet="SC"
                  itemID={scReward.itemID}
                  itemAmount={scReward.itemAmount}
                />
                <div className="daily-login-modal__day-art-wrap">
                  <img
                    className="daily-login-modal__day-art"
                    src={dailyBonusDayArtSrc(day.dayNumber, "sc")}
                    alt=""
                    decoding="async"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className={
                  "daily-login-modal__day-rewards" +
                  (inlineRewardPlus
                    ? " daily-login-modal__day-rewards--inline"
                    : "")
                }
              >
                {inlineRewardPlus ? (
                  <>
                    <RewardRow
                      wallet="GC"
                      itemID={gcReward!.itemID}
                      itemAmount={gcReward!.itemAmount}
                    />
                    <span className="daily-login-modal__reward-plus" aria-hidden>
                      +
                    </span>
                    <RewardRow
                      wallet="SC"
                      itemID={scReward!.itemID}
                      itemAmount={scReward!.itemAmount}
                    />
                  </>
                ) : (
                  day.rewards.map((r, i) => (
                    <RewardRow
                      key={i}
                      wallet={r.wallet}
                      itemID={r.itemID}
                      itemAmount={r.itemAmount}
                    />
                  ))
                )}
              </div>
              <div className="daily-login-modal__day-art-wrap">
                <img
                  className="daily-login-modal__day-art"
                  src={dailyBonusDayArtSrc(day.dayNumber)}
                  alt=""
                  decoding="async"
                />
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function MilestoneRewardHint({
  reward,
  disabled,
  onClaimCredit,
}: {
  reward: CreditRewardViewModel;
  disabled?: boolean;
  onClaimCredit?: (threshold: number, rect: DOMRect) => void;
}) {
  const gcReward = reward.rewards.find((r) => r.wallet === "GC");
  const scReward = reward.rewards.find((r) => r.wallet === "SC");
  const inlineRewardPlus = gcReward && scReward;

  const hint = (
    <div className="daily-login-modal__milestone-hint">
      {reward.rewards.length > 0 ? (
        inlineRewardPlus ? (
          <>
            <RewardRow
              wallet="GC"
              itemID={gcReward!.itemID}
              itemAmount={gcReward!.itemAmount}
            />
            <span className="daily-login-modal__reward-plus" aria-hidden>
              +
            </span>
            <RewardRow
              wallet="SC"
              itemID={scReward!.itemID}
              itemAmount={scReward!.itemAmount}
            />
          </>
        ) : (
          reward.rewards.map((r, i) => (
            <RewardRow
              key={i}
              wallet={r.wallet}
              itemID={r.itemID}
              itemAmount={r.itemAmount}
            />
          ))
        )
      ) : (
        <span className="daily-login-modal__milestone-hint-empty">—</span>
      )}
      {reward.claimable && onClaimCredit && !disabled ? (
        <button
          type="button"
          className="daily-login-modal__milestone-hint-claim"
          onClick={(e) => {
            e.stopPropagation();
            onClaimCredit(
              reward.requiredCreditAmount,
              (e.currentTarget as HTMLElement).getBoundingClientRect(),
            );
          }}
        >
          Collect
        </button>
      ) : null}
    </div>
  );

  return (
    <InfoPopover
      content={hint}
      align="center"
      panelClassName="daily-login-modal__milestone-popover"
    >
      {(triggerProps, triggerRef) => (
        <button
          ref={triggerRef}
          className="daily-login-modal__milestone-hit"
          aria-label={`Rewards at day ${reward.requiredCreditAmount}`}
          {...triggerProps}
        >
          {!reward.isCollected ? (
            <span className="daily-login-modal__milestone-lock-top" aria-hidden>
              <Lock className="daily-login-modal__milestone-lock" size={12} />
            </span>
          ) : (
            <span className="daily-login-modal__milestone-lock-top" aria-hidden />
          )}
          <Gift className="daily-login-modal__milestone-gift" aria-hidden size={16} />
          <span className="daily-login-modal__milestone-node">
            {reward.isCollected ? (
              <Check className="daily-login-modal__milestone-check" size={12} />
            ) : (
              <span className="daily-login-modal__milestone-day">
                {reward.requiredCreditAmount}
              </span>
            )}
          </span>
        </button>
      )}
    </InfoPopover>
  );
}

function ProgressMilestone({
  reward,
  index,
  achievedCreditAmount,
  maxRequired,
  disabled,
  onClaimCredit,
}: {
  reward: CreditRewardViewModel;
  index: number;
  achievedCreditAmount: number;
  maxRequired: number;
  disabled?: boolean;
  onClaimCredit?: (threshold: number, rect: DOMRect) => void;
}) {
  const reached = achievedCreditAmount >= reward.requiredCreditAmount;
  const positionStyle = scaledAxisPositionStyle(
    reward.requiredCreditAmount,
    maxRequired,
    "x",
  );
  const clickable = reward.claimable && !disabled;

  return (
    <li
      className={
        "daily-login-modal__milestone" +
        ` daily-login-modal__milestone--tone-${index % 4}` +
        (reward.isCollected ? " daily-login-modal__milestone--collected" : "") +
        (reward.claimable ? " daily-login-modal__milestone--claimable" : "") +
        (reached && !reward.isCollected
          ? " daily-login-modal__milestone--reached"
          : "") +
        (clickable ? " daily-login-modal__milestone--claimable-glow" : "")
      }
      style={positionStyle}
    >
      <MilestoneRewardHint
        reward={reward}
        disabled={disabled}
        onClaimCredit={onClaimCredit}
      />
    </li>
  );
}

export function DailyLoginModal({ open }: Props) {
  const titleId = useId();
  const [flyFromRect, setFlyFromRect] = useState<DOMRect | null>(null);
  const [claimingDayNumber, setClaimingDayNumber] = useState<number | null>(
    null,
  );
  const {
    viewModel,
    loading,
    error,
    claiming,
    flying,
    claimDay,
    claimCreditReward,
    onFlyComplete,
    handlePrimaryAction,
  } = useDailyLoginActivity();

  const handleClose = useCallback(() => {
    handlePrimaryAction();
  }, [handlePrimaryAction]);

  const handleClaimDay = useCallback(
    (day: DayViewModel, rect: DOMRect) => {
      if (claiming || flying || !isDayCollectable(day)) return;
      setClaimingDayNumber(day.dayNumber);
      setFlyFromRect(rect);
      void claimDay(day, rect).finally(() => setClaimingDayNumber(null));
    },
    [claimDay, claiming, flying],
  );

  const handleClaimCredit = useCallback(
    (threshold: number, rect: DOMRect) => {
      if (claiming || flying) return;
      setFlyFromRect(rect);
      void claimCreditReward(threshold, rect);
    },
    [claimCreditReward, claiming, flying],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const weekDays = viewModel?.days ?? [];
  const regularDays = weekDays.slice(0, 6);
  const day7 = weekDays[6] ?? null;
  const progressFillPct = viewModel
    ? Math.min(
        100,
        (viewModel.achievedCreditAmount / CREDIT_MILESTONE_MAX) * 100,
      )
    : 0;
  const interactionDisabled = claiming || flying;
  const primaryActionLabel = "Close daily bonus";

  return createPortal(
    <>
      <div
        className="daily-login-overlay"
        role="presentation"
        aria-hidden={flying}
      >
        <button
          type="button"
          className="daily-login-overlay__tap-zone"
          aria-label={primaryActionLabel}
          onClick={() => handlePrimaryAction()}
          disabled={interactionDisabled}
        />

        <div
          className="daily-login-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header className="daily-login-modal__header">
            <h2 id={titleId} className="daily-login-modal__title">
              DAILY BONUS
            </h2>
            {viewModel?.dateRangeLabel ? (
              <p className="daily-login-modal__range">{viewModel.dateRangeLabel}</p>
            ) : null}
          </header>

          {loading && !viewModel ? (
            <p className="daily-login-modal__status" role="status">
              Loading…
            </p>
          ) : null}

          {error ? (
            <p
              className="daily-login-modal__status daily-login-modal__status--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {viewModel ? (
            <>
              {viewModel.creditRewards.length > 0 ? (
                <div className="daily-login-modal__progress">
                  <ol className="daily-login-modal__milestones">
                    {viewModel.creditRewards.map((r, i) => (
                      <ProgressMilestone
                        key={r.requiredCreditAmount}
                        reward={r}
                        index={i}
                        achievedCreditAmount={viewModel.achievedCreditAmount}
                        maxRequired={CREDIT_MILESTONE_MAX}
                        disabled={interactionDisabled}
                        onClaimCredit={handleClaimCredit}
                      />
                    ))}
                  </ol>
                  <div className="daily-login-modal__progress-track">
                    <div
                      className="daily-login-modal__progress-fill"
                      style={{ width: `${progressFillPct}%` }}
                    />
                    <span className="daily-login-modal__progress-thumb">
                      {viewModel.achievedCreditAmount}
                    </span>
                  </div>
                </div>
              ) : null}

              <ul className="daily-login-modal__grid">
                {regularDays.map((day) => (
                  <DayCell
                    key={day.dayNumber}
                    day={day}
                    claiming={claimingDayNumber === day.dayNumber}
                    disabled={interactionDisabled}
                    onClaim={handleClaimDay}
                  />
                ))}
              </ul>

              <ul className="daily-login-modal__featured">
                {day7 ? (
                  <DayCell
                    day={day7}
                    featured
                    claiming={claimingDayNumber === day7.dayNumber}
                    disabled={interactionDisabled}
                    onClaim={handleClaimDay}
                  />
                ) : null}
              </ul>

              <footer className="daily-login-modal__footer">
                <p className="daily-login-modal__cta">
                  TAP TO COLLECT YOUR DAILY BONUS
                </p>
              </footer>
            </>
          ) : !loading ? (
            <p className="daily-login-modal__status" role="status">
              Daily login is not available right now.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="daily-login-overlay__close"
          aria-label={primaryActionLabel}
          onClick={handleClose}
          disabled={interactionDisabled}
        >
          <X aria-hidden strokeWidth={2.4} />
        </button>
      </div>

      <CoinFlyToBalance
        active={flying}
        fromRect={flyFromRect}
        onComplete={onFlyComplete}
      />
    </>,
    document.body,
  );
}
