/**
 * DEV-only helpers to correlate lobby shell ↔ Gateway／Unity lifecycle with backend logs.
 */

type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit?: number
  }
}

export function logGameOverlayOpened(url: string): void {
  if (!import.meta.env.DEV) return
  const payload = {
    event: 'overlay_open',
    url,
    ts: Date.now(),
    iso: new Date().toISOString(),
  }
  console.info('[game-shell][dev]', payload)
}

export function logGameOverlayClosed(): void {
  if (!import.meta.env.DEV) return
  const payload = {
    event: 'overlay_close',
    ts: Date.now(),
    iso: new Date().toISOString(),
  }
  console.info('[game-shell][dev]', payload)
}

export function logGameOpenedNewTab(url: string): void {
  if (!import.meta.env.DEV) return
  console.info('[game-shell][dev]', {
    event: 'game_new_tab',
    url: url.trim(),
    ts: Date.now(),
    iso: new Date().toISOString(),
  })
}

/** Chrome exposes `performance.memory` when launched with `--enable-precise-memory-info` (optional). */
export function logPerfMemorySnapshot(label: string): void {
  if (!import.meta.env.DEV) return
  const m =
    typeof performance !== 'undefined'
      ? (performance as PerformanceWithMemory).memory
      : undefined
  if (!m) {
    console.info(`${label} (performance.memory unavailable — try Chrome with memory flag)`)
    return
  }
  console.info(label, {
    usedJSHeapMB: (m.usedJSHeapSize / 1048576).toFixed(2),
    totalJSHeapMB: (m.totalJSHeapSize / 1048576).toFixed(2),
  })
}
