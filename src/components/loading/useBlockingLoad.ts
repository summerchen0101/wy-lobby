import { useContext } from 'react'
import {
  LoadingOverlayContext,
  type BlockingLoadControls,
} from './loadingOverlayContext'

export function useBlockingLoad(): BlockingLoadControls {
  const ctx = useContext(LoadingOverlayContext)
  if (!ctx) {
    throw new Error('useBlockingLoad must be used within LoadingOverlayProvider')
  }
  return ctx
}
