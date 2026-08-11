import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  REWARD_GC_COIN_SRC,
  REWARD_SC_COIN_SRC,
} from "../lib/rewardCoinPileAssets";
import { beginRewardCoinPileAnimation } from "../lib/rewardCoinPileAnimationGuard";
import { CoinFlyToBalance } from "./CoinFlyToBalance";
import {
  flyOriginRectFromPiles,
  INITIAL_DELAY_MS,
  PILE_ENTER_MS,
  PILE_EXIT_MS,
  PILE_EXIT_STAGGER_MS,
  PILE_HOLD_MS,
  PILE_STAGGER_MS,
} from "./rewardCoinPileAnimationHelpers";
import "./RewardCoinPileAnimation.css";

type PilePhase = "hidden" | "enter" | "exit" | "done";

export type RewardCoinPileLabels = {
  gcLabel?: string;
  scLabel?: string;
};

type Props = RewardCoinPileLabels & {
  onComplete: () => void;
  /** 疊在 VIP 升級彈窗之上。 */
  elevated?: boolean;
};

function pileClassName(phase: PilePhase): string {
  const base = "reward-coin-pile-anim__pile";
  if (phase === "enter") return `${base} reward-coin-pile-anim__pile--in`;
  if (phase === "exit") return `${base} reward-coin-pile-anim__pile--out`;
  if (phase === "done") return `${base} reward-coin-pile-anim__pile--done`;
  return base;
}

function coinRectFromPile(
  pileEl: HTMLDivElement | null | undefined,
): DOMRect | undefined {
  const img = pileEl?.querySelector("img.reward-coin-pile-anim__coin-img");
  return img?.getBoundingClientRect();
}

function hasPositiveRewardLabel(label: string | undefined): boolean {
  if (!label) return false;
  const normalized = label.trim().replace(/^\+/, "");
  if (!normalized || normalized === "0") return false;
  const n = Number(normalized.replace(/,/g, ""));
  if (Number.isFinite(n)) return n > 0;
  return true;
}

export function RewardCoinPileAnimation({
  gcLabel,
  scLabel,
  onComplete,
  elevated = false,
}: Props) {
  const gcRef = useRef<HTMLDivElement | null>(null);
  const scRef = useRef<HTMLDivElement | null>(null);
  const gcFlyRectRef = useRef<DOMRect | null>(null);
  const scFlyRectRef = useRef<DOMRect | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [gcPhase, setGcPhase] = useState<PilePhase>("hidden");
  const [scPhase, setScPhase] = useState<PilePhase>("hidden");
  const [flying, setFlying] = useState(false);
  const [flyFromRect, setFlyFromRect] = useState<DOMRect | null>(null);
  const showGc = hasPositiveRewardLabel(gcLabel);
  const showSc = hasPositiveRewardLabel(scLabel);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => beginRewardCoinPileAnimation(), []);

  useEffect(() => {
    const timers: number[] = [];
    const gcEnterAt = showGc ? INITIAL_DELAY_MS : null;
    const scEnterAt = showSc
      ? (gcEnterAt ?? 0) + (showGc ? PILE_STAGGER_MS : 0)
      : null;
    const lastEnterAt = Math.max(gcEnterAt ?? -1, scEnterAt ?? -1);
    if (lastEnterAt < 0) {
      onCompleteRef.current();
      return;
    }
    const lastEnterDoneAt = lastEnterAt + PILE_ENTER_MS;
    const gcExitAt = showGc ? lastEnterDoneAt + PILE_HOLD_MS : null;
    const scExitAt = showSc
      ? (gcExitAt ?? lastEnterDoneAt) +
        (showGc ? PILE_EXIT_STAGGER_MS : 0)
      : null;
    const flyAt = (scExitAt ?? gcExitAt ?? lastEnterDoneAt) + PILE_EXIT_MS;

    const resolveFlyRect = () =>
      flyOriginRectFromPiles(
        gcFlyRectRef.current ?? undefined,
        showSc ? scFlyRectRef.current ?? undefined : undefined,
      );

    if (gcEnterAt != null) {
      timers.push(window.setTimeout(() => setGcPhase("enter"), gcEnterAt));
    }
    if (scEnterAt != null) {
      timers.push(window.setTimeout(() => setScPhase("enter"), scEnterAt));
    }

    if (gcExitAt != null) {
      timers.push(
        window.setTimeout(() => {
          gcFlyRectRef.current = coinRectFromPile(gcRef.current) ?? null;
          setGcPhase("exit");
        }, gcExitAt),
      );
    }

    if (scExitAt != null) {
      timers.push(
        window.setTimeout(() => {
          scFlyRectRef.current = coinRectFromPile(scRef.current) ?? null;
          setScPhase("exit");
        }, scExitAt),
      );
    }

    timers.push(
      window.setTimeout(() => {
        if (showGc) setGcPhase("done");
        if (showSc) setScPhase("done");
      }, flyAt - 16),
    );

    timers.push(
      window.setTimeout(() => {
        const rect = resolveFlyRect();
        if (rect) {
          setFlyFromRect(rect);
          setFlying(true);
        } else {
          onCompleteRef.current();
        }
      }, flyAt),
    );

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [showGc, showSc]);

  return createPortal(
    <>
      <div
        className={
          "reward-coin-pile-anim" +
          (elevated ? " reward-coin-pile-anim--elevated" : "")
        }
        role="presentation"
        aria-hidden
      >
        <div className="reward-coin-pile-anim__piles">
          {showGc ? (
            <div ref={gcRef} className={pileClassName(gcPhase)}>
              <img
                src={REWARD_GC_COIN_SRC}
                alt=""
                className="reward-coin-pile-anim__coin-img"
              />
              <p className="reward-coin-pile-anim__amount">{gcLabel}</p>
            </div>
          ) : null}
          {showSc ? (
            <div ref={scRef} className={pileClassName(scPhase)}>
              <img
                src={REWARD_SC_COIN_SRC}
                alt=""
                className="reward-coin-pile-anim__coin-img"
              />
              <p className="reward-coin-pile-anim__amount">{scLabel}</p>
            </div>
          ) : null}
        </div>
      </div>
      <CoinFlyToBalance
        active={flying && !!flyFromRect}
        fromRect={flyFromRect}
        onComplete={onComplete}
        elevated={elevated}
      />
    </>,
    document.body,
  );
}
