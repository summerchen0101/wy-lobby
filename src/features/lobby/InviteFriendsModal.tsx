import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy } from 'lucide-react'
import { InfoPopover } from '../../components/InfoPopover'
import { useAlert } from '../../components/alert/alertContext'
import { buildReferralInviteUrl, isWsLobbyGamesEnabled } from '../../lib/env'
import { CURRENCY_ICON_GC, CURRENCY_ICON_SC } from '../../lib/currencyIcons'
import {
  GATEWAY_API_CLAIM_REFERRAL_REWARD,
  GATEWAY_API_GET_REFERRAL_INFO,
} from '../../realtime/gatewayApi'
import { isGatewaySuccessCode } from '../../realtime/gatewayWire'
import { useGatewayLobby } from '../../realtime/useGatewayLobby'
import { translateGatewayError } from '../../i18n/apiErrorMessage'
import {
  decodeClaimReferralRewardRespBytes,
  decodeGetReferralInfoRespBytes,
  formatClaimedReferralRewardsMessage,
  hasReferralRewardEntries,
  referralGcDisplayAmount,
  referralScDisplayAmount,
  type GetReferralInfoRespDecoded,
} from '../../realtime/referralLobbyWire'
import { InviteFriendsTermsModal } from '../legal/InviteFriendsTermsModal'
import { getWord } from '../../wordData/getWord'
import './InviteFriendsModal.css'

type Props = {
  open: boolean
  onClose: () => void
}

const CLAIM_REFERRAL_NO_REWARDS_INFO =
  'No rewards to claim yet. Your friend must complete registration successfully before you can receive referral rewards.'

const WS_WAIT_SLOW_MS = 16_000

type LoadPhase = 'idle' | 'ws_wait' | 'fetch' | 'ready'

function parseCnt(v: string | number | undefined): number {
  if (v === undefined || v === null) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(v.trim())
  return Number.isFinite(n) ? n : 0
}

/** Compact label for GC-style whole amounts (e.g. 400K). */
function formatCompactInt(n: number): string {
  if (n >= 1_000_000) {
    const x = n / 1_000_000
    const s = (Math.round(x * 10) / 10).toString()
    return `${s.replace(/\.0$/, '')}M`
  }
  if (n >= 1000) {
    const x = n / 1000
    const s = (Math.round(x * 10) / 10).toString()
    return `${s.replace(/\.0$/, '')}K`
  }
  return String(n)
}

