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

    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    window.addEventListener('orientationchange', apply)
    window.addEventListener('pageshow', apply)

    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      window.removeEventListener('orientationchange', apply)
      window.removeEventListener('pageshow', apply)
      clear()
    }
  }, [targetRef, opts?.adaptIosBottomGutter])
}
