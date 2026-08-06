import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CoinFlyToBalance } from "../../components/CoinFlyToBalance";
import {
  SHOP_REWARD_GC_COIN_SRC,
  SHOP_REWARD_SC_COIN_SRC,
} from "./shopCoinPile";
import type { ShopPack } from "./types";
import {
  flyOriginRectFromPiles,
  INITIAL_DELAY_MS,
  PILE_ENTER_MS,
  PILE_EXIT_MS,
  PILE_EXIT_STAGGER_MS,
  PILE_HOLD_MS,
  PILE_STAGGER_MS,
} from "./shopPurchaseRewardAnimationHelpers";
import "./ShopPurchaseRewardAnimation.css";

type PilePhase = "hidden" | "enter" | "exit" | "done";

type Props = {
  pack: ShopPack;
  onComplete: () => void;
};

function pileClassName(phase: PilePhase): string {
  const base = "shop-reward-anim__pile";
  if (phase === "enter") return `${base} shop-reward-anim__pile--in`;
  if (phase === "exit") return `${base} shop-reward-anim__pile--out`;
  if (phase === "done") return `${base} shop-reward-anim__pile--done`;
  return base;
}

function coinRectFromPile(
  pileEl: HTMLDivElement | null | undefined,
): DOMRect | undefined {
  const img = pileEl?.querySelector("img.shop-reward-anim__coin-img");
  return img?.getBoundingClientRect();
}

export function ShopPurchaseRewardAnimation({ pack, onComplete }: Props) {
  const gcRef = useRef<HTMLDivElement | null>(null);
  const scRef = useRef<HTMLDivElement | null>(null);
  const gcFlyRectRef = useRef<DOMRect | null>(null);
  const scFlyRectRef = useRef<DOMRect | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [gcPhase, setGcPhase] = useState<PilePhase>("hidden");
  const [scPhase, setScPhase] = useState<PilePhase>("hidden");
  const [flying, setFlying] = useState(false);
  const [flyFromRect, setFlyFromRect] = useState<DOMRect | null>(null);
  const showSc = pack.bonusSc > 0;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers: number[] = [];
    const gcEnterAt = INITIAL_DELAY_MS;
    const scEnterAt = showSc ? gcEnterAt + PILE_STAGGER_MS : null;
    const lastEnterDoneAt = (scEnterAt ?? gcEnterAt) + PILE_ENTER_MS;
    const gcExitAt = lastEnterDoneAt + PILE_HOLD_MS;
    const scExitAt = showSc ? gcExitAt + PILE_EXIT_STAGGER_MS : null;
    const flyAt = (scExitAt ?? gcExitAt) + PILE_EXIT_MS;

    const resolveFlyRect = () =>
      flyOriginRectFromPiles(
        gcFlyRectRef.current ?? undefined,
        showSc ? scFlyRectRef.current ?? undefined : undefined,
      );

    timers.push(window.setTimeout(() => setGcPhase("enter"), gcEnterAt));

    if (showSc) {
      timers.push(window.setTimeout(() => setScPhase("enter"), scEnterAt!));
    }

    timers.push(
      window.setTimeout(() => {
        gcFlyRectRef.current = coinRectFromPile(gcRef.current) ?? null;
        setGcPhase("exit");
      }, gcExitAt),
    );

    if (showSc) {
      timers.push(
        window.setTimeout(() => {
          scFlyRectRef.current = coinRectFromPile(scRef.current) ?? null;
          setScPhase("exit");
        }, scExitAt!),
      );
    }

    timers.push(
      window.setTimeout(() => {
        setGcPhase("done");
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
  }, [showSc]);

  return createPortal(
    <>
      <div className="shop-reward-anim" role="presentation" aria-hidden>
        <div className="shop-reward-anim__piles">
          <div ref={gcRef} className={pileClassName(gcPhase)}>
            <img
              src={SHOP_REWARD_GC_COIN_SRC}
              alt=""
              className="shop-reward-anim__coin-img"
            />
            <p className="shop-reward-anim__amount">{pack.gcLabel}</p>
          </div>
          {showSc ? (
            <div ref={scRef} className={pileClassName(scPhase)}>
              <img
                src={SHOP_REWARD_SC_COIN_SRC}
                alt=""
                className="shop-reward-anim__coin-img"
              />
              <p className="shop-reward-anim__amount">{pack.bonusSc}</p>
            </div>
          ) : null}
        </div>
      </div>
      <CoinFlyToBalance
        active={flying && !!flyFromRect}
        fromRect={flyFromRect}
        onComplete={onComplete}
      />
    </>,
    document.body,
  );
}
