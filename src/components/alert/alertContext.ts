import { createContext, useContext } from 'react'

export type AlertVariant = 'success' | 'error' | 'info'

export type ShowAlertOptions = {
  variant?: AlertVariant
  /** Default 3000. Non-positive values use the default. */
  durationMs?: number
}

export type ShowBlockingAlertOptions = {
  /** Runs after the user dismisses the dialog (native `alert` parity). */
  onConfirm?: () => void
}

export type AlertImperativeApi = {
  show: (message: string, options?: ShowAlertOptions) => void
  showBlockingAlert: (message: string, options?: ShowBlockingAlertOptions) => void
}

export type AlertContextValue = AlertImperativeApi

export const AlertContext = createContext<AlertContextValue | null>(null)

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert must be used within AlertProvider')
  return ctx
}
