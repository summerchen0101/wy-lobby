/* Minimal PWA service worker: satisfies installability (fetch control) without caching.
 * Unity WebGL build assets bypass SW so large .wasm/.data files use HTTP cache directly. */

const UNITY_BUILD_PATH = /\/Build\//
const UNITY_GAME_PREFIX = /^\/games\//
const UNITY_ASSET_SUFFIX =
  /\.(wasm|data|framework\.js|loader\.js|bundle)(\.br)?$/i

function shouldBypassServiceWorker(pathname) {
  if (UNITY_GAME_PREFIX.test(pathname)) return true
  if (UNITY_BUILD_PATH.test(pathname)) return true
  return UNITY_ASSET_SUFFIX.test(pathname)
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(Promise.resolve())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  let requestUrl
  try {
    requestUrl = new URL(event.request.url)
  } catch {
    return
  }
  if (requestUrl.origin !== self.location.origin) {
    return
  }
  if (shouldBypassServiceWorker(requestUrl.pathname)) {
    return
  }
  event.respondWith(fetch(event.request))
})
