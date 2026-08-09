import { useEffect, useId, useState, type AnimationEvent } from "react";
import "./LobbyWithdrawMarquee.css";

const HOLD_MS = 3200;

type AnimPhase = "in" | "hold" | "out";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

type Props = {
  messages: string[];
};

export function LobbyWithdrawMarquee({ messages }: Props) {
  const labelId = useId();
  const reduced = usePrefersReducedMotion();
  const n = messages.length;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<AnimPhase>("hold");

  useEffect(() => {
    if (n === 0) return;
    setIndex(0);
    setPhase(reduced || n === 1 ? "hold" : "in");
  }, [n, reduced]);

  useEffect(() => {
    if (phase !== "hold" || n <= 1 || reduced) return;
    const holdTimer = window.setTimeout(() => setPhase("out"), HOLD_MS);
    return () => window.clearTimeout(holdTimer);
  }, [phase, n, reduced]);

  const handleAnimationEnd = (e: AnimationEvent<HTMLParagraphElement>) => {
    if (e.target !== e.currentTarget) return;
    if (phase === "in") {
      setPhase("hold");
      return;
    }
    if (phase === "out") {
      setIndex((prev) => (prev + 1) % n);
      setPhase("in");
    }
  };

  if (n === 0) return null;

  const text = messages[index]!;

  return (
    <div
      className="lobby-withdraw-marquee"
      role="region"
      aria-labelledby={labelId}>
      <p id={labelId} className="lobby-withdraw-marquee__sr">
        Recent redemptions and prizes
      </p>
      <div className="lobby-withdraw-marquee__viewport" aria-hidden>
        <p
          key={index}
          className={`lobby-withdraw-marquee__line lobby-withdraw-marquee__line--${phase}`}
          onAnimationEnd={handleAnimationEnd}>
          {text}
        </p>
      </div>
    </div>
  );
}
