import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { GameOverlay } from '../../components/GameOverlay'
import '../../components/GameShellContext.css'
import {
  exitDocumentFullscreen,
  isFullscreenActive,
  requestDocumentFullscreen,
} from '../../lib/fullscreen'
import {
  clearGamePopoutUrlByKey,
  parseSafeHttpGameUrl,
  readGamePopoutUrlByKey,
} from '../../lib/gameShell'
import { GAME_SHELL_POPOUT_CLOSED_TYPE } from '../../lib/gameShellMessages'
import {
  logGameOverlayClosed,
  logPerfMemorySnapshot,
} from '../../lib/gameShellTelemetry'

export function GamePopoutPage() {
  const [params] = useSearchParams()
  const k = params.get('k')?.trim()
  const rawUrlParam = params.get('url')?.trim()

  const [showFullscreenCta, setShowFullscreenCta] = useState(false)
  const autoFullscreenDoneRef = useRef(false)

  const frameUrl = useMemo(() => {
    if (k) return readGamePopoutUrlByKey(k)
    if (rawUrlParam) return parseSafeHttpGameUrl(rawUrlParam)
    return null
  }, [k, rawUrlParam])

  useEffect(() => {
    if (!frameUrl) return
    let cancelled = false
    // iOS Safari often won't honor documentElement fullscreen; the game iframe may still use its own fullscreen via allow="fullscreen".
    void requestDocumentFullscreen()
      .catch(() => {})
      .finally(() => {
        if (cancelled) return
        autoFullscreenDoneRef.current = true
        if (!isFullscreenActive()) setShowFullscreenCta(true)
      })
    return () => {
      cancelled = true
    }
  }, [frameUrl])

  useEffect(() => {
    if (!frameUrl) return
    const sync = () => {
      if (isFullscreenActive()) setShowFullscreenCta(false)
      else if (autoFullscreenDoneRef.current) setShowFullscreenCta(true)
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    document.addEventListener('mozfullscreenchange', sync)
    document.addEventListener('MSFullscreenChange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
      document.removeEventListener('mozfullscreenchange', sync)
      document.removeEventListener('MSFullscreenChange', sync)
    }
  }, [frameUrl])

  const handleClose = useCallback(async () => {
    try {
      await exitDocumentFullscreen()
    } catch {
      /* ignore */
    }
    if (k) clearGamePopoutUrlByKey(k)
    logGameOverlayClosed()
    logPerfMemorySnapshot('[game-shell][dev] heap on popout_close')
    try {
      window.opener?.postMessage(
        { type: GAME_SHELL_POPOUT_CLOSED_TYPE },
        window.location.origin,
      )
    } catch {
      /* ignore */
    }
    try {
      window.opener?.focus()
    } catch {
      /* ignore */
    }
    window.close()
    window.setTimeout(() => {
      window.location.replace('/')
    }, 0)
  }, [k])

  const onEnterFullscreenClick = useCallback(() => {
    void requestDocumentFullscreen().then(
      () => setShowFullscreenCta(false),
      () => {},
    )
  }, [])

  if (!frameUrl) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      {showFullscreenCta ? (
        <div
          className="game-popout-fullscreen-cta"
          role="region"
          aria-label="Fullscreen prompt"
        >
          <button
            type="button"
            className="game-popout-fullscreen-cta__btn"
            onClick={onEnterFullscreenClick}
          >
            Enter fullscreen
          </button>
        </div>
      ) : null}
      <GameOverlay
        key={frameUrl}
        url={frameUrl}
        widthPercent={100}
        heightPercent={100}
        isPayment={false}
        onClose={handleClose}
      />
    </>
  )
}
