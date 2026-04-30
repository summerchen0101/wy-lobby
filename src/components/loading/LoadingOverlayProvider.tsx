import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { FullScreenLoadingOverlay } from './FullScreenLoadingOverlay'
import {
  LoadingOverlayContext,
  type BlockingLoadControls,
} from './loadingOverlayContext'

export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
  const [depth, setDepth] = useState(0)

  const startBlocking = useCallback(() => {
    setDepth((d) => d + 1)
  }, [])

  const endBlocking = useCallback(() => {
    setDepth((d) => Math.max(0, d - 1))
  }, [])

  const withBlocking = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      startBlocking()
      try {
        return await fn()
      } finally {
        endBlocking()
      }
    },
    [startBlocking, endBlocking],
  )

  const value = useMemo(
    (): BlockingLoadControls => ({
      startBlocking,
      endBlocking,
      withBlocking,
    }),
    [startBlocking, endBlocking, withBlocking],
  )

  return (
    <LoadingOverlayContext.Provider value={value}>
      {children}
      {depth > 0 ? <FullScreenLoadingOverlay /> : null}
    </LoadingOverlayContext.Provider>
  )
}
