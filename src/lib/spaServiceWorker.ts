/** Versioned Unity WebGL deploy dirs on shared static hosts (e.g. /0001/WebGL_Build_Alpha/). */
const UNITY_VERSIONED_PREFIX = /^\/\d{4}\//

const DEFAULT_HOSTS_WITHOUT_SPA_SW = ['unityweb-alpha.ffglobaltech.com']

const SPA_SW_SCRIPT_SUFFIX = '/sw.js'

function hostsWithoutSpaSw(): Set<string> {
  const raw = import.meta.env.VITE_SPA_SW_DISABLED_HOSTS as string | undefined
  const fromEnv =
    raw
      ?.split(',')
      .map((h) => h.trim())
      .filter(Boolean) ?? []
  return new Set([...DEFAULT_HOSTS_WITHOUT_SPA_SW, ...fromEnv])
}

/** Whether this page should register the minimal PWA service worker at /sw.js. */
export function shouldRegisterSpaServiceWorker(): boolean {
  if (!import.meta.env.PROD) return false
  if (!('serviceWorker' in navigator)) return false
  if (import.meta.env.VITE_DISABLE_SPA_SERVICE_WORKER === 'true') return false

  const { hostname, pathname } = window.location
  if (hostsWithoutSpaSw().has(hostname)) return false
  if (UNITY_VERSIONED_PREFIX.test(pathname)) return false

  return true
}

function isSpaLobbySwRegistration(reg: ServiceWorkerRegistration): boolean {
  const script =
    reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL
  return script?.endsWith(SPA_SW_SCRIPT_SUFFIX) ?? false
}

/**
 * On hosts that also serve Unity static builds, drop a previously installed SPA SW
 * so /0001/... pages are not left under scope `/` after visiting the lobby root.
 */
export async function unregisterSpaServiceWorkerIfDisabled(): Promise<void> {
  if (shouldRegisterSpaServiceWorker()) return
  if (!('serviceWorker' in navigator)) return

  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    regs.filter(isSpaLobbySwRegistration).map((reg) => reg.unregister()),
  )
}

export function registerSpaServiceWorkerOnLoad(): void {
  if (!shouldRegisterSpaServiceWorker()) {
    window.addEventListener('load', () => {
      void unregisterSpaServiceWorkerIfDisabled()
    })
    return
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' })
  })
}
