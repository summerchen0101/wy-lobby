import {
  useEffect,
  type RefObject,
} from 'react'
import { GAME_OVERLAY_IOS_TOOLBAR_CONSUMER_RESET_EVENT } from '../lib/iosGameFullscreen'

export type UseGameVisualViewportOpts = {
  /**
   * 將 visualViewport 映射為 iframe 的 --game-visible-* / --game-vv-* CSS 變數。
   * 僅 iPhone Safari 需要；Android／桌面應關閉，改由 CSS 100% 滿版，避免 Unity canvas 鎖在小尺寸。
   */
  applyLayoutFromVisualViewport?: boolean
  /**
   * iOS Safari：偵測網址列／工具列已收合時把 --game-ios-bottom-gutter 設為 0px，
   * 解除捲動帶佔高；收起前交還給 CSS clamp。
   * 啟用時一併套用與 ios-fullscreen-sample fsm.js 對齊的 vv baseline、轉向同步與 scroll nudge。
   */
  adaptIosBottomGutter?: boolean
  /** 橫屏時可上滑觸發 window.scrollTo 的左／右邊緣命中區（僅在 adaptIosBottomGutter 時註冊） */
  iosScrollEdgeLeftRef?: RefObject<HTMLElement | null>
  iosScrollEdgeRightRef?: RefObject<HTMLElement | null>
  /** scroll nudge 前對遊戲 iframe blur，避免焦點留在子 frame 時宿主捲動失效（僅 adaptIosBottomGutter） */
  blurTargetRef?: RefObject<HTMLIFrameElement | null>
  /**
   * `/play` 橫屏顯示上滑示意時為 true：略過轉向後自動 scroll nudge，且在 SWIPE_HINT_VV_GATE_MS 內
   * 不採信 vv 高度判「網址列已收合」（避免 follow-up sync 誤報 true、cover ~1s 消失）；邊緣上滑／nudge 後解除。
   */
  suppressAutoChromeNudgeRef?: RefObject<boolean>
  /**
   * iOS Safari：網址列／工具列收合狀態變更時回報（僅在 adaptIosBottomGutter 為 true 時有效）。
   * 初次 apply 也會回報目前值。
   */
  onIosToolbarHiddenChange?: (toolbarHidden: boolean) => void
}

/** 略長於 fsm 400ms，讓 iframe 暫停命中覆蓋整段 nudge */
const HIDE_CHROME_NUDGE_MS = 450

/** 收合 Safari UI 所需的父文件捲動幅度；過大易造成體感跳動 */
const HIDE_CHROME_SCROLL_NUDGE_PX = 120

/** vv.offsetTop／offsetLeft 細幅抖動時略過 CSS 更新，降低 iframe 視覺顫動 */
const VV_OFFSET_APPLY_EPS_PX = 2

function isLandscapeLayout(): boolean {
  return window.innerWidth > window.innerHeight
}

/**
 * `/play` 橫屏滿版示意啟用時：僅在轉向／consumer reset 後開啟；此時間內不採信 vv「已全螢」高度
 *（仍會跑 layout／CSS），須覆蓋 follow-up sync（480/700/820ms）+ GameOverlay debounce。
 */
const SWIPE_HINT_VV_GATE_MS = 3200

/**
 * Gate 開啟後多久起，若 vv 已達「網址列收合」閾值則視為使用者手勢而非 follow-up 假陽性、結束 gate。
 * 須 ≥ 820ms（最後一次 orientation follow-up）。
 */
const SWIPE_HINT_VV_GATE_TRUST_USER_FULLSCREEN_MS = 880

/** 橫屏：vv 高度接近 layout 短邊視為網址列已收合；過緊時首趟上滑全螢仍低於閾值、hook 不報 hidden、cover 卡住 */
const IOS_LANDSCAPE_TOOLBAR_HIDDEN_VV_SLACK_PX = 52

/**
 * `/play` 橫屏滿版示意（suppress nudge）時：Safari 首幀／layout 穩定前 vv 常短暫達「全高」→ 誤判 hidden、cover ~1s 內消失。
 * 需連續多幀皆為 hidden 才採信；邊緣 nudge 已 unlock 時改回即時採信。
 */
const SWIPE_HINT_TOOLBAR_HIDDEN_STREAK_REQUIRED = 8

function toolbarHiddenFromVvHeight(hRound: number): boolean {
  if (isLandscapeLayout()) {
    const shortSide = Math.min(window.innerWidth, window.innerHeight)
    return hRound >= shortSide - IOS_LANDSCAPE_TOOLBAR_HIDDEN_VV_SLACK_PX
  }
  return hRound >= window.innerHeight - 80
}

