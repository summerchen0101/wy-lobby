const PENDING_KEY = "ffgt:beggar-envelope:pending-check";
const SHOWN_KEY = "ffgt:beggar-envelope:shown-amount";

export const BEGGAR_ENVELOPE_CHECK_EVENT = "ffgt:beggar-envelope:check";

export function markPendingBeggarEnvelopeCheck(): void {
  try {
    sessionStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new CustomEvent(BEGGAR_ENVELOPE_CHECK_EVENT));
}

export function consumePendingBeggarEnvelopeCheck(): boolean {
  try {
    const v = sessionStorage.getItem(PENDING_KEY);
    if (v !== "1") return false;
    sessionStorage.removeItem(PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isBeggarEnvelopeShown(amount: number): boolean {
  try {
    const raw = sessionStorage.getItem(SHOWN_KEY);
    if (!raw) return false;
    const n = Number(raw);
    return Number.isFinite(n) && n === amount;
  } catch {
    return false;
  }
}

export function markBeggarEnvelopeShown(amount: number): void {
  try {
    sessionStorage.setItem(SHOWN_KEY, String(amount));
  } catch {
    /* ignore */
  }
}

export function clearBeggarEnvelopeShownForTests(): void {
  try {
    sessionStorage.removeItem(SHOWN_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}
