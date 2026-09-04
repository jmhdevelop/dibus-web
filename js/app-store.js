/* =====================================================================
   Estado de publicación en el App Store — INTERRUPTOR ÚNICO
   =====================================================================
   Mientras Dibus no tenga ficha en el App Store, esta constante deja
   todos los enlaces y el badge negro (los marcados con
   data-todo="app-store-id", 14 en total repartidos por index.html,
   en/index.html, soporte.html, en/support.html, privacidad.html y
   en/privacy.html) como elementos "próximamente": sin href, con
   aria-disabled y el texto adaptado.

   EL DÍA DEL LANZAMIENTO:
   1. Cambia APP_STORE_PUBLICADA a `true` (o borra este bloque entero).
   2. Despliega. No hace falta tocar ningún HTML: los 14 enlaces
      vuelven a apuntar a apps.apple.com/app/id6807736269 tal cual
      están en el markup, con su texto e href originales intactos.
   3. Si además ya quieres el banner "Abrir en la app" de Safari,
      vuelve a añadir en index.html y en/index.html:
        <meta name="apple-itunes-app" content="app-id=6807736269">
      (se quitó a propósito mientras la ficha no existe).
   ===================================================================== */
const APP_STORE_PUBLICADA = false;

(function () {
  if (APP_STORE_PUBLICADA) return;

  var esTextos = {
    'Descargar en el App Store': 'Próximamente en el App Store',
    'Descargar gratis': 'Próximamente',
    'Ver packs': 'Próximamente',
  };
  var enTextos = {
    'Download on the App Store': 'Coming soon to the App Store',
    'Download for free': 'Coming soon',
    'See packs': 'Coming soon',
  };

  var lang = document.documentElement.lang === 'en' ? 'en' : 'es';
  var textos = lang === 'en' ? enTextos : esTextos;
  var badgeLinea1 = lang === 'en' ? 'Coming soon to the' : 'Próximamente en el';
  var badgeLabel = lang === 'en' ? 'Coming soon to the App Store' : 'Próximamente en el App Store';

  document.querySelectorAll('[data-todo="app-store-id"]').forEach(function (el) {
    el.dataset.appStoreHref = el.getAttribute('href') || '';
    el.removeAttribute('href');
    el.setAttribute('aria-disabled', 'true');
    el.classList.add('is-coming-soon');
    el.addEventListener('click', function (e) {
      e.preventDefault();
    });

    if (el.classList.contains('badge')) {
      // Badge negro tipo App Store: dos líneas de texto dentro del SVG.
      var lineas = el.querySelectorAll('svg text');
      if (lineas.length === 2) {
        lineas[0].textContent = badgeLinea1;
        // textLength fuerza a que la primera línea quepa en el ancho
        // disponible del badge sea cual sea el idioma o la longitud
        // del texto ("Descargar en el" / "Próximamente en el" / etc.).
        lineas[0].setAttribute('textLength', '124');
        lineas[0].setAttribute('lengthAdjust', 'spacingAndGlyphs');
        // La segunda línea ("App Store") no cambia.
      }
      el.setAttribute('aria-label', badgeLabel);
    } else if (el.classList.contains('btn')) {
      var actual = el.textContent.trim();
      if (textos[actual]) el.textContent = textos[actual];
    }
  });
})();
