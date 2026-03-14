const STATIC_CACHE = "mansour-cup-v2026";
const DATA_CACHE = "mansour-data-v9";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./awards.html",
  "./final.html",
  "./group.html",
  "./groups_all.html",
  "./knockout.html",
  "./match.html",
  "./qf.html",
  "./sf.html",
  "./stats.html",
  "./tp.html",
  "./assets/css/style.css",
  "./assets/js/main.js",
  "./assets/js/awards.js",
  "./assets/js/groups_all.js",
  "./assets/js/stats.js",
  "./assets/img/bg-hero.jpg",
  "./assets/img/logo-committee-white.png",
  "./assets/img/logo-cup-white.png",
  "./assets/img/logo-tournament.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./manifest.webmanifest"
];

const DATA_PATTERNS = [
  "/data/matches.csv",
  "/data/roster.json",
  "/data/staff.json",
  "/data/standings.json",
  "/data/awards.json",
  "/data/videos.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, DATA_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (DATA_PATTERNS.some((p) => url.pathname.endsWith(p))) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if(res && res.ok){
            const copy = res.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(req, copy)).catch(()=>{});
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response("", { status: 504, statusText: "Offline" });
        })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy)).catch(()=>{});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response("", { status: 504, statusText: "Offline" });
      })
  );
});
