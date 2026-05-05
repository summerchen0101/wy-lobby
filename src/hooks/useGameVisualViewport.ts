import { useEffect, type RefObject } from 'react'

export type UseGameVisualViewportOpts = {
  /**
   * iOS Safari：偵測網址列／工具列已收合時把 --game-ios-bottom-gutter 設為 0px，
   * 解除捲動帶佔高；收起前交還給 CSS clamp。
   */
  adaptIosBottomGutter?: boolean
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

    const clear = () => {
      el.style.removeProperty('--game-visible-h')
      el.style.removeProperty('--game-visible-w')
      el.style.removeProperty('--game-vv-top')
      el.style.removeProperty('--game-vv-left')
      if (adaptGutter) el.style.removeProperty('--game-ios-bottom-gutter')
    }

    const applyIosBottomGutter = (hRound: number) => {
      if (!adaptGutter) return
      const inner = window.innerHeight
      /*
       * 旋轉後常有一兩幀 `innerHeight` 仍是橫式、hRound 已是直式，若仍用
       * hRound >= inner - 80 會誤判「chrome 已收合」而把 gutter 設 0，iframe 貼滿底部，
       * 宿主就再也沒有可穿透捲動的帶狀區。
       */
      if (hRound > inner + 48) {
        el.style.removeProperty('--game-ios-bottom-gutter')
        return
      }
      const chromeCollapsed = hRound >= inner - 80
      if (chromeCollapsed) el.style.setProperty('--game-ios-bottom-gutter', '0px')
      else el.style.removeProperty('--game-ios-bottom-gutter')
    }

    const apply = () => {
      const vv = window.visualViewport
      if (!vv) {
        clear()
        return
      }
      const h = Math.round(vv.height)
      const w = Math.round(vv.width)
      if (
        !Number.isFinite(h) ||
        !Number.isFinite(w) ||
        h < 8 ||
        w < 8
      ) {
        clear()
        return
      }
      el.style.setProperty('--game-visible-h', `${h}px`)
      el.style.setProperty('--game-visible-w', `${w}px`)
      el.style.setProperty('--game-vv-top', `${Math.round(vv.offsetTop)}px`)
      el.style.setProperty('--game-vv-left', `${Math.round(vv.offsetLeft)}px`)
      applyIosBottomGutter(h)
    }

    apply()

    const vv = window.visualViewport
    if (!vv) return () => clear()

    const orientationFollowUps: number[] = []
    const clearOrientationFollowUps = () => {
      while (orientationFollowUps.length) {
        const id = orientationFollowUps.pop()
        if (id !== undefined) window.clearTimeout(id)
      }
    }

    const onOrientationChange = () => {
      apply()
      clearOrientationFollowUps()
      for (const ms of [0, 90, 240, 500]) {
        orientationFollowUps.push(window.setTimeout(apply, ms))
      }
    }

    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', onOrientationChange)
    window.addEventListener('pageshow', apply)

    return () => {
      clearOrientationFollowUps()
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', onOrientationChange)
      window.removeEventListener('pageshow', apply)
      clear()
    }
  }, [targetRef, opts?.adaptIosBottomGutter])
}
