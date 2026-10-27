/* Contador de visitas propio. No guarda nada en el navegador: cada carga de la
   portada (de cualquier idioma) cuenta como una visita (v:1); el resto de
   páginas, como una página vista (v:0). Mismo aviso que b.js de softmetrics. */
(function () {
  try {
    var p = location.pathname;
    var portada = /^\/(?:(?:en|de|fr|it|pt-br)\/?)?(?:index\.html)?$/i.test(p);
    var b = new Blob([JSON.stringify({ h: location.hostname, v: portada ? 1 : 0 })], { type: 'text/plain' });
    var u = 'https://softmetrics.softapp.tech/hit';
    if (navigator.sendBeacon) navigator.sendBeacon(u, b);
    else fetch(u, { method: 'POST', body: b, keepalive: true, mode: 'no-cors' });
  } catch (e) {}
})();
