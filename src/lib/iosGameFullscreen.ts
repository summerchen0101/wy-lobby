import { isStandalonePWA } from './pwaMode'

const LS_IOS_SCROLL_HINT_KEY = 'wynoco.game.iosScrollHint.dismissed'

/** iOS WebKit（Safari / 內嵌 WebView 常見）且非 MSStream 舊 hack（含 iPad／iPhone／iPod UA） */
export function isIOSWebKit(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
  )
}

/** 僅 iPhone／iPod：需收合 Safari 網址列的捲動宿主／vv 行為；iPad 改走點擊 requestFullscreen */
export function isIPhoneOrIpodWebKit(): boolean {
  return (
    /iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
  )
}

/** iPad 以「桌面版網站」瀏覽時 UA 常為 Macintosh；仍視為平板（走點擊全螢） */
export function isIPadDesktopSiteUa(): boolean {
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * 瀏覽器分頁內 **iPhone／iPod**：捲動宿主、上滑示意等；standalone PWA 略過。
 * iPad（含桌面 UA）不在此路徑。
 */
export function shouldUseIosGameViewportWorkarounds(): boolean {
  return isIPhoneOrIpodWebKit() && !isStandalonePWA()
}

/** `document.fullscreenEnabled` 與舊 WebKit 前綴相容 */
export function isBrowserFullscreenCapable(): boolean {
  if (typeof document === 'undefined') return false
  if (document.fullscreenEnabled) return true
  const d = document as Document & { webkitFullscreenEnabled?: boolean }
  return d.webkitFullscreenEnabled === true
}

/** 典型電腦瀏覽器：有 hover 能力 + 精細指標（滑鼠） */
export function isDesktopLikeBrowser(): boolean {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function hasTapFullscreenDeviceSignals(): boolean {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return true
  if (/iPad/i.test(ua)) return true
  if (isIPadDesktopSiteUa()) return true
  if (/Mobi|webOS|Tablet|Silk|BlackBerry|IEMobile|Opera Mini/i.test(ua))
    return true
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  )
    return true
  return false
}

/**
 * 典型鼠標桌面：無行動／平板 UA、非 iPad 桌面偽裝、非粗指標。
 * 與 `hasTapFullscreenDeviceSignals` 並用：避免在 PC 上自動進全螢流程。
 */
function isLikelyDesktopMouseOnly(): boolean {
  const ua = navigator.userAgent
  const mobileOrTabletUa =
    /Android|Mobi|webOS|iPhone|iPad|iPod|Tablet|Silk|BlackBerry|IEMobile|Opera Mini/i.test(
      ua,
    )
  if (mobileOrTabletUa || isIPadDesktopSiteUa()) return false

  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  if (coarsePointer) return false

  const finePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: fine)').matches

  return (
    navigator.maxTouchPoints === 0 ||
    (finePointer && !coarsePointer)
  )
}

/**
 * 非 iPhone 捲動模式之行動裝置／平板：於使用者手勢下呼叫 Fullscreen API。
 * 不支援時退化成固定 overlay。
 */
export function shouldUseTapToBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false
  if (isDesktopLikeBrowser()) return false
  if (shouldUseIosGameViewportWorkarounds()) return false
  if (!isBrowserFullscreenCapable()) return false
  if (isLikelyDesktopMouseOnly()) return false
  return hasTapFullscreenDeviceSignals()
}

/** `document.fullscreenElement` 含 WebKit 前綴 */
export function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null
  return (
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element | null })
      .webkitFullscreenElement ??
    null
  )
}

export async function enterBrowserFullscreen(el: Element): Promise<void> {
  const node = el as HTMLElement & {
    webkitRequestFullscreen?: () => void
  }
  if (typeof node.requestFullscreen === 'function') {
    await node.requestFullscreen()
    return
  }
  if (typeof node.webkitRequestFullscreen === 'function') {
    node.webkitRequestFullscreen()
    return
  }
  throw new Error('requestFullscreen unsupported')
}

export async function exitBrowserFullscreen(): Promise<void> {
  const doc = document as Document & { webkitExitFullscreen?: () => void }
  if (typeof document.exitFullscreen === 'function') {
    await document.exitFullscreen()
    return
  }
  if (typeof doc.webkitExitFullscreen === 'function') {
    doc.webkitExitFullscreen()
    return
  }
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
