export const INITIAL_DELAY_MS = 40;
export const PILE_ENTER_MS = 550;
export const PILE_STAGGER_MS = 280;
export const PILE_HOLD_MS = 400;
export const PILE_EXIT_MS = 450;
export const PILE_EXIT_STAGGER_MS = 220;

export function flyOriginRectFromPiles(
  gc: DOMRect | undefined,
  sc: DOMRect | undefined,
): DOMRect | null {
  if (!gc && !sc) return null;
  if (gc && !sc) return gc;
  if (!gc && sc) return sc;

  const gcCx = gc.left + gc.width / 2;
  const gcCy = gc.top + gc.height / 2;
  const scCx = sc.left + sc.width / 2;
  const scCy = sc.top + sc.height / 2;
  const cx = (gcCx + scCx) / 2;
  const cy = (gcCy + scCy) / 2;
  const width = Math.max(gc.width, sc.width);
  const height = Math.max(gc.height, sc.height);
  const left = cx - width / 2;
  const top = cy - height / 2;
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  } as DOMRect;
}

export function shopPurchaseRewardFlyDelayMs(showSc: boolean): number {
  const gcEnterAt = INITIAL_DELAY_MS;
  const scEnterAt = showSc ? gcEnterAt + PILE_STAGGER_MS : null;
  const lastEnterDoneAt = (scEnterAt ?? gcEnterAt) + PILE_ENTER_MS;
  const gcExitAt = lastEnterDoneAt + PILE_HOLD_MS;
  const scExitAt = showSc ? gcExitAt + PILE_EXIT_STAGGER_MS : null;
  const flyAt = (scExitAt ?? gcExitAt) + PILE_EXIT_MS;
  return flyAt;
}
