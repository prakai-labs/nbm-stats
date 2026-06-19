// Service Worker สำหรับ PWA — แคชไฟล์ static และ fallback เมื่อ offline
const CACHE_VERSION = 'v1'
const STATIC_CACHE = `bnnm-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `bnnm-runtime-${CACHE_VERSION}`

// ไฟล์ที่จะแคชทันทีเมื่อติดตั้ง (app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
]

// ไม่แคช API ที่เกี่ยวข้องกับข้อมูลสด (real-time)
const NEVER_CACHE_PATTERNS = [
  /\/api\//,
  /socket\.io/,
  /\/_next\/webpack-hmr/,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // ใช้ addAll แบบผ่อนปรน — ถ้า URL ใด fail ก็ยังติดตั้งได้
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // ไม่แคช API, socket.io, HMR
  if (NEVER_CACHE_PATTERNS.some((p) => p.test(url.pathname))) {
    return
  }

  // HTML navigation — network-first, fallback to cache
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    )
    return
  }

  // Static assets — cache-first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    })
  )
})

// รับ messages จาก client (เช่นสั่ง skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