/**
 * iOS WebKit：若 html/body 同時可捲或捲動落在 #root 內層，單用 window.scrollTo 常無法觸發主文件捲動、
 * 因而收合不了網址列。改寫 scrollingElement（並備援 body）以對齊「最外層」捲動。
 */
function setDocumentScrollTop(y: number): void {
  const se = document.scrollingElement ?? document.documentElement
  try {
    se.scrollTop = y
  } catch {
    /* ignore */
  }
  try {
    if (document.body && document.body !== se) {
      document.body.scrollTop = y
    }
  } catch {
    /* ignore */
  }
  window.scrollTo(0, y)
}

/**
 * 將 window.visualViewport 映射到元素上的 CSS 變數，供遊戲殼 iframe 對齊實際可視區（iOS Safari 重要）。
 * --game-visible-h, --game-visible-w, --game-vv-top, --game-vv-left
 */
export function useGameVisualViewport(
  targetRef: RefObject<HTMLElement | null>,
  opts?: UseGameVisualViewportOpts,
) {
  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    const applyLayout = opts?.applyLayoutFromVisualViewport ?? true
    const adaptGutter = opts?.adaptIosBottomGutter ?? false
    if (!applyLayout && !adaptGutter) {
      return
    }
    const edgeLeft = opts?.iosScrollEdgeLeftRef
    const edgeRight = opts?.iosScrollEdgeRightRef
    const blurTargetRef = opts?.blurTargetRef
    const suppressAutoChromeNudgeRef = opts?.suppressAutoChromeNudgeRef
    const onToolbarHiddenChange = opts?.onIosToolbarHiddenChange

    let baselineInitialized = false
    let isToolbarHidden = false
    let isRotating = false
    let isScrolling = false
    let hasTriggeredSwipe = false
    let swipeStartY = 0
    const nudgeTimers: number[] = []

    let lastAppliedH = -1
    let lastAppliedW = -1
    let lastAppliedTop = 0
    let lastAppliedLeft = 0
    let vvScrollRaf = 0
    let lastReportedToolbarHidden: boolean | null = null
    /** -1：未啟用 gate；>=0：在此之前強制「未全螢」（僅配合 suppress ref） */
    let swipeHintVvGateUntil = -1
    /** `armSwipeHintVvGateFromNow` 時刻；用於 gate 內晚於 follow-up 後採信使用者全螢 */
    let swipeHintVvGateStartedAt = 0
    /** 使用者已主動觸發 nudge／邊緣上滑，採信 vv */
    let swipeHintUnlockVvRead = false
    /**
     * `/play` 橫屏：連續幀 absHidden 累計；抑制 Safari 載入後短暫假全高。
     */
    let vvToolbarHiddenStreak = 0

    const armSwipeHintVvGateFromNow = () => {
      swipeHintVvGateStartedAt = Date.now()
      swipeHintVvGateUntil = Date.now() + SWIPE_HINT_VV_GATE_MS
    }

    const clearSwipeHintVvGate = () => {
      swipeHintVvGateUntil = -1
      swipeHintVvGateStartedAt = 0
    }

    const unlockSwipeHintVvRead = () => {
      swipeHintUnlockVvRead = true
      clearSwipeHintVvGate()
    }

    const toolbarHiddenForChrome = (hRound: number): boolean => {
      if (
        suppressAutoChromeNudgeRef?.current &&
        !swipeHintUnlockVvRead &&
        swipeHintVvGateUntil >= 0 &&
        Date.now() < swipeHintVvGateUntil
      ) {
        const sinceGate = Date.now() - swipeHintVvGateStartedAt
        if (
          swipeHintVvGateStartedAt > 0 &&
          sinceGate >= SWIPE_HINT_VV_GATE_TRUST_USER_FULLSCREEN_MS &&
          toolbarHiddenFromVvHeight(hRound)
        ) {
          unlockSwipeHintVvRead()
          return toolbarHiddenFromVvHeight(hRound)
        }
        return false
      }
      return toolbarHiddenFromVvHeight(hRound)
    }

    /**
     * 非 nudge-unlock 的 /play 橫屏：須連續多幀 vv 皆判定 hidden，避免首屏誤判讓 cover ~1s 內消失。
     */
    const stableToolbarHiddenForSwipeHint = (absHidden: boolean): boolean => {
      if (!suppressAutoChromeNudgeRef?.current) {
        vvToolbarHiddenStreak = 0
        return absHidden
      }
      if (swipeHintUnlockVvRead) {
        vvToolbarHiddenStreak = 0
        return absHidden
      }
      if (!absHidden) {
        vvToolbarHiddenStreak = 0
        return false
      }
      vvToolbarHiddenStreak += 1
      if (vvToolbarHiddenStreak > SWIPE_HINT_TOOLBAR_HIDDEN_STREAK_REQUIRED) {
        vvToolbarHiddenStreak = SWIPE_HINT_TOOLBAR_HIDDEN_STREAK_REQUIRED
      }
      return vvToolbarHiddenStreak >= SWIPE_HINT_TOOLBAR_HIDDEN_STREAK_REQUIRED
    }

    const notifyToolbarHiddenIfChanged = () => {
      if (!adaptGutter || !onToolbarHiddenChange) return
      if (lastReportedToolbarHidden === isToolbarHidden) return
      lastReportedToolbarHidden = isToolbarHidden
      onToolbarHiddenChange(isToolbarHidden)
    }

    const clear = () => {
      if (applyLayout) {
        el.style.removeProperty('--game-visible-h')
        el.style.removeProperty('--game-visible-w')
        el.style.removeProperty('--game-vv-top')
        el.style.removeProperty('--game-vv-left')
      }
      if (adaptGutter) el.style.removeProperty('--game-ios-bottom-gutter')
    }

    const applyGutterStyle = () => {
      if (!adaptGutter) return
      if (isToolbarHidden) {
        el.style.setProperty('--game-ios-bottom-gutter', '0px')
      } else {
        el.style.removeProperty('--game-ios-bottom-gutter')
      }
    }

    /**
     * 轉向後重算工具列是否收合。勿用 screen.width/height：旋轉瞬間常尚未換算，易誤判 isToolbarHidden，
     * 導致 gutter=0、邊緣手勢略過，滑動全螢幕永久失效。
     * 橫屏以 layout 短邊對齊 vv.height；直屏沿用 innerHeight 閾值。
     */
    const syncToolbarAfterOrientation = () => {
      const vv = window.visualViewport
      if (!vv) return
      const h = Math.round(vv.height)
      vvToolbarHiddenStreak = 0
      const absHidden = toolbarHiddenForChrome(h)
      isToolbarHidden = stableToolbarHiddenForSwipeHint(absHidden)
      baselineInitialized = true
      hasTriggeredSwipe = false
      /* GameOverlay 可能在轉向時單方面重設 UI；強制再送一次目前狀態，否則已全螢後無 edge 再次觸發 notify */
      lastReportedToolbarHidden = null
      notifyToolbarHiddenIfChanged()
    }

    const updateToolbarFromVvResize = (hRound: number) => {
      if (!adaptGutter || isRotating || isScrolling) return
      /**
       * 勿在此開啟 swipe-hint vv gate：首次橫屏載入時第一次 vv 就會鎖 3.2s，期間一般上滑收合網址列
       *（未走邊緣 nudge → 未 unlock）會讓 `toolbarHiddenForChrome` 恒為 false、滿版 cover 卡住。
       * 轉向後 gate 由 `applyOrientationFollowUps` 與 `onToolbarConsumerReset` 負責。
       */
      const absHidden = toolbarHiddenForChrome(hRound)
      const hiddenForState = stableToolbarHiddenForSwipeHint(absHidden)
      if (!baselineInitialized) {
        baselineInitialized = true
        isToolbarHidden = hiddenForState
        return
      }
      if (hiddenForState !== isToolbarHidden) {
        if (isToolbarHidden && !absHidden) {
          const activeEl = document.activeElement
          const isKeyboardOpen =
            activeEl instanceof HTMLElement &&
            (activeEl.tagName === 'INPUT' ||
              activeEl.tagName === 'TEXTAREA' ||
              activeEl.isContentEditable)
          if (isKeyboardOpen) {
            return
          }
        }
        isToolbarHidden = hiddenForState
        hasTriggeredSwipe = false
      }
    }

    /** sample tryHideBar：父文件捲動以促使 Safari 收合 UI */
    const runHideChromeScrollNudge = () => {
      if (!adaptGutter) return
      unlockSwipeHintVvRead()
      try {
        blurTargetRef?.current?.blur()
      } catch {
        /* ignore */
      }
      const ae = document.activeElement
      if (ae instanceof HTMLIFrameElement) {
        try {
          ae.blur()
        } catch {
          /* ignore */
        }
      }
      isScrolling = true
      el.classList.add('game-overlay--parent-scroll-nudge')
      setDocumentScrollTop(HIDE_CHROME_SCROLL_NUDGE_PX)
      const tid = window.setTimeout(() => {
        isScrolling = false
        el.classList.remove('game-overlay--parent-scroll-nudge')
        /**
         * iOS：nudge 結束當下 vv.height 常晚一兩幀才反映網址列收合；期間 isScrolling 又會讓
         * updateToolbarFromVvResize 略過，若單次 apply 讀到舊高度，diff 無法變 true，
         * React 永遠收不到 hidden（要等拉回再滑第二次才會出現高度落差）。先以絕對閾值重算並補幾拍重試。
         */
        const syncToolbarThenApply = () => {
          syncToolbarAfterOrientation()
          applyImmediate()
        }
        syncToolbarThenApply()
        requestAnimationFrame(() => {
          syncToolbarThenApply()
        })
        window.setTimeout(syncToolbarThenApply, 100)
        window.setTimeout(syncToolbarThenApply, 260)
        /* 對齊 fsm.js：若捲動後仍未收合，允許再次邊緣上滑觸發 */
        if (!isToolbarHidden) {
          hasTriggeredSwipe = false
        }
      }, HIDE_CHROME_NUDGE_MS)
      nudgeTimers.push(tid)
    }

    const flushVvScrollRaf = () => {
      if (vvScrollRaf !== 0) {
        window.cancelAnimationFrame(vvScrollRaf)
        vvScrollRaf = 0
      }
    }

    const applyImmediate = () => {
      const vv = window.visualViewport
      if (!vv) {
        clear()
        return
      }
      const h = Math.round(vv.height)
      const w = Math.round(vv.width)
      if (!Number.isFinite(h) || !Number.isFinite(w) || h < 8 || w < 8) {
        clear()
        return
      }
      if (adaptGutter) {
        updateToolbarFromVvResize(h)
      }

      if (applyLayout) {
        const sizeChanged = h !== lastAppliedH || w !== lastAppliedW
        const ot = Math.round(vv.offsetTop)
        const ol = Math.round(vv.offsetLeft)
        const offsetJump =
          Math.abs(ot - lastAppliedTop) > VV_OFFSET_APPLY_EPS_PX ||
          Math.abs(ol - lastAppliedLeft) > VV_OFFSET_APPLY_EPS_PX

        el.style.setProperty('--game-visible-h', `${h}px`)
        el.style.setProperty('--game-visible-w', `${w}px`)
        lastAppliedH = h
        lastAppliedW = w

        if (sizeChanged || offsetJump) {
          el.style.setProperty('--game-vv-top', `${ot}px`)
          el.style.setProperty('--game-vv-left', `${ol}px`)
          lastAppliedTop = ot
          lastAppliedLeft = ol
        }
      }

      if (adaptGutter) {
        applyGutterStyle()
        notifyToolbarHiddenIfChanged()
      }
    }

    const onToolbarConsumerReset = () => {
      if (!adaptGutter) return
      lastReportedToolbarHidden = null
      swipeHintUnlockVvRead = false
      vvToolbarHiddenStreak = 0
      if (suppressAutoChromeNudgeRef?.current) {
        armSwipeHintVvGateFromNow()
      } else {
        clearSwipeHintVvGate()
      }
      isToolbarHidden = false
      hasTriggeredSwipe = false
      notifyToolbarHiddenIfChanged()
      applyImmediate()
    }

    const scheduleApplyOnVvScroll = () => {
      if (vvScrollRaf !== 0) return
      vvScrollRaf = window.requestAnimationFrame(() => {
        vvScrollRaf = 0
        applyImmediate()
      })
    }

    const onVisualViewportResize = () => {
      flushVvScrollRaf()
      applyImmediate()
    }

    applyImmediate()

    const vv = window.visualViewport
    if (!vv) return () => clear()

    const orientationDeferTimers: number[] = []

    const applyOrientationFollowUps = () => {
      swipeHintUnlockVvRead = false
      vvToolbarHiddenStreak = 0
      if (adaptGutter && suppressAutoChromeNudgeRef?.current) {
        armSwipeHintVvGateFromNow()
      } else {
        clearSwipeHintVvGate()
      }
      if (adaptGutter) {
        isRotating = true
        setDocumentScrollTop(0)
      }
      onVisualViewportResize()
      orientationDeferTimers.forEach((id) => window.clearTimeout(id))
      orientationDeferTimers.length = 0
      orientationDeferTimers.push(
        window.setTimeout(onVisualViewportResize, 100),
        window.setTimeout(onVisualViewportResize, 250),
      )
      if (adaptGutter) {
        orientationDeferTimers.push(
          window.setTimeout(() => {
            syncToolbarAfterOrientation()
            isRotating = false
            onVisualViewportResize()
            if (
              !isToolbarHidden &&
              isLandscapeLayout() &&
              !suppressAutoChromeNudgeRef?.current
            ) {
              runHideChromeScrollNudge()
            }
          }, 480),
          /* iOS 延遲換算 inner/vv 時再同步一次，避免首次 sync 仍誤判 */
          window.setTimeout(() => {
            syncToolbarAfterOrientation()
            onVisualViewportResize()
          }, 700),
          /* vv 穩定後再同步（不重複 nudge，避免雙重捲動體感） */
          window.setTimeout(() => {
            syncToolbarAfterOrientation()
            onVisualViewportResize()
          }, 820),
        )
      }
    }

    const onEdgeTouchStart = (e: TouchEvent) => {
      if (!adaptGutter || !isLandscapeLayout() || isToolbarHidden) return
      swipeStartY = e.touches[0].clientY
    }

    const onEdgeTouchEnd = (e: TouchEvent) => {
      if (
        !adaptGutter ||
        !isLandscapeLayout() ||
        isToolbarHidden ||
        hasTriggeredSwipe
      ) {
        return
      }
      const delta = e.changedTouches[0].clientY - swipeStartY
      if (delta < -10) {
        hasTriggeredSwipe = true
        runHideChromeScrollNudge()
      }
    }

    const edgeOpts = { passive: true } as const

    const attachEdge = (refObj: RefObject<HTMLElement | null> | undefined) => {
      const node = refObj?.current
      if (!node) return
      node.addEventListener('touchstart', onEdgeTouchStart, edgeOpts)
      node.addEventListener('touchend', onEdgeTouchEnd, edgeOpts)
    }

    const detachEdge = (refObj: RefObject<HTMLElement | null> | undefined) => {
      const node = refObj?.current
      if (!node) return
      node.removeEventListener('touchstart', onEdgeTouchStart)
      node.removeEventListener('touchend', onEdgeTouchEnd)
    }

    let edgeAttachRaf = 0
    if (adaptGutter) {
      edgeAttachRaf = window.requestAnimationFrame(() => {
        edgeAttachRaf = 0
        attachEdge(edgeLeft)
        attachEdge(edgeRight)
      })
    }

    vv.addEventListener('resize', onVisualViewportResize)
    vv.addEventListener('scroll', scheduleApplyOnVvScroll)
    window.addEventListener('resize', onVisualViewportResize)
    window.addEventListener('orientationchange', applyOrientationFollowUps)
    window.addEventListener('pageshow', onVisualViewportResize)
    if (adaptGutter) {
      window.addEventListener(
        GAME_OVERLAY_IOS_TOOLBAR_CONSUMER_RESET_EVENT,
        onToolbarConsumerReset,
      )
    }

    return () => {
      if (edgeAttachRaf !== 0) window.cancelAnimationFrame(edgeAttachRaf)
      flushVvScrollRaf()
      nudgeTimers.forEach((id) => window.clearTimeout(id))
      el.classList.remove('game-overlay--parent-scroll-nudge')
      orientationDeferTimers.forEach((id) => window.clearTimeout(id))
      detachEdge(edgeLeft)
      detachEdge(edgeRight)
      vv.removeEventListener('resize', onVisualViewportResize)
      vv.removeEventListener('scroll', scheduleApplyOnVvScroll)
      window.removeEventListener('resize', onVisualViewportResize)
      window.removeEventListener('orientationchange', applyOrientationFollowUps)
      window.removeEventListener('pageshow', onVisualViewportResize)
      if (adaptGutter) {
        window.removeEventListener(
          GAME_OVERLAY_IOS_TOOLBAR_CONSUMER_RESET_EVENT,
          onToolbarConsumerReset,
        )
      }
      clear()
    }
  }, [
    targetRef,
    opts?.applyLayoutFromVisualViewport,
    opts?.adaptIosBottomGutter,
    opts?.iosScrollEdgeLeftRef,
    opts?.iosScrollEdgeRightRef,
    opts?.blurTargetRef,
    opts?.suppressAutoChromeNudgeRef,
    opts?.onIosToolbarHiddenChange,
  ])
}
