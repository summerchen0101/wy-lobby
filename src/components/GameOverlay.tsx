import { Home } from 'lucide-react'
import type { TransitionEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  agentDebugLog,
  agentDebugUrlPreview,
} from '../debug/agentDebugIngest'
import { useGameVisualViewport } from '../hooks/useGameVisualViewport'
import { playSwipeHintImageUrl } from '../lib/env'
import { buildIframeAllow, postQuitToGameIframe } from '../lib/gameShell'
import {
  GAME_OVERLAY_IOS_TOOLBAR_CONSUMER_RESET_EVENT,
  dismissIosGameScrollHintPermanently,
  hasDismissedIosGameScrollHint,
  shouldUseIosGameViewportWorkarounds,
} from '../lib/iosGameFullscreen'
import { logPerfMemorySnapshot } from '../lib/gameShellTelemetry'
import './GameShellContext.css'

/**
 * 轉向後多久內不採信「已全螢」的 debounce 截止時間（從 orientationchange 起算）。
 * 須 ≥ useGameVisualViewport 轉向 follow-up（~820ms），否則剛轉橫就會被誤判全螢、cover 約 1s 內消失。
 */
const ORIENTATION_POST_ROTATION_GRACE_MS = 1100

/** 連續視為全螢幕前的等待；濾掉 vv 抖動導致 cover 过早消失 */
const IOS_TOOLBAR_HIDDEN_DEBOUNCE_MS = 520

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
  const { pathname } = useLocation()
  const [layoutLandscape, setLayoutLandscape] = useState(
    () =>
      typeof window !== 'undefined' && window.innerWidth > window.innerHeight,
  )
  const isPlayRoute = pathname === '/play'
  const playSwipeHintConfiguredUrl = playSwipeHintImageUrl()
  /** 已設定 URL 且為 /play；實際顯示還需 playSwipeHintFeatureOn */
  const playSwipeHintConfigured =
    isPlayRoute && Boolean(playSwipeHintConfiguredUrl)
  /**
   * 生產環境僅真 iOS 分頁內需要上滑收合 chrome；本機 dev 允許任何 UA 預覽滿版圖。
   */
  const playSwipeHintFeatureOn =
    playSwipeHintConfigured &&
    (shouldUseIosGameViewportWorkarounds() || import.meta.env.DEV)
  const { t } = useTranslation('common')
  const allow = buildIframeAllow(isPayment)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const iosScrollEdgeLeftRef = useRef<HTMLDivElement>(null)
  const iosScrollEdgeRightRef = useRef<HTMLDivElement>(null)
  /** 取消 stale teardown（Strict Mode dev 會先 unmount 再 mount，未定時清空會誤設 about:blank） */
  const iframeTeardownTimerRef = useRef<number | undefined>(undefined)

  const iosWorkarounds = shouldUseIosGameViewportWorkarounds()
  /** 曾偵測到「網址列尚未收合」狀態；用以區分 Chrome 裝置模擬首幀即 full-vv 的情況（DEV 仍顯示示意圖） */
  const [iosToolbarChromeEverVisible, setIosToolbarChromeEverVisible] =
    useState(false)
  const [iosToolbarHidden, setIosToolbarHidden] = useState(false)
  /** 滿版 cover 仍掛在 DOM（含淡出中），供漸入漸出與 iframe suppress */
  const [swipeHintInDom, setSwipeHintInDom] = useState(false)
  const [swipeHintOpaque, setSwipeHintOpaque] = useState(false)
  /** 供 orientationchange 讀取「已確認」全螢幕，與滿版圖顯示邏輯一致 */
  const iosToolbarHiddenRef = useRef(false)
  /** `hidden:true` 延後套用，避免誤判瞬間關掉 cover */
  const toolbarHiddenConfirmTimerRef = useRef<number | undefined>(undefined)
  /** 上次 orientationchange 時間；轉向後短時間內拉長「採信全螢」延遲 */
  const lastOrientationAtRef = useRef(0)

  const onIosToolbarHiddenChange = useCallback((hidden: boolean) => {
    if (!hidden) {
      if (toolbarHiddenConfirmTimerRef.current !== undefined) {
        window.clearTimeout(toolbarHiddenConfirmTimerRef.current)
        toolbarHiddenConfirmTimerRef.current = undefined
      }
      iosToolbarHiddenRef.current = false
      setIosToolbarChromeEverVisible(true)
      setIosToolbarHidden(false)
      return
    }
    if (toolbarHiddenConfirmTimerRef.current !== undefined) return
    const sinceOrient = Date.now() - lastOrientationAtRef.current
    const graceRemain = Math.max(
      0,
      ORIENTATION_POST_ROTATION_GRACE_MS - sinceOrient,
    )
    const wait = IOS_TOOLBAR_HIDDEN_DEBOUNCE_MS + graceRemain
    toolbarHiddenConfirmTimerRef.current = window.setTimeout(() => {
      toolbarHiddenConfirmTimerRef.current = undefined
      iosToolbarHiddenRef.current = true
      setIosToolbarHidden(true)
    }, wait)
  }, [])

  useEffect(() => {
    return () => {
      if (toolbarHiddenConfirmTimerRef.current !== undefined) {
        window.clearTimeout(toolbarHiddenConfirmTimerRef.current)
        toolbarHiddenConfirmTimerRef.current = undefined
      }
    }
  }, [])

  useGameVisualViewport(rootRef, {
    adaptIosBottomGutter: iosWorkarounds,
    iosScrollEdgeLeftRef: iosWorkarounds ? iosScrollEdgeLeftRef : undefined,
    iosScrollEdgeRightRef: iosWorkarounds ? iosScrollEdgeRightRef : undefined,
    blurTargetRef: iosWorkarounds ? iframeRef : undefined,
    onIosToolbarHiddenChange: iosWorkarounds
      ? onIosToolbarHiddenChange
      : undefined,
  })

  useEffect(() => {
    const syncLayout = () => {
      setLayoutLandscape(window.innerWidth > window.innerHeight)
    }
    syncLayout()
    window.addEventListener('resize', syncLayout)
    window.addEventListener('orientationchange', syncLayout)
    return () => {
      window.removeEventListener('resize', syncLayout)
      window.removeEventListener('orientationchange', syncLayout)
    }
  }, [])

  useEffect(() => {
    if (!iosWorkarounds) return
    const onOrientationChange = () => {
      lastOrientationAtRef.current = Date.now()
      /*
       * 轉向後 Safari 經常重新排版網址列（尤其直向），舊的 hidden 狀態不可沿用；
       * 先取消「全螢幕」判定與 debounce，否則橫屏全螢 → 轉直後非全螢仍不顯示 cover。
       */
      if (toolbarHiddenConfirmTimerRef.current !== undefined) {
        window.clearTimeout(toolbarHiddenConfirmTimerRef.current)
        toolbarHiddenConfirmTimerRef.current = undefined
      }
      iosToolbarHiddenRef.current = false
      setIosToolbarHidden(false)
      window.dispatchEvent(new Event(GAME_OVERLAY_IOS_TOOLBAR_CONSUMER_RESET_EVENT))
    }
    window.addEventListener('orientationchange', onOrientationChange)
    return () => {
      window.removeEventListener('orientationchange', onOrientationChange)
    }
  }, [iosWorkarounds])

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

  const handleHomeClick = () => {
    postQuitToGameIframe(iframeRef.current)
    onClose()
  }

  const showPlaySwipeHintImage =
    playSwipeHintFeatureOn &&
    Boolean(playSwipeHintConfiguredUrl) &&
    layoutLandscape &&
    ((!iosWorkarounds && import.meta.env.DEV) ||
      (iosWorkarounds &&
        (!iosToolbarHidden ||
          (import.meta.env.DEV && !iosToolbarChromeEverVisible))))

  useEffect(() => {
    if (!playSwipeHintConfiguredUrl) {
      setSwipeHintInDom(false)
      setSwipeHintOpaque(false)
      return
    }
    if (showPlaySwipeHintImage) {
      setSwipeHintInDom(true)
    } else {
      setSwipeHintOpaque(false)
    }
  }, [showPlaySwipeHintImage, playSwipeHintConfiguredUrl])

  useEffect(() => {
    if (!swipeHintInDom || !showPlaySwipeHintImage) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSwipeHintOpaque(true))
    })
    return () => cancelAnimationFrame(id)
  }, [swipeHintInDom, showPlaySwipeHintImage])

  const onSwipeHintTransitionEnd = (e: TransitionEvent<HTMLImageElement>) => {
    if (e.propertyName !== 'opacity') return
    if (!showPlaySwipeHintImage) setSwipeHintInDom(false)
  }

  /** 未實際完成 fade-in 就關閉時，opacity 未變可能不觸發 transitionend */
  useEffect(() => {
    if (showPlaySwipeHintImage || !swipeHintInDom) return
    const tid = window.setTimeout(() => {
      setSwipeHintInDom(false)
    }, 450)
    return () => window.clearTimeout(tid)
  }, [showPlaySwipeHintImage, swipeHintInDom])

  /** 直向不顯示滿版圖時仍用既有文字提示（與舊版 ios-hint 並存） */
  const showIosTextScrollHint =
    iosHintOn && (!playSwipeHintFeatureOn || !layoutLandscape)

  const swipeHintSuppressIframe =
    iosWorkarounds &&
    Boolean(playSwipeHintConfiguredUrl) &&
    layoutLandscape &&
    swipeHintInDom

  const overlayClassNames = [
    iosWorkarounds ? 'game-overlay game-overlay--ios-scroll-host' : 'game-overlay',
    swipeHintSuppressIframe ? 'game-overlay--swipe-hint-suppress-iframe' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={rootRef} className={overlayClassNames} role="presentation">
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
        onClick={handleHomeClick}
        aria-label="Return to lobby"
      >
        <Home
          className="game-overlay__close-icon"
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {swipeHintInDom && playSwipeHintConfiguredUrl ? (
        <img
          src={playSwipeHintConfiguredUrl}
          alt=""
          className={`game-overlay__play-swipe-hint${swipeHintOpaque ? ' game-overlay__play-swipe-hint--visible' : ''}`}
          aria-hidden
          onTransitionEnd={onSwipeHintTransitionEnd}
        />
      ) : null}
      {showIosTextScrollHint ? (
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
