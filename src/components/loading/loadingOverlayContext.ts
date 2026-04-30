import { createContext } from 'react'

export type BlockingLoadControls = {
  startBlocking: () => void
  endBlocking: () => void
  /** 執行 async 期間顯示遮罩 */
  withBlocking: <T>(fn: () => Promise<T>) => Promise<T>
}

export const LoadingOverlayContext = createContext<BlockingLoadControls | null>(
  null,
)
