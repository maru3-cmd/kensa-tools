/* 検査ミニポータル Service Worker
 * オフライン専用機向け：全ツールを事前キャッシュし、キャッシュ優先で即表示。
 * 更新時は下の CACHE のバージョン(v1→v2…)を上げるだけ。古いキャッシュは自動削除。
 */
var CACHE = "kensa-tools-v19";

/* プリキャッシュで取りこぼしたURLの記録先。ページからの診断に使う（外部通信はしない） */
var FAILKEY = "./__precache_failed";

var PRECACHE = [
  "./",
  "./apple-touch-icon.png",
  "./axis-tilt/",
  "./axis-tilt/index.html",
  "./bend-guide-3d/",
  "./bend-guide-3d/index.html",
  "./bend-guide/",
  "./bend-guide/index.html",
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
  "./hole-map/",
  "./hole-map/index.html",
  "./icon-192.png",
  "./icon-512-maskable.png",
  "./icon-512.png",
  "./index.html",
  "./manifest.json",
  "./over-pin/",
  "./over-pin/index.html",
  "./pcd-multi/",
  "./pcd-multi/index.html",
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
  "./resin-guide/",
  "./resin-guide/index.html",
  "./right-triangle/",
  "./right-triangle/index.html",
  "./scale-count/",
  "./scale-count/index.html",
  "./tally-split/",
  "./tally-split/index.html",
  "./belt-length/",
  "./belt-length/index.html",
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
      // 1件失敗で全体を巻き込まないよう個別に投入。ただし失敗は握り潰さず記録する
      var failed = [];
      return Promise.all(PRECACHE.map(function(u){
        return c.add(new Request(u, {cache:"reload"})).catch(function(){ failed.push(u); });
      })).then(function(){
        return c.put(FAILKEY, new Response(JSON.stringify(failed), {
          headers:{"Content-Type":"application/json"}
        }));
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

/* ページからの「ちゃんと保存できているか」の問い合わせに答える */
self.addEventListener("message", function(e){
  if(!e.data || e.data.type !== "STATUS") return;
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all([c.keys(), c.match(FAILKEY)]).then(function(r){
        var keys = r[0], fr = r[1];
        var saved = keys.filter(function(rq){ return rq.url.indexOf("__precache_failed") < 0; }).length;
        return (fr ? fr.json() : Promise.resolve(null)).then(function(failed){
          var msg = {type:"STATUS", cache:CACHE, saved:saved, total:PRECACHE.length, failed:failed || []};
          if(e.ports && e.ports[0]) e.ports[0].postMessage(msg);
          else if(e.source) e.source.postMessage(msg);
        });
      });
    })
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
