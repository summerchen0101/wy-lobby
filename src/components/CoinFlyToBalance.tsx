import { useEffect, useRef } from "react";
import { BEGGAR_ENVELOPE_FLY_COIN_URLS } from "../lib/beggarEnvelopeAssets";
import "./CoinFlyToBalance.css";

const COIN_COUNT = 12;
const DURATION_MS = 950;

type Point = { x: number; y: number };

type CoinMotion = {
  delay: number;
  angle: number;
  distance: number;
  spin: number;
  lift: number;
};

type Props = {
  active: boolean;
  fromRect: DOMRect | null;
  onComplete: () => void;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createCoinMotion(): CoinMotion {
  return {
    delay: randomBetween(0, 120),
    angle: randomBetween(-Math.PI * 0.92, -Math.PI * 0.08),
    distance: randomBetween(72, 168),
    spin: randomBetween(-220, 220),
    lift: randomBetween(18, 56),
  };
}

export function CoinFlyToBalance({ active, fromRect, onComplete }: Props) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active || !fromRect) return;

    const from: Point = {
      x: fromRect.left + fromRect.width / 2,
      y: fromRect.top + fromRect.height / 2,
    };

    const layer = document.createElement("div");
    layer.className = "coin-fly-layer";
    document.body.appendChild(layer);

    const coins: Array<{ el: HTMLImageElement; motion: CoinMotion }> = [];
    const startAt = performance.now();
    let completed = false;

    for (let i = 0; i < COIN_COUNT; i++) {
      const img = document.createElement("img");
      img.src =
        BEGGAR_ENVELOPE_FLY_COIN_URLS[i % BEGGAR_ENVELOPE_FLY_COIN_URLS.length];
      img.alt = "";
      img.className = "coin-fly-layer__coin";
      img.style.left = `${from.x}px`;
      img.style.top = `${from.y}px`;
      layer.appendChild(img);
      coins.push({ el: img, motion: createCoinMotion() });
    }

    let raf = 0;
    const tick = (now: number) => {
      if (completed) return;

      const elapsed = now - startAt;
      let allDone = true;

      for (const { el, motion } of coins) {
        const t = Math.min(1, Math.max(0, (elapsed - motion.delay) / DURATION_MS));
        if (t < 1) allDone = false;

        const eased = 1 - (1 - t) ** 2.4;
        const cx = from.x + Math.cos(motion.angle) * motion.distance * eased;
        const cy =
          from.y +
          Math.sin(motion.angle) * motion.distance * eased +
          motion.lift * eased * eased;
        const scale = 0.45 + eased * 0.55;
        const opacity = t < 0.1 ? t / 0.1 : t > 0.72 ? (1 - t) / 0.28 : 1;

        el.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${motion.spin * eased}deg)`;
        el.style.left = `${cx}px`;
        el.style.top = `${cy}px`;
        el.style.opacity = String(opacity);
      }

      if (!allDone) {
        raf = requestAnimationFrame(tick);
        return;
      }

      completed = true;
      layer.remove();
      onCompleteRef.current();
    };

    raf = requestAnimationFrame(tick);

    return () => {
      completed = true;
      cancelAnimationFrame(raf);
      layer.remove();
    };
  }, [active, fromRect]);

  return null;
}
