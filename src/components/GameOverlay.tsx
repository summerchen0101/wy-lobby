import { Home } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  agentDebugLog,
  agentDebugUrlPreview,
} from '../debug/agentDebugIngest'
import { useGameVisualViewport } from '../hooks/useGameVisualViewport'
import { buildIframeAllow, postQuitToGameIframe } from '../lib/gameShell'
import {
  dismissIosGameScrollHintPermanently,
  hasDismissedIosGameScrollHint,
  shouldUseIosGameViewportWorkarounds,
} from '../lib/iosGameFullscreen'
import { logPerfMemorySnapshot } from '../lib/gameShellTelemetry'
import './GameShellContext.css'

/** ms — brief delay so embedded Unity can run `Quit()` after shell postMessage before `about:blank`. */
const IFRAME_TEARDOWN_DELAY_MS = 120

/** iOS Safari 自動淡出提示後再卸載，需略長於 `--leaving` transition */
const IOS_HINT_LEAVE_MS = 480
const IOS_HINT_AUTO_LEAVE_MS = 11_500

type GameOverlayProps = {
  url: string
  widthPercent: number
  heightPercent: number
  isPayment: boolean
  onClose: () => void
}

export function GameOverlay({ url, isPayment, onClose }: GameOverlayProps) {
  const { t } = useTranslation('common')
  const allow = buildIframeAllow(isPayment)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const iosScrollEdgeLeftRef = useRef<HTMLDivElement>(null)
  const iosScrollEdgeRightRef = useRef<HTMLDivElement>(null)
  /** 取消 stale teardown（Strict Mode dev 會先 unmount 再 mount，未定時清空會誤設 about:blank） */
  const iframeTeardownTimerRef = useRef<number | undefined>(undefined)

  const iosWorkarounds = shouldUseIosGameViewportWorkarounds()
  useGameVisualViewport(rootRef, {
    adaptIosBottomGutter: iosWorkarounds,
    iosScrollEdgeLeftRef: iosWorkarounds ? iosScrollEdgeLeftRef : undefined,
    iosScrollEdgeRightRef: iosWorkarounds ? iosScrollEdgeRightRef : undefined,
    blurTargetRef: iosWorkarounds ? iframeRef : undefined,
  })

  useEffect(() => {
    const doc = document.documentElement
    if (!shouldUseIosGameViewportWorkarounds()) return
    doc.classList.add('game-fullscreen-host')
    document.body.classList.add('game-fullscreen-host')
    return () => {
      doc.classList.remove('game-fullscreen-host')
      document.body.classList.remove('game-fullscreen-host')
    }
  }, [])

  const initialIosHint =
    shouldUseIosGameViewportWorkarounds() && !hasDismissedIosGameScrollHint()

  const [iosHintOn, setIosHintOn] = useState(initialIosHint)
  const [iosHintLeaving, setIosHintLeaving] = useState(false)

  useEffect(() => {
    if (!iosHintOn || iosHintLeaving) return
    const tId = window.setTimeout(() => {
      setIosHintLeaving(true)
    }, IOS_HINT_AUTO_LEAVE_MS)
    return () => window.clearTimeout(tId)
  }, [iosHintOn, iosHintLeaving])

  useEffect(() => {
    if (!iosHintLeaving || !iosHintOn) return
    const tId = window.setTimeout(() => {
      setIosHintOn(false)
      setIosHintLeaving(false)
    }, IOS_HINT_LEAVE_MS)
    return () => window.clearTimeout(tId)
  }, [iosHintLeaving, iosHintOn])

  useEffect(() => {
    agentDebugLog({
      hypothesisId: 'A',
      location: 'GameOverlay.tsx:mount',
      message: 'overlay_mounted',
      data: { path: agentDebugUrlPreview(url), isPayment },
    })
    return () => {
      agentDebugLog({
        hypothesisId: 'A',
        location: 'GameOverlay.tsx:unmount',
        message: 'overlay_unmount_cleanup_start',
        data: { path: agentDebugUrlPreview(url) },
      })
    }
  }, [url, isPayment])

  /** Ask Unity to Quit (postMessage), then tear down iframe so WebGL can release sooner. */
  useEffect(() => {
    const prevTimer = iframeTeardownTimerRef.current
    if (prevTimer !== undefined) {
      window.clearTimeout(prevTimer)
      iframeTeardownTimerRef.current = undefined
    }

    const iframeEl = iframeRef.current

    return () => {
      if (!iframeEl) return
      postQuitToGameIframe(iframeEl)

      iframeTeardownTimerRef.current = window.setTimeout(() => {
        iframeTeardownTimerRef.current = undefined
        try {
          iframeEl.src = 'about:blank'
        } catch {
          /* ignore */
        }
        logPerfMemorySnapshot(
          '[game-shell][dev] heap after iframe_teardown (delayed)',
        )
      }, IFRAME_TEARDOWN_DELAY_MS)
    }
  }, [url])

  const dismissIosHint = () => {
    dismissIosGameScrollHintPermanently()
    setIosHintLeaving(true)
  }

  const iosScrollHostClass = iosWorkarounds
    ? 'game-overlay game-overlay--ios-scroll-host'
    : 'game-overlay'

  return (
    <div ref={rootRef} className={iosScrollHostClass} role="presentation">
      {iosWorkarounds ? (
        <>
          <div
            ref={iosScrollEdgeLeftRef}
            className="game-overlay__ios-scroll-edge game-overlay__ios-scroll-edge--left"
            aria-hidden
          />
          <div
            ref={iosScrollEdgeRightRef}
            className="game-overlay__ios-scroll-edge game-overlay__ios-scroll-edge--right"
            aria-hidden
          />
        </>
      ) : null}
      <button
        type="button"
        className="game-overlay__close"
        onClick={() => {
          postQuitToGameIframe(iframeRef.current)
          onClose()
        }}
        aria-label="Return to lobby"
      >
        <Home
          className="game-overlay__close-icon"
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {iosHintOn ? (
        <aside
          className={`game-overlay__ios-hint${iosHintLeaving ? ' game-overlay__ios-hint--leaving' : ''}`}
          role="note"
          aria-live="polite"
        >
          <p className="game-overlay__ios-hint-text">
            {t('gameIosScrollHint')}
          </p>
          <div className="game-overlay__ios-hint-actions">
            <button
              type="button"
              className="game-overlay__ios-hint-dismiss"
              onClick={dismissIosHint}
            >
              {t('gameIosScrollHintDismiss')}
            </button>
          </div>
        </aside>
      ) : null}
      <iframe
        ref={iframeRef}
        className="game-overlay__frame"
        title={isPayment ? 'payment' : 'game'}
        src={url}
        referrerPolicy="strict-origin-when-cross-origin"
        allow={allow}
        onLoad={() => {
          agentDebugLog({
            hypothesisId: 'D',
            location: 'GameOverlay.tsx:iframe',
            message: 'iframe_load_event',
            data: { path: agentDebugUrlPreview(url) },
          })
        }}
        onError={() => {
          agentDebugLog({
            hypothesisId: 'D',
            location: 'GameOverlay.tsx:iframe',
            message: 'iframe_error_ua',
            data: { path: agentDebugUrlPreview(url) },
          })
        }}
      />
    </div>
  )
}
