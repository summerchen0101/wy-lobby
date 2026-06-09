type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Welcome Bonus → Newbie tutorial wiring.
 *
 * When the real Welcome Bonus modal finishes Claim (including any coin fly
 * animation), call {@link notifyWelcomeBonusClaimFinished}. Subscribers
 * (see `LandingPage.tsx`) open the tutorial if `tutorialStorage` reports it
 * is not completed yet.
 */

export function subscribeWelcomeBonusClaimFinished(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Call when the Welcome Bonus Claim action completes (after any coin fly animation).
 * Wire this from the real Welcome Bonus modal when it exists.
 */
export function notifyWelcomeBonusClaimFinished(): void {
  for (const l of listeners) {
    l();
  }
}

/** Semantic alias for production Welcome Bonus handlers — identical to {@link notifyWelcomeBonusClaimFinished}. */
export const onWelcomeBonusClaimFinished = notifyWelcomeBonusClaimFinished;
