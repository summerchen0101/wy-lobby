import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertContext,
  type AlertImperativeApi,
  type AlertVariant,
  type ShowAlertOptions,
  type ShowBlockingAlertOptions,
} from './alertContext'
import { registerAlertImperativeApi } from './alertImperative'
import './AlertProvider.css'

const DEFAULT_DURATION_MS = 3000

type ToastState = {
  message: string
  variant: AlertVariant
} | null

function AlertToast({ message, variant }: { message: string; variant: AlertVariant }) {
  const isError = variant === 'error'
  return (
    <div
      className={'global-alert' + (isError ? ' global-alert--error' : ' global-alert--' + variant)}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {message}
    </div>
  )
}

function BlockingAlertModal({
  message,
  onConfirm,
}: {
  message: string
  onConfirm: () => void
}) {
  return (
    <div className="app-modal-overlay alert-blocking-overlay" role="presentation">
      <div
        className="app-modal alert-blocking-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-blocking-title"
        aria-describedby="alert-blocking-desc"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="app-modal__body alert-blocking-modal__body">
          <h2 id="alert-blocking-title" className="alert-blocking__sr-only">
            Notice
          </h2>
          <p id="alert-blocking-desc" className="alert-blocking-modal__message">
            {message}
          </p>
          <div className="alert-blocking-modal__actions">
            <button type="button" className="alert-blocking-modal__ok" onClick={onConfirm}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Registers `getAlertApi()` before sibling layout effects (e.g. gateway WS). */
function AlertImperativeMount({ api }: { api: AlertImperativeApi }) {
  useLayoutEffect(() => {
    registerAlertImperativeApi(api)
    return () => registerAlertImperativeApi(null)
  }, [api])
  return null
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>(null)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [blockingMessage, setBlockingMessage] = useState<string | null>(null)
  const blockingConfirmRef = useRef<(() => void) | undefined>(undefined)

  const show = useCallback((message: string, options?: ShowAlertOptions) => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
    const variant: AlertVariant = options?.variant ?? 'info'
    const requested = options?.durationMs ?? DEFAULT_DURATION_MS
    const duration = requested > 0 ? requested : DEFAULT_DURATION_MS
    setState({ message, variant })
    clearTimerRef.current = setTimeout(() => {
      clearTimerRef.current = null
      setState(null)
    }, duration)
  }, [])

  const showBlockingAlert = useCallback(
    (message: string, options?: ShowBlockingAlertOptions) => {
      blockingConfirmRef.current = options?.onConfirm
      setBlockingMessage(message)
    },
    [],
  )

  const confirmBlockingAlert = useCallback(() => {
    const fn = blockingConfirmRef.current
    blockingConfirmRef.current = undefined
    setBlockingMessage(null)
    fn?.()
  }, [])

  const imperativeApi = useMemo(
    (): AlertImperativeApi => ({
      show,
      showBlockingAlert,
    }),
    [show, showBlockingAlert],
  )

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current)
      }
    }
  }, [])

  const value = imperativeApi

  const toast =
    state &&
    createPortal(
      <div className="global-alert-portal" role="presentation">
        <AlertToast message={state.message} variant={state.variant} />
      </div>,
      document.body,
    )

  const blocking =
    blockingMessage &&
    createPortal(
      <BlockingAlertModal message={blockingMessage} onConfirm={confirmBlockingAlert} />,
      document.body,
    )

  return (
    <AlertContext.Provider value={value}>
      <AlertImperativeMount api={imperativeApi} />
      {children}
      {toast}
      {blocking}
    </AlertContext.Provider>
  )
}
