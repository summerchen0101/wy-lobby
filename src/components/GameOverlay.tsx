import { Home } from 'lucide-react'
import { useEffect, useRef } from 'react'
import {
  agentDebugLog,
  agentDebugUrlPreview,
} from '../debug/agentDebugIngest'
import { buildIframeAllow, postQuitToGameIframe } from '../lib/gameShell'
import { logPerfMemorySnapshot } from '../lib/gameShellTelemetry'
import './GameShellContext.css'

/** ms — brief delay so embedded Unity can run `Quit()` after shell postMessage before `about:blank`. */
const IFRAME_TEARDOWN_DELAY_MS = 120

type GameOverlayProps = {
  url: string
  widthPercent: number
  heightPercent: number
  isPayment: boolean
  onClose: () => void
}

export function GameOverlay({ url, isPayment, onClose }: GameOverlayProps) {
  const allow = buildIframeAllow(isPayment)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // #region agent log
    agentDebugLog({
      hypothesisId: 'A',
      location: 'GameOverlay.tsx:mount',
      message: 'overlay_mounted',
      data: { path: agentDebugUrlPreview(url), isPayment },
    })
    // #endregion
    return () => {
      // #region agent log
      agentDebugLog({
        hypothesisId: 'A',
        location: 'GameOverlay.tsx:unmount',
        message: 'overlay_unmount_cleanup_start',
        data: { path: agentDebugUrlPreview(url) },
      })
      // #endregion
    }
  }, [url, isPayment])

  /** Ask Unity to Quit (postMessage), then tear down iframe so WebGL can release sooner. */
  useEffect(() => {
    return () => {
      const el = iframeRef.current
      if (!el) return
      postQuitToGameIframe(el)
      window.setTimeout(() => {
        try {
          el.src = 'about:blank'
        } catch {
          /* ignore */
        }
        logPerfMemorySnapshot(
          '[game-shell][dev] heap after iframe_teardown (delayed)',
        )
      }, IFRAME_TEARDOWN_DELAY_MS)
    }
  }, [url])

  return (
    <div className="game-overlay" role="presentation">
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
      <iframe
        ref={iframeRef}
        className="game-overlay__frame"
        title={isPayment ? 'payment' : 'game'}
        src={url}
        referrerPolicy="strict-origin-when-cross-origin"
        allow={allow}
        onLoad={() => {
          // #region agent log
          agentDebugLog({
            hypothesisId: 'D',
            location: 'GameOverlay.tsx:iframe',
            message: 'iframe_load_event',
            data: { path: agentDebugUrlPreview(url) },
          })
          // #endregion
        }}
        onError={() => {
          // #region agent log
          agentDebugLog({
            hypothesisId: 'D',
            location: 'GameOverlay.tsx:iframe',
            message: 'iframe_error_ua',
            data: { path: agentDebugUrlPreview(url) },
          })
          // #endregion
        }}
      />
    </div>
  )
}
