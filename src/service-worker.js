// 留白 Service Worker
const CACHE_NAME = 'liubai-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/js/storage.js',
  '/js/supabase.js',
  '/js/data.js',
  '/js/ui.js',
  '/js/features.js',
  '/js/features2.js',
  '/js/ai.js',
  '/js/app.js',
  '/manifest.json',
  '/audio/雨声.mp3',
  '/audio/海浪.mp3',
  '/audio/壁炉.mp3',
  '/audio/风铃.mp3',
  '/audio/深夜书店.mp3'
];

// 安装：预缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API 请求：网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 缓存 GET 请求的响应
          if (request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Supabase 请求：直接走网络
  if (url.hostname.includes('supabase.co') || url.hostname.includes('jsdelivr.net')) {
    event.respondWith(fetch(request));
    return;
  }

  // Google Fonts：网络优先，缓存回退
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
  );
});
