/* Minimal PWA service worker: satisfies installability (fetch control) without caching. */
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
  event.respondWith(fetch(event.request))
})
