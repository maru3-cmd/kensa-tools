/* 検査ミニポータル Service Worker
 * オフライン専用機向け：全ツールを事前キャッシュし、キャッシュ優先で即表示。
 * 更新時は下の CACHE のバージョン(v1→v2…)を上げるだけ。古いキャッシュは自動削除。
 */
var CACHE = "kensa-tools-v1";

var PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./angle-dim/",
  "./angle-dim/index.html",
  "./axis-tilt/",
  "./axis-tilt/index.html",
  "./bend-guide/",
  "./bend-guide/index.html",
  "./bend-guide-3d/",
  "./bend-guide-3d/index.html",
  "./cam-profile/",
  "./cam-profile/index.html",
  "./chord-r/",
  "./chord-r/index.html",
  "./corner-dist/",
  "./corner-dist/index.html",
  "./cpk/",
  "./cpk/index.html",
  "./datum-edge/",
  "./datum-edge/index.html",
  "./frame-check/",
  "./frame-check/index.html",
  "./gear-w/",
  "./gear-w/index.html",
  "./hardness/",
  "./hardness/index.html",
  "./hole-builder/",
  "./hole-builder/index.html",
  "./multi-hole/",
  "./multi-hole/index.html",
  "./over-pin/",
  "./over-pin/index.html",
  "./pcd-pitch/",
  "./pcd-pitch/index.html",
  "./phase-shift/",
  "./phase-shift/index.html",
  "./pin-wire/",
  "./pin-wire/index.html",
  "./pipe-thread/",
  "./pipe-thread/index.html",
  "./pitch-radius/",
  "./pitch-radius/index.html",
  "./pitch-row/",
  "./pitch-row/index.html",
  "./right-triangle/",
  "./right-triangle/index.html",
  "./scale-count/",
  "./scale-count/index.html",
  "./tap-drill/",
  "./tap-drill/index.html",
  "./taper/",
  "./taper/index.html",
  "./temp-comp/",
  "./temp-comp/index.html",
  "./tolerance/",
  "./tolerance/index.html",
  "./true-position/",
  "./true-position/index.html"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // 1件失敗で全体を巻き込まないよう個別に投入
      return Promise.all(PRECACHE.map(function(u){
        return c.add(new Request(u, {cache:"reload"})).catch(function(){ /* 取得不可はスキップ */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // 外部は関与しない（そもそも通信しない設計）

  e.respondWith(
    caches.match(req, {ignoreSearch:true}).then(function(hit){
      if(hit) return hit;                            // キャッシュ優先＝オフライン即表示
      return fetch(req).then(function(res){
        // オンライン時に取れたものは追加保存（次回からオフライン可）
        if(res && res.status===200 && res.type==="basic"){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        // オフラインでキャッシュにも無い場合：ナビゲーションはトップへ退避
        if(req.mode==="navigate") return caches.match("./index.html");
        return new Response("", {status:504, statusText:"offline"});
      });
    })
  );
});
