/**
 * Document fullscreen with vendor prefixes. iOS Safari has limited support for
 * non-video fullscreen; games can still use iframe-internal fullscreen (allow attribute).
 */

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null
  mozFullScreenElement?: Element | null
  msFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
  mozCancelFullScreen?: () => Promise<void>
  msExitFullscreen?: () => Promise<void>
}

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>
  mozRequestFullScreen?: () => Promise<void>
  msRequestFullscreen?: () => Promise<void>
}

export function getFullscreenElement(): Element | null {
  const d = document as FsDoc
  return (
    d.fullscreenElement ??
    d.webkitFullscreenElement ??
    d.mozFullScreenElement ??
    d.msFullscreenElement ??
    null
  )
}

export function isFullscreenActive(): boolean {
  return getFullscreenElement() !== null
}

export function requestDocumentFullscreen(
  el: HTMLElement = document.documentElement,
): Promise<void> {
  const target = el as FsElement
  const req =
    target.requestFullscreen?.bind(target) ??
    target.webkitRequestFullscreen?.bind(target) ??
    target.mozRequestFullScreen?.bind(target) ??
    target.msRequestFullscreen?.bind(target)

  if (!req) {
    return Promise.reject(new Error('fullscreen API unavailable'))
  }

  const result = req() as void | Promise<void>
  return result === undefined ? Promise.resolve() : result
}

export function exitDocumentFullscreen(): Promise<void> {
  const d = document as FsDoc
  const exit =
    d.exitFullscreen?.bind(d) ??
    d.webkitExitFullscreen?.bind(d) ??
    d.mozCancelFullScreen?.bind(d) ??
    d.msExitFullscreen?.bind(d)

  if (!exit) {
    return Promise.reject(new Error('fullscreen exit unavailable'))
  }

  if (!isFullscreenActive()) {
    return Promise.resolve()
  }

  const result = exit() as void | Promise<void>
  return result === undefined ? Promise.resolve() : result
}
