// Sirve dibu.softapp.tech desde GitHub Pages (jmhdevelop/dibu-web, rama master).
// La web es estática; aquí solo se reescriben rutas y redirecciones y se cachea.
const ORIGIN = "https://jmhdevelop.github.io";
const BASE = "/dibu-web";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }
    const isHead = request.method === "HEAD";
    const upstream = new URL(ORIGIN + BASE + url.pathname + url.search);
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const hit = await cache.match(cacheKey);
    if (hit) return isHead ? new Response(null, hit) : hit;

    const res = await fetch(upstream.toString(), {
      headers: { "user-agent": "dibu-web-proxy", accept: request.headers.get("accept") || "*/*" },
      redirect: "manual",
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    // GitHub responde 301 para carpetas sin barra final: devolver la redirección en nuestro dominio.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") || "/";
      const target = new URL(loc, ORIGIN);
      let path = target.pathname.startsWith(BASE) ? target.pathname.slice(BASE.length) : target.pathname;
      if (path === "") path = "/";
      return Response.redirect(url.origin + path + target.search, 301);
    }

    let body = res.body;
    let status = res.status;
    if (status === 404) {
      const notFound = await fetch(ORIGIN + BASE + "/404.html", { cf: { cacheTtl: 300 } });
      body = notFound.body;
    }
    const headers = new Headers(res.headers);
    headers.delete("set-cookie");
    headers.set("cache-control", status === 200 ? "public, max-age=300, s-maxage=600" : "no-cache");
    headers.set("x-served-by", "dibu-web worker");
    const out = new Response(body, { status, headers });
    if (status === 200) await cache.put(cacheKey, out.clone());
    return isHead ? new Response(null, out) : out;
  },
};
