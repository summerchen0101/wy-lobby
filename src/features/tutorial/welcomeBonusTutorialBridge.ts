type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Welcome Bonus → Newbie tutorial wiring.
 *
 * **Production:** when the real Welcome Bonus modal finishes Claim (including any
 * coin fly animation), call {@link notifyWelcomeBonusClaimFinished}. Subscribers
 * (see `LandingPage.tsx`) open the tutorial if `tutorialStorage` reports it is not completed yet.
 *
 * **Demo:** `WelcomeBonusDemoModal.tsx` exposes Claim when `import.meta.env.DEV` is true.
 */

/**
 * Subscribe to “Welcome Bonus claim finished” — demo Claim button and production
 * bonus flow should both invoke {@link notifyWelcomeBonusClaimFinished}.
 */
export function subscribeWelcomeBonusClaimFinished(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Call when the Welcome Bonus **Claim** action completes (after any coin fly animation).
 * Wire this from the real Welcome Bonus modal when it exists.
 *
 * Demo: {@link WelcomeBonusDemoModal} invokes this on Claim.
 */
export function notifyWelcomeBonusClaimFinished(): void {
  for (const l of listeners) {
    l();
  }
}

/** Semantic alias for production Welcome Bonus handlers — identical to {@link notifyWelcomeBonusClaimFinished}. */
export const onWelcomeBonusClaimFinished = notifyWelcomeBonusClaimFinished;
