const idleListeners = new Set<() => void>();

let activeCount = 0;

function notifyIdle(): void {
  if (activeCount > 0) return;
  for (const listener of idleListeners) {
    listener();
  }
}

/** 金幣堆／撒幣動效進行中（用於延後 VIP 等彈窗）。 */
export function isRewardCoinPileAnimationActive(): boolean {
  return activeCount > 0;
}

/** Mount 時呼叫；回傳的函式在 unmount 時呼叫。 */
export function beginRewardCoinPileAnimation(): () => void {
  activeCount += 1;
  return () => {
    activeCount = Math.max(0, activeCount - 1);
    notifyIdle();
  };
}

export function onRewardCoinPileAnimationIdle(listener: () => void): () => void {
  idleListeners.add(listener);
  return () => {
    idleListeners.delete(listener);
  };
}
