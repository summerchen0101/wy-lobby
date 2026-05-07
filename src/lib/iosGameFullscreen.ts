import { isStandalonePWA } from './pwaMode'

const LS_IOS_SCROLL_HINT_KEY = 'wynoco.game.iosScrollHint.dismissed'

/** iOS WebKit（Safari / 內嵌 WebView 常見）且非 MSStream 舊 hack */
export function isIOSWebKit(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
  )
}

/** 瀏覽器分頁內 iOS：需收合網址列時啟用捲動宿主等行為；已加入主畫面 / standalone 略過 */
export function shouldUseIosGameViewportWorkarounds(): boolean {
  return isIOSWebKit() && !isStandalonePWA()
}

export function hasDismissedIosGameScrollHint(): boolean {
  try {
    return localStorage.getItem(LS_IOS_SCROLL_HINT_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissIosGameScrollHintPermanently(): void {
  try {
    localStorage.setItem(LS_IOS_SCROLL_HINT_KEY, '1')
  } catch {
    /* ignore */
  }
}

/**
 * GameOverlay 在 orientationchange 樂觀重設 `iosToolbarHidden` 時送出，讓 useGameVisualViewport
 * 清掉 lastReported／狀態，否則 hook 仍認為「已回報過 true」而不再 notify，React 會卡在 false、cover 不消失。
 */
export const GAME_OVERLAY_IOS_TOOLBAR_CONSUMER_RESET_EVENT =
  'ffgt-game-overlay-ios-toolbar-consumer-reset'
