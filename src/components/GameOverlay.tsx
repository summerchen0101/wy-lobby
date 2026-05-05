import { Home } from 'lucide-react'
import { useEffect, useRef } from 'react'
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
      />
    </div>
  )
}
