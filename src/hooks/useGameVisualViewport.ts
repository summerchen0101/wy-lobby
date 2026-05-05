import {
  useEffect,
  type RefObject,
} from 'react'

export type UseGameVisualViewportOpts = {
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
}

/** 略長於 fsm 400ms，讓 iframe 暫停命中覆蓋整段 nudge */
const HIDE_CHROME_NUDGE_MS = 450

function isLandscapeLayout(): boolean {
  return window.innerWidth > window.innerHeight
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

    const adaptGutter = opts?.adaptIosBottomGutter ?? false
    const edgeLeft = opts?.iosScrollEdgeLeftRef
    const edgeRight = opts?.iosScrollEdgeRightRef
    const blurTargetRef = opts?.blurTargetRef

    let baselineHeight = 0
    let baselineInitialized = false
    let isToolbarHidden = false
    let isRotating = false
    let isScrolling = false
    let hasTriggeredSwipe = false
    let swipeStartY = 0
    const nudgeTimers: number[] = []

    const clear = () => {
      el.style.removeProperty('--game-visible-h')
      el.style.removeProperty('--game-visible-w')
      el.style.removeProperty('--game-vv-top')
      el.style.removeProperty('--game-vv-left')
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
      if (isLandscapeLayout()) {
        const shortSide = Math.min(window.innerWidth, window.innerHeight)
        isToolbarHidden = h >= shortSide - 72
      } else {
        isToolbarHidden = h >= window.innerHeight - 80
      }
      baselineHeight = h
      baselineInitialized = true
      hasTriggeredSwipe = false
    }

    const updateToolbarFromVvResize = (hRound: number) => {
      if (!adaptGutter || isRotating || isScrolling) return
      if (!baselineInitialized) {
        baselineHeight = hRound
        baselineInitialized = true
        if (hRound >= window.innerHeight - 80) {
          isToolbarHidden = true
        }
        return
      }
      const diff = hRound - baselineHeight

      if (!isToolbarHidden && diff > 10) {
        isToolbarHidden = true
        baselineHeight = hRound
        hasTriggeredSwipe = false
      } else if (isToolbarHidden && diff < -10) {
        const activeEl = document.activeElement
        const isKeyboardOpen =
          activeEl instanceof HTMLElement &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable)
        if (isKeyboardOpen) {
          baselineHeight = hRound
        } else {
          isToolbarHidden = false
          baselineHeight = hRound
          hasTriggeredSwipe = false
        }
      } else if (isToolbarHidden && diff > 10) {
        baselineHeight = hRound
      }
    }

    /** sample tryHideBar：父文件捲動以促使 Safari 收合 UI */
    const runHideChromeScrollNudge = () => {
      if (!adaptGutter) return
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
      setDocumentScrollTop(200)
      const tid = window.setTimeout(() => {
        isScrolling = false
        el.classList.remove('game-overlay--parent-scroll-nudge')
        apply()
        /* 對齊 fsm.js：若捲動後仍未收合，允許再次邊緣上滑觸發 */
        if (!isToolbarHidden) {
          hasTriggeredSwipe = false
        }
      }, HIDE_CHROME_NUDGE_MS)
      nudgeTimers.push(tid)
    }

    const apply = () => {
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
      el.style.setProperty('--game-visible-h', `${h}px`)
      el.style.setProperty('--game-visible-w', `${w}px`)
      el.style.setProperty('--game-vv-top', `${Math.round(vv.offsetTop)}px`)
      el.style.setProperty('--game-vv-left', `${Math.round(vv.offsetLeft)}px`)
      if (adaptGutter) {
        applyGutterStyle()
      }
    }

    apply()

    const vv = window.visualViewport
    if (!vv) return () => clear()

    const orientationDeferTimers: number[] = []

    const applyOrientationFollowUps = () => {
      if (adaptGutter) {
        isRotating = true
        setDocumentScrollTop(0)
      }
      apply()
      orientationDeferTimers.forEach((id) => window.clearTimeout(id))
      orientationDeferTimers.length = 0
      orientationDeferTimers.push(
        window.setTimeout(apply, 100),
        window.setTimeout(apply, 250),
      )
      if (adaptGutter) {
        orientationDeferTimers.push(
          window.setTimeout(() => {
            syncToolbarAfterOrientation()
            isRotating = false
            apply()
            if (!isToolbarHidden && isLandscapeLayout()) {
              runHideChromeScrollNudge()
            }
          }, 480),
          /* iOS 延遲換算 inner/vv 時再同步一次，避免首次 sync 仍誤判 */
          window.setTimeout(() => {
            syncToolbarAfterOrientation()
            apply()
          }, 700),
          /* vv 穩定後若仍見工具列再 nudge 一次（避免首次捲動落在錯誤 layout） */
          window.setTimeout(() => {
            syncToolbarAfterOrientation()
            apply()
            if (!isToolbarHidden && isLandscapeLayout()) {
              runHideChromeScrollNudge()
            }
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

    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', applyOrientationFollowUps)
    window.addEventListener('pageshow', apply)

    return () => {
      if (edgeAttachRaf !== 0) window.cancelAnimationFrame(edgeAttachRaf)
      nudgeTimers.forEach((id) => window.clearTimeout(id))
      el.classList.remove('game-overlay--parent-scroll-nudge')
      orientationDeferTimers.forEach((id) => window.clearTimeout(id))
      detachEdge(edgeLeft)
      detachEdge(edgeRight)
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', applyOrientationFollowUps)
      window.removeEventListener('pageshow', apply)
      clear()
    }
  }, [
    targetRef,
    opts?.adaptIosBottomGutter,
    opts?.iosScrollEdgeLeftRef,
    opts?.iosScrollEdgeRightRef,
    opts?.blurTargetRef,
  ])
}