export function InviteFriendsModal({ open, onClose }: Props) {
  const { show } = useAlert()
  const { requestRef, gatewayRequestReady, refreshLobbyGet } = useGatewayLobby()
  const titleId = useId()

  const [referralInfo, setReferralInfo] = useState<GetReferralInfoRespDecoded | null>(null)
  const [loadPhase, setLoadPhase] = useState<LoadPhase>('idle')
  const [wsConnectSlow, setWsConnectSlow] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)
  const [claiming, setClaiming] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  const wsOk = isWsLobbyGamesEnabled()

  const fetchReferralInfo = useCallback(
    async (options?: { quiet?: boolean }) => {
      const req = requestRef.current
      if (!req) return false
      try {
        const r = await req({
          type: GATEWAY_API_GET_REFERRAL_INFO,
          data: new Uint8Array(0),
          debugLabel: 'GET_REFERRAL_INFO',
        })
        if (!isGatewaySuccessCode(String(r.code ?? '')) || !(r.data instanceof Uint8Array)) {
          const errMsg = translateGatewayError(
            String(r.code ?? ''),
            (r as { errMessage?: string }).errMessage,
            'Could not load referral info',
          )
          if (!options?.quiet) {
            show(errMsg, { variant: 'error' })
          }
          setReferralInfo(null)
          return false
        }
        if (r.data.byteLength === 0) {
          setReferralInfo(null)
          return true
        }
        setReferralInfo(decodeGetReferralInfoRespBytes(r.data))
        return true
      } catch {
        if (!options?.quiet) {
          show('Could not load referral info', { variant: 'error' })
        }
        setReferralInfo(null)
        return false
      }
    },
    [requestRef, show],
  )

  useEffect(() => {
    if (open) return
    setReferralInfo(null)
    setLoadPhase('idle')
    setWsConnectSlow(false)
    setRetryNonce(0)
    setTermsOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!wsOk || gatewayRequestReady || loadPhase !== 'ws_wait') {
      return
    }
    const id = window.setTimeout(() => setWsConnectSlow(true), WS_WAIT_SLOW_MS)
    return () => window.clearTimeout(id)
  }, [open, wsOk, gatewayRequestReady, loadPhase, retryNonce])

  useEffect(() => {
    if (!open) return
    if (!wsOk) {
      setReferralInfo(null)
      setLoadPhase('ready')
      setWsConnectSlow(false)
      return
    }
    if (!gatewayRequestReady) {
      setLoadPhase('ws_wait')
      return
    }
    let cancelled = false
    setLoadPhase('fetch')
    setWsConnectSlow(false)
    void (async () => {
      try {
        await fetchReferralInfo()
      } finally {
        if (!cancelled) setLoadPhase('ready')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, wsOk, gatewayRequestReady, fetchReferralInfo, retryNonce])

  const onRetryLoad = useCallback(() => {
    setWsConnectSlow(false)
    setRetryNonce((n) => n + 1)
  }, [])

  const rewards = referralInfo?.referralInfo?.rewards
  const gcDisplay = referralGcDisplayAmount(rewards)
  const scDisplay = referralScDisplayAmount(rewards)
  const friendsRegistered = wsOk ? parseCnt(referralInfo?.registerReferredCnt) : 0
  const friendsQualified = wsOk ? parseCnt(referralInfo?.qualifiedReferredCnt) : 0

  const referralCode = referralInfo?.myReferrerCode?.value?.trim() ?? ''
  const referralUrl =
    wsOk && referralCode ? buildReferralInviteUrl(referralCode) : ''

  const gcLabel =
    wsOk && loadPhase === 'ready'
      ? gcDisplay !== null
        ? `${formatCompactInt(gcDisplay)} +`
        : '—'
      : '—'
  const scLabel =
    wsOk && loadPhase === 'ready' ? (scDisplay !== null ? String(scDisplay) : '—') : '—'

  const linkPillText =
    loadPhase === 'ws_wait' || (loadPhase === 'idle' && wsOk)
      ? 'Connecting…'
      : loadPhase === 'fetch'
        ? 'Loading referral…'
        : referralUrl.trim() || (wsOk ? 'Link unavailable' : referralUrl)

  const claimDisabled =
    claiming ||
    !wsOk ||
    !gatewayRequestReady ||
    loadPhase === 'ws_wait' ||
    loadPhase === 'fetch' ||
    (loadPhase === 'idle' && wsOk)

  const copyUrl = useCallback(() => {
    const url = referralUrl.trim()
    if (!url) {
      show('Link unavailable', { variant: 'error' })
      return
    }
    return navigator.clipboard
      .writeText(url)
      .then(() => {
        show(getWord(1503), { variant: 'success' })
      })
      .catch(() => {
        show('Could not copy link', { variant: 'error' })
      })
  }, [referralUrl, show])

  const onInvite = useCallback(() => {
    const url = referralUrl.trim()
    if (!url) {
      show('Link unavailable', { variant: 'error' })
      return
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator
        .share({ title: 'Join me', text: 'Play with my referral link', url })
        .catch((err) => {
          if (err instanceof Error && err.name === 'AbortError') return
          void copyUrl()
        })
      return
    }
    void copyUrl()
  }, [copyUrl, referralUrl, show])

  const onClaimRewards = useCallback(async () => {
    const req = requestRef.current
    if (!req || claiming || claimDisabled) return
    setClaiming(true)
    try {
      const r = await req({
        type: GATEWAY_API_CLAIM_REFERRAL_REWARD,
        data: new Uint8Array(0),
        debugLabel: 'CLAIM_REFERRAL_REWARD',
      })
      if (!isGatewaySuccessCode(String(r.code ?? '')) || !(r.data instanceof Uint8Array)) {
        const errMsg = translateGatewayError(
          String((r as { code?: string }).code ?? ''),
          (r as { errMessage?: string }).errMessage,
          'Could not claim rewards',
        )
        show(errMsg, { variant: 'error' })
        return
      }
      const { rewards: claimed } = decodeClaimReferralRewardRespBytes(r.data)
      if (hasReferralRewardEntries(claimed)) {
        show(formatClaimedReferralRewardsMessage(claimed), { variant: 'success' })
        await refreshLobbyGet()
        void fetchReferralInfo({ quiet: true })
      } else {
        show(CLAIM_REFERRAL_NO_REWARDS_INFO, { variant: 'info' })
      }
    } catch {
      show('Could not claim rewards', { variant: 'error' })
    } finally {
      setClaiming(false)
    }
  }, [
    requestRef,
    claiming,
    claimDisabled,
    show,
    refreshLobbyGet,
    fetchReferralInfo,
  ])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (termsOpen) {
        setTermsOpen(false)
        return
      }
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, termsOpen])

  if (!open) return null

  return createPortal(
    <>
    <div className="app-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-modal app-modal--scroll-y invite-friends-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal__header app-modal__header--with-start">
          <InfoPopover
            key={termsOpen ? 'terms-view' : 'info'}
            align="start"
            panelClassName="invite-friends-modal__info-popover-wrap"
            content={
              <p className="invite-friends-modal__qualified invite-friends-modal__qualified--popover">
                *Friends qualify by signing up with your referral link, purchasing Luklok Casino packages
                worth $14.99 in total and not with an existing account with STI group.{' '}
                <button
                  type="button"
                  className="invite-friends-modal__terms-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    setTermsOpen(true)
                  }}
                >
                  {getWord(212)}
                </button>
              </p>
            }
          >
            {(p, triggerRef) => (
              <button
                ref={triggerRef}
                {...p}
                className="invite-friends-modal__info"
                aria-label="What qualified means"
              >
                i
              </button>
            )}
          </InfoPopover>
          <h2 id={titleId} className="app-modal__title">
            INVITE FRIENDS
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
        <div className="invite-friends-modal__body">
          <p className="invite-friends-modal__reward-head">Invite Friends and Get</p>
          <div className="invite-friends-modal__reward-row">
            <img className="invite-friends-modal__coin" src={CURRENCY_ICON_GC} alt="" width={22} height={22} />
            <span>{gcLabel}</span>
            <img className="invite-friends-modal__coin" src={CURRENCY_ICON_SC} alt="" width={22} height={22} />
            <span>{scLabel}</span>
          </div>
          <p className="invite-friends-modal__reward-sub">For Each Friend that Qualified!</p>

          <div className="invite-friends-modal__stats" aria-live="polite">
            <span>Friends Registered : {friendsRegistered}</span>
            <span>Friends Qualified* : {friendsQualified}</span>
          </div>

          <p className="invite-friends-modal__link-label">Tap to copy your link</p>
          <div className="invite-friends-modal__link-row">
            <button
              type="button"
              className="invite-friends-modal__link-pill"
              onClick={copyUrl}
              aria-label="Copy referral link"
            >
              <span title={referralUrl || undefined}>{linkPillText}</span>
            </button>
            <button
              type="button"
              className="invite-friends-modal__copy"
              onClick={copyUrl}
              aria-label="Copy"
            >
              <Copy
                className="invite-friends-modal__copy-icon"
                strokeWidth={2.25}
                aria-hidden
              />
            </button>
          </div>
          {wsOk && loadPhase === 'ws_wait' && wsConnectSlow ? (
            <div className="invite-friends-modal__retry-wrap">
              <p className="invite-friends-modal__ws-slow">
                Connection is taking longer than usual. Check your network, then try again.
              </p>
              <button type="button" className="invite-friends-modal__retry" onClick={onRetryLoad}>
                Retry
              </button>
            </div>
          ) : null}

          <div className="invite-friends-modal__actions">
            <button type="button" className="invite-friends-modal__btn-invite" onClick={onInvite}>
              INVITE
            </button>
            <button
              type="button"
              className="invite-friends-modal__btn-claim"
              disabled={claimDisabled}
              onClick={() => void onClaimRewards()}
            >
              {claiming ? 'CLAIMING…' : 'CLAIM REWARDS'}
            </button>
          </div>

          <p className="invite-friends-modal__foot">*Qualified: Click on the yellow info button</p>
        </div>
      </div>
    </div>
    <InviteFriendsTermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>,
    document.body,
  )
}
