// 版を上げると、古いキャッシュ(前の版の画面と絵)は activate で消える。
const CACHE_NAME = "keisan-princess-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// stale-while-revalidate: キャッシュがあれば即返し、裏でネットワークから更新。
// オフラインでもアプリの見た目がすぐ出るようにするための簡易戦略。
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // 画面(index.html)はネットワーク優先。古い画面が新しい JS と絵を読まないままにならないように。
  // オフラインのときだけキャッシュを使う。
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) cache.put(request, response.clone());
            return response;
          })
          .catch(async () => (await cache.match(request)) || (await cache.match("/")) || Response.error())
      )
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

