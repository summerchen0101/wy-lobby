import { useSyncExternalStore } from 'react'

function subscribeLandscape(onStoreChange: () => void) {
  const mq = window.matchMedia('(orientation: landscape)')
  mq.addEventListener('change', onStoreChange)
  window.addEventListener('resize', onStoreChange)
  return () => {
    mq.removeEventListener('change', onStoreChange)
    window.removeEventListener('resize', onStoreChange)
  }
}

function snapshotLandscape(): boolean {
  return window.matchMedia('(orientation: landscape)').matches
}

/** 目前是否為橫向（`orientation: landscape`，並監聽 resize 以涵蓋延遲更新的裝置）。 */
export function useLandscapeOrientation(): boolean {
  return useSyncExternalStore(
    subscribeLandscape,
    snapshotLandscape,
    () => false,
  )
}
