import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAlert } from '../../components/alert/alertContext'
import { useAuthModals } from '../auth/authModalsContext'
import { isWsLobbyGamesEnabled } from '../../lib/env'
import { GATEWAY_API_GENERATE_AMOE_CODE } from '../../realtime/gatewayApi'
import { isGatewaySuccessCode } from '../../realtime/gatewayWire'
import { useGatewayLobby } from '../../realtime/useGatewayLobby'
import {
  classifyGenerateAmoeError,
  decodeGenerateAmoeCodeResponseBytes,
  formatSweepstakeCodeDigits,
} from '../../realtime/amoeLobbyWire'
import './AmoePostalCodeModal.css'

type Props = {
  open: boolean
  onClose: () => void
}

type GeneratePhase = 'idle' | 'generating' | 'success'

const SWEEPSTAKE_CODE_LENGTH = 10
const RATE_LIMIT_COOLDOWN_MS = 5_000

export function AmoePostalCodeModal({ open, onClose }: Props) {
  const { show } = useAlert()
  const { openLoginDirect } = useAuthModals()
  const { requestRef, gatewayRequestReady } = useGatewayLobby()
  const titleId = useId()

  const [phase, setPhase] = useState<GeneratePhase>('idle')
  const [digits, setDigits] = useState<string[]>([])
  const [cooldownActive, setCooldownActive] = useState(false)
  const cooldownTimerRef = useRef<number | null>(null)

  const wsOk = isWsLobbyGamesEnabled()

  const resetState = useCallback(() => {
    setPhase('idle')
    setDigits([])
    setCooldownActive(false)
    if (cooldownTimerRef.current != null) {
      window.clearTimeout(cooldownTimerRef.current)
      cooldownTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (open) return
    resetState()
  }, [open, resetState])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleGenerate = useCallback(async () => {
    if (phase === 'generating' || cooldownActive) return

    const req = requestRef.current
    if (!wsOk) {
      show('WebSocket is not available in this environment.', { variant: 'error' })
      return
    }
    if (!gatewayRequestReady || !req) {
      show('Connecting to server, please try again in a moment.', { variant: 'error' })
      return
    }

    setPhase('generating')
    try {
      const r = await req({
        type: GATEWAY_API_GENERATE_AMOE_CODE,
        data: new Uint8Array(0),
        debugLabel: 'GENERATE_AMOE_CODE',
      })

      const code = String(r.code ?? '')
      if (!isGatewaySuccessCode(code) || !(r.data instanceof Uint8Array)) {
        const errMsg = (r as { errMessage?: string }).errMessage?.trim()
        const kind = classifyGenerateAmoeError(code, errMsg)

        if (kind === 'profile_name') {
          show(
            errMsg ||
              'Please complete your full name before requesting a sweepstake code.',
            { variant: 'error' },
          )
          show('Update your full name in Profile to continue.', { variant: 'info' })
        } else if (kind === 'profile_email') {
          show(
            errMsg || 'Please set your email before requesting a sweepstake code.',
            { variant: 'error' },
          )
          show('Add your email in Profile to continue.', { variant: 'info' })
        } else if (kind === 'rate_limit') {
          show(
            errMsg ||
              "You're requesting too frequently. Please wait a while before requesting another sweepstake code.",
            { variant: 'error' },
          )
          setCooldownActive(true)
          if (cooldownTimerRef.current != null) {
            window.clearTimeout(cooldownTimerRef.current)
          }
          cooldownTimerRef.current = window.setTimeout(() => {
            setCooldownActive(false)
            cooldownTimerRef.current = null
          }, RATE_LIMIT_COOLDOWN_MS)
        } else if (kind === 'quota') {
          show(
            errMsg || "You've reached the sweepstake entry limit for this period.",
            { variant: 'error' },
          )
        } else if (kind === 'unauthorized') {
          show(errMsg || 'The request unauthorized.', { variant: 'error' })
          openLoginDirect()
        } else if (kind === 'server') {
          show(errMsg || 'Server occur error.', { variant: 'error' })
        } else {
          show(errMsg || 'Could not generate sweepstake code.', { variant: 'error' })
        }

        setPhase('idle')
        setDigits([])
        return
      }

      const decoded = decodeGenerateAmoeCodeResponseBytes(r.data)
      const codeStr = decoded.sweepstakeCode?.trim()
      if (!codeStr) {
        show('Could not generate sweepstake code.', { variant: 'error' })
        setPhase('idle')
        setDigits([])
        return
      }

      setDigits(formatSweepstakeCodeDigits(codeStr))
      setPhase('success')
    } catch {
      show('Could not generate sweepstake code.', { variant: 'error' })
      setPhase('idle')
      setDigits([])
    }
  }, [
    phase,
    cooldownActive,
    requestRef,
    wsOk,
    gatewayRequestReady,
    show,
    openLoginDirect,
  ])

  if (!open) return null

  const displaySlots = Array.from({ length: SWEEPSTAKE_CODE_LENGTH }, (_, i) => digits[i] ?? '')

  return createPortal(
    <div className="app-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-modal app-modal--scroll-y amoe-postal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal__header">
          <h2 id={titleId} className="app-modal__title amoe-postal-modal__title">
            Mail-In Request Code
          </h2>
          <button
            type="button"
            className="app-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <hr className="app-modal__rule app-modal__rule--flush" />

        <div className="amoe-postal-modal__body">
          <div className="amoe-postal-modal__code-row" aria-live="polite">
            {displaySlots.map((digit, index) => (
              <div key={index} className="amoe-postal-modal__digit-slot">
                <span className="amoe-postal-modal__digit">{digit}</span>
                <span className="amoe-postal-modal__digit-line" aria-hidden />
              </div>
            ))}
          </div>

          <p className="amoe-postal-modal__copy">
            Each Mail-In Request Code is a unique, one-time-use code generated for your LukLok
            Casino Player Account. Each Request Card must include a distinct Mail-In Request
            Code. For more details, please refer to the Alternative Mode of Entry and Mail-In
            Request Code sections of the{' '}
            <Link className="amoe-postal-modal__rules-link" to="/sweeps#how-to-enter">
              Sweepstakes Rules
            </Link>
            . If you need another Mail-In Request Code, please wait 24 hours before requesting
            again.
          </p>

          <div className="amoe-postal-modal__warning" role="note">
            <span className="amoe-postal-modal__warning-icon" aria-hidden>
              !
            </span>
            <p className="amoe-postal-modal__warning-text">
              <strong>Important:</strong> Please make sure the Mail-In Request Code written on
              your outer envelope and Request Card exactly matches the code displayed on screen.
              Each Mail-In Request Code may only be used once and is valid for 60 days after it
              is generated. Request Cards that do not comply with the Sweepstakes Rules may be
              disqualified.
            </p>
          </div>

          <button
            type="button"
            className="amoe-postal-modal__generate-btn"
            onClick={handleGenerate}
            disabled={phase === 'generating' || cooldownActive}
          >
            {phase === 'generating' ? 'Generating…' : 'Generate Code'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
