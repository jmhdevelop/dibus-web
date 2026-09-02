// Sirve dibu.softapp.tech desde GitHub Pages (jmhdevelop/dibu-web, rama master).
// La web es estática; aquí solo se reescriben rutas y redirecciones y se cachea.
const ORIGIN = "https://jmhdevelop.github.io";
const BASE = "/dibu-web";

// Imágenes y recursos versionados (?v=) viven mucho en caché; el HTML, poco.
function cachePolicy(pathname) {
  if (/\.(png|jpg|jpeg|webp|avif|svg|ico|woff2?)$/i.test(pathname)) return "public, max-age=2592000, immutable";
  if (/\.(css|js)$/i.test(pathname)) return "public, max-age=604800, stale-while-revalidate=86400";
  return "public, max-age=300, s-maxage=600";
}

export default {
  async fetch(request, env, ctx) {
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
    });

    // GitHub responde 301 para carpetas sin barra final: devolver la redirección en nuestro dominio.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") || "/";
      const target = new URL(loc, ORIGIN);
      let path = target.pathname.startsWith(BASE) ? target.pathname.slice(BASE.length) : target.pathname;
      if (path === "") path = "/";
      return Response.redirect(url.origin + path + target.search, 301);
    }

    let status = res.status;
    let buf = await res.arrayBuffer();
    if (status === 404) {
      const notFound = await fetch(ORIGIN + BASE + "/404.html");
      buf = await notFound.arrayBuffer();
    }
    const headers = new Headers();
    for (const h of ["content-type", "last-modified", "etag", "vary"]) {
      const v = res.headers.get(h); if (v) headers.set(h, v);
    }
    headers.set("cache-control", status === 200 ? cachePolicy(url.pathname) : "no-cache");
    headers.set("x-served-by", "dibu-web worker");
    const out = new Response(buf, { status, headers });
    if (status === 200) ctx.waitUntil(cache.put(cacheKey, out.clone()));
    return isHead ? new Response(null, out) : out;
  },
};
